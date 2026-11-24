"""
Run inside Blender (Scripting tab -> Open -> Run Script) with your car scene open.

1. Packs every image into the .blend (images that are only linked by file path are the
   #1 reason textures vanish from a .glb).
2. Prints a report: for every material, what feeds Base Color / Normal / Roughness /
   Metallic, and flags anything the glTF exporter cannot read.
3. Exports a .glb with materials + images included.

Read the report in  Window -> Toggle System Console  (or the Info editor).
"""
import bpy, os

OUT = r"C:\Preet Patel\delite 3d\server\models\delite.glb"

# Node types the glTF exporter understands when they sit between an image and the
# Principled BSDF. Anything else upstream is silently dropped (-> white material).
OK = {"TEX_IMAGE", "NORMAL_MAP", "SEPARATE_COLOR", "SEPARATE_RGB", "MAPPING", "TEX_COORD",
      "UVMAP", "MIX", "MIX_RGB", "MATH", "INVERT", "VALUE", "RGB"}

def upstream(sock, seen=None):
    """All nodes feeding a socket, nearest first."""
    seen = seen or set()
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

# --- 1. pack images -----------------------------------------------------------
missing = []
for img in bpy.data.images:
    if img.source == "FILE" and not img.packed_file and img.name not in ("Render Result", "Viewer Node"):
        if not os.path.exists(bpy.path.abspath(img.filepath)):
            missing.append(img.name + "  ->  " + img.filepath)
try:
    bpy.ops.file.pack_all()
except Exception as e:
    print("pack_all problem:", e)

# --- 2. report ----------------------------------------------------------------
print("\n" + "=" * 70 + "\nMATERIAL REPORT\n" + "=" * 70)
bad = 0
for mat in bpy.data.materials:
    if not mat.use_nodes or not mat.users:
        continue
    p = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if not p:
        print(f"[!] {mat.name}: no Principled BSDF (exporter only reads Principled)")
        bad += 1
        continue
    line = []
    for key in ("Base Color", "Normal", "Roughness", "Metallic"):
        s = p.inputs[key]
        if not s.is_linked:
            line.append(f"{key}=value")
            continue
        chain = upstream(s)
        imgs = [n.image.name if n.image else "NO IMAGE" for n in chain if n.type == "TEX_IMAGE"]
        weird = sorted({n.type for n in chain if n.type not in OK})
        flag = ""
        if not imgs and key == "Base Color":
            flag = "  <-- procedural/no image: will export WHITE"
        if weird:
            flag += f"  <-- unsupported nodes: {', '.join(weird)}"
        if flag:
            bad += 1
        line.append(f"{key}={'+'.join(imgs) or 'nodes'}{flag}")
    print(f"{mat.name}: " + " | ".join(line))

if missing:
    print("\nMISSING IMAGE FILES (relink via File > External Data > Find Missing Files):")
    for m in missing:
        print("  ", m)
print(f"\n{bad} problem(s) found. For every flagged material: connect the image DIRECTLY to the "
      "Principled BSDF (or bake it: Cycles > Bake > Diffuse, Color only, into a new image).")

# --- 3. export ----------------------------------------------------------------
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format="GLB",
    export_image_format="AUTO",
    export_materials="EXPORT",
    export_texcoords=True,
    export_normals=True,
    export_yup=True,
    use_selection=False,   # select only the car and set True if the scene has extra objects
    export_apply=True,     # apply modifiers
)
print("Exported:", OUT)
