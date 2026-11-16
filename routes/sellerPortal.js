import express from "express";
import multer from "multer";
import { requireSeller } from "../middleware/requireSeller.js";
import { uploadProductImage } from "../middleware/productImageUpload.js";
import { persistPublicUpload } from "../middleware/persistPublicUpload.js";
import {
  addCategory,
  addProduct,
  addProductPage,
  categoriesPage,
  createWalkInSale,
  dashboardPage,
  deleteCategory,
  deleteProduct,
  editProduct,
  editProductPage,
  productsPage,
  sellerOrderDetailPage,
  sellerOrdersPage,
  sellerPaymentProof,
  walkInPage
} from "../controllers/sellerPortalController.js";

const router = express.Router();
const walkInProofUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)
    ? callback(null, true) : callback(new Error("Attach a JPEG, PNG, or WebP payment receipt."))
});
const acceptWalkInProof = (req, res, next) => walkInProofUpload.single("payment_proof")(req, res, error => {
  if (!error) return next();
  req.flash("error_msg", error.code === "LIMIT_FILE_SIZE" ? "Payment receipt must be no larger than 5 MB." : "Attach a JPEG, PNG, or WebP payment receipt.");
  return res.redirect("/seller/walk-in");
});

router.use(requireSeller);
router.get("/", (_req, res) => res.redirect("/seller/dashboard"));
router.get("/dashboard", dashboardPage);
router.get("/walk-in", walkInPage);
router.post("/walk-in", acceptWalkInProof, createWalkInSale);
router.get("/orders", sellerOrdersPage);
router.get("/orders/:id", sellerOrderDetailPage);
router.get("/orders/:orderId/payments/:paymentId/proof", sellerPaymentProof);
router.get("/products", productsPage);
router.get("/products/add", addProductPage);
router.post("/products/add", uploadProductImage, persistPublicUpload, addProduct);
router.get("/products/edit/:id", editProductPage);
router.post("/products/edit/:id", uploadProductImage, persistPublicUpload, editProduct);
router.post("/products/delete/:id", deleteProduct);
router.get("/categories", categoriesPage);
router.post("/categories/add", addCategory);
router.post("/categories/delete/:id", deleteCategory);

export default router;
