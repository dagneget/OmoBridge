import type {
  ProductResponse,
  TourPackageResponse,
  SessionResponse,
  Hotel,
  GuideResponse,
  TransportService,
  SafetyGuideline,
  DeliveryTrackingResponse,
  PublicTraceResponse,
} from '../../types/api';

export const mockTourPackages: TourPackageResponse[] = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001',
    enterpriseId: '33333333-3333-3333-3333-333333333333',
    enterpriseName: 'South Omo Eco Tourism',
    name: 'Mursi & Hamar Cultural Immersion',
    category: 'CULTURAL',
    overview: 'Respectful 3-day guided cultural exchange in Hamar and Mursi territories.',
    story:
      'Guided by community elders, learning local traditions, architecture, and pastoral life.',
    locationText: 'Turmi & Mago National Park',
    durationHours: 72,
    maxGroupSize: 8,
    priceAmount: 4500,
    priceUnit: 'PER_PERSON',
    currency: 'ETB',
    culturalRules: 'Photography requires community consent; respect sacred trees and quiet hours.',
    safetyNotes: 'Local certified guide and ranger accompaniment mandatory.',
    isActive: true,
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000002',
    enterpriseId: '33333333-3333-3333-3333-333333333333',
    enterpriseName: 'South Omo Eco Tourism',
    name: 'Lower Omo River Birding & Flora',
    category: 'ECO_TOUR',
    overview: 'Sunrise bird watching expedition along the banks of the Omo River.',
    locationText: 'Omorate & Dassanech Basin',
    durationHours: 8,
    maxGroupSize: 6,
    priceAmount: 1800,
    priceUnit: 'PER_PERSON',
    currency: 'ETB',
    isActive: true,
  },
];

export const mockHotels: Hotel[] = [
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000001',
    name: 'Buska Hotel',
    locationText: 'Turmi Center, near Keske River',
    priceFrom: 2500,
    currency: 'ETB',
    amenities: 'Free WiFi, Restaurant, Bar, AC, Cultural craft shop',
    contactPhone: '+251911223344',
    contactEmail: 'info@buskahotel.et',
    active: true,
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000002',
    name: 'Green Resort',
    locationText: 'Jinka Foothills, South Omo',
    priceFrom: 1800,
    currency: 'ETB',
    amenities: 'Swimming Pool, Organic Garden Restaurant, 24/7 Security',
    contactPhone: '+251911334455',
    contactEmail: 'stay@greenresort.et',
    active: true,
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000003',
    name: 'Paradise Lodge',
    locationText: 'Lake Chamo Ridge, Arba Minch',
    priceFrom: 3200,
    currency: 'ETB',
    amenities: 'Panoramic Lake View, Luxury Spa, Fine Dining, Conference Facilities',
    contactPhone: '+251911445566',
    contactEmail: 'booking@paradiselodge.et',
    active: true,
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-000000000004',
    name: 'Turmi Desert Lodge & Eco Resort',
    locationText: 'Turmi, South Omo',
    priceFrom: 2200,
    currency: 'ETB',
    amenities: 'Eco cottages, traditional meals, cultural evening fires',
    contactPhone: '+251911556677',
    contactEmail: 'info@turmilodge.et',
    active: true,
  },
];

export const mockGuides: GuideResponse[] = [
  {
    id: 'cccccccc-cccc-4ccc-8ccc-000000000001',
    userId: '55555555-5555-5555-5555-555555555555',
    fullName: 'Desta Girmay',
    bio: 'Native Hamar guide with 10 years experience in community-based eco tourism.',
    languages: ['Hamer', 'Amharic', 'English'],
    specialties: 'Cultural heritage, birdwatching, local botany',
    dailyRate: 800,
    isAvailable: true,
  },
];

export const mockTransportServices: TransportService[] = [
  {
    id: 'dddddddd-dddd-4ddd-8ddd-000000000001',
    serviceName: 'Omo 4WD Cooperative',
    vehicleType: '4WD_LAND_CRUISER',
    priceAmount: 3500,
    contactPhone: '+251911554433',
    routeDescription: 'Jinka, Turmi, Omorate, Dimeka, Key Afer',
    active: true,
  },
];

export const mockSafetyGuidelines: SafetyGuideline[] = [
  {
    id: 'eeeeeeee-eeee-4eee-8eee-000000000001',
    title: 'Cultural Consent & Photography Protocol',
    content:
      'Always ask verbal permission through your guide before taking portraits. Never photograph sacred ceremonies without elder sanction.',
    category: 'CULTURAL',
    displayOrder: 1,
    active: true,
  },
  {
    id: 'eeeeeeee-eeee-4eee-8eee-000000000002',
    title: 'Hydration and Solar Protection',
    content:
      'Daytime temperatures frequently exceed 36°C in Lower Omo. Carry at least 3 liters of water per excursion and broad-brimmed hats.',
    category: 'HEALTH',
    displayOrder: 2,
    active: true,
  },
];

export const mockProducts: ProductResponse[] = [
  {
    id: 'ffffffff-ffff-4fff-8fff-000000000001',
    name: 'Pure Wild South Omo White Honey (1kg)',
    enterpriseName: 'South Omo Beekeeping Union',
    enterpriseId: '11111111-1111-4111-8111-000000000001',
    story: 'Demo: harvested by local beekeepers using traditional hanging beehives.',
    unit: 'kg',
    traceToken: 'TRACE-HONEY-001',
    priceBreakdown: {
      purchaseCost: 180, processingCost: 40, packagingCost: 25, laborCost: 45,
      transportCost: 20, enterpriseMargin: 50, communityFund: 10, taxAmount: 15,
      platformFee: 35, totalPrice: 420,
    },
    description:
      'Multi-floral raw honey ethically harvested by traditional beekeepers in the Mago river valley.',
    currency: 'ETB',
    unitPrice: 420,
    availableStock: 150,
    category: 'Honey & Hive Products',
    published: true,
  },
  {
    id: 'ffffffff-ffff-4fff-8fff-000000000002',
    name: 'Organic White Sesame Seeds (5kg)',
    enterpriseId: '11111111-1111-4111-8111-000000000001',
    enterpriseName: 'South Omo Beekeeping Union',
    unit: 'pack',
    description:
      'Cleaned, sun-dried, pesticide-free sesame cultivated along the fertile Omo floodplains.',
    currency: 'ETB',
    unitPrice: 650,
    availableStock: 300,
    category: 'Oilseeds & Grains',
    published: true,
  },
  {
    id: 'ffffffff-ffff-4fff-8fff-000000000003',
    name: 'Handcrafted Hamar Glass Bead Necklace',
    enterpriseId: '11111111-1111-4111-8111-000000000002',
    enterpriseName: 'Turmi Women Artisans Cooperative',
    unit: 'piece',
    description: 'Authentic traditional beadwork crafted by the Turmi Women Artisans Cooperative.',
    currency: 'ETB',
    unitPrice: 380,
    availableStock: 45,
    category: 'Artisan Crafts',
    published: true,
  },
];

export const liveDemoProducts: ProductResponse[] = [
  {
    id: '717145d1-32dc-4858-b6ed-f2e423924c42',
    enterpriseId: 'f72f40fc-b95e-4e04-9c69-1457a83f256b',
    enterpriseName: 'South Omo Honey & Coffee Union',
    name: 'Pure South Omo Forest White Honey (500g Jar)',
    description:
      'Raw, unpasteurized white honey collected by traditional beekeepers from wild tree hives in the deep riverine forests of South Omo. Rich in natural floral aromas.',
    story:
      'For centuries, Hamer and Ari beekeepers have crafted traditional bark hives suspended high in wild acacia trees. Every purchase directly empowers local producer families with guaranteed fair prices.',
    category: 'HONEY',
    unit: 'JAR',
    unitPrice: 450,
    currency: 'ETB',
    availableStock: 150,
    published: true,
    priceBreakdown: {
      purchaseCost: 200, processingCost: 45, packagingCost: 50, laborCost: 35,
      transportCost: 30, enterpriseMargin: 55, communityFund: 35, taxAmount: 0,
      platformFee: 0, totalPrice: 450,
    },
  },
  {
    id: '6044b1da-1590-400e-9441-ad293193eac7',
    enterpriseId: 'f72f40fc-b95e-4e04-9c69-1457a83f256b',
    enterpriseName: 'South Omo Honey & Coffee Union',
    name: 'Lower Omo Wild Acacia Amber Honey (1kg Jar)',
    description:
      'Golden amber wild honey harvested from indigenous acacia savannah blossoms across Lower Omo basin. Robust flavor profile with lingering herbal notes.',
    story:
      'Harvested sustainably using smoke-free techniques developed through cooperative training to preserve forest biodiversity and protect wild honeybee colonies.',
    category: 'HONEY',
    unit: 'JAR',
    unitPrice: 850,
    currency: 'ETB',
    availableStock: 80,
    published: true,
    priceBreakdown: {
      purchaseCost: 400, processingCost: 70, packagingCost: 80, laborCost: 60,
      transportCost: 50, enterpriseMargin: 120, communityFund: 70, taxAmount: 0,
      platformFee: 0, totalPrice: 850,
    },
  },
  {
    id: '3eb5e568-c2d8-42a9-8352-c1a9d0e67a7f',
    enterpriseId: 'f72f40fc-b95e-4e04-9c69-1457a83f256b',
    enterpriseName: 'South Omo Honey & Coffee Union',
    name: 'South Omo Shade-Grown Forest Coffee (250g Whole Bean)',
    description:
      'Heirloom Arabica beans grown in natural mountain shade canopy in South Ari highlands. Naturally sun-dried on raised African beds.',
    story:
      'Cultivated without synthetic fertilizers or pesticides by smallholder farming families at elevations above 1,800m. Micro-roasted to highlight citrus and floral jasmine notes.',
    category: 'COFFEE',
    unit: 'BAG',
    unitPrice: 350,
    currency: 'ETB',
    availableStock: 120,
    published: true,
    priceBreakdown: {
      purchaseCost: 150, processingCost: 40, packagingCost: 35, laborCost: 30,
      transportCost: 25, enterpriseMargin: 45, communityFund: 25, taxAmount: 0,
      platformFee: 0, totalPrice: 350,
    },
  },
  {
    id: '3deed58c-ad30-400e-b197-fc52296a7284',
    enterpriseId: 'f72f40fc-b95e-4e04-9c69-1457a83f256b',
    enterpriseName: 'South Omo Honey & Coffee Union',
    name: 'Handwoven Hamer Artisan Agelgil Basket',
    description:
      'Traditional multi-purpose container tightly hand-coiled with wild savannah grass and decorated with natural cowhide binding and geometric patterns.',
    story:
      'Handmade by elder women artisans in Turmi and Dimeka kebeles. These containers traditionally preserve travel food and ceremonial items, keeping them fresh for days.',
    category: 'CRAFT',
    unit: 'PIECE',
    unitPrice: 900,
    currency: 'ETB',
    availableStock: 35,
    published: true,
    priceBreakdown: {
      purchaseCost: 500, processingCost: 50, packagingCost: 40, laborCost: 60,
      transportCost: 50, enterpriseMargin: 120, communityFund: 80, taxAmount: 0,
      platformFee: 0, totalPrice: 900,
    },
  },
  {
    id: '7db3c051-640e-4d27-b257-f9c0e6e05a71',
    enterpriseId: 'f72f40fc-b95e-4e04-9c69-1457a83f256b',
    enterpriseName: 'South Omo Honey & Coffee Union',
    name: 'Organic Hand-Spun Cotton Shawl (Netela / Gabi)',
    description:
      'Featherlight double-layered woven cotton wrap featuring intricate colored border embroidery (tibeb) crafted on traditional wooden foot looms.',
    story:
      'Spun from 100% locally grown rain-fed South Omo cotton by women cooperatives and woven by master artisans with ancestral spinning techniques.',
    category: 'TEXTILE',
    unit: 'PIECE',
    unitPrice: 1200,
    currency: 'ETB',
    availableStock: 25,
    published: true,
    priceBreakdown: {
      purchaseCost: 700, processingCost: 60, packagingCost: 50, laborCost: 80,
      transportCost: 60, enterpriseMargin: 150, communityFund: 100, taxAmount: 0,
      platformFee: 0, totalPrice: 1200,
    },
  },
  {
    id: '505c8144-9902-4deb-b0ed-786149f4a910',
    enterpriseId: 'f72f40fc-b95e-4e04-9c69-1457a83f256b',
    enterpriseName: 'South Omo Honey & Coffee Union',
    name: 'Traditional Pastoralist Terracotta Clay Cooking Pot',
    description:
      'Hand-molded earthenware pot pit-fired with organic husks and polished with smooth river stones. Exceptional thermal retention for slow stews.',
    story:
      'Molded by pastoralist potters along the Keske and Mago riverbanks using seasonal sedimentary clay and age-old firing pits without wheels or electricity.',
    category: 'CRAFT',
    unit: 'PIECE',
    unitPrice: 650,
    currency: 'ETB',
    availableStock: 40,
    published: true,
    priceBreakdown: {
      purchaseCost: 350, processingCost: 40, packagingCost: 50, laborCost: 40,
      transportCost: 40, enterpriseMargin: 80, communityFund: 50, taxAmount: 0,
      platformFee: 0, totalPrice: 650,
    },
  },
];

export const mockTrackingResponse: DeliveryTrackingResponse = {
  jobId: '99999999-9999-4999-8999-000000000001',
  jobNo: 'TRK-OMO-9876',
  status: 'IN_TRANSIT',
  currentLatitude: 5.4678,
  currentLongitude: 36.5678,
  lastRecordedAt: new Date().toISOString(),
  history: [
    {
      latitude: 5.4678,
      longitude: 36.5678,
    },
  ],
};

export const mockPublicTrace: PublicTraceResponse = {
  publicToken: 'TRACE-HONEY-001',
  batchCode: 'BATCH-2026-09-HONEY',
  enterpriseName: 'South Omo Beekeeping Union',
  originVillage: 'Mago River Valley',
  originLabel: 'Pure Wild Forest Apiary',
  processingDate: '2026-09-15T00:00:00Z',
  publicStory: 'Ethically harvested using traditional hanging beehives without colony destruction.',
};

export const MOCK_SESSION_DATE = '2026-11-01';
export const mockSessions: SessionResponse[] = [
  {
    id: '88888888-8888-4888-8888-000000000001',
    packageId: mockTourPackages[0].id,
    sessionDate: MOCK_SESSION_DATE,
    capacity: 8,
    bookedCount: 2,
    availableCapacity: 6,
    status: 'OPEN',
  },
  {
    id: '88888888-8888-4888-8888-000000000002',
    packageId: mockTourPackages[0].id,
    sessionDate: MOCK_SESSION_DATE,
    capacity: 8,
    bookedCount: 8,
    availableCapacity: 0,
    status: 'CLOSED',
  },
];
