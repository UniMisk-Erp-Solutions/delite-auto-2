"""Hero environment, rendered with Blender Cycles: twilight sky, dunes, rock massif, haze, and the studio floor.

  MODE=preview   hero camera, the car drawn grey: judge the composition        -> OUT (png)
  MODE=pano      the backdrop seen from the hero camera position (a 90 x 46 degree sector)  -> client/public/floor/hero-sky.jpg
  MODE=floor     top-down renders of the flat ground under the car: studio pool of light + the car's shadow
                 -> client/public/floor/hero-floor-light.jpg, hero-floor-shadow.jpg

  GLB=server/models/delite.glb MODE=pano OUT=client/public/floor \
  "C:/Program Files/Blender Foundation/Blender 5.1/blender.exe" -b --python tools/bake_hero_world.py

Website space (x right, y up, z toward the camera) maps to Blender as (x, -z, y). The car is placed exactly like
client/src/three/CarModel.jsx does. The terrain is flat (height 0) within 14 m of the car, so the baked floor and
the backdrop agree there; all of this must stay in step with client/src/three/Floor.jsx (sector, plane size).
"""
import math
import os
import re

import bpy
import numpy as np
from mathutils import Matrix, Vector

GLB = os.environ.get('GLB', 'server/models/delite.glb')
MODE = os.environ.get('MODE', 'preview')
OUT = os.environ.get('OUT', 'exports/hero_world.png')
SAMPLES = int(os.environ.get('SAMPLES', '64'))
RES_X = int(os.environ.get('RES_X', '1280'))
CAR_LENGTH = 4.6
PLANE_W, PLANE_D, PLANE_CZ = 20.0, 11.25, 0.5
CAM = (0.0, 1.548, 9.976)  # hero camera (website space): az 0, el 4, dist 10 around (0, .85, 0)
LON = 45.0  # pano sector: +-LON degrees across, LAT0..LAT1 degrees up
LAT0, LAT1 = -20.0, 26.0
BG_LIN = 0.0033  # page background #0b0b0c

P = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
rng = np.random.default_rng(11)


# ------------------------------------------------------------------ noise
def _rnd(ix, iy, seed):
    n = (ix.astype(np.int64) * 374761393 + iy.astype(np.int64) * 668265263 + seed * 1442695041) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    n = n ^ (n >> 16)
    return (n & 0xFFFFFF).astype(np.float32) / float(0xFFFFFF)


def vnoise(x, z, seed=0):
    x0 = np.floor(x)
    z0 = np.floor(z)
    fx = (x - x0).astype(np.float32)
    fz = (z - z0).astype(np.float32)
    fx = fx * fx * (3 - 2 * fx)
    fz = fz * fz * (3 - 2 * fz)
    a = _rnd(x0, z0, seed)
    b = _rnd(x0 + 1, z0, seed)
    c = _rnd(x0, z0 + 1, seed)
    d = _rnd(x0 + 1, z0 + 1, seed)
    return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz


def fbm(x, z, octaves=6, seed=0, gain=0.5):
    s = np.zeros_like(x, dtype=np.float32)
    amp, f, tot = 1.0, 1.0, 0.0
    for o in range(octaves):
        s += amp * vnoise(x * f + o * 17.3, z * f - o * 9.1, seed + o)
        tot += amp
        amp *= gain
        f *= 2.03
    return s / tot


def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


# ------------------------------------------------------------------ terrain
def height(X, Z):
    depth = -Z
    d0 = np.hypot(X, Z - PLANE_CZ)
    flat = sstep(14.0, 60.0, d0)  # exactly 0 around the car

    # sculpted dunes: sinuous crests (a strongly domain-warped sawtooth), biggest on the left
    def saw(ph, k):
        fr = ph - np.floor(ph)
        return np.where(fr < 0.76, (fr / 0.76) ** k, ((1 - fr) / 0.24) ** 1.2)

    def terrace(b_, n_, sharp=0.84):
        t_ = b_ * n_
        i_ = np.floor(t_)
        return (i_ + sstep(sharp, 1.0, t_ - i_)) / n_

    warp = (fbm(X * 0.008, Z * 0.008, 3, 3) - 0.5) * 2 + 0.45 * (fbm(X * 0.03, Z * 0.03, 3, 7) - 0.5) * 2
    ph1 = ((X * 0.5 + Z * 0.866) * 0.07 + warp * 3.6) / (2 * math.pi)
    ph2 = ((X * 0.9 + Z * 0.44) * 0.048 + warp * 4.2 + 1.7) / (2 * math.pi)
    prof = 0.65 * saw(ph1, 1.6) + 0.5 * saw(ph2, 2.0)
    prof = prof * (0.8 + 0.3 * fbm(X * 0.04, Z * 0.04, 4, 5))
    left = sstep(6, -75, X)
    amp = (3.6 + 17.0 * sstep(30, 170, depth)) * (0.22 + 1.05 * left)
    wv = 16 + 0.16 * depth
    valley = sstep(0.05, 1.0, np.abs(X - 1.5) / wv)  # the valley floor stays open down the middle
    dunes = prof * amp * (0.12 + 0.88 * valley)

    # the black rock massif on the right: wide, stepped in tiers, cracked, steep flanks
    blob = np.exp(-(((X - 40) / 16) ** 2 + ((Z + 112) / 30) ** 2))
    cw = (fbm(X * 0.02, Z * 0.02, 3, 61) - 0.5) * 2
    base = fbm(X * 0.035 + cw * 1.2, Z * 0.04 + cw * 1.2, 5, 21)
    hf = 1 - np.abs(2 * fbm(X * 0.2, Z * 0.16, 4, 71) - 1)
    crack = sstep(0.86, 0.98, hf)
    lumpy = 0.88 + 0.24 * fbm(X * 0.12, Z * 0.12, 4, 51)
    mass = sstep(0.09, 0.3, blob)
    tiers = terrace(np.clip(0.5 * base + 0.66 * sstep(10, 36, X) - 0.06, 0, 1), 7, 0.6)
    cliff = mass * (1.8 + 11.4 * tiers) * (1 - 0.16 * crack) * lumpy
    ridged = 1 - np.abs(2 * fbm(X * 0.11 + 5, Z * 0.07, 7, 21) - 1)
    # a second, distant massif at the far right edge
    blob2 = np.exp(-(((X - 78) / 24) ** 2 + ((Z + 170) / 34) ** 2))
    cliff += 7 * terrace(np.clip(base * 1.2, 0, 1), 4) * sstep(0.1, 0.6, blob2)

    # pale low hills far down the valley
    ridged2 = 1 - np.abs(2 * fbm(X * 0.03 + 2, Z * 0.025, 6, 33) - 1)
    hills = 15 * sstep(220, 420, depth) * (0.3 + 0.7 * ridged2) * np.exp(-(((X + 6) / 80) ** 2))
    hills += 16 * sstep(400, 800, depth) * fbm(X * 0.006, Z * 0.01, 5, 41)
    return flat * (dunes + cliff + hills)


def build_terrain():
    nu, nv = 760, 1300
    u = np.linspace(-1, 1, nu)
    v = np.linspace(0, 1, nv)
    xs = 420 * np.sinh(2.2 * u) / math.sinh(2.2)
    zs = 24 - 1500 * (np.exp(3.2 * v) - 1) / (math.exp(3.2) - 1)
    X, Z = np.meshgrid(xs.astype(np.float32), zs.astype(np.float32), indexing='ij')
    Y = height(X, Z).astype(np.float32)
    co = np.stack([X, -Z, Y], axis=-1).reshape(-1, 3)  # Blender coordinates
    idx = np.arange(nu * nv).reshape(nu, nv)
    quads = np.stack([idx[:-1, :-1], idx[1:, :-1], idx[1:, 1:], idx[:-1, 1:]], axis=-1).reshape(-1, 4)
    me = bpy.data.meshes.new('terrain')
    me.from_pydata(co.tolist(), [], quads.tolist())
    me.update()
    ob = bpy.data.objects.new('terrain', me)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.shade_smooth()
    return ob


# ------------------------------------------------------------------ sky (float equirect image used as the world)
def sky_array(W=4096, H=2048):
    j, i = np.mgrid[0:H, 0:W].astype(np.float32)
    u = (i + 0.5) / W
    vv = (j + 0.5) / H
    e = (vv - 0.5) * math.pi
    phi = (0.5 - u) * 2 * math.pi
    a = math.pi / 2 - phi
    a = (a + math.pi) % (2 * math.pi) - math.pi  # 0 = straight ahead (website -z), + = to the right
    ed = np.degrees(e)
    ad = np.degrees(a)
    stops_e = [-90, 0, 2, 4.5, 7, 10, 12.3, 15, 25, 50, 90]
    cols = np.array([(0.010, 0.010, 0.016), (0.30, 0.31, 0.38), (0.25, 0.27, 0.35), (0.168, 0.20, 0.296), (0.08, 0.10, 0.17), (0.04, 0.05, 0.10), (0.016, 0.020, 0.045), (0.0105, 0.015, 0.036), (0.0043, 0.0065, 0.017), (0.0022, 0.003, 0.009), (0.0011, 0.0015, 0.0045)], dtype=np.float32)
    sky = np.stack([np.interp(ed, stops_e, cols[:, c]) for c in range(3)], axis=-1).astype(np.float32)
    g1 = np.exp(-(ad / 7.5) ** 2) * np.exp(-((ed - 1.4) / 2.6) ** 2)  # warm glow at the end of the valley
    g2 = np.exp(-(ad / 65) ** 2) * np.exp(-(ed / 22) ** 2)
    sky += g1[..., None] * np.array([0.66, 0.42, 0.28], dtype=np.float32) * 0.34
    sky += g2[..., None] * np.array([0.6, 0.5, 0.5], dtype=np.float32) * 0.035
    # stars: sparse, soft, only well above the horizon
    n = int(W * H * 0.55e-4)
    sv = np.arcsin(rng.uniform(0.07, 1.0, n))  # uniform on the sphere above ~4 degrees
    sx = rng.integers(0, W, n)
    sy = np.clip(((sv / math.pi + 0.5) * H).astype(int), 0, H - 1)
    br = 0.18 + 1.1 * rng.random(n) ** 4
    br *= np.clip((np.degrees(sv) - 4) / 14, 0, 1)
    tint = np.array([0.9, 0.95, 1.0], dtype=np.float32)
    for dx, dy, w in ((0, 0, 1.0), (1, 0, 0.10), (-1, 0, 0.10), (0, 1, 0.10), (0, -1, 0.10)):
        np.add.at(sky, (np.clip(sy + dy, 0, H - 1), (sx + dx) % W), (br * w)[:, None] * tint)
    return sky


# ------------------------------------------------------------------ scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bake_floor = MODE == 'floor'

# the car (preview + floor modes)
cars = []
if MODE in ('preview', 'floor') and not os.environ.get('NOCAR'):
    bpy.ops.import_scene.gltf(filepath=GLB)
    HIDE = re.compile(r'^(cube|plane|floor|ground|stand|plate|backdrop)', re.I)
    roots = [o for o in bpy.data.objects if o.parent is None]
    keep = [o for o in roots if o.name.replace('.', '') == 'model_2001'] or roots
    for r in roots:
        if r not in keep or HIDE.match(r.name.replace('.', '')):
            for o in [r, *r.children_recursive]:
                bpy.data.objects.remove(o, do_unlink=True)
    roots = [o for o in bpy.data.objects if o.parent is None]
    cars = [o for o in bpy.data.objects if o.type == 'MESH']
    pts = []
    for o in cars:
        n = len(o.data.vertices)
        co = np.empty(n * 3, dtype=np.float32)
        o.data.vertices.foreach_get('co', co)
        m = np.array(o.matrix_world, dtype=np.float64)
        w = co.reshape(-1, 3) @ m[:3, :3].T + m[:3, 3]
        pts.append(np.stack([w[:, 0], w[:, 2], -w[:, 1]], axis=1))
    g = np.concatenate(pts)
    size = g.max(0) - g.min(0)
    yaw = math.pi / 2 if size[2] > size[0] else 0.0
    c_, s_ = math.cos(yaw), math.sin(yaw)
    R = np.array([[c_, 0, s_], [0, 1, 0], [-s_, 0, c_]])
    g2 = (g @ R.T)
    scale = CAR_LENGTH / (g2.max(0)[0] - g2.min(0)[0])
    g2 *= scale
    mn, mx = g2.min(0), g2.max(0)
    ctr = (mn + mx) / 2
    M = Matrix.Translation(Vector((-ctr[0], -mn[1], -ctr[2]))) @ Matrix.Scale(scale, 4) @ Matrix(R.tolist()).to_4x4()
    Mb = P @ M @ P.inverted()
    for r in roots:
        r.matrix_world = Mb @ r.matrix_world
    blk = bpy.data.materials.new('car')
    blk.use_nodes = True
    nt = blk.node_tree
    nt.nodes.clear()
    d = nt.nodes.new('ShaderNodeBsdfDiffuse')
    d.inputs['Color'].default_value = (0.0, 0.0, 0.0, 1) if bake_floor else (0.16, 0.16, 0.17, 1)
    o_ = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(d.outputs[0], o_.inputs['Surface'])
    for o in cars:
        me = o.data
        me.materials.clear()
        me.materials.append(blk)
        me.polygons.foreach_set('material_index', np.zeros(len(me.polygons), dtype=np.int32))
        o.visible_camera = not bake_floor

# the world: float equirect sky
sky_img = bpy.data.images.new('sky', 4096, 2048, alpha=True, float_buffer=True)
sky_img.colorspace_settings.name = 'Non-Color'
sk = sky_array()
sky_img.pixels.foreach_set(np.concatenate([sk, np.ones(sk.shape[:2] + (1,), dtype=np.float32)], axis=-1).ravel())
sky_img.update()
print('SKY stats', float(sk.max()), float(sk.mean()), 'readback', list(sky_img.pixels[4096 * 4 * 1100:4096 * 4 * 1100 + 4]))
world = bpy.data.worlds.new('w')
world.use_nodes = True
wn = world.node_tree.nodes
wn.clear()
wenv = wn.new('ShaderNodeTexEnvironment')
wenv.image = sky_img
wbg = wn.new('ShaderNodeBackground')
wout = wn.new('ShaderNodeOutputWorld')
wbg2 = wn.new('ShaderNodeBackground')  # what the camera sees
wlp = wn.new('ShaderNodeLightPath')
wmix = wn.new('ShaderNodeMixShader')
world.node_tree.links.new(wenv.outputs['Color'], wbg.inputs['Color'])
world.node_tree.links.new(wenv.outputs['Color'], wbg2.inputs['Color'])
wbg2.inputs['Strength'].default_value = 1.0
world.node_tree.links.new(wlp.outputs['Is Camera Ray'], wmix.inputs['Fac'])
world.node_tree.links.new(wbg.outputs[0], wmix.inputs[1])
world.node_tree.links.new(wbg2.outputs[0], wmix.inputs[2])
world.node_tree.links.new(wmix.outputs[0], wout.inputs['Surface'])
scene.world = world

# the ground material: wind-rippled sand on the flats, dark layered rock on steep faces, haze with distance
terrain = build_terrain()
tm = bpy.data.materials.new('ground')
tm.use_nodes = True
n = tm.node_tree
n.nodes.clear()
N = n.nodes.new
L = n.links.new
tc = N('ShaderNodeTexCoord')
geo = N('ShaderNodeNewGeometry')


def noise(scale, detail=6, rough=0.55, mapping=(1, 1, 1), distortion=0.0, src='Object'):
    mp = N('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = mapping
    L(tc.outputs[src], mp.inputs['Vector'])
    nz = N('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = scale
    nz.inputs['Detail'].default_value = detail
    nz.inputs['Roughness'].default_value = rough
    nz.inputs['Distortion'].default_value = distortion
    L(mp.outputs[0], nz.inputs['Vector'])
    return nz.outputs['Fac']


def ramp(inp, pairs):
    cr = N('ShaderNodeValToRGB')
    cr.color_ramp.elements[0].position = pairs[0][0]
    cr.color_ramp.elements[0].color = pairs[0][1]
    cr.color_ramp.elements[1].position = pairs[1][0]
    cr.color_ramp.elements[1].color = pairs[1][1]
    L(inp, cr.inputs['Fac'])
    return cr.outputs['Color']


def mul(c1, c2):
    mx = N('ShaderNodeMix')
    mx.data_type = 'RGBA'
    mx.blend_type = 'MULTIPLY'
    mx.inputs['Factor'].default_value = 1.0
    L(c1, mx.inputs[6])  # colour A / B sockets (the same-named float and vector sockets come first)
    L(c2, mx.inputs[7])
    return mx.outputs[2]


def math_(op, a, b=None):
    m = N('ShaderNodeMath')
    m.operation = op
    if isinstance(a, (int, float)):
        m.inputs[0].default_value = a
    else:
        L(a, m.inputs[0])
    if b is not None:
        if isinstance(b, (int, float)):
            m.inputs[1].default_value = b
        else:
            L(b, m.inputs[1])
    return m.outputs[0]


# slope: 1 on flats, 0 on steep faces
sep = N('ShaderNodeSeparateXYZ')
L(geo.outputs['Normal'], sep.inputs['Vector'])
steep = ramp(sep.outputs['Z'], [(0.62, (1, 1, 1, 1)), (0.92, (0, 0, 0, 1))])  # rock where steep
steep_f = n.nodes.new('ShaderNodeSeparateColor')
L(steep, steep_f.inputs['Color'])
pos_sep = N('ShaderNodeSeparateXYZ')
L(tc.outputs['Object'], pos_sep.inputs['Vector'])
xm = ramp(pos_sep.outputs['X'], [(6.0, (0, 0, 0, 1)), (26.0, (1, 1, 1, 1))])
xm_f = n.nodes.new('ShaderNodeSeparateColor')
L(xm, xm_f.inputs['Color'])
rockf = math_('MAXIMUM', steep_f.outputs['Red'], xm_f.outputs['Red'])

sand_var = noise(0.02, 6, 0.6, (1, 1, 1), 0.3)
sand = ramp(sand_var, [(0.25, (0.029, 0.030, 0.040, 1)), (0.75, (0.078, 0.082, 0.107, 1))])
sand = mul(sand, ramp(noise(0.7, 8, 0.6), [(0.3, (0.8, 0.8, 0.8, 1)), (0.7, (1.15, 1.15, 1.15, 1))]))
rock = ramp(noise(0.05, 8, 0.65), [(0.3, (0.0004, 0.0004, 0.0007, 1)), (0.7, (0.0018, 0.0019, 0.0027, 1))])
snow_h = ramp(pos_sep.outputs['Z'], [(6.0, (0, 0, 0, 1)), (8.5, (1, 1, 1, 1))])
snow_d = ramp(pos_sep.outputs['Y'], [(220.0, (0, 0, 0, 1)), (265.0, (1, 1, 1, 1))])
sf1 = n.nodes.new('ShaderNodeSeparateColor')
L(snow_h, sf1.inputs['Color'])
sf2 = n.nodes.new('ShaderNodeSeparateColor')
L(snow_d, sf2.inputs['Color'])
snow = math_('MINIMUM', sf1.outputs['Red'], sf2.outputs['Red'])
mixc = N('ShaderNodeMix')
mixc.data_type = 'RGBA'
L(rockf, mixc.inputs['Factor'])
L(sand, mixc.inputs[6])
L(rock, mixc.inputs[7])
# wind ripples on the sand (bump), strata and cracks on the rock
wave = N('ShaderNodeTexWave')
wave.inputs['Scale'].default_value = 1.6
wave.inputs['Distortion'].default_value = 5.0
wave.inputs['Detail'].default_value = 2.0
mp = N('ShaderNodeMapping')
mp.inputs['Scale'].default_value = (0.55, 1.0, 1.0)
L(tc.outputs['Object'], mp.inputs['Vector'])
L(mp.outputs[0], wave.inputs['Vector'])
ripple = wave.outputs['Fac']
grain = noise(260, 4, 0.5)
strata = noise(0.35, 10, 0.7, (1.0, 1.0, 5.0))
stripes = noise(2.0, 8, 0.65, (5.0, 5.0, 0.5))  # vertical striations on the cliff faces
hgt = math_('ADD', math_('MULTIPLY', ripple, 0.5), math_('MULTIPLY', grain, 0.6))
hgt = math_('ADD', hgt, math_('MULTIPLY', math_('MULTIPLY', strata, rockf), 2.2))
hgt = math_('ADD', hgt, math_('MULTIPLY', math_('MULTIPLY', stripes, rockf), 1.2))
bump = N('ShaderNodeBump')
bump.inputs['Strength'].default_value = 1.2
bump.inputs['Distance'].default_value = 0.05
L(hgt, bump.inputs['Height'])
pb = N('ShaderNodeBsdfPrincipled')
snowmix = N('ShaderNodeMix')
snowmix.data_type = 'RGBA'
L(snow, snowmix.inputs['Factor'])
L(mixc.outputs[2], snowmix.inputs[6])
snowmix.inputs[7].default_value = (0.6, 0.63, 0.75, 1)
L(snowmix.outputs[2], pb.inputs['Base Color'])
L(bump.outputs['Normal'], pb.inputs['Normal'])
L(math_('SUBTRACT', 1.0, math_('MULTIPLY', rockf, 0.45)), pb.inputs['Roughness'])
L(math_('ADD', 0.04, math_('MULTIPLY', rockf, 0.5)), pb.inputs['Specular IOR Level'])
shade = pb.outputs[0]
out = N('ShaderNodeOutputMaterial')
if not bake_floor:
    # distance haze for camera rays: fade to the sky colour in that direction
    inc = N('ShaderNodeNewGeometry')
    flip = N('ShaderNodeVectorMath')
    flip.operation = 'SCALE'
    flip.inputs['Scale'].default_value = -1.0
    L(inc.outputs['Incoming'], flip.inputs[0])
    env = N('ShaderNodeTexEnvironment')
    env.image = sky_img
    L(flip.outputs[0], env.inputs['Vector'])
    cd = N('ShaderNodeCameraData')
    fog = math_('SUBTRACT', 1.0, math_('EXPONENT', math_('MULTIPLY', math_('MAXIMUM', math_('SUBTRACT', cd.outputs['View Distance'], 140.0), 0.0), -1.0 / 170.0)))
    zs_ = N('ShaderNodeSeparateXYZ')
    L(tc.outputs['Object'], zs_.inputs['Vector'])
    low = ramp(zs_.outputs['Z'], [(0.0, (1, 1, 1, 1)), (15.0, (0.8, 0.8, 0.8, 1))])  # valleys hold more mist than crests
    low_f = n.nodes.new('ShaderNodeSeparateColor')
    L(low, low_f.inputs['Color'])
    fog = math_('MULTIPLY', fog, low_f.outputs['Red'])
    lp = N('ShaderNodeLightPath')
    fog = math_('MULTIPLY', fog, lp.outputs['Is Camera Ray'])
    hz = N('ShaderNodeEmission')
    L(env.outputs['Color'], hz.inputs['Color'])
    mixs = N('ShaderNodeMixShader')
    L(fog, mixs.inputs['Fac'])
    L(shade, mixs.inputs[1])
    L(hz.outputs[0], mixs.inputs[2])
    L(mixs.outputs[0], out.inputs['Surface'])
else:
    L(shade, out.inputs['Surface'])
terrain.data.materials.append(tm)

# the low moon behind the valley: raking light, soft rims on the dune crests
moon = bpy.data.lights.new('moon', 'SUN')
moon.energy = float(os.environ.get('MOON', '1.4'))
moon.angle = math.radians(4.0)
moon.color = (0.85, 0.88, 1.0)
mo = bpy.data.objects.new('moon', moon)
scene.collection.objects.link(mo)
az, el = math.radians(28.0), math.radians(10.0)
to_light = Vector((math.sin(az) * math.cos(el), math.cos(az) * math.cos(el), math.sin(el)))  # Blender: +Y = ahead
mo.rotation_euler = (-to_light).to_track_quat('-Z', 'Y').to_euler()

# a very dim cool fill from the camera side: lets the faces that look at us (the cliff tiers) read
fill = bpy.data.lights.new('fill', 'SUN')
FILL = float(os.environ.get('FILL', '0.12'))
fill.energy = FILL
fill.angle = math.radians(30.0)
fill.color = (0.7, 0.78, 1.0)
fo = bpy.data.objects.new('fill', fill)
scene.collection.objects.link(fo)
faz, fel = math.radians(-18.0), math.radians(22.0)
f_to = Vector((math.sin(faz) * math.cos(fel), -math.cos(faz) * math.cos(fel), math.sin(fel)))
fo.rotation_euler = (-f_to).to_track_quat('-Z', 'Y').to_euler()


def spot(name, pos_web, tgt_web, watts, size_deg, radius, blend=1.0, color=(1.0, 0.96, 0.9)):
    ld = bpy.data.lights.new(name, 'SPOT')
    ld.energy = watts
    ld.spot_size = math.radians(size_deg)
    ld.spot_blend = blend
    ld.shadow_soft_size = radius
    ld.color = color
    ob = bpy.data.objects.new(name, ld)
    scene.collection.objects.link(ob)
    pb_ = P @ Vector(pos_web)
    ob.location = pb_
    dd = (P @ Vector(tgt_web)) - pb_
    ob.rotation_euler = dd.to_track_quat('-Z', 'Y').to_euler()
    return ob


studio = []
if MODE == 'floor' or (MODE == 'preview' and os.environ.get('STUDIO') == '1'):  # the studio pool of light under the car
    K = float(os.environ.get('KEY', '2300'))
    studio = [
        spot('keyL', (-1.9, 6.4, -0.9), (-0.9, 0, 0.5), K, 100, 0.8),
        spot('keyR', (1.9, 6.4, -0.9), (0.9, 0, 0.5), K, 100, 0.8),
        spot('front', (0.0, 5.0, 4.2), (0.0, 0, 2.2), float(os.environ.get('FRONT', '3200')), 70, 1.6, 1.0, (1.0, 0.97, 0.93)),
    ]

# ------------------------------------------------------------------ cameras / render setup
cam = bpy.data.cameras.new('cam')
cob = bpy.data.objects.new('cam', cam)
scene.collection.objects.link(cob)
scene.camera = cob
scene.render.engine = 'CYCLES'
cy = scene.cycles
cy.use_adaptive_sampling = True
cy.use_denoising = True
cy.max_bounces = 6
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.display_settings.display_device = 'sRGB'
scene.render.film_transparent = False
scene.render.resolution_percentage = 100
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for t in ('OPTIX', 'CUDA'):
        prefs.compute_device_type = t
        (prefs.refresh_devices if hasattr(prefs, 'refresh_devices') else prefs.get_devices)()
        gpus = [x for x in prefs.devices if x.type == t]
        if gpus:
            for x in prefs.devices:
                x.use = x.type == t
            cy.device = 'GPU'
            print('render device:', t)
            break
except Exception as e:  # noqa: BLE001
    print('GPU setup failed, using CPU:', e)


def render_exr(path, samples):
    cy.samples = samples
    scene.render.image_settings.file_format = 'OPEN_EXR'
    scene.render.image_settings.color_depth = '32'
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(path)
    im.colorspace_settings.name = 'Non-Color'
    w, h = im.size
    a = np.empty(w * h * 4, dtype=np.float32)
    im.pixels.foreach_get(a)
    bpy.data.images.remove(im)
    os.remove(path)
    return a.reshape(h, w, 4)[:, :, :3].copy()


def to_srgb8(lin, dither=1.0):
    a = np.clip(lin, 0, 1)
    s = np.where(a <= 0.0031308, a * 12.92, 1.055 * np.power(a, 1 / 2.4) - 0.055)
    r = np.random.default_rng(5)
    s = s + dither * (r.random(s.shape, dtype=np.float32) + r.random(s.shape, dtype=np.float32) - 1.0) / 255.0
    return np.clip(s, 0, 1)


def save_image(srgb, path, fmt, quality=92):
    h, w = srgb.shape[:2]
    im = bpy.data.images.new('save_' + os.path.basename(path), w, h, alpha=False)
    im.colorspace_settings.name = 'Non-Color'
    im.pixels.foreach_set(np.concatenate([srgb, np.ones((h, w, 1), dtype=np.float32)], axis=2).ravel())
    scene.render.image_settings.file_format = fmt
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.image_settings.quality = quality
    if fmt == 'PNG':
        scene.render.image_settings.color_depth = '8'
    # save_render would apply colour management; the pixels are already display values, so use Standard + sRGB
    im.save_render(os.path.abspath(path), scene=scene)
    print('wrote', os.path.abspath(path))


def set_sky(strength):
    wbg.inputs['Strength'].default_value = strength * 0.5  # the sky as a light
    wbg2.inputs['Strength'].default_value = strength  # the sky as the camera sees it


os.makedirs(os.path.dirname(os.path.abspath(OUT)) if MODE == 'preview' else OUT, exist_ok=True)

if MODE == 'pano':
    cam.type = 'PANO'
    cam.panorama_type = 'EQUIRECTANGULAR'
    cam.longitude_min, cam.longitude_max = math.radians(-LON), math.radians(LON)
    cam.latitude_min, cam.latitude_max = math.radians(LAT0), math.radians(LAT1)
    cob.location = P @ Vector(CAM)
    cob.rotation_euler = (math.pi / 2, 0, 0)  # level, looking ahead (website -z)
    W = int(os.environ.get('PANO_W', '4096'))
    scene.render.resolution_x = W
    scene.render.resolution_y = round(W * (LAT1 - LAT0) / (2 * LON))
    lin = render_exr(os.path.abspath(os.path.join(OUT, '_pano.exr')), SAMPLES)
    save_image(to_srgb8(lin, 1.6), os.path.join(OUT, 'hero-sky.jpg'), 'JPEG', 90)

elif MODE == 'preview':
    az_, el_, dist_, fov = 0.0, 4.0, 10.0, 28.0
    tgt = Vector((0, 0.85, 0))
    posw = tgt + Vector((math.sin(math.radians(az_)) * math.cos(math.radians(el_)), math.sin(math.radians(el_)), math.cos(math.radians(az_)) * math.cos(math.radians(el_)))) * dist_
    cob.location = P @ posw
    cob.rotation_euler = ((P @ tgt) - (P @ posw)).to_track_quat('-Z', 'Y').to_euler()
    cam.sensor_fit = 'VERTICAL'
    cam.sensor_height = 24.0
    cam.lens = 12.0 / math.tan(math.radians(fov) / 2)
    cam.shift_y = float(os.environ.get('SHIFT', '0.22'))  # the page lifts/lowers the car with this (config.js KEYS[0].sy)
    scene.render.resolution_x = RES_X
    scene.render.resolution_y = round(RES_X * 9 / 16)
    lin = render_exr(os.path.abspath(OUT) + '.exr', SAMPLES)
    save_image(to_srgb8(lin, 1.0), OUT, 'PNG')

else:  # floor
    cam.type = 'ORTHO'
    cam.ortho_scale = PLANE_W
    cob.location = P @ Vector((0, 10, PLANE_CZ))
    cob.rotation_euler = (0, 0, 0)
    scene.render.resolution_x = RES_X
    scene.render.resolution_y = round(RES_X * PLANE_D / PLANE_W)
    S = SAMPLES

    def lights(sky, moon_on, studio_on):
        set_sky(sky)
        moon.energy = float(os.environ.get('MOON', '1.4')) if moon_on else 0.0
        fill.energy = FILL if moon_on else 0.0
        for o in studio:
            o.hide_render = not studio_on

    # 1 + 2: ground lit by sky + moon, with and without the car -> how much the car darkens it
    lights(1.0, True, False)
    with_car = render_exr(os.path.abspath(os.path.join(OUT, '_a.exr')), S)
    for o in cars:
        o.hide_render = True
    no_car = render_exr(os.path.abspath(os.path.join(OUT, '_b.exr')), S)
    for o in cars:
        o.hide_render = False
    lum = lambda a: a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)  # noqa: E731
    if os.environ.get('DEBUG'):
        save_image(to_srgb8(with_car * 3, 0), os.path.join(OUT, '_dbg_with.png'), 'PNG')
        save_image(to_srgb8(no_car * 3, 0), os.path.join(OUT, '_dbg_no.png'), 'PNG')
    ratio = np.clip(lum(with_car) / np.maximum(lum(no_car), 1e-5), 0, 1)
    for _ in range(2):  # soften the denoiser's residue
        r = np.pad(ratio, 1, mode='edge')
        ratio = sum(r[i:i + ratio.shape[0], j:j + ratio.shape[1]] for i in range(3) for j in range(3)) / 9.0

    # 3: only the studio spots (car casts, no sky): the pool of light, grain and all
    lights(0.0, False, True)
    pool = render_exr(os.path.abspath(os.path.join(OUT, '_c.exr')), S)
    h, w = pool.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    dx = (xx / (w - 1) - 0.5) * 2
    dy = (0.5 - yy / (h - 1)) * 2  # rows are stored bottom-up; dy > 0 = toward the camera
    r = np.hypot(dx / float(os.environ.get('RX', '0.21')), (dy - 0.08) / float(os.environ.get('RY', '0.36')))
    t = np.clip((r - 0.28) / 0.72, 0, 1)
    mask = (1 - t * t * (3 - 2 * t)) ** 1.35
    pool = pool * mask[..., None]
    save_image(to_srgb8(pool, 1.0), os.path.join(OUT, 'hero-floor-light.jpg'), 'JPEG', 93)
    save_image(to_srgb8(np.repeat(ratio[..., None], 3, axis=2), 0.7), os.path.join(OUT, 'hero-floor-shadow.jpg'), 'JPEG', 93)
