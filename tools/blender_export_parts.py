"""
Prepares the SEPARATE-PARTS Innova for the 3D product page.

Run from Blender's TEXT EDITOR (Scripting tab -> Text Editor -> Open -> Run Script), with the
scene that has every part as its own object. Nothing in your scene is modified.

What it does
  1. Lists every mesh object and tells you which product part / exterior panel the website
     will recognise it as (by name), and which objects it could NOT classify.
  2. Exports  exports/innova-parts.glb  (the name must contain "parts").
     Copy that file into  server/models/  and reload http://localhost:5173/product

How the website decides (edit the same words in client/src/product/parts.js if you prefer other names):
  shoppable (hover + product card):  seat | steer / stear (steering) | cabin / cabinet / dash / console / trim
                                     | headlight / headlamp | mirror
  exterior shell (ghost glass):      body | shell | door | hood / bonnet | roof | fender / wing | bumper
                                     | trunk / tailgate / boot | panel | paint | glass | window | windshield | pillar | grille
  everything else (wheels, chassis, engine...) stays solid and is not hoverable.
Names are matched anywhere in the OBJECT name, a PARENT object name, or a MATERIAL name (case-insensitive).
So an object that is joined with others can still be recognised through its material, for example a
material called "Seat_Leather". Anything that is fused into one big object and cannot be told apart can be
pinned by coordinates instead: open  /product?pick , click the spot, paste the line into MANUAL_PINS
(client/src/product/parts.js).
"""
import bpy
import re
import os

OUT_DIR = r"C:\Preet Patel\delite 3d\exports"
OUT = os.path.join(OUT_DIR, "innova-parts.glb")

PARTS = [
    ("seats", r"seat"),
    ("steering", r"stear|steer"),
    ("cabin set", r"cabin|cabinet|dash|console|trim"),
    ("headlights", r"head[\s_.-]?(light|lamp)|headlamp"),
    ("mirrors", r"mirror|orvm"),
]
GHOST = r"body|shell|door|hood|bonnet|roof|fender|wing|bumper|trunk|tailgate|boot|panel|paint|glass|window|windscreen|windshield|pillar|skin|grille|quarter"


def chain(obj):
    names = []
    o = obj
    while o is not None:
        names.append(o.name)
        o = o.parent
    # material names count too (a joined object can still be recognised by its materials)
    names += [s.material.name for s in obj.material_slots if s.material]
    return " ".join(names)


def classify(obj):
    c = chain(obj)
    for label, pat in PARTS:
        if re.search(pat, c, re.I):
            return ("PART", label)
    if re.search(GHOST, c, re.I):
        return ("GHOST", "exterior glass")
    return ("SOLID", "kept solid, not hoverable")


meshes = [o for o in bpy.context.view_layer.objects if o.type == "MESH"]
print("\n" + "=" * 72)
print(f"{len(meshes)} mesh objects")
print("=" * 72)
found = {}
for o in sorted(meshes, key=lambda x: x.name.lower()):
    kind, label = classify(o)
    found.setdefault(label, []).append(o.name)
    mats = [sl.material.name for sl in o.material_slots if sl.material]
    joined = "   <-- joined: %d materials (P > By Material to split, or pin it with /product?pick)" % len(mats) if len(mats) > 1 else ""
    print(f"  [{kind:5}] {o.name:34} -> {label:26} {', '.join(mats[:3])}{joined}")

print("\nSUMMARY")
for label, _ in PARTS:
    n = len(found.get(label, []))
    print(f"  {label:12}: {n} object(s)" + ("" if n else "   <-- none found: rename your objects to include this word"))
print(f"  {'exterior glass':12}: {len(found.get('exterior glass', []))} object(s)")
print(f"  {'solid':12}: {len(found.get('kept solid, not hoverable', []))} object(s)")

# export (selection untouched: exports every visible mesh as its own node)
os.makedirs(OUT_DIR, exist_ok=True)
common = dict(
    filepath=OUT,
    export_format="GLB",
    export_materials="EXPORT",
    export_normals=True,
    export_texcoords=True,
    export_yup=True,
    use_selection=False,
    use_visible=True,
    export_apply=True,
)
try:
    bpy.ops.export_scene.gltf(**common)
except TypeError:
    # exporter option names differ slightly between Blender versions
    common.pop("use_visible", None)
    bpy.ops.export_scene.gltf(**common)
print("\nExported:", OUT)
print("Next: copy it to  C:\\Preet Patel\\delite 3d\\server\\models\\  and open /product")
