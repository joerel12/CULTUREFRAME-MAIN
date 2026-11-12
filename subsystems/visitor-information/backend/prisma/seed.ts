import "dotenv/config";
import { ContentKind, PrismaClient, PublicationStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password?.length && password.length < 12) {
    throw new Error("ADMIN_PASSWORD must contain at least 12 characters when administrator provisioning is enabled.");
  }
  if (email && password) {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash, role: UserRole.ADMIN, status: "ACTIVE" },
      create: {
        firstName: "CultureFrame",
        lastName: "Administrator",
        email,
        passwordHash,
        role: UserRole.ADMIN
      }
    });
  } else {
    console.warn("ADMIN_EMAIL or ADMIN_PASSWORD is not set; destination data was seeded without changing administrator accounts.");
  }

  const defaults = [
    { key: "heroTitle", value: "Discover the Living Heritage of Mansalay" },
    { key: "heroDescription", value: "Explore the traditions, stories, and places documented by the CultureFrame community." },
    { key: "about", value: "CultureFrame is a community-focused information portal for documenting cultural heritage in Mansalay, Oriental Mindoro." }
  ];
  for (const entry of defaults) {
    await prisma.homepageContent.upsert({
      where: { key: entry.key },
      update: {},
      create: entry
    });
  }

  const destinationImageUrls: Record<string, string> = {
    "Buktot Beach": "https://www.travelorientalmindoro.ph/uploads/places/184/gallery/20251211030638_a75fad4b.jpg",
    "Casabangan Beach and Marine Protected Area": "https://www.travelorientalmindoro.ph/uploads/places/222/gallery/20251211053518_09274ecb.jpg",
    "Mansalay Eco Park": "https://www.travelorientalmindoro.ph/uploads/places/491/gallery/20251212034452_dd8222a1.jpg",
    "Mt. Abenlay Eco Tour Monkey Trail": "https://www.travelorientalmindoro.ph/uploads/places/527/gallery/20251212060630_2235c978.jpg",
    "Mangyan Burial Cave": "https://www.travelorientalmindoro.ph/uploads/places/484/gallery/20251212033035_9b8a6587.jpg",
    "Oriental Mindoro Heritage and Cultural Center": "/images/experiences/heritage-center-art.png",
    "Mangyan Villages of Panaytayan": "/images/experiences/hanunuo-weaving-art.png"
  };
  const destinations = [
    {
      name: "Buktot Beach",
      category: "Beach & Island",
      address: "Barangay Manaul, Mansalay, Oriental Mindoro",
      description: "A pristine white-sand beach with clear water and distinctive rock formations in Barangay Manaul.",
      sourceUrl: "https://www.travelorientalmindoro.ph/place/buktot-beach",
      latitude: 12.44872704,
      longitude: 121.4203594,
      feedbackRadiusMeters: 150,
      verified: true
    },
    {
      name: "Casabangan Beach and Marine Protected Area",
      category: "Beach & Marine Sanctuary",
      address: "Barangay Don Pedro, Mansalay, Oriental Mindoro",
      description: "A white-sand coastal area known for clear blue water, swimming, snorkeling, and its marine protected area.",
      sourceUrl: "https://www.travelorientalmindoro.ph/place/casabangan-beach-marine-protected-areas",
      latitude: 12.50516334,
      longitude: 121.3207688,
      feedbackRadiusMeters: 200,
      verified: true
    },
    {
      name: "Mansalay Eco Park",
      category: "Adventure & Eco-tourism",
      address: "Sitio Barubo, Barangay B. del Mundo, Mansalay, Oriental Mindoro",
      description: "An elevated eco-tourism and pilgrimage destination overlooking Mansalay's lowlands and the Tablas Strait.",
      sourceUrl: "https://www.travelorientalmindoro.ph/place/mansalay-eco-park",
      latitude: 12.55143146,
      longitude: 121.4711495,
      feedbackRadiusMeters: 200,
      verified: true
    },
    {
      name: "Mt. Abenlay Eco Tour Monkey Trail",
      category: "Mountain & Eco-tourism",
      address: "Barangay Budburan, Mansalay, Oriental Mindoro",
      description: "An upland nature trail and viewing area in Budburan with scenic landscapes and opportunities to observe monkeys responsibly.",
      sourceUrl: "https://www.travelorientalmindoro.ph/place/mt-abenlay-eco-tour-monkey-trail",
      latitude: 12.47411349,
      longitude: 121.3387986,
      feedbackRadiusMeters: 250,
      verified: true
    },
    {
      name: "Mangyan Burial Cave",
      category: "Sacred Cultural Site",
      address: "Sitio Palaypay, Barangay B. del Mundo, Mansalay, Oriental Mindoro",
      description: "A sacred ancestral Mangyan burial place along Palaypay Cove. Visit only with local guidance, permission, and respect for cultural protocols.",
      sourceUrl: "https://www.travelorientalmindoro.ph/place/mangyan-burial-cave",
      latitude: 12.53244262,
      longitude: 121.4627573,
      feedbackRadiusMeters: 150,
      verified: true
    },
    {
      name: "Oriental Mindoro Heritage and Cultural Center",
      category: "Historical & Cultural",
      address: "Barangay B. del Mundo, Mansalay, Oriental Mindoro",
      description: "A free-admission cultural center dedicated to promoting appreciation and preservation of Mangyan art, works, and cultural heritage.",
      sourceUrl: "https://www.travelorientalmindoro.ph/place/oriental-mindoro-heritage-and-cultural-center",
      latitude: null,
      longitude: null,
      feedbackRadiusMeters: 150,
      verified: false
    },
    {
      name: "Mangyan Villages of Panaytayan",
      category: "Living Cultural Community",
      address: "Barangay Panaytayan, Mansalay, Oriental Mindoro",
      description: "A living cultural community associated with Hanunuo Mangyan weaving and local knowledge. Visits should be community-led, consent-based, and respectful rather than treated as staged tourism.",
      sourceUrl: "https://www.travelorientalmindoro.ph/place/mangyan-villages",
      latitude: null,
      longitude: null,
      feedbackRadiusMeters: 150,
      verified: false
    }
  ];
  for (const destination of destinations) {
    const existing = await prisma.location.findFirst({ where: { name: destination.name } });
    if (existing) await prisma.location.update({ where: { id: existing.id }, data: destination });
    else await prisma.location.create({ data: destination });
  }

  const attractionRecords = [
    ...destinations.map((destination) => ({
      kind: ContentKind.ATTRACTION,
      title: destination.name,
      slug: destination.name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      summary: destination.description,
      description: `${destination.description} The destination is listed by the Provincial Tourism Office of Oriental Mindoro. Check current access conditions and follow local safety and cultural guidance before visiting.`,
      payload: { location: destination.address, sourceUrl: destination.sourceUrl, imageUrl: destinationImageUrls[destination.name] },
      publicationStatus: PublicationStatus.PUBLISHED,
      featured: false
    })),
    {
      kind: ContentKind.HERITAGE,
      title: "Oriental Mindoro Heritage and Cultural Center",
      slug: "oriental-mindoro-heritage-and-cultural-center",
      summary: "A Mansalay center dedicated to appreciating and preserving Mangyan art, works, and cultural heritage.",
      description: "The center presents symbols and works of Mangyan culture and helps communicate and celebrate the cultural heritage of Oriental Mindoro.",
      payload: {
        location: "Barangay B. del Mundo, Mansalay, Oriental Mindoro",
        sourceUrl: "https://www.travelorientalmindoro.ph/place/oriental-mindoro-heritage-and-cultural-center",
        imageUrl: "/images/experiences/heritage-center-art.png"
      },
      publicationStatus: PublicationStatus.PUBLISHED,
      featured: true
    },
    {
      kind: ContentKind.FESTIVAL,
      title: "Mangyan Festival",
      slug: "mangyan-festival",
      summary: "Mansalay's official annual festival honoring its Mangyan constituency and living indigenous heritage every November 25.",
      description: "Mangyan Festival brings the community together through Mangyan cultural presentations, indigenous dances, traditional crafts, tribal rituals, and heritage celebrations at the Mansalay Municipal Grounds.",
      culturalSignificance: "The festival acknowledges the Mangyan constituency that forms a significant part of Mansalay and promotes the ideals, traditions, and cultural identity of its Hanunuo and Buhid communities.",
      payload: {
        location: "Mansalay Municipal Grounds, Mansalay, Oriental Mindoro",
        eventDate: "Every November 25",
        sourceUrl: "https://www.travelorientalmindoro.ph/festival/mangyan-festival",
        imageUrl: "/images/experiences/mangyan-festival-art.png"
      },
      publicationStatus: PublicationStatus.PUBLISHED,
      featured: true
    },
    {
      kind: ContentKind.FESTIVAL,
      title: "Pamugu-an Festival",
      slug: "pamugu-an-festival",
      summary: "A traditional third-week-of-October reunion of Mangyan communities in Mansalay centered on culture, indigenous games, demonstrations, and native products.",
      description: "Pamugu-an is remembered as a festive reunion of different Mangyan groups. Programs have included Palaro ng Lahi, cultural presentations, product demonstrations, and a Barakalan or baratillo where native products are presented and sold. Because annual schedules and program names can change, visitors should confirm current dates with the Mansalay Municipal Tourism Office.",
      culturalSignificance: "Pamugu-an places community reunion, shared cultural expression, indigenous games, and artisan livelihood at the center of the celebration.",
      historicalBackground: "Tourism references have traditionally placed Pamugu-an in the third week of October. It should be distinguished from the current official Mangyan Festival of Mansalay, celebrated every November 25.",
      payload: {
        location: "Mansalay, Oriental Mindoro",
        eventDate: "Traditionally the third week of October",
        sourceUrl: "https://aroundph.com/festivals/pamuguan-festival",
        imageUrl: "/images/experiences/pamuguan-market-art.png"
      },
      publicationStatus: PublicationStatus.PUBLISHED,
      featured: true
    },
    {
      kind: ContentKind.TRADITION,
      title: "Hanunuo Mangyan Weaving",
      slug: "hanunuo-mangyan-weaving",
      summary: "A living Mansalay tradition expressed through carefully woven ramit textiles and patterns carried across generations.",
      description: "Hanunuo Mangyan artisans in Mansalay continue the knowledge of backstrap loom weaving, producing textiles whose materials, patterns, and practice express community identity and skilled local craftsmanship.",
      culturalSignificance: "Weaving sustains cultural memory, livelihood, artistic knowledge, and the intergenerational teaching of Hanunuo Mangyan identity.",
      payload: {
        location: "Mangyan Villages, Barangay Panaytayan, Mansalay, Oriental Mindoro",
        sourceUrl: "https://www.travelorientalmindoro.ph/place/mangyan-villages",
        imageUrl: "/images/experiences/hanunuo-weaving-art.png"
      },
      publicationStatus: PublicationStatus.PUBLISHED,
      featured: true
    },
    {
      kind: ContentKind.HERITAGE,
      title: "Ambahan and Surat Mangyan",
      slug: "ambahan-and-surat-mangyan",
      summary: "A living Hanunuo Mangyan poetic and writing tradition associated with Mansalay and preserved through oral performance and inscriptions on bamboo.",
      description: "Ambahan is a poetic tradition often expressed in measured lines and shared through recitation. It has remained visible through Surat Mangyan, an indigenous writing system used for inscriptions including those made on bamboo tubes. Visitors should approach the tradition as living community knowledge, not merely as a souvenir design.",
      culturalSignificance: "Ambahan carries advice, memory, relationships, humor, and community values while Surat Mangyan demonstrates the continuing life of an indigenous Philippine script.",
      historicalBackground: "National Living Treasure Ginaw Bilog, a Hanunuo Mangyan poet from Mansalay, helped preserve and bring wider recognition to the ambahan tradition.",
      payload: {
        location: "Mansalay, Oriental Mindoro",
        sourceUrl: "https://ncca.gov.ph/about-culture-and-arts/culture-profile/gamaba/national-living-treasures-ginaw-bilog/",
        imageUrl: "/images/products/ambahan-bamboo-keepsake.jpg"
      },
      publicationStatus: PublicationStatus.PUBLISHED,
      featured: true
    },
    {
      kind: ContentKind.HISTORICAL_SITE,
      title: "Mansalay Town Formation and Founding",
      slug: "mansalay-town-formation-and-founding",
      summary: "The story of Mansalay's early settlement, changing seats of government, and establishment as an independent municipality on July 24, 1928.",
      description: "Mansalay's documented municipal history connects early coastal settlement, the Spanish and American periods, local leadership, and the eventual creation of a separate municipality. The present town grew around the community that became the nucleus of modern Mansalay.",
      historicalBackground: "Mansalay became an independent town on July 24, 1928 under Act No. 3498. The anniversary remains an important point for civic history and local identity.",
      payload: {
        location: "Poblacion, Mansalay, Oriental Mindoro",
        sourceUrl: "https://www.travelorientalmindoro.ph/municipality/mansalay/history",
        imageUrl: "/images/experiences/mansalay-history-art.png"
      },
      publicationStatus: PublicationStatus.PUBLISHED,
      featured: true
    },
    {
      kind: ContentKind.TRADITION,
      title: "Palaro ng Lahi",
      slug: "palaro-ng-lahi-mansalay",
      summary: "Traditional community games that bring generations together during cultural celebrations and town gatherings.",
      description: "Palaro ng Lahi programs feature familiar Filipino and local games that emphasize teamwork, skill, friendly competition, and participation across age groups. They have been associated with Pamugu-an and Mansalay community celebrations.",
      culturalSignificance: "The games turn cultural celebration into active participation and provide a welcoming way for younger generations to learn through community experience.",
      payload: {
        location: "Mansalay, Oriental Mindoro",
        sourceUrl: "https://aroundph.com/festivals/pamuguan-festival",
        imageUrl: "/images/experiences/palaro-ng-lahi-art.png"
      },
      publicationStatus: PublicationStatus.PUBLISHED,
      featured: false
    },
    {
      kind: ContentKind.TRADITION,
      title: "Barakalan Native Products Market",
      slug: "barakalan-native-products-market",
      summary: "A community market tradition associated with Pamugu-an where native products and demonstrations connect culture with livelihood.",
      description: "The Barakalan or baratillo gives makers a place to demonstrate, present, and sell native products during the celebration. It connects visitors with the skill, time, and local materials behind cultural craft while supporting community livelihood.",
      culturalSignificance: "Responsible cultural commerce should preserve maker attribution, fair pricing, consent, and honest descriptions of materials and meaning.",
      payload: {
        location: "Mansalay, Oriental Mindoro",
        sourceUrl: "https://aroundph.com/festivals/pamuguan-festival",
        imageUrl: "/images/experiences/pamuguan-market-art.png"
      },
      publicationStatus: PublicationStatus.PUBLISHED,
      featured: false
    },
    {
      kind: ContentKind.EVENT,
      title: "Pamugu-an Cultural Week",
      slug: "pamugu-an-cultural-week",
      summary: "A traditional October cultural week of Mangyan reunion, indigenous games, presentations, demonstrations, and native products.",
      description: "Plan for Palaro ng Lahi, cultural presentations, product demonstrations, and the Barakalan native-products market. Confirm the current-year program and access guidance with the Mansalay Municipal Tourism Office before travelling.",
      culturalSignificance: "The week highlights cultural exchange, community participation, and artisan livelihood.",
      payload: {
        location: "Mansalay, Oriental Mindoro",
        eventDate: "Traditionally the third week of October",
        sourceUrl: "https://aroundph.com/festivals/pamuguan-festival",
        imageUrl: "/images/experiences/pamuguan-market-art.png"
      },
      publicationStatus: PublicationStatus.PUBLISHED,
      featured: true
    },
    {
      kind: ContentKind.EVENT,
      title: "Mangyan Festival Cultural Program",
      slug: "mangyan-festival-cultural-program",
      summary: "Mansalay's November 25 program of indigenous dances, cultural presentations, traditional crafts, tribal rituals, and heritage activities.",
      description: "The municipal grounds become a meeting place for performances, presentations, craft, and community heritage. Visitors should follow organizer guidance and ask permission before photographing people or cultural activities.",
      culturalSignificance: "The program recognizes the Mangyan constituency and promotes the living identity of Hanunuo and Buhid communities in Mansalay.",
      payload: {
        location: "Mansalay Municipal Grounds",
        eventDate: "Every November 25",
        sourceUrl: "https://www.travelorientalmindoro.ph/festival/mangyan-festival",
        imageUrl: "/images/experiences/mangyan-festival-art.png"
      },
      publicationStatus: PublicationStatus.PUBLISHED,
      featured: true
    },
    {
      kind: ContentKind.EVENT,
      title: "Mansalay Founding Anniversary",
      slug: "mansalay-founding-anniversary",
      summary: "A July 24 civic commemoration of Mansalay becoming an independent municipality in 1928.",
      description: "The anniversary is an opportunity to introduce residents and visitors to Mansalay's municipal history, local leaders, community achievements, and continuing cultural life.",
      historicalBackground: "Mansalay became an independent town on July 24, 1928 under Act No. 3498.",
      payload: {
        location: "Mansalay, Oriental Mindoro",
        eventDate: "Every July 24",
        sourceUrl: "https://www.travelorientalmindoro.ph/municipality/mansalay/history",
        imageUrl: "/images/experiences/mansalay-history-art.png"
      },
      publicationStatus: PublicationStatus.PUBLISHED,
      featured: true
    },
    ...[
      ["Hanunuo Mangyan Ramit Textile", "Traditional Textiles", "A marketplace introduction to handwoven ramit textiles and the living knowledge carried through fiber preparation, weaving, and careful finishing.", "/images/products/ramit-textile.jpg", "hanunuo-mangyan-ramit-textile"],
      ["Handwoven Nito Basketry", "Basketry & Homeware", "Practical natural-fiber baskets that connect close handweaving, durable everyday design, and local artisan livelihood.", "/images/products/nito-basket.jpg", "handwoven-nito-basketry"],
      ["Mangyan Artisan Beadwork", "Beadwork & Accessories", "Contemporary beadwork presented with maker attribution, honest materials, and respect for community-held patterns and meaning.", "/images/products/beadwork-set.jpg", "mangyan-artisan-beadwork"],
      ["Ambahan Learning Keepsakes", "Cultural Keepsakes", "Educational bamboo keepsakes that open respectful conversations about ambahan and Surat Mangyan without reproducing or claiming a traditional poem.", "/images/products/ambahan-bamboo-keepsake.jpg", "ambahan-learning-keepsakes"]
    ].map(([title, category, description, imageUrl, slug]) => ({
      kind: ContentKind.LOCAL_PRODUCT,
      title,
      slug,
      summary: description,
      description: `${description} Product availability, artisan attribution, materials, and fulfillment are managed through the main CultureFrame marketplace.`,
      culturalSignificance: "CultureFrame promotes fair descriptions, maker consent, traceable attribution, and responsible support for local livelihoods.",
      payload: { category, imageUrl, marketplacePath: "/shop" },
      publicationStatus: PublicationStatus.PUBLISHED,
      featured: false
    }))
  ];
  for (const record of attractionRecords) {
    await prisma.contentRecord.upsert({
      where: { slug: record.slug },
      update: record,
      create: record
    });
  }

  const galleryRecords = [
    {
      filePath: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/96/Buktot_Beach%2C_Mansalay_in_the_afternoon_%28The_Wandering_Angel%29_-_Flickr.jpg/960px-Buktot_Beach%2C_Mansalay_in_the_afternoon_%28The_Wandering_Angel%29_-_Flickr.jpg",
      fileName: "buktot-beach-mansalay.jpg",
      mimeType: "image/jpeg",
      fileSize: 0,
      altText: "Buktot Beach in Mansalay, Oriental Mindoro after a light shower",
      caption: "Buktot Beach, one of Mansalay's documented coastal destinations.",
      photographer: "The Wandering Angel",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Buktot_Beach,_Mansalay_in_the_afternoon_(The_Wandering_Angel)_-_Flickr.jpg",
      license: "CC BY 2.0",
      permissionStatus: "APPROVED"
    },
    {
      filePath: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e1/Mansalay_road_and_public_market.jpg/960px-Mansalay_road_and_public_market.jpg",
      fileName: "mansalay-road-public-market.jpg",
      mimeType: "image/jpeg",
      fileSize: 0,
      altText: "A road in Mansalay with the public market in the background",
      caption: "Town life near the Mansalay public market.",
      photographer: "Hariboneagle927",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Mansalay_road_and_public_market.jpg",
      license: "CC BY-SA 4.0",
      permissionStatus: "APPROVED"
    }
  ];
  for (const media of galleryRecords) {
    const existing = await prisma.mediaAsset.findFirst({ where: { sourceUrl: media.sourceUrl } });
    if (existing) await prisma.mediaAsset.update({ where: { id: existing.id }, data: media });
    else await prisma.mediaAsset.create({ data: media });
  }
}

main().finally(() => prisma.$disconnect());
