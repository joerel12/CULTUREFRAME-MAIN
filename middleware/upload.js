/*
  CultureFrame — Secure Product Image Upload Middleware

  Two-layer validation:
  ┌─────────────────────────────────────────────────────────────────────┐
  │  Layer 1 (multer fileFilter)                                        │
  │    Checks req.file.mimetype — fast rejection of obvious mismatches  │
  │    but NOT trusted alone because browsers can spoof it.             │
  │                                                                     │
  │  Layer 2 (verifyImageMagicBytes)                                    │
  │    Reads the first 12 bytes of the saved file and matches against   │
  │    known magic-byte signatures for JPEG, PNG, WebP.                 │
  │    File is deleted immediately if the bytes don't match.            │
  │    The safe extension is derived from the bytes, not the filename.  │
  └─────────────────────────────────────────────────────────────────────┘

  Why this matters:
    An attacker could rename evil.php → product.jpg.  The browser sends
    mimetype "image/jpeg".  Layer 1 passes it.  Layer 2 reads the actual
    bytes: PHP starts with "<?", not FF D8.  The file is deleted.

  Express cannot execute static files as server-side code because:
    • express.static serves files from public/ as raw bytes
    • There is no PHP/CGI handler registered in this Express app
    • Multer saves to public/uploads/products/ — not to any script directory
    So even if a non-image slips through, it cannot run.  The magic-byte
    check is defense-in-depth.
*/

import multer  from "multer";
import path    from "path";
import fs      from "fs";
import { fileURLToPath } from "url";
import { dirname }       from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ── Configuration (edit here to change limits) ─────────────────────────
export const UPLOAD_CONFIG = {
  MAX_SIZE_MB:  3,
  UPLOAD_DIR:   path.join(__dirname, "../public/uploads/products"),
  ALLOWED_MIME: ["image/jpeg", "image/png", "image/webp"]
};

// ── Magic-byte signatures ──────────────────────────────────────────────
// Each entry: { ext, mime, bytes (hex), offset }
const MAGIC_SIGNATURES = [
  // JPEG:  FF D8 FF
  { ext: ".jpg",  mime: "image/jpeg", offset: 0, hex: "ffd8ff" },
  // PNG:   89 50 4E 47 0D 0A 1A 0A
  { ext: ".png",  mime: "image/png",  offset: 0, hex: "89504e470d0a1a0a" },
  // WebP:  RIFF????WEBP  (bytes 0-3 = RIFF, bytes 8-11 = WEBP)
  { ext: ".webp", mime: "image/webp", offset: 0, hex: "52494646",
    secondary: { offset: 8, hex: "57454250" } }
];

const READ_BYTES = 12;   // enough to cover all signatures above

/**
 * Reads the first READ_BYTES bytes of a saved file and matches against
 * MAGIC_SIGNATURES.  Returns { ok, ext, mime } or { ok: false, reason }.
 */
export function checkMagicBytes(filePath) {
  let buf;
  try {
    const fd = fs.openSync(filePath, "r");
    buf = Buffer.alloc(READ_BYTES);
    fs.readSync(fd, buf, 0, READ_BYTES, 0);
    fs.closeSync(fd);
  } catch (err) {
    return { ok: false, reason: "Could not read uploaded file." };
  }

  for (const sig of MAGIC_SIGNATURES) {
    const sigBuf = Buffer.from(sig.hex, "hex");
    const slice  = buf.slice(sig.offset, sig.offset + sigBuf.length);

    if (!slice.equals(sigBuf)) continue;

    // WebP needs secondary check
    if (sig.secondary) {
      const secBuf   = Buffer.from(sig.secondary.hex, "hex");
      const secSlice = buf.slice(sig.secondary.offset, sig.secondary.offset + secBuf.length);
      if (!secSlice.equals(secBuf)) continue;
    }

    return { ok: true, ext: sig.ext, mime: sig.mime };
  }

  return { ok: false, reason: "File does not match any accepted image format (JPEG, PNG, WebP)." };
}

/**
 * Deletes a file silently — used to clean up rejected uploads.
 */
export function deleteUploadedFile(filePath) {
  fs.unlink(filePath, () => {});   // fire-and-forget; no throw on error
}

// ── Multer configuration ───────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_CONFIG.UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    /*
     * Generate a safe filename using only timestamp + random number.
     * We use ".tmp" here; the correct extension is set AFTER magic-byte
     * verification in the controller, avoiding reliance on the original name.
     */
    const tmpName = Date.now() + "-" + Math.round(Math.random() * 1e9) + ".tmp";
    cb(null, tmpName);
  }
});

/*
 * Layer 1: coarse MIME filter.
 * Rejects obviously wrong types before they are written to disk.
 * Not trusted as the sole check — magic bytes are verified afterward.
 */
const fileFilter = (_req, file, cb) => {
  if (UPLOAD_CONFIG.ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Pass as a multer error so the route error handler catches it cleanly
    const err = new multer.MulterError("LIMIT_UNEXPECTED_FILE", "image");
    err.message = `File type "${file.mimetype}" is not accepted. Upload JPEG, PNG, or WebP only.`;
    cb(err);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize:  UPLOAD_CONFIG.MAX_SIZE_MB * 1024 * 1024,
    files:     1    // only one file per request
  }
});

/*
 * Exported middleware — handles a single "image" field.
 * Wraps multer.single() to convert multer errors into req.uploadError
 * so the controller can render the form with a friendly message instead
 * of crashing with a 500.
 */
export function uploadProductImage(req, res, next) {
  const handler = upload.single("image");

  handler(req, res, (err) => {
    if (!err) return next();

    // Clean up any partial file
    if (req.file) deleteUploadedFile(req.file.path);

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        req.uploadError = `Image is too large. Maximum size is ${UPLOAD_CONFIG.MAX_SIZE_MB} MB.`;
      } else {
        req.uploadError = err.message || "Invalid file upload.";
      }
      return next();   // let the controller handle it gracefully
    }

    // Unknown error — pass to Express error handler
    next(err);
  });
}
