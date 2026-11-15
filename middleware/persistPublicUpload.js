import fs from "node:fs/promises";
import path from "node:path";
import { StoredFile } from "../models/StoredFile.js";

export async function persistPublicUpload(req, _res, next) {
  if (!req.file || process.env.NODE_ENV !== "production") return next();
  try {
    const relativePath = path.relative(path.join(process.cwd(), "public", "uploads"), req.file.path).replaceAll("\\", "/");
    if (relativePath.startsWith("../") || path.isAbsolute(relativePath)) throw new Error("Invalid upload path");
    await StoredFile.upsert({
      key: `uploads/${relativePath}`,
      mimeType: req.file.mimetype,
      data: await fs.readFile(req.file.path)
    });
    next();
  } catch (error) {
    next(error);
  }
}
