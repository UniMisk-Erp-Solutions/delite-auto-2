"""
Automatically prepares YOUR specific delite.blend for the 3D product page. No manual naming needed.

It works on a COPY that you pass in (never your original):
    blender -b copy.blend --python tools/auto_prepare_parts.py        (env STAGE=debug | export)

What it does
  1. drops the joined duplicate (model_2.001)
  2. splits every chunk into its loose pieces (about 5,000)
  3. classifies each piece by WHERE it sits in the car + its material + which chunk it came from
  4. merges the pieces of each class back into one clean, named object:
        25 accessory groups (seats, headrests, armrests, steering, dash_trim, door_cards, infotainment, instrument_cluster,
        gear_shifter, pedals, interior_rearview, door_sills, floor_mats, door_handles, mirrors, headlights, fog_lamps,
        front_grille, tail_lamps, roof_rails, rear_spoiler, skid_plate, alloy_wheels, tyres, brake_discs) + ghost_body
     (names are chosen so the website recognises them: see client/src/product/parts.js)
  STAGE=debug : renders two colour-coded views so the grouping can be checked by eye
  STAGE=export: also bakes the procedural colours into vertex colours (glTF cannot carry procedural nodes)
                and exports the .glb
Car axes in this file: x = width (driver on -x, right-hand drive), y = length (FRONT is -y), z = up.
"""
import bpy, os, collections, mathutils

V = mathutils.Vector
STAGE = os.environ.get("STAGE", "debug")
OUT = os.environ.get("OUT", r"C:\Preet Patel\delite 3d\server\models\innova-parts.glb")
DBG = os.environ.get("DBG", os.path.dirname(OUT))


def log(*a):
    print("RESULT", *a, flush=True)


# ------------------------------------------------------------------ 1-2. clean + split
if "model_2.001" in bpy.data.objects:
    bpy.data.objects.remove(bpy.data.objects["model_2.001"], do_unlink=True)

for o in [o for o in bpy.data.objects if o.type == "MESH"]:
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")

pieces = [o for o in bpy.data.objects if o.type == "MESH"]
log("loose pieces:", len(pieces))


# ------------------------------------------------------------------ 3. classify
# 25 shoppable accessories + one ghost group. The rules come from measuring this exact car.
WHEEL_SRC = {"model_6": "alloy_wheels", "model_39": "tyres", "model_42": "tyres", "model_40": "brake_discs"}
GHOST_SRC = {"model_2", "model_3", "model_7", "model_51"}  # paint, black exterior panels, trims, glass


def info(o):
    bb = [o.matrix_world @ V(c) for c in o.bound_box]
    mn = [min(v[i] for v in bb) for i in range(3)]
    mx = [max(v[i] for v in bb) for i in range(3)]
    m = o.material_slots[0].material.name if o.material_slots and o.material_slots[0].material else "-"
    return dict(src=o.name.split(".")[0], m=m, c=[(mn[i] + mx[i]) / 2 for i in range(3)], s=[mx[i] - mn[i] for i in range(3)])


def classify(d):
    s, m = d["src"], d["m"]
    x, y, z = d["c"]
    sx, sy, sz = d["s"]
    ax = abs(x)
    big = max(d["s"])
    ext = s in GHOST_SRC
    leather = m == "Material.005"
    # ---- exterior, most specific first (front = -y, driver on -x)
    if ax >= 0.86 and -1.05 <= y <= -0.55 and 0.95 <= z <= 1.45 and big < 0.45:
        return "mirrors"
    if ax >= 0.86 and 0.95 <= z <= 1.15 and sx < 0.08 and 0.2 < sy < 0.3:
        return "door_handles"
    if y < -2.15 and 0.6 <= z <= 1.1 and (ax < 0.3 or sx > 0.5) and ax < 0.62:
        return "front_grille"
    if ax < 0.7 and y < -2.1 and z < 0.45 and sx > 0.8:
        return "skid_plate"
    if 0.4 < ax < 0.9 and y < -2.0 and 0.5 <= z <= 0.72 and s in ("model_3", "model_10") and big <= 0.5:
        return "fog_lamps"
    if 0.30 <= ax <= 0.95 and -2.45 <= y <= -1.78 and 0.72 <= z <= 1.12 and s not in ("model_2", "model_3"):
        return "headlights"
    if 0.30 <= ax <= 0.95 and y >= 1.85 and 0.9 <= z <= 1.35 and s in ("model_38", "model_50", "model_37"):
        return "tail_lamps"
    if 1.55 <= z <= 1.8 and ax >= 0.5 and sy > 0.8:
        return "roof_rails"
    if ax < 0.65 and 1.85 <= y <= 2.25 and 1.5 <= z <= 1.75 and s in ("model_2", "model_0") and sx > 0.6:
        return "rear_spoiler"
    if s in WHEEL_SRC:
        return WHEEL_SRC[s]
    # ---- interior (never from the exterior shell sources)
    if not ext:
        if ax < 0.16 and -0.82 <= y <= -0.66 and 1.08 <= z <= 1.32 and big <= 0.3:
            return "infotainment"
        if -0.58 <= x <= -0.15 and -0.95 <= y < -0.72 and 0.95 <= z <= 1.3 and big <= 0.4:
            return "instrument_cluster"
        if -0.57 <= x <= -0.13 and -0.72 <= y <= -0.42 and 0.82 <= z <= 1.28 and big <= 0.45:
            return "steering"
        if ax < 0.12 and -0.45 <= y <= -0.2 and 0.62 <= z <= 0.9 and big <= 0.3:
            return "gear_shifter"
        if -0.62 <= x <= -0.1 and -1.12 <= y <= -0.9 and 0.4 <= z <= 0.7 and big <= 0.25:
            return "pedals"
        if ax < 0.16 and -0.7 <= y <= -0.35 and 1.45 <= z <= 1.62 and big <= 0.3:
            return "interior_rearview"
        if leather and 0.6 <= ax <= 0.8 and z < 0.5 and sy > 0.4:
            return "door_sills"
        if s == "model_14" or (s == "model_12" and z < 0.52 and sx >= 0.4 and sy >= 0.4):
            return "floor_mats"
        if leather and 0.1 <= ax <= 0.26 and 0.5 <= y <= 0.8 and 0.65 <= z <= 0.85 and sx <= 0.15 and sy >= 0.3:
            return "armrests"
        in_seat_zone = leather and ax <= 0.60 and -0.55 <= y <= 1.70 and 0.35 <= z <= 1.45 and sx < 1.0
        if in_seat_zone and z > 1.12 and big <= 0.4:
            return "headrests"
        if in_seat_zone:
            return "seats"
        if ax <= 0.88 and -1.25 <= y <= 1.95 and 0.28 <= z <= 1.68:
            if leather and ax >= 0.62 and sx < 0.2:
                return "door_cards"
            if leather or (-1.25 <= y <= -0.25 and 0.50 <= z <= 1.55):
                return "dash_trim"
    # everything else is exterior shell, frames, bumper rails, chrome: shown as ghost glass
    return "ghost_body"


groups = collections.defaultdict(list)
for o in pieces:
    groups[classify(info(o))].append(o)

# ------------------------------------------------------------------ 4. merge per class
final = {}
for name, lst in groups.items():
    bpy.ops.object.select_all(action="DESELECT")
    for o in lst:
        o.select_set(True)
    bpy.context.view_layer.objects.active = lst[0]
    if len(lst) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    ob.data.name = name
    final[name] = ob
for name, ob in sorted(final.items()):
    tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    i = info(ob)
    log(f"{name:15} pieces={len(groups[name]):4} tris={tris:7} centre={[round(v,2) for v in i['c']]} size={[round(v,2) for v in i['s']]}")

# ------------------------------------------------------------------ debug renders
if STAGE == "debug":
    import colorsys
    names = sorted(n for n in final if n != "ghost_body")
    for i, n in enumerate(names):
        r, g, b = colorsys.hsv_to_rgb(i / len(names), 0.85, 1.0)
        final[n].color = (r, g, b, 1)
        log("colour", f"{i:2}", n, [round(v, 2) for v in (r, g, b)])
    final["ghost_body"].hide_render = True
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "STUDIO"
    sc.display.shading.color_type = "OBJECT"
    sc.render.resolution_x, sc.render.resolution_y = 1000, 560
    cam = bpy.data.objects.new("dbgcam", bpy.data.cameras.new("dbgcam"))
    sc.collection.objects.link(cam)
    sc.camera = cam

    def shot(loc, target, file, lens=38):
        cam.location = loc
        cam.data.lens = lens
        cam.rotation_euler = (V(target) - V(loc)).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = os.path.join(DBG, file)
        bpy.ops.render.render(write_still=True)

    shot((-5.2, -5.6, 3.3), (0, -0.2, 0.95), "dbg_front_left.png")
    shot((5.0, 6.2, 3.4), (0, 0.2, 0.9), "dbg_rear_right.png")
    log("debug renders written to", DBG)


# ------------------------------------------------------------------ export
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


def procedural(sock):
    return sock.is_linked and not any(n.type in ("TEX_IMAGE", "VERTEX_COLOR", "ATTRIBUTE") for n in upstream(sock))


def unlink(nt, sock):
    for l in list(sock.links):
        nt.links.remove(l)


if STAGE == "export":
    sc = bpy.context.scene
    objs = list(final.values())
    mats = []
    for ob in objs:
        for sl in ob.material_slots:
            if sl.material and sl.material not in mats:
                mats.append(sl.material)

    # an earlier flatten had unplugged the ColorRamp feeding Base Color: plug the darkest orphan ramp back
    for mat in mats:
        p = principled(mat) if mat.use_nodes else None
        if p and not p.inputs["Base Color"].is_linked and any(n.type == "TEX_NOISE" for n in mat.node_tree.nodes):
            ramps = [n for n in mat.node_tree.nodes if n.type == "VALTORGB" and n.inputs[0].is_linked and not any(o.is_linked for o in n.outputs)]
            if ramps:
                best = min(ramps, key=lambda n: max(max(e.color[:3]) for e in n.color_ramp.elements))
                mat.node_tree.links.new(best.outputs["Color"], p.inputs["Base Color"])
    todo = [(m, principled(m)) for m in mats if m.use_nodes and principled(m) and procedural(principled(m).inputs["Base Color"])]
    log("procedural colour materials:", [m.name for m, _ in todo])

    baked = False
    if todo:
        sc.render.engine = "CYCLES"
        sc.cycles.samples = 8
        for ob in objs:
            attr = ob.data.color_attributes.get("BakedColor") or ob.data.color_attributes.new(name="BakedColor", type="BYTE_COLOR", domain="CORNER")
            ob.data.color_attributes.active_color = attr
        bpy.ops.object.select_all(action="DESELECT")
        for ob in objs:
            ob.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        try:
            bpy.ops.object.bake(type="DIFFUSE", pass_filter={"COLOR"}, target="VERTEX_COLORS")
            baked = True
        except Exception as e:
            log("bake failed, using flat colours:", e)
        for mat, p in todo:
            nt = mat.node_tree
            if baked:
                unlink(nt, p.inputs["Base Color"])
                vc = nt.nodes.new("ShaderNodeVertexColor")
                vc.layer_name = "BakedColor"
                nt.links.new(vc.outputs["Color"], p.inputs["Base Color"])
            else:
                ramps = [n for n in upstream(p.inputs["Base Color"]) if n.type == "VALTORGB"]
                if ramps:
                    c = ramps[0].color_ramp.evaluate(0.5)
                    p.inputs["Base Color"].default_value = (c[0], c[1], c[2], 1.0)
                unlink(nt, p.inputs["Base Color"])
    # bump / roughness / normal that are procedural cannot be exported
    for mat in mats:
        p = principled(mat) if mat.use_nodes else None
        for key in ("Roughness", "Metallic", "Normal", "Coat Normal"):
            if p and key in p.inputs and procedural(p.inputs[key]):
                unlink(mat.node_tree, p.inputs[key])

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    common = dict(filepath=OUT, export_format="GLB", export_materials="EXPORT", export_yup=True, use_selection=False, export_apply=True)
    try:
        bpy.ops.export_scene.gltf(export_vertex_color="MATERIAL", **common)
    except TypeError:
        bpy.ops.export_scene.gltf(**common)
    log("exported", OUT, os.path.getsize(OUT) // 1048576, "MB")
