export const images = {
  hero: "https://images.unsplash.com/photo-1572861875689-0d8553d82f60?auto=format&fit=crop&w=1600&q=88",
  coffee: "https://images.unsplash.com/photo-1774529233247-d3f34ed11994?auto=format&fit=crop&w=1200&q=86",
  cooking: "https://images.unsplash.com/photo-1691826280486-2a7f9a40441c?auto=format&fit=crop&w=1200&q=86",
  artisan: "https://images.unsplash.com/photo-1778079247396-9c0e01c83c8b?auto=format&fit=crop&w=1200&q=86",
  baskets: "https://images.unsplash.com/photo-1596626417050-39c7f6ddd2c9?auto=format&fit=crop&w=1200&q=84",
  bowls: "https://images.unsplash.com/photo-1567696154083-9547fd0c8e1d?auto=format&fit=crop&w=1200&q=84",
  woven: "https://images.unsplash.com/photo-1534413340928-7bd74b65196f?auto=format&fit=crop&w=1200&q=84",
  coffeeBeans: "https://images.unsplash.com/photo-1679917010073-ead631d41d91?auto=format&fit=crop&w=1200&q=84",
  simien: "https://images.unsplash.com/photo-1572888195250-3037a59d3578?auto=format&fit=crop&w=1600&q=88",
  lalibela: "https://images.unsplash.com/photo-1658823235938-c424fa0875d6?auto=format&fit=crop&w=1400&q=86",
  highlands: "https://images.unsplash.com/photo-1580320209809-a0c51e645872?auto=format&fit=crop&w=1400&q=86",
  portrait: "https://images.unsplash.com/photo-1572793792870-22f51f2f7e75?auto=format&fit=crop&w=1000&q=86",
  host: "https://images.unsplash.com/photo-1588349419102-ff038134f2af?auto=format&fit=crop&w=1000&q=86",
  maker: "https://images.unsplash.com/photo-1662894310975-bce268199aec?auto=format&fit=crop&w=1000&q=86",
  market: "https://images.unsplash.com/photo-1751725154557-b10ab73f1564?auto=format&fit=crop&w=1200&q=84",
  craft: "https://images.unsplash.com/photo-1682669112457-b6bbc00ee29e?auto=format&fit=crop&w=1200&q=84",
};

export type Product = {
  id: string;
  name: string;
  producer: string;
  price: number;
  image: string;
  category: string;
  availability: "In stock" | "Low stock" | "Made to order" | "Unavailable";
  description: string;
  material: string;
};

export const products: Product[] = [
  { id: "mesob-serving-basket", name: "Mesob Woven Serving Basket", producer: "Selam Weaving Collective", price: 2480, image: images.baskets, category: "Handcrafted Goods", availability: "Made to order", material: "Natural grass and palm fiber", description: "A handwoven serving basket made in small batches. Its generous form is designed for shared meals, bread, or considered storage at home." },
  { id: "clay-coffee-set", name: "Hand-thrown Clay Coffee Set", producer: "Entoto Clay Studio", price: 1850, image: images.bowls, category: "Home & Living", availability: "In stock", material: "Locally sourced clay", description: "A tactile coffee set shaped and finished by hand, pairing a traditional serving idea with a quiet, contemporary profile." },
  { id: "cotton-table-runner", name: "Natural Cotton Table Runner", producer: "Sabahar Textiles", price: 1320, image: images.woven, category: "Textiles", availability: "Low stock", material: "Handwoven Ethiopian cotton", description: "A softly textured table runner woven from natural cotton with understated detailing for everyday tables and celebrations." },
  { id: "konga-roasted-coffee", name: "Single-Origin Roasted Coffee", producer: "Konga Coffee Growers", price: 680, image: images.coffeeBeans, category: "Coffee & Food", availability: "In stock", material: "Whole bean coffee, 500g", description: "A prototype listing for whole-bean coffee from the Konga area, roasted to highlight a balanced and aromatic cup." },
  { id: "market-basket-set", name: "Market Basket Pair", producer: "Aster Basketry Studio", price: 2100, image: images.market, category: "Handcrafted Goods", availability: "In stock", material: "Woven natural fiber", description: "Two lightweight nesting baskets for market mornings, storage, and daily use, woven in a small community workshop." },
  { id: "woven-wall-piece", name: "Geometric Woven Wall Piece", producer: "Hana Kebede Textiles", price: 1740, image: images.craft, category: "Home & Living", availability: "Low stock", material: "Natural fiber and cotton", description: "A graphic woven composition that brings material, rhythm, and hand-finished detail to an interior." },
  { id: "coffee-cup-pair", name: "Clay Buna Cup Pair", producer: "Entoto Clay Studio", price: 540, image: images.bowls, category: "Home & Living", availability: "In stock", material: "Glazed clay", description: "A pair of compact cups shaped for buna and made to sit comfortably in the hand." },
  { id: "woven-travel-pouch", name: "Handwoven Travel Pouch", producer: "Sabahar Textiles", price: 890, image: images.woven, category: "Textiles", availability: "Unavailable", material: "Cotton with metal zip", description: "A useful lined pouch in handwoven cotton for small travel essentials and everyday organization." },
];

export type Experience = {
  id: string;
  title: string;
  host: string;
  location: string;
  category: string;
  duration: string;
  price: number;
  image: string;
  dates: string[];
  description: string;
};

export const experiences: Experience[] = [
  { id: "ethiopian-coffee-ceremony", title: "Ethiopian Coffee Ceremony", host: "Bethlehem Assefa", location: "Addis Ababa", category: "Coffee & Food", duration: "2 hours", price: 950, image: images.coffee, dates: ["2026-03-28", "2026-04-04", "2026-04-11"], description: "Spend time around the preparation and sharing of coffee, learning about the tools, aromas, and conversation that shape this hosted tradition." },
  { id: "traditional-cooking-workshop", title: "Traditional Cooking Workshop", host: "Rahel Getachew", location: "Addis Ababa", category: "Cooking", duration: "3.5 hours", price: 1400, image: images.cooking, dates: ["2026-03-29", "2026-04-05", "2026-04-12"], description: "Prepare a shared meal with a local host, from ingredients and spice blends to the final table. Designed as a participatory introduction rather than a demonstration." },
  { id: "weaving-pottery-artisans", title: "Weaving & Pottery with Local Artisans", host: "Blue Nile Makers", location: "Bahir Dar", category: "Craft", duration: "Half day", price: 1850, image: images.artisan, dates: ["2026-04-02", "2026-04-09"], description: "Visit working makers, learn how local materials are prepared, and try foundational techniques with patient guidance." },
  { id: "harar-storytelling-walk", title: "Harar Storytelling Walk", host: "Yusuf Ahmed", location: "Harar", category: "Storytelling", duration: "2.5 hours", price: 1100, image: images.portrait, dates: ["2026-04-01", "2026-04-08"], description: "Walk through old Harar with a local storyteller, taking time for architecture, neighborhood histories, and everyday details." },
  { id: "highland-music-evening", title: "Highland Music Evening", host: "Saba Cultural House", location: "Gondar", category: "Traditional Arts", duration: "2 hours", price: 1250, image: images.host, dates: ["2026-04-03", "2026-04-10"], description: "An intimate introduction to regional instruments, songs, and the social settings in which music is shared." },
  { id: "natural-dye-workshop", title: "Natural Dye & Cotton Workshop", host: "Hana Kebede", location: "Bahir Dar", category: "Craft", duration: "4 hours", price: 1650, image: images.maker, dates: ["2026-04-06", "2026-04-13"], description: "Explore color from plant to fiber and create a small cotton sample using a guided natural dye process." },
];

export type TourismListing = {
  id: string;
  title: string;
  provider: string;
  location: string;
  type: "Destination" | "Tour" | "Accommodation" | "Guide";
  price: number;
  image: string;
  summary: string;
};

export const tourismListings: TourismListing[] = [
  { id: "simien-guided-trek", title: "Simien Highlands Guided Trek", provider: "North Ridge Guides", location: "Simien Mountains", type: "Tour", price: 4800, image: images.simien, summary: "A flexible prototype itinerary focused on landscapes, walking, and locally guided interpretation." },
  { id: "lalibela-heritage-day", title: "Lalibela Heritage Day", provider: "Lalibela Community Guides", location: "Lalibela", type: "Guide", price: 2200, image: images.lalibela, summary: "A locally guided day introducing the town's living heritage and remarkable architecture." },
  { id: "harar-courtyard-stay", title: "Harar Courtyard Guesthouse", provider: "Abdulahi Family Stay", location: "Harar", type: "Accommodation", price: 1950, image: images.portrait, summary: "A sample family-run stay within reach of the old city's lanes, markets, and gathering places." },
  { id: "rift-valley-retreat", title: "Rift Valley Lakeside Retreat", provider: "Ziway Nature Stays", location: "Lake Ziway", type: "Accommodation", price: 3200, image: images.highlands, summary: "A quiet base for birdlife, lake landscapes, and guided outings in the Rift Valley." },
  { id: "bahir-dar-city-guide", title: "Bahir Dar Local Guide", provider: "Mekdes Alemu", location: "Bahir Dar", type: "Guide", price: 1500, image: images.maker, summary: "A private orientation to the city, local food, lakeside life, and nearby maker communities." },
  { id: "danakil-landscape-journey", title: "Danakil Landscape Journey", provider: "Afar Horizon Tours", location: "Afar Region", type: "Tour", price: 7800, image: images.highlands, summary: "A sample small-group journey with logistical planning and local regional guidance." },
];

export const formatETB = (value: number) => `${new Intl.NumberFormat("en-US").format(value)} ETB`;
