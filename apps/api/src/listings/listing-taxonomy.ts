export type StandardCategorySeed = {
  name: string;
  slug: string;
  icon: string;
  order: number;
};

export type ListingAttributeValue = string | number | boolean;

export type ListingAttributes = Record<string, ListingAttributeValue>;

export type ListingFeatureFieldType = 'text' | 'number' | 'select' | 'boolean';

export interface ListingFeatureDefinition {
  key: string;
  label: string;
  type: ListingFeatureFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  min?: number;
  max?: number;
  unit?: string;
}

export interface ListingSubcategoryDefinition {
  slug: string;
  name: string;
  minPrice: number;
  features: ListingFeatureDefinition[];
}

export interface ListingCategoryDefinition extends StandardCategorySeed {
  minPrice: number;
  subcategories: ListingSubcategoryDefinition[];
}

const required = true;

export const LISTING_CATEGORY_DEFINITIONS: ListingCategoryDefinition[] = [
  {
    name: 'Mobile Phones',
    slug: 'mobiles',
    icon: '\u{1F4F1}',
    order: 1,
    minPrice: 1500,
    subcategories: [
      {
        slug: 'smartphones',
        name: 'Smartphones',
        minPrice: 5000,
        features: [
          { key: 'brand', label: 'Brand', type: 'text', required, placeholder: 'Samsung, Infinix, Apple' },
          { key: 'model', label: 'Model', type: 'text', required, placeholder: 'iPhone 13, Redmi Note 12' },
          { key: 'storageGb', label: 'Storage (GB)', type: 'number', required, min: 1, max: 2048 },
          { key: 'ramGb', label: 'RAM (GB)', type: 'number', required, min: 1, max: 64 },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used', 'Open Box', 'Refurbished'] },
          { key: 'ptaApproved', label: 'PTA Approved', type: 'boolean', required },
        ],
      },
      {
        slug: 'feature-phones',
        name: 'Feature Phones',
        minPrice: 1500,
        features: [
          { key: 'brand', label: 'Brand', type: 'text', required },
          { key: 'model', label: 'Model', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
          { key: 'battery', label: 'Battery', type: 'text', required, placeholder: 'Original / 2000 mAh' },
        ],
      },
      {
        slug: 'tablets',
        name: 'Tablets',
        minPrice: 7000,
        features: [
          { key: 'brand', label: 'Brand', type: 'text', required },
          { key: 'model', label: 'Model', type: 'text', required },
          { key: 'storageGb', label: 'Storage', type: 'number', required, min: 1, max: 2048 },
          { key: 'connectivity', label: 'WiFi/SIM', type: 'select', required, options: ['WiFi', 'SIM', 'WiFi + SIM'] },
        ],
      },
      {
        slug: 'mobile-accessories',
        name: 'Mobile Accessories',
        minPrice: 300,
        features: [
          { key: 'type', label: 'Type', type: 'text', required, placeholder: 'Charger, Cover, Handsfree' },
          { key: 'brand', label: 'Brand', type: 'text', required },
          { key: 'compatibleModel', label: 'Compatible Model', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'spare-parts',
        name: 'Spare Parts',
        minPrice: 500,
        features: [
          { key: 'partName', label: 'Part Name', type: 'text', required },
          { key: 'compatibleModel', label: 'Compatible Model', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
    ],
  },
  {
    name: 'Cars',
    slug: 'cars',
    icon: '\u{1F697}',
    order: 2,
    minPrice: 50000,
    subcategories: [
      {
        slug: 'sedans',
        name: 'Sedans',
        minPrice: 500000,
        features: [
          { key: 'make', label: 'Make', type: 'text', required },
          { key: 'model', label: 'Model', type: 'text', required },
          { key: 'year', label: 'Year', type: 'number', required, min: 1980, max: 2100 },
          { key: 'kmDriven', label: 'KM Driven', type: 'number', required, min: 0, max: 2000000 },
          { key: 'fuel', label: 'Fuel', type: 'select', required, options: ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'CNG'] },
          { key: 'transmission', label: 'Transmission', type: 'select', required, options: ['Manual', 'Automatic'] },
          { key: 'color', label: 'Color', type: 'text', required },
        ],
      },
      {
        slug: 'suvs-jeeps',
        name: 'SUVs & Jeeps',
        minPrice: 900000,
        features: [
          { key: 'make', label: 'Make', type: 'text', required },
          { key: 'model', label: 'Model', type: 'text', required },
          { key: 'year', label: 'Year', type: 'number', required, min: 1980, max: 2100 },
          { key: 'kmDriven', label: 'KM Driven', type: 'number', required, min: 0, max: 2000000 },
          { key: 'fourByFour', label: '4x4', type: 'boolean', required },
          { key: 'fuel', label: 'Fuel', type: 'select', required, options: ['Petrol', 'Diesel', 'Hybrid', 'Electric'] },
        ],
      },
      {
        slug: 'vans-minivans',
        name: 'Vans & Minivans',
        minPrice: 700000,
        features: [
          { key: 'make', label: 'Make', type: 'text', required },
          { key: 'model', label: 'Model', type: 'text', required },
          { key: 'year', label: 'Year', type: 'number', required, min: 1980, max: 2100 },
          { key: 'seats', label: 'Seats', type: 'number', required, min: 2, max: 30 },
          { key: 'kmDriven', label: 'KM Driven', type: 'number', required, min: 0, max: 2000000 },
        ],
      },
      {
        slug: 'pickup-trucks',
        name: 'Pickup Trucks',
        minPrice: 900000,
        features: [
          { key: 'make', label: 'Make', type: 'text', required },
          { key: 'model', label: 'Model', type: 'text', required },
          { key: 'year', label: 'Year', type: 'number', required, min: 1980, max: 2100 },
          { key: 'payloadKg', label: 'Payload (KG)', type: 'number', required, min: 100, max: 10000 },
          { key: 'kmDriven', label: 'KM Driven', type: 'number', required, min: 0, max: 2000000 },
        ],
      },
      {
        slug: 'hatchbacks',
        name: 'Hatchbacks',
        minPrice: 450000,
        features: [
          { key: 'make', label: 'Make', type: 'text', required },
          { key: 'model', label: 'Model', type: 'text', required },
          { key: 'year', label: 'Year', type: 'number', required, min: 1980, max: 2100 },
          { key: 'kmDriven', label: 'KM Driven', type: 'number', required, min: 0, max: 2000000 },
          { key: 'fuel', label: 'Fuel', type: 'select', required, options: ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'CNG'] },
          { key: 'transmission', label: 'Transmission', type: 'select', required, options: ['Manual', 'Automatic'] },
        ],
      },
      {
        slug: 'crossovers',
        name: 'Crossovers',
        minPrice: 850000,
        features: [
          { key: 'make', label: 'Make', type: 'text', required },
          { key: 'model', label: 'Model', type: 'text', required },
          { key: 'year', label: 'Year', type: 'number', required, min: 1980, max: 2100 },
          { key: 'kmDriven', label: 'KM Driven', type: 'number', required, min: 0, max: 2000000 },
          { key: 'fuel', label: 'Fuel', type: 'select', required, options: ['Petrol', 'Diesel', 'Hybrid', 'Electric'] },
          { key: 'transmission', label: 'Transmission', type: 'select', required, options: ['Manual', 'Automatic'] },
        ],
      },
      {
        slug: 'coupes-sports',
        name: 'Coupes & Sports',
        minPrice: 1500000,
        features: [
          { key: 'make', label: 'Make', type: 'text', required },
          { key: 'model', label: 'Model', type: 'text', required },
          { key: 'year', label: 'Year', type: 'number', required, min: 1980, max: 2100 },
          { key: 'kmDriven', label: 'KM Driven', type: 'number', required, min: 0, max: 2000000 },
          { key: 'fuel', label: 'Fuel', type: 'select', required, options: ['Petrol', 'Hybrid', 'Electric'] },
          { key: 'transmission', label: 'Transmission', type: 'select', required, options: ['Manual', 'Automatic'] },
        ],
      },
      {
        slug: 'hybrid-electric',
        name: 'Hybrid & Electric',
        minPrice: 1200000,
        features: [
          { key: 'make', label: 'Make', type: 'text', required },
          { key: 'model', label: 'Model', type: 'text', required },
          { key: 'year', label: 'Year', type: 'number', required, min: 1980, max: 2100 },
          { key: 'rangeKm', label: 'Range (KM)', type: 'number', required, min: 40, max: 1200 },
          { key: 'batteryHealth', label: 'Battery Health %', type: 'number', required, min: 1, max: 100 },
          { key: 'chargingTime', label: 'Charging Time', type: 'text', required, placeholder: 'Fast 45 min / Home 6 hrs' },
        ],
      },
      {
        slug: 'car-spare-parts',
        name: 'Spare Parts',
        minPrice: 1000,
        features: [
          { key: 'partName', label: 'Part Name', type: 'text', required },
          { key: 'compatibleMakeModel', label: 'Compatible Make/Model', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'car-accessories',
        name: 'Accessories',
        minPrice: 800,
        features: [
          { key: 'type', label: 'Type', type: 'text', required },
          { key: 'compatibleCar', label: 'Compatible Car', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
    ],
  },
  {
    name: 'Property',
    slug: 'property',
    icon: '\u{1F3E0}',
    order: 3,
    minPrice: 10000,
    subcategories: [
      {
        slug: 'house-for-sale',
        name: 'House for Sale',
        minPrice: 1000000,
        features: [
          { key: 'bedrooms', label: 'Bedrooms', type: 'number', required, min: 1, max: 20 },
          { key: 'bathrooms', label: 'Bathrooms', type: 'number', required, min: 1, max: 20 },
          { key: 'areaMarla', label: 'Area (Marla)', type: 'number', required, min: 1, max: 2000 },
          { key: 'cityName', label: 'City', type: 'text', required },
          { key: 'society', label: 'Society', type: 'text', required },
        ],
      },
      {
        slug: 'flat-apartment',
        name: 'Flat/Apartment',
        minPrice: 25000,
        features: [
          { key: 'floor', label: 'Floor', type: 'number', required, min: 0, max: 200 },
          { key: 'bedrooms', label: 'Bedrooms', type: 'number', required, min: 1, max: 20 },
          { key: 'areaSqft', label: 'Area (Sqft)', type: 'number', required, min: 100, max: 50000 },
          { key: 'furnished', label: 'Furnished', type: 'boolean', required },
        ],
      },
      {
        slug: 'plot-for-sale',
        name: 'Plot for Sale',
        minPrice: 300000,
        features: [
          { key: 'areaMarla', label: 'Area (Marla)', type: 'number', required, min: 1, max: 2000 },
          { key: 'plotType', label: 'Type', type: 'select', required, options: ['Residential', 'Commercial'] },
          { key: 'society', label: 'Society', type: 'text', required },
        ],
      },
      {
        slug: 'commercial',
        name: 'Commercial',
        minPrice: 50000,
        features: [
          { key: 'commercialType', label: 'Type', type: 'text', required, placeholder: 'Shop, Office, Hall' },
          { key: 'areaSqft', label: 'Area (Sqft)', type: 'number', required, min: 100, max: 50000 },
          { key: 'floor', label: 'Floor', type: 'number', required, min: 0, max: 200 },
          { key: 'usage', label: 'Usage', type: 'text', required },
        ],
      },
      {
        slug: 'room-for-rent',
        name: 'Room for Rent',
        minPrice: 4000,
        features: [
          { key: 'furnished', label: 'Furnished', type: 'boolean', required },
          { key: 'attachedBath', label: 'Attached Bath', type: 'boolean', required },
          { key: 'floor', label: 'Floor', type: 'number', required, min: 0, max: 200 },
        ],
      },
      {
        slug: 'pg-hostel',
        name: 'PG/Hostel',
        minPrice: 5000,
        features: [
          { key: 'gender', label: 'Gender', type: 'select', required, options: ['Male', 'Female', 'Mixed'] },
          { key: 'meals', label: 'Meals', type: 'boolean', required },
          { key: 'ac', label: 'AC', type: 'boolean', required },
          { key: 'monthlyRent', label: 'Monthly Rent', type: 'number', required, min: 1000, max: 1000000 },
        ],
      },
    ],
  },
  {
    name: 'Electronics',
    slug: 'electronics',
    icon: '\u{1F4BB}',
    order: 4,
    minPrice: 1000,
    subcategories: [
      {
        slug: 'laptops',
        name: 'Laptops',
        minPrice: 12000,
        features: [
          { key: 'brand', label: 'Brand', type: 'text', required },
          { key: 'model', label: 'Model', type: 'text', required },
          { key: 'ramGb', label: 'RAM', type: 'number', required, min: 2, max: 128 },
          { key: 'storage', label: 'Storage', type: 'text', required, placeholder: '256GB SSD' },
          { key: 'processor', label: 'Processor', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used', 'Refurbished'] },
        ],
      },
      {
        slug: 'desktops-pcs',
        name: 'Desktops/PCs',
        minPrice: 15000,
        features: [
          { key: 'brand', label: 'Brand', type: 'text', required },
          { key: 'ramGb', label: 'RAM', type: 'number', required, min: 2, max: 256 },
          { key: 'storage', label: 'Storage', type: 'text', required },
          { key: 'processor', label: 'Processor', type: 'text', required },
          { key: 'gpu', label: 'GPU', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'monitors',
        name: 'Monitors',
        minPrice: 4000,
        features: [
          { key: 'brand', label: 'Brand', type: 'text', required },
          { key: 'sizeInch', label: 'Size (inch)', type: 'number', required, min: 10, max: 100 },
          { key: 'resolution', label: 'Resolution', type: 'text', required },
          { key: 'panelType', label: 'Panel Type', type: 'select', required, options: ['IPS', 'VA', 'TN', 'OLED'] },
        ],
      },
      {
        slug: 'cameras',
        name: 'Cameras',
        minPrice: 10000,
        features: [
          { key: 'brand', label: 'Brand', type: 'text', required },
          { key: 'model', label: 'Model', type: 'text', required },
          { key: 'cameraType', label: 'Type', type: 'select', required, options: ['DSLR', 'Mirrorless', 'Compact', 'Action Cam'] },
          { key: 'megapixels', label: 'Megapixels', type: 'number', required, min: 1, max: 200 },
        ],
      },
      {
        slug: 'tvs',
        name: 'TVs',
        minPrice: 8000,
        features: [
          { key: 'brand', label: 'Brand', type: 'text', required },
          { key: 'sizeInch', label: 'Size', type: 'number', required, min: 10, max: 120 },
          { key: 'tvType', label: 'Type', type: 'select', required, options: ['LED', 'OLED', 'QLED', 'Smart TV'] },
          { key: 'resolution', label: 'Resolution', type: 'select', required, options: ['HD', 'Full HD', '4K', '8K'] },
        ],
      },
      {
        slug: 'audio',
        name: 'Audio',
        minPrice: 1200,
        features: [
          { key: 'type', label: 'Type', type: 'text', required, placeholder: 'Speaker, Soundbar, Earbuds' },
          { key: 'brand', label: 'Brand', type: 'text', required },
          { key: 'model', label: 'Model', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'gaming',
        name: 'Gaming',
        minPrice: 5000,
        features: [
          { key: 'type', label: 'Type', type: 'text', required, placeholder: 'Console, Controller, VR' },
          { key: 'brand', label: 'Brand', type: 'text', required },
          { key: 'model', label: 'Model', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'printers',
        name: 'Printers',
        minPrice: 2500,
        features: [
          { key: 'brand', label: 'Brand', type: 'text', required },
          { key: 'printerType', label: 'Type', type: 'select', required, options: ['Inkjet', 'Laser', 'Thermal'] },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'ups-inverter',
        name: 'UPS/Inverter',
        minPrice: 6000,
        features: [
          { key: 'brand', label: 'Brand', type: 'text', required },
          { key: 'capacityKva', label: 'Capacity (KVA)', type: 'number', required, min: 1, max: 50 },
          { key: 'batteryIncluded', label: 'Battery Included', type: 'boolean', required },
        ],
      },
      {
        slug: 'ac-appliances',
        name: 'AC/Appliances',
        minPrice: 5000,
        features: [
          { key: 'brand', label: 'Brand', type: 'text', required },
          { key: 'capacityOrSize', label: 'Capacity/Size', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
          { key: 'applianceType', label: 'Type', type: 'text', required, placeholder: 'AC, Fridge, Microwave' },
        ],
      },
    ],
  },
  {
    name: 'Furniture',
    slug: 'furniture',
    icon: '\u{1F6CB}\uFE0F',
    order: 5,
    minPrice: 1000,
    subcategories: [
      {
        slug: 'sofa-couch',
        name: 'Sofa/Couch',
        minPrice: 6000,
        features: [
          { key: 'seats', label: 'Seats', type: 'number', required, min: 1, max: 20 },
          { key: 'material', label: 'Material', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
          { key: 'folding', label: 'Folding', type: 'boolean', required },
        ],
      },
      {
        slug: 'bed',
        name: 'Bed',
        minPrice: 5000,
        features: [
          { key: 'size', label: 'Size', type: 'select', required, options: ['Single', 'Double', 'Queen', 'King'] },
          { key: 'material', label: 'Material', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'dining-table',
        name: 'Dining Table',
        minPrice: 7000,
        features: [
          { key: 'chairsIncluded', label: 'Chairs Included', type: 'boolean', required },
          { key: 'material', label: 'Material', type: 'text', required },
          { key: 'seats', label: 'Seats', type: 'number', required, min: 1, max: 20 },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'wardrobe',
        name: 'Wardrobe',
        minPrice: 4500,
        features: [
          { key: 'doors', label: 'Doors', type: 'number', required, min: 1, max: 10 },
          { key: 'material', label: 'Material', type: 'text', required },
          { key: 'mirror', label: 'Mirror', type: 'boolean', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'office-furniture',
        name: 'Office Furniture',
        minPrice: 2000,
        features: [
          { key: 'type', label: 'Type', type: 'text', required },
          { key: 'material', label: 'Material', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'kids-furniture',
        name: 'Kids Furniture',
        minPrice: 2500,
        features: [
          { key: 'type', label: 'Type', type: 'text', required },
          { key: 'material', label: 'Material', type: 'text', required },
          { key: 'ageGroup', label: 'Age Group', type: 'text', required, placeholder: '3-6 years' },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'outdoor-furniture',
        name: 'Outdoor Furniture',
        minPrice: 3500,
        features: [
          { key: 'type', label: 'Type', type: 'text', required },
          { key: 'material', label: 'Material', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
    ],
  },
  {
    name: 'Motorcycles',
    slug: 'motorcycles',
    icon: '\u{1F3CD}\uFE0F',
    order: 6,
    minPrice: 25000,
    subcategories: [
      {
        slug: 'standard-bikes',
        name: 'Standard Bikes',
        minPrice: 50000,
        features: [
          { key: 'make', label: 'Make', type: 'text', required },
          { key: 'model', label: 'Model', type: 'text', required },
          { key: 'year', label: 'Year', type: 'number', required, min: 1980, max: 2100 },
          { key: 'cc', label: 'CC', type: 'number', required, min: 50, max: 2000 },
          { key: 'kmDriven', label: 'KM Driven', type: 'number', required, min: 0, max: 2000000 },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'sports-bikes',
        name: 'Sports Bikes',
        minPrice: 250000,
        features: [
          { key: 'make', label: 'Make', type: 'text', required },
          { key: 'model', label: 'Model', type: 'text', required },
          { key: 'year', label: 'Year', type: 'number', required, min: 1980, max: 2100 },
          { key: 'cc', label: 'CC', type: 'number', required, min: 125, max: 2000 },
          { key: 'kmDriven', label: 'KM Driven', type: 'number', required, min: 0, max: 2000000 },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'scooters',
        name: 'Scooters',
        minPrice: 25000,
        features: [
          { key: 'make', label: 'Make', type: 'text', required },
          { key: 'model', label: 'Model', type: 'text', required },
          { key: 'year', label: 'Year', type: 'number', required, min: 1980, max: 2100 },
          { key: 'cc', label: 'CC', type: 'number', required, min: 50, max: 1500 },
          { key: 'kmDriven', label: 'KM Driven', type: 'number', required, min: 0, max: 2000000 },
        ],
      },
      {
        slug: 'electric-motorcycles',
        name: 'Electric Motorcycles',
        minPrice: 40000,
        features: [
          { key: 'brand', label: 'Brand', type: 'text', required },
          { key: 'rangeKm', label: 'Range (KM)', type: 'number', required, min: 5, max: 1000 },
          { key: 'battery', label: 'Battery', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'motorcycle-spare-parts',
        name: 'Motorcycle Spare Parts',
        minPrice: 500,
        features: [
          { key: 'partName', label: 'Part Name', type: 'text', required },
          { key: 'compatibleModel', label: 'Compatible Model', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'motorcycle-accessories',
        name: 'Motorcycle Accessories',
        minPrice: 500,
        features: [
          { key: 'type', label: 'Type', type: 'text', required },
          { key: 'compatibleVehicle', label: 'Compatible Vehicle', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
    ],
  },
  {
    name: 'Cycles & Bikes',
    slug: 'cycles',
    icon: '\u{1F6B2}',
    order: 7,
    minPrice: 2000,
    subcategories: [
      {
        slug: 'bicycles',
        name: 'Bicycles',
        minPrice: 5000,
        features: [
          { key: 'bikeType', label: 'Type', type: 'text', required, placeholder: 'Mountain, Road, Kids' },
          { key: 'size', label: 'Size', type: 'text', required },
          { key: 'brand', label: 'Brand', type: 'text', required },
          { key: 'gears', label: 'Gears', type: 'number', required, min: 1, max: 30 },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'cycle-spare-parts',
        name: 'Cycle Spare Parts',
        minPrice: 500,
        features: [
          { key: 'partName', label: 'Part Name', type: 'text', required },
          { key: 'compatibleModel', label: 'Compatible Model', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'cycle-accessories',
        name: 'Cycle Accessories',
        minPrice: 500,
        features: [
          { key: 'type', label: 'Type', type: 'text', required },
          { key: 'compatibleVehicle', label: 'Compatible Vehicle', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
    ],
  },
  {
    name: 'Fashion',
    slug: 'fashion',
    icon: '\u{1F455}',
    order: 8,
    minPrice: 500,
    subcategories: [
      {
        slug: 'mens-clothing',
        name: "Men's Clothing",
        minPrice: 700,
        features: [
          { key: 'type', label: 'Type', type: 'text', required },
          { key: 'size', label: 'Size', type: 'text', required },
          { key: 'brand', label: 'Brand', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'womens-clothing',
        name: "Women's Clothing",
        minPrice: 700,
        features: [
          { key: 'type', label: 'Type', type: 'text', required },
          { key: 'size', label: 'Size', type: 'text', required },
          { key: 'brand', label: 'Brand', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'kids-clothing',
        name: 'Kids Clothing',
        minPrice: 500,
        features: [
          { key: 'type', label: 'Type', type: 'text', required },
          { key: 'ageGroup', label: 'Age Group', type: 'text', required },
          { key: 'brand', label: 'Brand', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'shoes',
        name: 'Shoes',
        minPrice: 800,
        features: [
          { key: 'type', label: 'Type', type: 'text', required },
          { key: 'size', label: 'Size', type: 'text', required },
          { key: 'brand', label: 'Brand', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'bags-wallets',
        name: 'Bags & Wallets',
        minPrice: 600,
        features: [
          { key: 'type', label: 'Type', type: 'text', required },
          { key: 'brand', label: 'Brand', type: 'text', required },
          { key: 'material', label: 'Material', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'watches',
        name: 'Watches',
        minPrice: 1000,
        features: [
          { key: 'brand', label: 'Brand', type: 'text', required },
          { key: 'watchType', label: 'Type', type: 'select', required, options: ['Analog', 'Digital', 'Smart Watch'] },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'jewelry',
        name: 'Jewelry',
        minPrice: 1200,
        features: [
          { key: 'type', label: 'Type', type: 'text', required },
          { key: 'material', label: 'Material', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
    ],
  },
  {
    name: 'Books',
    slug: 'books',
    icon: '\u{1F4DA}',
    order: 9,
    minPrice: 200,
    subcategories: [
      {
        slug: 'school-books',
        name: 'School Books',
        minPrice: 300,
        features: [
          { key: 'grade', label: 'Grade', type: 'text', required },
          { key: 'subject', label: 'Subject', type: 'text', required },
          { key: 'board', label: 'Board', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'university-books',
        name: 'University Books',
        minPrice: 500,
        features: [
          { key: 'subject', label: 'Subject', type: 'text', required },
          { key: 'university', label: 'University', type: 'text', required },
          { key: 'edition', label: 'Edition', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'novels-fiction',
        name: 'Novels & Fiction',
        minPrice: 300,
        features: [
          { key: 'language', label: 'Language', type: 'text', required },
          { key: 'author', label: 'Author', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'islamic-books',
        name: 'Islamic Books',
        minPrice: 300,
        features: [
          { key: 'bookType', label: 'Type', type: 'text', required },
          { key: 'language', label: 'Language', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'magazines',
        name: 'Magazines',
        minPrice: 200,
        features: [
          { key: 'title', label: 'Title', type: 'text', required },
          { key: 'issue', label: 'Issue', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'stationery',
        name: 'Stationery',
        minPrice: 200,
        features: [
          { key: 'type', label: 'Type', type: 'text', required },
          { key: 'brand', label: 'Brand', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
    ],
  },
  {
    name: 'Pets',
    slug: 'pets',
    icon: '\u{1F43E}',
    order: 10,
    minPrice: 1000,
    subcategories: [
      {
        slug: 'dogs',
        name: 'Dogs',
        minPrice: 5000,
        features: [
          { key: 'breed', label: 'Breed', type: 'text', required },
          { key: 'age', label: 'Age', type: 'text', required },
          { key: 'gender', label: 'Gender', type: 'select', required, options: ['Male', 'Female'] },
          { key: 'vaccinated', label: 'Vaccinated', type: 'boolean', required },
        ],
      },
      {
        slug: 'cats',
        name: 'Cats',
        minPrice: 3000,
        features: [
          { key: 'breed', label: 'Breed', type: 'text', required },
          { key: 'age', label: 'Age', type: 'text', required },
          { key: 'gender', label: 'Gender', type: 'select', required, options: ['Male', 'Female'] },
          { key: 'vaccinated', label: 'Vaccinated', type: 'boolean', required },
        ],
      },
      {
        slug: 'birds',
        name: 'Birds',
        minPrice: 1500,
        features: [
          { key: 'species', label: 'Type/Species', type: 'text', required },
          { key: 'age', label: 'Age', type: 'text', required },
          { key: 'gender', label: 'Gender', type: 'select', required, options: ['Male', 'Female', 'Unknown'] },
          { key: 'cageIncluded', label: 'Cage Included', type: 'boolean', required },
        ],
      },
      {
        slug: 'fish-aquarium',
        name: 'Fish & Aquarium',
        minPrice: 1200,
        features: [
          { key: 'species', label: 'Species', type: 'text', required },
          { key: 'tankSize', label: 'Tank Size', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
      {
        slug: 'pet-food',
        name: 'Pet Food',
        minPrice: 500,
        features: [
          { key: 'type', label: 'Type', type: 'text', required },
          { key: 'brand', label: 'Brand', type: 'text', required },
          { key: 'weight', label: 'Weight', type: 'text', required },
          { key: 'expiry', label: 'Expiry', type: 'text', required, placeholder: '2026-12' },
        ],
      },
      {
        slug: 'pet-accessories',
        name: 'Pet Accessories',
        minPrice: 400,
        features: [
          { key: 'type', label: 'Type', type: 'text', required },
          { key: 'compatiblePet', label: 'Compatible Pet', type: 'text', required },
          { key: 'conditionDetail', label: 'Condition', type: 'select', required, options: ['New', 'Used'] },
        ],
      },
    ],
  },
  {
    name: 'Services',
    slug: 'services',
    icon: '\u2699\uFE0F',
    order: 11,
    minPrice: 500,
    subcategories: [
      {
        slug: 'home-repairs',
        name: 'Home Repairs',
        minPrice: 1500,
        features: [
          { key: 'serviceType', label: 'Service Type', type: 'text', required },
          { key: 'areaCoverage', label: 'Area Coverage', type: 'text', required },
          { key: 'experienceYears', label: 'Experience', type: 'number', required, min: 0, max: 60, unit: 'years' },
        ],
      },
      {
        slug: 'tutoring',
        name: 'Tutoring',
        minPrice: 1000,
        features: [
          { key: 'subject', label: 'Subject', type: 'text', required },
          { key: 'level', label: 'Level', type: 'text', required },
          { key: 'mode', label: 'Online/Physical', type: 'select', required, options: ['Online', 'Physical', 'Hybrid'] },
          { key: 'rate', label: 'Rate', type: 'text', required, placeholder: 'Per hour / per month' },
        ],
      },
      {
        slug: 'driver-services',
        name: 'Driver Services',
        minPrice: 2000,
        features: [
          { key: 'driverType', label: 'Type', type: 'text', required, placeholder: 'Personal, Ride, Delivery' },
          { key: 'license', label: 'License', type: 'select', required, options: ['LTV', 'HTV', 'Bike', 'Other'] },
          { key: 'experienceYears', label: 'Experience', type: 'number', required, min: 0, max: 60, unit: 'years' },
          { key: 'availability', label: 'Availability', type: 'text', required },
        ],
      },
      {
        slug: 'beauty-salon',
        name: 'Beauty & Salon',
        minPrice: 1000,
        features: [
          { key: 'serviceType', label: 'Service Type', type: 'text', required },
          { key: 'homeVisit', label: 'Home Visit', type: 'boolean', required },
          { key: 'experienceYears', label: 'Experience', type: 'number', required, min: 0, max: 60, unit: 'years' },
        ],
      },
      {
        slug: 'photography',
        name: 'Photography',
        minPrice: 3000,
        features: [
          { key: 'serviceType', label: 'Type', type: 'text', required, placeholder: 'Wedding, Product, Event' },
          { key: 'equipment', label: 'Equipment', type: 'text', required },
          { key: 'areaCoverage', label: 'Area Coverage', type: 'text', required },
        ],
      },
      {
        slug: 'web-tech',
        name: 'Web & Tech',
        minPrice: 2500,
        features: [
          { key: 'serviceType', label: 'Service Type', type: 'text', required, placeholder: 'Web Dev, SEO, App Dev' },
          { key: 'experienceYears', label: 'Experience', type: 'number', required, min: 0, max: 60, unit: 'years' },
          { key: 'workMode', label: 'Remote/Onsite', type: 'select', required, options: ['Remote', 'Onsite', 'Hybrid'] },
        ],
      },
    ],
  },
];

export const STANDARD_CATEGORY_SEEDS: StandardCategorySeed[] = LISTING_CATEGORY_DEFINITIONS.map(
  ({ name, slug, icon, order }) => ({
    name,
    slug,
    icon,
    order,
  }),
);

export function getCategoryDefinitionBySlug(slug?: string | null) {
  if (!slug) return undefined;
  return LISTING_CATEGORY_DEFINITIONS.find((item) => item.slug === slug);
}

export function getSubcategoryDefinition(categorySlug?: string | null, subcategorySlug?: string | null) {
  const category = getCategoryDefinitionBySlug(categorySlug);
  if (!category || !subcategorySlug) return undefined;
  return category.subcategories.find((item) => item.slug === subcategorySlug);
}

export function getMinimumPriceForListing(categorySlug?: string | null, subcategorySlug?: string | null) {
  const category = getCategoryDefinitionBySlug(categorySlug);
  const subcategory = getSubcategoryDefinition(categorySlug, subcategorySlug);
  return subcategory?.minPrice ?? category?.minPrice ?? 100;
}
