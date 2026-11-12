import "dotenv/config";
import crypto from "node:crypto";
import { sequelize } from "../models/db.js";
import { User } from "../models/userModel.js";
import { Seller } from "../models/Seller.js";
import { ProductCategory } from "../models/ProductCategory.js";
import { Product } from "../models/Product.js";
import { Heritage } from "../models/Heritage.js";
import { Event } from "../models/Event.js";

const databaseUrl = process.env.DATABASE_URL || "";
const isLocalDatabase = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
if (process.env.NODE_ENV === "production" || !isLocalDatabase) {
  throw new Error("Mansalay showcase data may only be seeded into a local, non-production database.");
}

function nextAnnualDate(monthIndex, day) {
  const now = new Date();
  let date = new Date(now.getFullYear(), monthIndex, day, 9, 0, 0, 0);
  if (date < now) date = new Date(now.getFullYear() + 1, monthIndex, day, 9, 0, 0, 0);
  return date;
}

const heritageRecords = [
  {
    title: "Pamugu-an Festival",
    category: "festival",
    location: "Mansalay, Oriental Mindoro",
    description: "A traditional third-week-of-October reunion of Mangyan communities featuring Palaro ng Lahi, cultural presentations, product demonstrations, and a Barakalan or native-products market.",
    historical_significance: "Pamugu-an highlights cultural exchange, community reunion, indigenous games, and the livelihood value of locally made products.",
    year_established: "Traditional annual celebration",
    status: "active"
  },
  {
    title: "Mangyan Festival",
    category: "festival",
    location: "Mansalay Municipal Grounds",
    description: "Mansalay's official November 25 festival recognizes the municipality's Mangyan constituency through cultural presentations, indigenous dances, traditional crafts, tribal rituals, and heritage activities.",
    historical_significance: "The municipal festival gives importance to the Hanunuo and Buhid communities and to Mansalay's living indigenous heritage.",
    year_established: "Celebrated annually on November 25",
    status: "active"
  },
  {
    title: "Hanunuo Mangyan Weaving",
    category: "tradition",
    location: "Barangay Panaytayan, Mansalay",
    description: "Backstrap-loom weaving carries skilled knowledge through ramit textiles, careful fiber preparation, and patterns taught across generations.",
    historical_significance: "Weaving supports cultural memory, artistic knowledge, and artisan livelihoods.",
    year_established: "Living tradition",
    status: "active"
  },
  {
    title: "Ambahan and Surat Mangyan",
    category: "tradition",
    location: "Mansalay, Oriental Mindoro",
    description: "Ambahan is a poetic tradition associated with the Hanunuo Mangyan and preserved through oral performance and Surat Mangyan writing, including inscriptions on bamboo.",
    historical_significance: "The tradition is closely associated with National Living Treasure Ginaw Bilog of Mansalay and demonstrates the continuing use of an indigenous Philippine writing system.",
    year_established: "Intergenerational tradition",
    status: "active"
  }
];

const eventRecords = [
  {
    title: "Pamugu-an Cultural Week",
    description: "A week for Mangyan community reunion, Palaro ng Lahi, cultural presentations, product demonstrations, and the Barakalan native-products market. Confirm the final annual schedule with the Mansalay Tourism Office before travelling.",
    event_date: nextAnnualDate(9, 16),
    location: "Mansalay, Oriental Mindoro",
    category: "festival"
  },
  {
    title: "Mangyan Festival",
    description: "Mansalay's official municipal festival featuring Mangyan cultural presentations, indigenous dances, traditional crafts, tribal rituals, and community heritage activities.",
    event_date: nextAnnualDate(10, 25),
    location: "Mansalay Municipal Grounds",
    image_url: "https://www.travelorientalmindoro.ph/uploads/events/10/gallery/20260209073544_cacbbcf1.png",
    category: "festival"
  },
  {
    title: "Feast of Santa Catalina and Mansalay Town Fiesta",
    description: "The November 26 town fiesta brings residents and visitors together for religious observance and community activities following the Mangyan Festival.",
    event_date: nextAnnualDate(10, 26),
    location: "Poblacion, Mansalay, Oriental Mindoro",
    category: "community"
  },
  {
    title: "Mansalay Founding Anniversary",
    description: "A civic commemoration of Mansalay becoming an independent municipality on July 24, 1928, with local history and community programs.",
    event_date: nextAnnualDate(6, 24),
    location: "Mansalay, Oriental Mindoro",
    category: "historical"
  }
];

const catalog = [
  {
    name: "Hanunuo Mangyan Ramit Textile",
    description: "A handwoven textile listing inspired by the living ramit weaving tradition of Hanunuo Mangyan artisans. Natural texture and restrained bands make it suitable as a wrap, display textile, or meaningful gift. Maker attribution and availability are confirmed by the seller before dispatch.",
    price: 1250,
    category: "Traditional Textiles",
    stocks: 12,
    image_url: "/images/products/ramit-textile.jpg",
    is_featured: true,
    free_shipping: true,
    heritage: "Hanunuo Mangyan Weaving"
  },
  {
    name: "Ramit Accent Table Runner",
    description: "A smaller handwoven textile accent for tables and display shelves, created to introduce the material character of ramit weaving in a practical home format.",
    price: 780,
    category: "Traditional Textiles",
    stocks: 16,
    image_url: "/images/products/ramit-textile.jpg",
    is_featured: false,
    free_shipping: true,
    heritage: "Hanunuo Mangyan Weaving"
  },
  {
    name: "Handwoven Nito Market Basket",
    description: "A durable everyday basket shaped from natural nito and rattan, with closely woven sides and comfortable handles for market trips, storage, or gifting.",
    price: 680,
    category: "Basketry & Homeware",
    stocks: 20,
    image_url: "/images/products/nito-basket.jpg",
    is_featured: true,
    free_shipping: false,
    heritage: "Hanunuo Mangyan Weaving"
  },
  {
    name: "Handwoven Nito Trinket Basket",
    description: "A compact natural-fiber basket for jewelry, desk items, or keepsakes, finished with the same careful handwoven character as larger market baskets.",
    price: 360,
    category: "Basketry & Homeware",
    stocks: 24,
    image_url: "/images/products/nito-basket.jpg",
    is_featured: false,
    free_shipping: true,
    heritage: "Hanunuo Mangyan Weaving"
  },
  {
    name: "Mangyan Artisan Beadwork Set",
    description: "A coordinated pair of earrings and bracelet in warm earth colors, presented as a contemporary artisan accessory with seller-confirmed maker attribution.",
    price: 390,
    category: "Beadwork & Accessories",
    stocks: 30,
    image_url: "/images/products/beadwork-set.jpg",
    is_featured: true,
    free_shipping: true,
    heritage: "Pamugu-an Festival"
  },
  {
    name: "Earth-Tone Beaded Bracelet",
    description: "A lightweight hand-beaded bracelet using amber, ivory, green, and muted red tones for an easy everyday cultural craft accessory.",
    price: 180,
    category: "Beadwork & Accessories",
    stocks: 40,
    image_url: "/images/products/beadwork-set.jpg",
    is_featured: false,
    free_shipping: true,
    heritage: "Pamugu-an Festival"
  },
  {
    name: "Ambahan Learning Bamboo Keepsake",
    description: "A contemporary bamboo keepsake paired with an educational note about ambahan and Surat Mangyan. It does not reproduce or claim ownership of a traditional poem; it is designed to encourage respectful learning.",
    price: 320,
    category: "Cultural Keepsakes",
    stocks: 18,
    image_url: "/images/products/ambahan-bamboo-keepsake.jpg",
    is_featured: true,
    free_shipping: true,
    heritage: "Ambahan and Surat Mangyan"
  },
  {
    name: "Bamboo Stylus and Keepsake Set",
    description: "A polished bamboo tube and stylus set for cultural-learning displays, journaling corners, and responsible conversations about Mindoro's indigenous writing traditions.",
    price: 460,
    category: "Cultural Keepsakes",
    stocks: 14,
    image_url: "/images/products/ambahan-bamboo-keepsake.jpg",
    is_featured: false,
    free_shipping: true,
    heritage: "Ambahan and Surat Mangyan"
  }
];

await sequelize.authenticate();
try {
  let sellerUser = await User.findOne({ where: { email: "mansalay.artisans@cultureframe.local" } });
  if (!sellerUser) {
    sellerUser = await User.create({
      name: "Mansalay Artisan Marketplace",
      email: "mansalay.artisans@cultureframe.local",
      password: `LocalSeller-${crypto.randomBytes(18).toString("base64url")}`,
      role: "seller",
      status: "active",
      address: "Mansalay, Oriental Mindoro"
    });
  }

  let seller = await Seller.findOne({ where: { email: sellerUser.email } });
  if (!seller) {
    seller = await Seller.create({
      user_id: sellerUser.id,
      business_name: "Mansalay Artisan Marketplace",
      contact_name: "CultureFrame Local Catalog Team",
      email: sellerUser.email,
      address: "Mansalay, Oriental Mindoro",
      category: "Mangyan arts, crafts and cultural keepsakes",
      status: "active",
      commission_rate: 8,
      notes: "Local showcase catalog. Confirm artisan identity, consent, attribution and inventory before public deployment."
    });
  } else if (seller.user_id !== sellerUser.id || seller.status !== "active") {
    await seller.update({ user_id: sellerUser.id, status: "active" });
  }

  const heritageByTitle = {};
  for (const data of heritageRecords) {
    const [record] = await Heritage.findOrCreate({ where: { title: data.title }, defaults: data });
    await record.update(data);
    heritageByTitle[data.title] = record;
  }

  for (const data of eventRecords) {
    const [record] = await Event.findOrCreate({ where: { title: data.title }, defaults: data });
    await record.update(data);
  }

  for (const name of [...new Set(catalog.map((product) => product.category))]) {
    await ProductCategory.findOrCreate({
      where: { name },
      defaults: { description: `Mansalay marketplace collection: ${name}`, is_active: true }
    });
  }

  for (const item of catalog) {
    const data = {
      seller_id: seller.id,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      stocks: item.stocks,
      image_url: item.image_url,
      status: "active",
      is_featured: item.is_featured,
      free_shipping: item.free_shipping,
      heritage_id: heritageByTitle[item.heritage]?.id ?? null
    };
    const [product] = await Product.findOrCreate({ where: { name: item.name }, defaults: data });
    await product.update(data);
  }

  const [products, events, heritage] = await Promise.all([
    Product.count({ where: { status: "active" } }),
    Event.count(),
    Heritage.count({ where: { status: "active" } })
  ]);
  console.log(JSON.stringify({ sellerId: seller.id, products, events, heritage }));
} finally {
  await sequelize.close();
}
