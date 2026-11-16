import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { StoredFile } from "../models/StoredFile.js";

const proofDirectory = path.resolve(process.cwd(), "private-uploads", "payment-proofs");
const extensions = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

export const savePaymentProof = async file => {
  if (!file?.buffer?.length || !extensions[file.mimetype]) throw new Error("Attach a JPEG, PNG, or WebP payment receipt.");
  const proofFile = `${crypto.randomUUID()}${extensions[file.mimetype]}`;
  if (process.env.NODE_ENV === "production") {
    await StoredFile.create({ key: `payment-proofs/${proofFile}`, mimeType: file.mimetype, data: file.buffer });
  } else {
    await fs.promises.mkdir(proofDirectory, { recursive: true });
    await fs.promises.writeFile(path.join(proofDirectory, proofFile), file.buffer, { flag: "wx" });
  }
  return proofFile;
};

export const discardPaymentProof = async proofFile => {
  if (!proofFile) return;
  await StoredFile.destroy({ where: { key: `payment-proofs/${proofFile}` } }).catch(() => {});
  await fs.promises.unlink(path.join(proofDirectory, proofFile)).catch(() => {});
};

export const sendPaymentProof = async (payment, res) => {
  let notes = {};
  try { notes = JSON.parse(payment.notes || "{}"); } catch { notes = {}; }
  const proofFile = typeof notes.proofFile === "string" ? notes.proofFile : "";
  if (!/^[0-9a-f-]{36}\.(?:jpg|png|webp)$/.test(proofFile) || path.basename(proofFile) !== proofFile) {
    return res.status(404).send("Payment proof not found");
  }
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (process.env.NODE_ENV === "production") {
    const saved = await StoredFile.findByPk(`payment-proofs/${proofFile}`);
    if (!saved) return res.status(404).send("Payment proof not found");
    res.setHeader("Content-Type", saved.mimeType);
    return res.send(saved.data);
  }
  const proofPath = path.join(proofDirectory, proofFile);
  try { await fs.promises.access(proofPath, fs.constants.R_OK); }
  catch { return res.status(404).send("Payment proof not found"); }
  return res.sendFile(proofPath);
};
