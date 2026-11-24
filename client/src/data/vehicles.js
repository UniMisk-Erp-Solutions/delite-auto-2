// Sample fitment catalogue (Indian market). Replace with your real fitment API later.
export const VEHICLES = {
  Car: {
    'Maruti Suzuki': ['Swift', 'Baleno', 'Dzire', 'Brezza', 'Ertiga', 'Fronx', 'Grand Vitara', 'Wagon R'],
    Hyundai: ['Creta', 'Venue', 'i20', 'Verna', 'Alcazar', 'Exter', 'Grand i10 Nios'],
    Tata: ['Nexon', 'Punch', 'Harrier', 'Safari', 'Altroz', 'Tiago', 'Curvv'],
    Mahindra: ['Thar', 'Scorpio-N', 'XUV700', 'XUV 3XO', 'Bolero', 'XUV400'],
    Toyota: ['Innova Hybrid', 'Innova Crysta', 'Fortuner', 'Urban Cruiser Hyryder', 'Glanza', 'Rumion'],
    Kia: ['Seltos', 'Sonet', 'Carens', 'Carnival'],
    Honda: ['City', 'Amaze', 'Elevate'],
    MG: ['Hector', 'Astor', 'Windsor EV', 'Comet EV'],
    Skoda: ['Slavia', 'Kushaq', 'Kylaq'],
    Volkswagen: ['Virtus', 'Taigun'],
    Renault: ['Kiger', 'Triber', 'Kwid'],
  },
  Bike: {
    'Royal Enfield': ['Classic 350', 'Hunter 350', 'Meteor 350', 'Bullet 350', 'Himalayan 450', 'Interceptor 650'],
    'Hero MotoCorp': ['Splendor Plus', 'HF Deluxe', 'Xtreme 160R', 'Xpulse 200', 'Glamour', 'Destini 125'],
    Bajaj: ['Pulsar 150', 'Pulsar NS200', 'Dominar 400', 'Platina', 'Avenger 220', 'Chetak'],
    TVS: ['Apache RTR 160', 'Apache RR 310', 'Jupiter', 'Raider 125', 'Ntorq 125', 'iQube'],
    Honda: ['Shine', 'Unicorn', 'Activa 6G', 'Hornet 2.0', 'CB350', 'Dio'],
    Yamaha: ['R15 V4', 'MT-15', 'FZ-S', 'Fascino', 'RayZR'],
    KTM: ['Duke 200', 'Duke 390', 'RC 390', 'Adventure 390'],
    Suzuki: ['Access 125', 'Gixxer SF', 'Burgman Street'],
  },
};

export const YEARS = Array.from({ length: 15 }, (_, i) => 2025 - i);

export const POPULAR = [
  { type: 'Car', brand: 'Toyota', model: 'Innova Hybrid' },
  { type: 'Car', brand: 'Hyundai', model: 'Creta' },
  { type: 'Car', brand: 'Tata', model: 'Nexon' },
  { type: 'Car', brand: 'Mahindra', model: 'Thar' },
  { type: 'Car', brand: 'Maruti Suzuki', model: 'Swift' },
  { type: 'Bike', brand: 'Royal Enfield', model: 'Classic 350' },
];

// stable pseudo-count so the button feels live without a backend
export const fitmentCount = (brand, model) => {
  let h = 0;
  for (const c of brand + model) h = (h * 31 + c.charCodeAt(0)) % 997;
  return 420 + h;
};
