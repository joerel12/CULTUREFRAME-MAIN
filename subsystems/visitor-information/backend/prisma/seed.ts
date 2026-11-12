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
      payload: { location: destination.address, sourceUrl: destination.sourceUrl },
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
        sourceUrl: "https://www.travelorientalmindoro.ph/place/oriental-mindoro-heritage-and-cultural-center"
      },
      publicationStatus: PublicationStatus.PUBLISHED,
      featured: true
    }
  ];
  for (const record of attractionRecords) {
    await prisma.contentRecord.upsert({
      where: { slug: record.slug },
      update: {},
      create: record
    });
  }
}

main().finally(() => prisma.$disconnect());
