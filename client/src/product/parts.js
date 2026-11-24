// How the product page understands a car model.
//
// With the separate-parts model, every object keeps its own name from Blender, and we match on
// that name (plus the names of its parents). Without it (the joined landing model) there are no
// part names, so we fall back to material names ("demo mode").
//
// To tune for your model: edit the regular expressions below. They are case-insensitive and
// match anywhere in the object name, so "Seat_Front_L", "seats" and "SEAT.001" all hit /seat/.

// Shoppable parts: solid, hoverable, each opens a product card.
// A part is recognised if its keyword appears in the OBJECT name, a PARENT object name, or a MATERIAL name.
// product = id in data/products.js, demoMaterials = material names used only in demo mode,
// leather = its leather surfaces get the same procedural leather as the landing page,
export const PART_DEFS = [
  // ORDER MATTERS: the first match wins, so specific names come before general ones.
  // ---- interior
  { id: 'seats', label: 'Nappa Seat Covers', product: 'p1', names: /seat/i, demoMaterials: ['Material.005'], leather: true },
  { id: 'headrests', label: 'Neck Rest Cushions', product: 'p16', names: /headrest/i, leather: true },
  { id: 'armrests', label: 'Leather Armrest Pads', product: 'p17', names: /armrest/i, leather: true },
  { id: 'steering', label: 'Leather Wheel Cover', product: 'p10', names: /stear|steer/i, leather: true },
  { id: 'infotainment', label: 'Smart GPS Head Unit', product: 'p3', names: /infotainment|head_unit/i },
  { id: 'cluster', label: 'Digital Cluster Upgrade', product: 'p19', names: /cluster/i },
  { id: 'gear', label: 'Leather Gear Knob', product: 'p20', names: /gear/i },
  { id: 'pedals', label: 'Aluminium Pedal Covers', product: 'p21', names: /pedal/i },
  { id: 'rearview', label: '4K Dash Camera', product: 'p4', names: /rearview|rear_view/i },
  { id: 'sills', label: 'Illuminated Door Sills', product: 'p22', names: /door_sill/i, leather: true },
  { id: 'mats', label: '7D Floor Mats', product: 'p2', names: /floor_mat/i },
  { id: 'doorcards', label: 'Door Panel Leather Wrap', product: 'p18', names: /door_card/i, leather: true },
  { id: 'cabin', label: 'Dash & Cabin Trim Kit', product: 'p13', names: /cabin|cabinet|dash|console|trim/i, demoMaterials: ['Material.007', 'Material.011', 'Material.004'], leather: true },
  // ---- exterior
  { id: 'handles', label: 'Chrome Door Handle Covers', product: 'p23', names: /door_handle/i },
  { id: 'mirrors', label: 'Chrome Mirror Covers', product: 'p15', names: /mirror|orvm/i },
  { id: 'headlights', label: 'LED Projector Headlamps', product: 'p14', names: /head[\s_.-]?(light|lamp)|headlamp/i },
  { id: 'fog', label: 'LED Fog Lamp Kit', product: 'p24', names: /fog/i },
  { id: 'grille', label: 'Chrome Front Grille', product: 'p25', names: /grille/i },
  { id: 'taillamps', label: 'Smoked LED Tail Lamps', product: 'p26', names: /tail_lamp|taillamp|backlight/i },
  { id: 'roofrails', label: 'Roof Rails & Cross Bars', product: 'p5', names: /roof_rail/i },
  { id: 'spoiler', label: 'Sport Rear Spoiler', product: 'p12', names: /spoiler/i },
  { id: 'skid', label: 'Front Skid Plate', product: 'p27', names: /skid/i },
  { id: 'alloys', label: 'Machined Alloy Wheels', product: 'p28', names: /alloy/i },
  { id: 'tyres', label: 'Premium Touring Tyres', product: 'p29', names: /tyre|tire/i },
  { id: 'discs', label: 'Drilled Brake Discs', product: 'p30', names: /brake/i },
];

// Materials that get the procedural leather (grain, creases, satin sheen). Only these surfaces of a
// leather part are treated, never its plastics. (Same material the landing page's seats use.)
export const LEATHER_MATERIALS = ['Material.005'];

// Colours of these materials were baked into vertex colours in Blender (glTF cannot carry procedural
// nodes). The exporter writes COLOR_0 on every part, so only these may use it.
export const BAKED_COLOR_MATERIALS = ['Material.003', 'Material.004', 'Material.005', 'Material.007', 'Material.009', 'Material.011'];

// Exterior shell: rendered as ghost glass so the parts inside are visible.
export const GHOST_NAMES = /body|shell|door|hood|bonnet|roof|fender|wing|bumper|trunk|tailgate|boot|panel|paint|glass|window|windscreen|windshield|pillar|skin|grille|quarter/i;
export const DEMO_GHOST = ['Material.013', 'Material.009', 'Material.003', 'Material'];

// all names from the object up to the model root, e.g. "door_fl seat_cover Cube.012"
export function nameChain(obj, root) {
  const names = [];
  for (let o = obj; o && o !== root; o = o.parent) if (o.name) names.push(o.name);
  return names.join(' ');
}

// Pins placed by hand, for things that are fused into a bigger object and cannot be told apart by
// name. Open  /product?pick , click the exact spot on the car, and paste the line it gives you here.
// These pins open their card on hover/tap of the pin itself (the part is not highlighted).
//
//   { id: 'sunroof', label: 'Sunroof Shade Kit', product: 'p1', p: [0.12, 1.51, 0.0] },
export const MANUAL_PINS = [
  // paste picked points here
];
