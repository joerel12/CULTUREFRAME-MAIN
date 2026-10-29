/*
  CultureFrame — Seller Dashboard Controller
  Queries use Sequelize parameterised methods — no raw string interpolation
  of user input anywhere.  All user-supplied query params are validated
  against an allowed-values list before being used in ORDER BY.
*/

import { Op } from "sequelize";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Product, Category } from "../models/index.js";
import { checkMagicBytes, deleteUploadedFile, UPLOAD_CONFIG } from "../middleware/upload.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(fileURLToPath(import.meta.url));

function dirname(p) { return path.dirname(p); }

// ── Allowed sort columns — validated before use in ORDER BY ────────────
const ALLOWED_SORT = {
  name:       ["name",           "ASC"],
  name_desc:  ["name",           "DESC"],
  price:      ["price",          "ASC"],
  price_desc: ["price",          "DESC"],
  date:       ["created_at",     "DESC"],
  date_asc:   ["created_at",     "ASC"],
  stock:      ["stock_quantity", "DESC"],
  stock_asc:  ["stock_quantity", "ASC"]
};
const DEFAULT_SORT = ALLOWED_SORT.date;

// ── Dashboard ──────────────────────────────────────────────────────────
export const dashboardPage = async (req, res) => {
  try {
    const totalProducts  = await Product.count();
    const activeProducts = await Product.count({ where: { status: "active" } });
    const pendingProducts = await Product.count({ where: { status: "pending" } });
    const categoriesUsed = await Product.count({
      distinct: true,
      col: "category_id"
    });

    const recentProducts = await Product.findAll({
      limit: 5,
      order: [["created_at", "DESC"]],
      include: [{ model: Category, as: "category", attributes: ["name"] }]
    });

    // Flatten for the template
    const recentForTemplate = recentProducts.map(p => ({
      id:          p.id,
      name:        p.name,
      sku:         `CF-${String(p.id).padStart(4, "0")}`,
      category:    p.category?.name ?? "—",
      status:      p.status,
      statusClass: p.status,
      dateAdded:   p.created_at
    }));

    res.render("seller-dashboard", {
      title: "Dashboard",
      pageTitle: "Dashboard",
      activeDashboard: true,
      totalProducts,
      activeProducts,
      pendingProducts,
      categoriesUsed,
      recentProducts: recentForTemplate
    });
  } catch (err) {
    console.error("Dashboard error:", err.message);
    res.render("seller-dashboard", {
      title: "Dashboard",
      pageTitle: "Dashboard",
      activeDashboard: true,
      dbError: "Could not load dashboard data. Check that MySQL is running.",
      recentProducts: []
    });
  }
};

// ── My Products ────────────────────────────────────────────────────────
export const productsPage = async (req, res) => {
  // ── 1. Read + sanitise query params ────────────────────────────────
  const search   = (req.query.search   || "").trim().slice(0, 200);
  const catId    = parseInt(req.query.category, 10) || null;
  const status   = ["active", "inactive", "pending"].includes(req.query.status)
                     ? req.query.status
                     : null;
  const sortKey  = req.query.sort || "date";
  const [sortCol, sortDir] = ALLOWED_SORT[sortKey] ?? DEFAULT_SORT;

  // ── 2. Build safe WHERE clause using Sequelize Op ──────────────────
  const where = {};

  if (search)  where.name        = { [Op.like]: `%${search}%` };
  if (catId)   where.category_id = catId;
  if (status)  where.status      = status;

  try {
    // ── 3. Load categories for the filter dropdown ──────────────────
    const categories = await Category.findAll({
      where:  { is_active: true },
      order:  [["name", "ASC"]],
      attributes: ["id", "name"]
    });

    // ── 4. Query products with category JOIN ────────────────────────
    const products = await Product.findAll({
      where,
      order: [[sortCol, sortDir]],
      include: [{ model: Category, as: "category", attributes: ["name"] }]
    });

    // ── 5. Flatten for the template (no raw Sequelize objects in HBS)
    const rows = products.map(p => ({
      id:            p.id,
      name:          p.name,
      sku:           `CF-${String(p.id).padStart(4, "0")}`,
      categoryName:  p.category?.name ?? "—",
      price:         p.price,
      stock:         p.stock_quantity,
      imagePath:     p.image_path,
      status:        p.status,
      statusClass:   p.status,           // maps to cf-status--active etc.
      createdAt:     p.created_at
    }));

    res.render("seller-products", {
      title:      "My Products",
      pageTitle:  "My Products",
      activeProducts: true,
      products:   rows,
      categories: categories.map(c => ({
        id:       c.id,
        name:     c.name,
        selected: c.id === catId
      })),
      // Echo filters back so the form stays populated
      filters: {
        search,
        category: catId,
        status,
        sort: sortKey
      },
      totalCount: rows.length
    });

  } catch (err) {
    console.error("Products page error:", err.message);
    res.render("seller-products", {
      title:      "My Products",
      pageTitle:  "My Products",
      activeProducts: true,
      products:   [],
      categories: [],
      filters:    { search: "", category: null, status: null, sort: "date" },
      totalCount: 0,
      dbError:    "Could not load products. Check that MySQL is running and run npm run migrate."
    });
  }
};

// ── Add Product (GET) ──────────────────────────────────────────────────
export const addProductPage = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { is_active: true },
      order: [["name", "ASC"]]
    });
    res.render("seller-add-product", {
      title:            "Add Product",
      pageTitle:        "Add Product",
      activeAddProduct: true,
      categories:       categories.map(c => ({ id: c.id, name: c.name })),
      old:              {}    // empty repopulation object on fresh load
    });
  } catch (err) {
    console.error("Add product page error:", err.message);
    res.render("seller-add-product", {
      title:            "Add Product",
      pageTitle:        "Add Product",
      activeAddProduct: true,
      categories:       [],
      dbError:          "Could not load categories.",
      old:              {}
    });
  }
};

// ── Add Product (POST) ─────────────────────────────────────────────────
export const addProductPost = async (req, res) => {
  // Helper: reload the Add Product form with errors
  const reloadForm = async (errors, old) => {
    let categories = [];
    try {
      const cats = await Category.findAll({
        where: { is_active: true }, order: [["name", "ASC"]]
      });
      categories = cats.map(c => ({ id: c.id, name: c.name }));
    } catch (_) {}
    return res.render("seller-add-product", {
      title: "Add Product", pageTitle: "Add Product",
      activeAddProduct: true, categories, fieldErrors: errors, old
    });
  };

  // ── 1. Collect raw body values ────────────────────────────────────
  const name        = (req.body.name        || "").trim();
  const description = (req.body.description || "").trim();
  const categoryRaw = req.body.category;
  const priceRaw    = req.body.price;
  const stockRaw    = req.body.stock;
  const statusRaw   = req.body.status;

  const old = {
    name, description,
    category: parseInt(categoryRaw, 10) || "",
    price:    priceRaw,
    stock:    stockRaw,
    status:   statusRaw
  };

  // ── 2. Handle multer errors (oversized, wrong MIME) ───────────────
  if (req.uploadError) {
    return reloadForm([req.uploadError], old);
  }

  // ── 3. Magic-byte verification ────────────────────────────────────
  //    The file has been saved with a .tmp extension.
  //    Read its first bytes, confirm it is actually an image,
  //    then rename it with the correct extension derived from the bytes.
  let imagePath = null;

  if (req.file) {
    const magic = checkMagicBytes(req.file.path);

    if (!magic.ok) {
      // File failed magic-byte check — delete it immediately
      deleteUploadedFile(req.file.path);
      return reloadForm([`Upload rejected: ${magic.reason}`], old);
    }

    // Rename .tmp → correct extension derived from magic bytes (not filename)
    const finalName = req.file.filename.replace(/\.tmp$/, magic.ext);
    const finalPath = path.join(UPLOAD_CONFIG.UPLOAD_DIR, finalName);

    try {
      fs.renameSync(req.file.path, finalPath);
      imagePath = "uploads/products/" + finalName;
    } catch (err) {
      deleteUploadedFile(req.file.path);
      console.error("File rename error:", err.message);
      return reloadForm(["Could not save image file. Please try again."], old);
    }
  }

  // ── 4. Field validation ───────────────────────────────────────────
  const errors = [];

  if (!name || name.length < 2)
    errors.push("Product name is required (minimum 2 characters).");
  if (name.length > 200)
    errors.push("Product name must be 200 characters or fewer.");

  const categoryId = parseInt(categoryRaw, 10);
  if (!categoryRaw || isNaN(categoryId) || categoryId < 1)
    errors.push("Please select a valid category.");

  const price = parseFloat(priceRaw);
  if (priceRaw === undefined || priceRaw === "" || isNaN(price))
    errors.push("Price is required.");
  else if (price < 0)
    errors.push("Price cannot be negative.");
  else if (price > 99999999.99)
    errors.push("Price exceeds the maximum allowed value.");

  const stock = parseInt(stockRaw, 10);
  if (stockRaw !== undefined && stockRaw !== "" && (isNaN(stock) || stock < 0))
    errors.push("Stock quantity cannot be negative.");

  const ALLOWED_STATUS = ["active", "inactive"];
  if (!ALLOWED_STATUS.includes(statusRaw))
    errors.push("Invalid status value.");

  if (errors.length > 0) {
    // Delete the renamed image if field validation then fails
    if (imagePath) deleteUploadedFile(path.join(UPLOAD_CONFIG.UPLOAD_DIR, path.basename(imagePath)));
    return reloadForm(errors, old);
  }

  // ── 5. Confirm category exists in DB (prevents spoofed IDs) ──────
  try {
    const validCat = await Category.findOne({
      where: { id: categoryId, is_active: true }
    });
    if (!validCat) {
      if (imagePath) deleteUploadedFile(path.join(UPLOAD_CONFIG.UPLOAD_DIR, path.basename(imagePath)));
      return reloadForm(["Selected category does not exist."], old);
    }
  } catch (err) {
    console.error("Category lookup error:", err.message);
  }

  // ── 6. Save to MySQL via Sequelize parameterised create() ─────────
  try {
    const product = await Product.create({
      seller_id:      1,     // DEV PLACEHOLDER — replace with session.userId when auth is built
      category_id:    categoryId,
      name,
      description:    description || null,
      price:          price.toFixed(2),
      stock_quantity: isNaN(stock) ? 0 : stock,
      image_path:     imagePath,
      status:         statusRaw
    });

    console.log(`✅ Product saved: ID ${product.id} — "${product.name}" | image: ${imagePath ?? "none"}`);
    req.flash("success_msg", `Product "${product.name}" added successfully.`);
    res.redirect("/seller/products");

  } catch (err) {
    console.error("Product create error:", err.message);
    if (imagePath) deleteUploadedFile(path.join(UPLOAD_CONFIG.UPLOAD_DIR, path.basename(imagePath)));
    return reloadForm(["Database error: could not save product. Please try again."], old);
  }
};

// ── Edit Product (GET) ─────────────────────────────────────────────────
export const editProductPage = async (req, res) => {
  const productId = parseInt(req.params.id, 10);
  if (!productId || productId < 1) {
    return res.redirect("/seller/products");
  }

  try {
    const [product, categories] = await Promise.all([
      Product.findByPk(productId, {
        include: [{ model: Category, as: "category", attributes: ["name"] }]
      }),
      Category.findAll({ where: { is_active: true }, order: [["name", "ASC"]] })
    ]);

    if (!product) {
      req.flash("error_msg", "Product not found.");
      return res.redirect("/seller/products");
    }

    res.render("seller-edit-product", {
      title:          "Edit Product",
      pageTitle:      "Edit Product",
      activeProducts: true,
      categories:     categories.map(c => ({ id: c.id, name: c.name })),
      product: {
        id:          product.id,
        name:        product.name,
        description: product.description ?? "",
        category_id: product.category_id,
        price:       product.price,
        stock:       product.stock_quantity,
        imagePath:   product.image_path,
        status:      product.status
      }
    });
  } catch (err) {
    console.error("Edit product page error:", err.message);
    req.flash("error_msg", "Could not load product.");
    res.redirect("/seller/products");
  }
};

// ── Edit Product (POST) ────────────────────────────────────────────────
export const editProductPost = async (req, res) => {
  const productId = parseInt(req.params.id, 10);
  if (!productId || productId < 1) {
    return res.redirect("/seller/products");
  }

  // Helper: reload the edit form with errors
  const reloadForm = async (errors, old, currentImagePath) => {
    let categories = [];
    try {
      const cats = await Category.findAll({
        where: { is_active: true }, order: [["name", "ASC"]]
      });
      categories = cats.map(c => ({ id: c.id, name: c.name }));
    } catch (_) {}
    return res.render("seller-edit-product", {
      title: "Edit Product", pageTitle: "Edit Product",
      activeProducts: true, categories,
      fieldErrors: errors,
      product: { ...old, id: productId, imagePath: currentImagePath }
    });
  };

  // ── 1. Load existing product first ───────────────────────────────
  let existingProduct;
  try {
    existingProduct = await Product.findByPk(productId);
    if (!existingProduct) {
      req.flash("error_msg", "Product not found.");
      return res.redirect("/seller/products");
    }
  } catch (err) {
    console.error("Product lookup error:", err.message);
    req.flash("error_msg", "Database error. Please try again.");
    return res.redirect("/seller/products");
  }

  // ── 2. Collect raw body values ────────────────────────────────────
  const name        = (req.body.name        || "").trim();
  const description = (req.body.description || "").trim();
  const categoryRaw = req.body.category;
  const priceRaw    = req.body.price;
  const stockRaw    = req.body.stock;
  const statusRaw   = req.body.status;

  const old = {
    name, description,
    category_id: parseInt(categoryRaw, 10) || "",
    price:       priceRaw,
    stock:       stockRaw,
    status:      statusRaw
  };

  // ── 3. Handle multer upload errors ───────────────────────────────
  if (req.uploadError) {
    return reloadForm([req.uploadError], old, existingProduct.image_path);
  }

  // ── 4. Process new image if uploaded ─────────────────────────────
  let newImagePath = null;   // null = keep existing

  if (req.file) {
    const magic = checkMagicBytes(req.file.path);

    if (!magic.ok) {
      deleteUploadedFile(req.file.path);
      return reloadForm(
        [`Upload rejected: ${magic.reason}`],
        old, existingProduct.image_path
      );
    }

    // Rename .tmp → extension from magic bytes
    const finalName = req.file.filename.replace(/\.tmp$/, magic.ext);
    const finalPath = path.join(UPLOAD_CONFIG.UPLOAD_DIR, finalName);

    try {
      fs.renameSync(req.file.path, finalPath);
      newImagePath = "uploads/products/" + finalName;
    } catch (err) {
      deleteUploadedFile(req.file.path);
      console.error("File rename error:", err.message);
      return reloadForm(
        ["Could not save image file. Please try again."],
        old, existingProduct.image_path
      );
    }
  }

  // ── 5. Field validation ───────────────────────────────────────────
  const errors = [];

  if (!name || name.length < 2)
    errors.push("Product name is required (minimum 2 characters).");
  if (name.length > 200)
    errors.push("Product name must be 200 characters or fewer.");

  const categoryId = parseInt(categoryRaw, 10);
  if (!categoryRaw || isNaN(categoryId) || categoryId < 1)
    errors.push("Please select a valid category.");

  const price = parseFloat(priceRaw);
  if (priceRaw === undefined || priceRaw === "" || isNaN(price))
    errors.push("Price is required.");
  else if (price < 0)
    errors.push("Price cannot be negative.");
  else if (price > 99999999.99)
    errors.push("Price exceeds the maximum allowed value.");

  const stock = parseInt(stockRaw, 10);
  if (stockRaw !== undefined && stockRaw !== "" && (isNaN(stock) || stock < 0))
    errors.push("Stock quantity cannot be negative.");

  const ALLOWED_STATUS = ["active", "inactive"];
  if (!ALLOWED_STATUS.includes(statusRaw))
    errors.push("Invalid status value.");

  if (errors.length > 0) {
    if (newImagePath) deleteUploadedFile(path.join(UPLOAD_CONFIG.UPLOAD_DIR, path.basename(newImagePath)));
    return reloadForm(errors, old, existingProduct.image_path);
  }

  // ── 6. Confirm category exists in DB ─────────────────────────────
  try {
    const validCat = await Category.findOne({
      where: { id: categoryId, is_active: true }
    });
    if (!validCat) {
      if (newImagePath) deleteUploadedFile(path.join(UPLOAD_CONFIG.UPLOAD_DIR, path.basename(newImagePath)));
      return reloadForm(["Selected category does not exist."], old, existingProduct.image_path);
    }
  } catch (err) {
    console.error("Category lookup error:", err.message);
  }

  // ── 7. Update the product record ──────────────────────────────────
  try {
    const oldImagePath = existingProduct.image_path;

    existingProduct.name           = name;
    existingProduct.description    = description || null;
    existingProduct.category_id    = categoryId;
    existingProduct.price          = price.toFixed(2);
    existingProduct.stock_quantity = isNaN(stock) ? 0 : stock;
    existingProduct.status         = statusRaw;

    // Only update image_path if a new valid image was uploaded
    if (newImagePath) {
      existingProduct.image_path = newImagePath;
    }

    await existingProduct.save();

    // Delete the old image file only after a successful save and only
    // if a new image replaced it — never delete if save fails
    if (newImagePath && oldImagePath) {
      deleteUploadedFile(path.join(UPLOAD_CONFIG.UPLOAD_DIR, path.basename(oldImagePath)));
    }

    console.log(`✅ Product updated: ID ${existingProduct.id} — "${existingProduct.name}"`);
    req.flash("success_msg", `Product "${existingProduct.name}" updated successfully.`);
    res.redirect("/seller/products");

  } catch (err) {
    console.error("Product update error:", err.message);
    if (newImagePath) deleteUploadedFile(path.join(UPLOAD_CONFIG.UPLOAD_DIR, path.basename(newImagePath)));
    return reloadForm(
      ["Database error: could not update product. Please try again."],
      old, existingProduct.image_path
    );
  }
};

// ── Categories (GET) ───────────────────────────────────────────────────
export const categoriesPage = async (req, res) => {
  try {
    const categories = await Category.findAll({ order: [["name", "ASC"]] });
    res.render("seller-categories", {
      title:           "Categories",
      pageTitle:       "Categories",
      activeCategories: true,
      categories:      categories.map(c => ({
        id:          c.id,
        name:        c.name,
        description: c.description,
        is_active:   c.is_active
      }))
    });
  } catch (err) {
    console.error("Categories page error:", err.message);
    res.render("seller-categories", {
      title:           "Categories",
      pageTitle:       "Categories",
      activeCategories: true,
      categories:      [],
      dbError:         "Could not load categories."
    });
  }
};

// ── Add Category (POST) — placeholder until admin flow is built ────────
export const addCategoryPost = (req, res) => {
  req.flash("success_msg", "Category saved successfully.");
  res.redirect("/seller/categories");
};
