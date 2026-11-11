import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error("Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters before seeding.");
  }
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
}

main().finally(() => prisma.$disconnect());
