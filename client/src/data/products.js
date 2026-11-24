// Sample catalogue. `art` picks the built-in vector illustration; set `image` to a real
// photo path (e.g. '/products/seat-cover.jpg') and it replaces the art automatically.
export const PRODUCTS = [
  { id: 'p1', name: 'Premium Nappa Leatherette Seat Covers', cat: 'Interior', art: 'seat', price: 8499, mrp: 11999, rating: 4.8, reviews: 2184, badge: 'Bestseller' },
  { id: 'p2', name: '7D Full-Coverage Floor Mats (Set of 5)', cat: 'Interior', art: 'mats', price: 3299, mrp: 4799, rating: 4.7, reviews: 1672, badge: '-31%' },
  { id: 'p3', name: 'Smart Android GPS Head Unit 9" with 4G', cat: 'Electronics', art: 'gps', price: 14999, mrp: 19999, rating: 4.6, reviews: 934, badge: 'New' },
  { id: 'p4', name: '4K Dual-Channel Dash Camera with Night Vision', cat: 'Electronics', art: 'dashcam', price: 5499, mrp: 7999, rating: 4.7, reviews: 1290, badge: 'Top rated' },
  { id: 'p5', name: 'Aerodynamic Roof Carrier Box 400L', cat: 'Exterior', art: 'roof', price: 7999, mrp: 10499, rating: 4.5, reviews: 412 },
  { id: 'p6', name: '64-Colour App-Controlled Ambient Light Kit', cat: 'Lighting', art: 'led', price: 2299, mrp: 3499, rating: 4.6, reviews: 1503, badge: 'Trending' },
  { id: 'p7', name: 'Wireless CarPlay & Android Auto Adapter', cat: 'Electronics', art: 'carplay', price: 3799, mrp: 4999, rating: 4.4, reviews: 877 },
  { id: 'p8', name: 'Cordless Car Vacuum Cleaner 12000Pa', cat: 'Car Care', art: 'vacuum', price: 1999, mrp: 2999, rating: 4.5, reviews: 2210, badge: '-33%' },
  { id: 'p9', name: 'Digital Tyre Inflator, Auto Cut-off', cat: 'Car Care', art: 'inflator', price: 1899, mrp: 2599, rating: 4.6, reviews: 1988 },
  { id: 'p10', name: 'Hand-Stitched Leather Steering Wheel Cover', cat: 'Interior', art: 'wheel', price: 1499, mrp: 2199, rating: 4.5, reviews: 1346 },
  { id: 'p11', name: 'Reverse Parking Sensors with LED Display', cat: 'Electronics', art: 'sensors', price: 2499, mrp: 3299, rating: 4.4, reviews: 1021 },
  { id: 'p12', name: 'Sport Rear Spoiler, Gloss Black', cat: 'Exterior', art: 'spoiler', price: 3499, mrp: 4999, rating: 4.3, reviews: 586, badge: 'New' },
  // used by the 3D product page (kept after the first twelve so the landing grid is unchanged)
  { id: 'p13', name: 'Premium Dash & Cabin Trim Kit', cat: 'Interior', art: 'dash', price: 5999, mrp: 8499, rating: 4.6, reviews: 742, badge: 'New' },
  { id: 'p14', name: 'LED Projector Headlamps, Sequential DRL', cat: 'Lighting', art: 'headlamp', price: 11999, mrp: 15999, rating: 4.7, reviews: 1031, badge: 'Top rated' },
  { id: 'p15', name: 'Chrome Side Mirror Covers (Pair)', cat: 'Exterior', art: 'mirror', price: 1799, mrp: 2599, rating: 4.4, reviews: 864 },
  // parts of the 3D product page
  { id: 'p16', name: 'Memory-Foam Neck Rest Pair', cat: 'Interior', art: 'cushion', price: 1299, mrp: 1899, rating: 4.5, reviews: 912 },
  { id: 'p17', name: 'Leather Centre Armrest Pad', cat: 'Interior', art: 'armrest', price: 1799, mrp: 2499, rating: 4.4, reviews: 603 },
  { id: 'p18', name: 'Door Panel Leather Wrap Kit', cat: 'Interior', art: 'panel', price: 6499, mrp: 8999, rating: 4.5, reviews: 288, badge: 'New' },
  { id: 'p19', name: 'Digital Instrument Cluster Upgrade', cat: 'Electronics', art: 'cluster', price: 12999, mrp: 16999, rating: 4.5, reviews: 214 },
  { id: 'p20', name: 'Leather Gear Knob & Gaiter', cat: 'Interior', art: 'gear', price: 1299, mrp: 1799, rating: 4.6, reviews: 774 },
  { id: 'p21', name: 'Anti-Slip Aluminium Pedal Cover Set', cat: 'Interior', art: 'pedal', price: 1499, mrp: 2199, rating: 4.5, reviews: 1203 },
  { id: 'p22', name: 'Illuminated Door Sill Plates (Set of 4)', cat: 'Interior', art: 'sill', price: 2899, mrp: 3999, rating: 4.6, reviews: 655, badge: 'Trending' },
  { id: 'p23', name: 'Chrome Door Handle Covers (Set of 4)', cat: 'Exterior', art: 'handle', price: 1199, mrp: 1799, rating: 4.4, reviews: 1410 },
  { id: 'p24', name: 'LED Fog Lamp Kit, 6000K', cat: 'Lighting', art: 'fog', price: 3299, mrp: 4599, rating: 4.6, reviews: 889 },
  { id: 'p25', name: 'Chrome Honeycomb Front Grille', cat: 'Exterior', art: 'grille', price: 6999, mrp: 9499, rating: 4.5, reviews: 377 },
  { id: 'p26', name: 'Smoked LED Tail Lamp Set', cat: 'Lighting', art: 'taillamp', price: 9999, mrp: 13499, rating: 4.6, reviews: 301 },
  { id: 'p27', name: 'Front Bumper Skid Plate, Steel', cat: 'Exterior', art: 'skid', price: 4299, mrp: 5999, rating: 4.4, reviews: 342 },
  { id: 'p28', name: '18-inch Machined Alloy Wheels (Set of 4)', cat: 'Exterior', art: 'alloy', price: 42999, mrp: 54999, rating: 4.7, reviews: 156, badge: 'Top rated' },
  { id: 'p29', name: 'Premium Touring Tyres 215/55 R17 (Set of 4)', cat: 'Exterior', art: 'tyre', price: 24999, mrp: 31999, rating: 4.6, reviews: 498 },
  { id: 'p30', name: 'Drilled & Slotted Brake Disc Set', cat: 'Exterior', art: 'disc', price: 11999, mrp: 15999, rating: 4.7, reviews: 188 },
];

export const CATEGORIES = [
  { id: 'exterior', name: 'Exterior', count: 1240, blurb: 'Grilles, guards, spoilers', icon: 'car' },
  { id: 'interior', name: 'Interior', count: 2160, blurb: 'Seats, mats, steering', icon: 'seat' },
  { id: 'lighting', name: 'Lighting', count: 680, blurb: 'LED, DRLs, ambient', icon: 'bulb' },
  { id: 'electronics', name: 'Electronics & GPS', count: 540, blurb: 'Head units, cameras', icon: 'chip' },
  { id: 'care', name: 'Car Care', count: 920, blurb: 'Clean, polish, protect', icon: 'drop' },
  { id: 'safety', name: 'Safety & Performance', count: 410, blurb: 'Sensors, kits, filters', icon: 'shield' },
];

export const inr = (n) => '₹' + new Intl.NumberFormat('en-IN').format(n);
export const off = (p) => Math.round((1 - p.price / p.mrp) * 100);
