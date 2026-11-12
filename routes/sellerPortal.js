import express from "express";
import { requireSeller } from "../middleware/requireSeller.js";
import { uploadProductImage } from "../middleware/productImageUpload.js";
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
  walkInPage
} from "../controllers/sellerPortalController.js";

const router = express.Router();

router.use(requireSeller);
router.get("/", (_req, res) => res.redirect("/seller/dashboard"));
router.get("/dashboard", dashboardPage);
router.get("/walk-in", walkInPage);
router.post("/walk-in", createWalkInSale);
router.get("/products", productsPage);
router.get("/products/add", addProductPage);
router.post("/products/add", uploadProductImage, addProduct);
router.get("/products/edit/:id", editProductPage);
router.post("/products/edit/:id", uploadProductImage, editProduct);
router.post("/products/delete/:id", deleteProduct);
router.get("/categories", categoriesPage);
router.post("/categories/add", addCategory);
router.post("/categories/delete/:id", deleteCategory);

export default router;
