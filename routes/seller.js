/*
  CultureFrame — Seller Routes
  All routes are prefixed with /seller (mounted in routes/index.js)
*/

import express from "express";
import { uploadProductImage } from "../middleware/upload.js";
import {
  dashboardPage,
  productsPage,
  addProductPage,
  addProductPost,
  editProductPage,
  editProductPost,
  deleteProductPost,
  categoriesPage,
  addCategoryPost,
  deleteCategoryPost
} from "../controllers/sellerController.js";

const router = express.Router();

// Redirect /seller → /seller/dashboard
router.get("/", (req, res) => res.redirect("/seller/dashboard"));

// Dashboard
router.get("/dashboard", dashboardPage);

// Products listing
router.get("/products", productsPage);

// Add product
router.get("/products/add",  addProductPage);
router.post("/products/add", uploadProductImage, addProductPost);

// Edit product — :id is validated as integer in the controller
router.get("/products/edit/:id",  editProductPage);
router.post("/products/edit/:id", uploadProductImage, editProductPost);

// Delete product — POST only (GET would allow accidental deletion via prefetch/link)
router.post("/products/delete/:id", deleteProductPost);

// Categories
router.get("/categories",               categoriesPage);
router.post("/categories/add",          addCategoryPost);
router.post("/categories/delete/:id",   deleteCategoryPost);

export default router;
