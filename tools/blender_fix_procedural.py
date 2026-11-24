"""
Keeps the colour variation of your PROCEDURAL materials (Noise + ColorRamp + Mapping ...)
through the glTF export, then exports a clean car-only .glb.

Run from Blender's TEXT EDITOR (not the console):
    Scripting tab -> Text Editor -> Open this file -> Run Script (play button)

Why vertex colours: the car mesh is ~870k loose triangles, so it cannot be UV-unwrapped
into a usable texture (every triangle becomes its own island). The procedural colour
varies slowly, and the mesh is very dense, so baking it into COLOUR ATTRIBUTES (per vertex)
keeps the look with no UVs and no image files.

Steps
  1. Re-plugs the Noise/ColorRamp nodes that an earlier 'flatten' run had unplugged.
  2. Bakes the diffuse colour of the car into a colour attribute ("BakedColor").
  3. Plugs a Color Attribute node into Base Color of each procedural material.
  4. Drops bump/roughness/coat-normal procedural links (glTF cannot carry them).
  5. Exports server/models/delite.glb.

!! It MODIFIES the open scene. Save first; afterwards use File > Save As, not Save.
Errors print with full tracebacks and the script keeps going.
"""
import bpy
import traceback

# Written OUTSIDE server/models on purpose, so a bad export can never overwrite the good
# model. Copy it into server/models yourself once it looks right.
OUT = r"C:\Preet Patel\delite 3d\exports\delite_blender.glb"
TRY_BAKE = True          # False = flat colours only
ATTR_TYPE = "BYTE_COLOR"  # BYTE_COLOR keeps the .glb small; FLOAT_COLOR = more precise, bigger

# Objects that make the car (the scene also holds a split copy and a floor plate).
EXPORT_ONLY = ["model_2.001"]

scene = bpy.context.scene


def log(*a):
    print(*a, flush=True)


def principled(mat):
    return next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)


def upstream(sock, seen=None):
    seen = seen if seen is not None else set()
    out = []
    for link in sock.links:
        n = link.from_node
        if n.name in seen:
            continue
        seen.add(n.name)
        out.append(n)
        for i in n.inputs:
            out += upstream(i, seen)
    return out


def is_procedural(sock):
    return sock.is_linked and not any(n.type in ("TEX_IMAGE", "VERTEX_COLOR", "ATTRIBUTE")
                                      for n in upstream(sock))


def unlink(nt, sock):
    for l in list(sock.links):
        nt.links.remove(l)


def flatten(mat, p):
    nt = mat.node_tree
    ramps = [n for n in upstream(p.inputs["Base Color"]) if n.type == "VALTORGB"]
    if ramps:
        c = ramps[0].color_ramp.evaluate(0.5)
        p.inputs["Base Color"].default_value = (c[0], c[1], c[2], 1.0)
    unlink(nt, p.inputs["Base Color"])


def deselect_all():
    for o in bpy.context.view_layer.objects:
        try:
            o.select_set(False)
        except Exception:
            pass


def repair_base_link(mat, p):
    """Plug the darkest orphan ColorRamp back into Base Color (an earlier run unplugged it)."""
    if p.inputs["Base Color"].is_linked:
        return
    nt = mat.node_tree
    ramps = [n for n in nt.nodes
             if n.type == "VALTORGB" and n.inputs[0].is_linked
             and not any(o.is_linked for o in n.outputs)]
    if ramps:
        best = min(ramps, key=lambda n: max(max(e.color[:3]) for e in n.color_ramp.elements))
        nt.links.new(best.outputs["Color"], p.inputs["Base Color"])
        log(f"   {mat.name}: re-linked {best.name} -> Base Color")


# ------------------------------------------------------------------ pick the car
car = [o for o in bpy.context.view_layer.objects if o.name in EXPORT_ONLY]
if not car:
    car = [o for o in bpy.context.view_layer.objects
           if o.type == "MESH" and not o.name.lower().startswith("cube")]
car = [o for o in car if o.type == "MESH"]
log(f"Car objects: {[o.name for o in car][:8]}  (total {len(car)})")

car_mats = []
for o in car:
    for s in o.material_slots:
        if s.material and s.material not in car_mats:
            car_mats.append(s.material)

# --------------------------------------------- 1. find procedural-colour materials
todo = []
for mat in car_mats:
    if not mat.use_nodes:
        continue
    p = principled(mat)
    if not p:
        continue
    if any(n.type == "TEX_NOISE" for n in mat.node_tree.nodes):
        try:
            repair_base_link(mat, p)
        except Exception:
            traceback.print_exc()
    if is_procedural(p.inputs["Base Color"]):
        todo.append((mat, p))
log("Procedural-colour materials:", [m.name for m, _ in todo])

# ------------------------------------------------- 2. bake colour into vertices
baked = False
old_engine = scene.render.engine
if TRY_BAKE and todo:
    try:
        scene.render.engine = "CYCLES"
        scene.cycles.samples = 8
        for o in car:
            me = o.data
            attr = me.color_attributes.get("BakedColor")
            if attr is None:
                attr = me.color_attributes.new(name="BakedColor", type=ATTR_TYPE, domain="CORNER")
            me.color_attributes.active_color = attr
            me.color_attributes.render_color_index = list(me.color_attributes).index(attr)
        deselect_all()
        for o in car:
            o.select_set(True)
        bpy.context.view_layer.objects.active = car[0]
        log("Baking colour into vertices (this can take a minute) ...")
        bpy.ops.object.bake(type="DIFFUSE", pass_filter={"COLOR"}, target="VERTEX_COLORS")
        baked = True
        log("Bake done.")
    except Exception:
        log("!! vertex-colour bake failed, using flat colours instead:")
        traceback.print_exc()
    finally:
        try:
            scene.render.engine = old_engine
        except Exception:
            pass

# ------------------------------------------------------------------ 3. rewire
fixed = []
for mat, p in todo:
    try:
        nt = mat.node_tree
        if baked:
            unlink(nt, p.inputs["Base Color"])
            vc = nt.nodes.new("ShaderNodeVertexColor")
            vc.layer_name = "BakedColor"
            nt.links.new(vc.outputs["Color"], p.inputs["Base Color"])
            fixed.append((mat.name, "vertex colours"))
        else:
            flatten(mat, p)
            fixed.append((mat.name, "flat colour"))
    except Exception:
        log(f"!! problem with material {mat.name}:")
        traceback.print_exc()

# ---- everything else procedural cannot be exported: drop the links, keep the values
for mat in car_mats:
    try:
        p = principled(mat) if mat.use_nodes else None
        if not p:
            continue
        nt = mat.node_tree
        for key in ("Roughness", "Metallic", "Normal", "Coat Normal"):
            if key in p.inputs and p.inputs[key].is_linked and is_procedural(p.inputs[key]):
                unlink(nt, p.inputs[key])
    except Exception:
        traceback.print_exc()

log("\nFIXED MATERIALS:")
for name, how in fixed:
    log(f"  {name}: {how}")

# ------------------------------------------------------------------- 4. export
try:
    bpy.ops.file.pack_all()
except Exception as e:
    log("pack_all:", e)

deselect_all()
for o in car:
    try:
        o.select_set(True)
    except Exception:
        pass
bpy.context.view_layer.objects.active = car[0] if car else None
log(f"\nExporting {len(car)} object(s) ...")

common = dict(
    filepath=OUT,
    export_format="GLB",
    export_materials="EXPORT",
    export_texcoords=True,
    export_normals=True,
    export_yup=True,
    use_selection=True,
    export_apply=True,
)
try:
    bpy.ops.export_scene.gltf(export_vertex_color="MATERIAL", **common)
except TypeError:
    log("(exporter has no export_vertex_color option; exporting with defaults)")
    bpy.ops.export_scene.gltf(**common)
log("Exported:", OUT)
log("Done. Use File > Save As if you want to keep the changed scene separate.")
