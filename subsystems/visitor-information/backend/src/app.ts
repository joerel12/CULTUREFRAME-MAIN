import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { Prisma, PrismaClient, ContentKind, PublicationStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import multer from "multer";
import { z } from "zod";

export const prisma = new PrismaClient();
export const app = express();
const sessionCookie = "cultureframe_session";
const sessionSecret = process.env.SESSION_SECRET ?? (process.env.NODE_ENV === "test" ? "cultureframe-test-secret-not-for-production-32" : undefined);
if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error("SESSION_SECRET must contain at least 32 characters.");
}

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.resolve("uploads"), { maxAge: "1d", dotfiles: "deny" }));
const authActionLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
app.get("/api/health/live", (_req, res) => res.json({ status: "ok" }));

type AuthUser = { id: string; email: string; firstName: string; lastName: string; role: UserRole };
declare global {
  namespace Express {
    interface Request { user?: AuthUser; sessionId?: string }
  }
}

const asyncRoute = (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => { void handler(req, res, next).catch(next); };
app.get("/api/health", asyncRoute(async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Database readiness check failed:", error);
    res.status(503).json({ status: "error", database: "unavailable" });
  }
}));
const hashToken = (token: string) => crypto.createHmac("sha256", sessionSecret).update(token).digest("hex");
const safeUser = ({ id, email, firstName, lastName, role }: AuthUser) => ({ id, email, firstName, lastName, role });

const requireAuth = asyncRoute(async (req, res, next) => {
  const token = req.cookies[sessionCookie];
  if (!token) return res.status(401).json({ error: "Authentication required." });
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true }
  });
  if (!session || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") {
    if (session) await prisma.authSession.delete({ where: { id: session.id } });
    res.clearCookie(sessionCookie, cookieOptions());
    return res.status(401).json({ error: "Session expired. Please sign in again." });
  }
  req.user = session.user;
  req.sessionId = session.id;
  next();
});
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== UserRole.ADMIN) return res.status(403).json({ error: "Administrator access required." });
  next();
};
const admin = [requireAuth, requireAdmin] as const;
const cookieOptions = () => ({
  httpOnly: true, secure: process.env.COOKIE_SECURE === "true", sameSite: "strict" as const,
  path: "/", maxAge: 7 * 24 * 60 * 60 * 1000
});

app.post("/api/auth/login", authActionLimiter, asyncRoute(async (req, res) => {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a valid email and password." });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || user.role !== UserRole.ADMIN || user.status !== "ACTIVE" || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }
  const token = crypto.randomBytes(32).toString("base64url");
  await prisma.authSession.create({
    data: { tokenHash: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + cookieOptions().maxAge) }
  });
  res.cookie(sessionCookie, token, cookieOptions());
  res.json({ user: safeUser(user), redirect: "/admin/dashboard" });
}));

app.post("/api/auth/logout", requireAuth, asyncRoute(async (req, res) => {
  if (req.sessionId) await prisma.authSession.delete({ where: { id: req.sessionId } });
  res.clearCookie(sessionCookie, cookieOptions());
  res.json({ message: "Signed out." });
}));
app.get("/api/auth/me", requireAuth, (req, res) => res.json({ user: safeUser(req.user!) }));

app.post("/api/auth/forgot-password", authActionLimiter, asyncRoute(async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a valid email address." });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (user) {
    const token = crypto.randomBytes(32).toString("base64url");
    await prisma.passwordResetToken.create({
      data: { email: user.email, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 30 * 60 * 1000) }
    });
    if (process.env.NODE_ENV !== "production") console.info(`Password reset URL: ${process.env.FRONTEND_ORIGIN ?? "http://localhost:5173"}/reset-password?token=${token}`);
  }
  res.json({ message: "If an account exists for that email, reset instructions have been issued." });
}));
app.post("/api/auth/reset-password", authActionLimiter, asyncRoute(async (req, res) => {
  const parsed = z.object({ token: z.string().min(20), password: z.string().min(10).max(128) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "The reset token or new password is invalid." });
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(parsed.data.token) } });
  if (!record || record.expiresAt <= new Date()) return res.status(400).json({ error: "The reset link is invalid or expired." });
  await prisma.$transaction([
    prisma.user.update({ where: { email: record.email }, data: { passwordHash: await bcrypt.hash(parsed.data.password, 12) } }),
    prisma.passwordResetToken.delete({ where: { id: record.id } }),
    prisma.authSession.deleteMany({ where: { user: { email: record.email } } })
  ]);
  res.json({ message: "Password updated. Please sign in." });
}));

const kinds: Record<string, ContentKind> = {
  heritage: ContentKind.HERITAGE, "historical-sites": ContentKind.HISTORICAL_SITE,
  traditions: ContentKind.TRADITION, events: ContentKind.EVENT, attractions: ContentKind.ATTRACTION,
  festivals: ContentKind.FESTIVAL, "local-products": ContentKind.LOCAL_PRODUCT
};
const contentSchema = z.object({
  kind: z.nativeEnum(ContentKind).optional(),
  title: z.string().trim().min(2).max(180),
  slug: z.string().trim().min(2).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  summary: z.string().max(500).optional(),
  description: z.string().max(20000).optional(),
  culturalSignificance: z.string().max(10000).optional(),
  historicalBackground: z.string().max(10000).optional(),
  publicationStatus: z.nativeEnum(PublicationStatus).optional(),
  featured: z.boolean().optional(),
  payload: z.record(z.union([z.string(), z.number(), z.boolean()])).optional()
});

function contentFilter(kind?: ContentKind, publicOnly = true) {
  return { ...(kind ? { kind } : {}), ...(publicOnly ? { publicationStatus: PublicationStatus.PUBLISHED } : {}) };
}
app.get("/api/home", asyncRoute(async (_req, res) => {
  const [values, featured, upcoming] = await Promise.all([
    prisma.homepageContent.findMany(),
    prisma.contentRecord.findMany({ where: { ...contentFilter(undefined), featured: true }, take: 6, orderBy: { updatedAt: "desc" } }),
    prisma.contentRecord.findMany({ where: { ...contentFilter(ContentKind.EVENT), featured: true }, take: 3, orderBy: { createdAt: "desc" } })
  ]);
  res.json({ content: Object.fromEntries(values.map((item) => [item.key, item.value])), featured, upcoming });
}));
app.get("/api/search", asyncRoute(async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const kind = typeof req.query.category === "string" ? kinds[req.query.category] : undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const take = Math.min(30, Math.max(1, Number(req.query.limit) || 9));
  const where = {
    ...contentFilter(kind),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { summary: { contains: q, mode: "insensitive" as const } }, { description: { contains: q, mode: "insensitive" as const } }] } : {})
  };
  const [items, total] = await Promise.all([
    prisma.contentRecord.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * take, take }),
    prisma.contentRecord.count({ where })
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / take) });
}));

for (const [segment, kind] of Object.entries(kinds)) {
  app.get(`/api/admin/${segment}`, ...admin, asyncRoute(async (_req, res) => {
    res.json({ items: await prisma.contentRecord.findMany({ where: { kind }, orderBy: { updatedAt: "desc" } }) });
  }));
  app.post(`/api/admin/${segment}`, ...admin, asyncRoute(async (req, res) => {
    const parsed = contentSchema.omit({ kind: true }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Please correct the record.", details: parsed.error.flatten() });
    const item = await prisma.contentRecord.create({ data: { ...parsed.data, kind, createdById: req.user!.id } });
    await prisma.auditLog.create({ data: { userId: req.user!.id, action: "CREATE", entity: "ContentRecord", entityId: item.id } });
    res.status(201).json({ item });
  }));
  app.patch(`/api/admin/${segment}/:id`, ...admin, asyncRoute(async (req, res) => {
    const parsed = contentSchema.omit({ kind: true }).partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Please correct the record.", details: parsed.error.flatten() });
    const existing = await prisma.contentRecord.findFirst({ where: { id: req.params.id, kind } });
    if (!existing) return res.status(404).json({ error: "Record not found." });
    const item = await prisma.contentRecord.update({ where: { id: existing.id }, data: parsed.data });
    await prisma.auditLog.create({ data: { userId: req.user!.id, action: "UPDATE", entity: "ContentRecord", entityId: item.id } });
    res.json({ item });
  }));
  app.delete(`/api/admin/${segment}/:id`, ...admin, asyncRoute(async (req, res) => {
    const existing = await prisma.contentRecord.findFirst({ where: { id: req.params.id, kind } });
    if (!existing) return res.status(404).json({ error: "Record not found." });
    await prisma.contentRecord.delete({ where: { id: existing.id } });
    await prisma.auditLog.create({ data: { userId: req.user!.id, action: "DELETE", entity: "ContentRecord", entityId: existing.id } });
    res.status(204).end();
  }));
  app.get(`/api/${segment}`, asyncRoute(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const take = Math.min(30, Math.max(1, Number(req.query.limit) || 12));
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const where = { ...contentFilter(kind), ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { summary: { contains: q, mode: "insensitive" as const } }] } : {}) };
    const [items, total] = await Promise.all([
      prisma.contentRecord.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * take, take }),
      prisma.contentRecord.count({ where })
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / take) });
  }));
  app.get(`/api/${segment}/:slug`, asyncRoute(async (req, res) => {
    const item = await prisma.contentRecord.findFirst({ where: { slug: req.params.slug, ...contentFilter(kind) } });
    if (!item) return res.status(404).json({ error: "This published record could not be found." });
    res.json({ item });
  }));
}

app.get("/api/gallery", asyncRoute(async (_req, res) => {
  res.json({ items: await prisma.mediaAsset.findMany({ where: { permissionStatus: "APPROVED" }, orderBy: { createdAt: "desc" } }) });
}));
app.get("/api/locations", asyncRoute(async (_req, res) => {
  res.json({ items: await prisma.location.findMany({ orderBy: { name: "asc" } }) });
}));

const feedbackLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });
app.post("/api/visitor/feedback", feedbackLimiter, asyncRoute(async (req, res) => {
  const parsed = z.object({
    category: z.string().min(2).max(80), subject: z.string().trim().min(3).max(160),
    rating: z.number().int().min(1).max(5), message: z.string().trim().min(10).max(5000),
    relatedHeritageId: z.string().optional()
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please correct the feedback form.", details: parsed.error.flatten() });
  const feedback = await prisma.visitorFeedback.create({ data: { ...parsed.data, userId: req.user?.id ?? null } });
  res.status(201).json({ feedback, message: "Thank you. Your feedback has been submitted." });
}));

const uploadDirectory = path.resolve("uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });
const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (_req, file, callback) => callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
});
const upload = multer({
  storage, limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) return callback(new Error("Only JPG, PNG, and WebP images are allowed."));
    callback(null, true);
  }
});

app.get("/api/admin/dashboard", ...admin, asyncRoute(async (_req, res) => {
  const [administrators, contents, feedback, media, byKind, recentFeedback] = await Promise.all([
    prisma.user.count({ where: { role: UserRole.ADMIN } }),
    prisma.contentRecord.count(),
    prisma.visitorFeedback.count(),
    prisma.mediaAsset.count(),
    prisma.contentRecord.groupBy({ by: ["kind"], _count: { _all: true } }),
    prisma.visitorFeedback.findMany({ take: 6, orderBy: { createdAt: "desc" }, include: { user: { select: { firstName: true, lastName: true } } } })
  ]);
  res.json({ administrators, contents, feedback, media, byKind, recentFeedback });
}));
app.get("/api/admin/content", ...admin, asyncRoute(async (req, res) => {
  const rawKind = typeof req.query.kind === "string" ? req.query.kind : "";
  const kind = Object.values(ContentKind).includes(rawKind as ContentKind) ? rawKind as ContentKind : kinds[rawKind];
  const items = await prisma.contentRecord.findMany({ where: kind ? { kind } : {}, orderBy: { updatedAt: "desc" } });
  res.json({ items });
}));
app.post("/api/admin/content", ...admin, asyncRoute(async (req, res) => {
  const parsed = contentSchema.safeParse(req.body);
  if (!parsed.success || !parsed.data.kind) return res.status(400).json({ error: "A valid content type and complete record are required.", details: parsed.success ? undefined : parsed.error.flatten() });
  const item = await prisma.contentRecord.create({ data: { ...parsed.data, kind: parsed.data.kind, createdById: req.user!.id } });
  await prisma.auditLog.create({ data: { userId: req.user!.id, action: "CREATE", entity: "ContentRecord", entityId: item.id } });
  res.status(201).json({ item });
}));
app.patch("/api/admin/content/:id", ...admin, asyncRoute(async (req, res) => {
  const parsed = contentSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please correct the record.", details: parsed.error.flatten() });
  const item = await prisma.contentRecord.update({ where: { id: req.params.id }, data: parsed.data });
  await prisma.auditLog.create({ data: { userId: req.user!.id, action: "UPDATE", entity: "ContentRecord", entityId: item.id } });
  res.json({ item });
}));
app.delete("/api/admin/content/:id", ...admin, asyncRoute(async (req, res) => {
  await prisma.contentRecord.delete({ where: { id: req.params.id } });
  await prisma.auditLog.create({ data: { userId: req.user!.id, action: "DELETE", entity: "ContentRecord", entityId: req.params.id } });
  res.status(204).end();
}));
app.get("/api/admin/homepage", ...admin, asyncRoute(async (_req, res) => {
  res.json({ content: Object.fromEntries((await prisma.homepageContent.findMany()).map((item) => [item.key, item.value])) });
}));
app.patch("/api/admin/homepage", ...admin, asyncRoute(async (req, res) => {
  const entries = z.record(z.union([z.string().max(2000), z.array(z.string()), z.number(), z.boolean()])).safeParse(req.body);
  if (!entries.success) return res.status(400).json({ error: "Homepage fields must contain supported values." });
  await prisma.$transaction(Object.entries(entries.data).map(([key, value]) => prisma.homepageContent.upsert({
    where: { key }, update: { value }, create: { key, value }
  })));
  res.json({ content: Object.fromEntries((await prisma.homepageContent.findMany()).map((item) => [item.key, item.value])) });
}));
app.get("/api/admin/feedback", ...admin, asyncRoute(async (_req, res) => {
  res.json({ items: await prisma.visitorFeedback.findMany({ orderBy: { createdAt: "desc" }, include: { user: { select: { firstName: true, lastName: true, email: true } } } }) });
}));
app.patch("/api/admin/feedback/:id", ...admin, asyncRoute(async (req, res) => {
  const parsed = z.object({ status: z.enum(["NEW", "REVIEWED", "RESOLVED"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid feedback status." });
  res.json({ item: await prisma.visitorFeedback.update({ where: { id: req.params.id }, data: parsed.data }) });
}));
app.get("/api/admin/media", ...admin, asyncRoute(async (_req, res) => {
  res.json({ items: await prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" } }) });
}));
app.post("/api/admin/media", ...admin, upload.single("image"), asyncRoute(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Choose an image to upload." });
  const parsed = z.object({
    altText: z.string().max(300).optional(), caption: z.string().max(1000).optional(),
    photographer: z.string().max(200).optional(), sourceUrl: z.string().url().optional(),
    license: z.string().max(120).optional(), permissionStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional()
  }).safeParse(req.body);
  if (!parsed.success) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "Invalid image attribution details.", details: parsed.error.flatten() });
  }
  const media = await prisma.mediaAsset.create({
    data: { filePath: `/uploads/${req.file.filename}`, fileName: req.file.originalname, mimeType: req.file.mimetype,
      fileSize: req.file.size, uploadedById: req.user!.id, ...parsed.data }
  });
  res.status(201).json({ item: media });
}));
app.get("/api/admin/locations", ...admin, asyncRoute(async (_req, res) => res.json({ items: await prisma.location.findMany({ orderBy: { name: "asc" } }) })));
app.post("/api/admin/locations", ...admin, asyncRoute(async (req, res) => {
  const parsed = z.object({ name: z.string().min(2).max(180), address: z.string().max(500).optional(), description: z.string().max(5000).optional(), latitude: z.number().min(-90).max(90).nullable().optional(), longitude: z.number().min(-180).max(180).nullable().optional(), verified: z.boolean().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid location details.", details: parsed.error.flatten() });
  res.status(201).json({ item: await prisma.location.create({ data: parsed.data }) });
}));
app.get("/api/admin/audit-logs", ...admin, asyncRoute(async (_req, res) => res.json({ items: await prisma.auditLog.findMany({ take: 100, orderBy: { createdAt: "desc" }, include: { user: { select: { email: true } } } }) })));

app.use((req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.path}` }));
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof multer.MulterError) return res.status(400).json({ error: error.message });
  if (error instanceof Error && error.message.startsWith("Only JPG")) return res.status(400).json({ error: error.message });
  if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return res.status(409).json({ error: "A record with that unique value already exists." });
  console.error(error);
  if (error instanceof Prisma.PrismaClientInitializationError || (typeof error === "object" && error !== null && "code" in error && error.code === "P1001")) {
    return res.status(503).json({ error: "The database is unavailable. Start PostgreSQL, apply the database migrations, and seed the administrator account before signing in." });
  }
  res.status(500).json({ error: "An unexpected server error occurred." });
});
