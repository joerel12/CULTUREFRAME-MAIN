/*
  MIT License
  
  Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
  Mindoro State University - Philippines

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
  */
  
import express from "express";
import multer from "multer";
import path from "path";
import { homePage } from "../controllers/homeController.js";
import sellerPortalRouter from "./sellerPortal.js";
import paymentIntegrationRouter from "./paymentIntegration.js";
import discoverRouter from "./discover.js";
import analyticsIntegrationRouter from "./analyticsIntegration.js";

// Import Auth Controller
import { 
  loginPage, 
  registerPage, 
  forgotPasswordPage, 
  dashboardPage,
  customerDashboard,
  adminDashboard,
  loginUser, 
  registerUser, 
  logoutUser,
  requireAuth,
  requireAdmin,
  renderCustomerProfileEdit,
  handleCustomerProfileEdit
} from "../controllers/authController.js";

// Import CultureFrame Controllers
import { productcontroller } from "../controllers/productcontroller.js";
import { ordercontroller } from "../controllers/ordercontroller.js";
import { cartController } from "../controllers/cartController.js";

// ⭐⭐⭐ IMPORT MODELS FOR DASHBOARD COUNTS ⭐⭐⭐
import { Heritage } from "../models/Heritage.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { Event } from "../models/Event.js";

const router = express.Router();

const configuredSystemUrl = (name) => {
  const value = process.env[name] || "";
  return /^https?:\/\//i.test(value) ? value : null;
};

const redirectToSystem = (environmentName, fallback, systemName) => (req, res) => {
  const destination = configuredSystemUrl(environmentName);
  if (destination) return res.redirect(destination);
  req.flash("error_msg", `${systemName} is not configured. Ask an administrator to check the integration settings.`);
  return res.redirect(fallback);
};

const retiredWriteRoute = (owner) => (_req, res) => res.status(410).json({
  success: false,
  message: `This page has moved. Manage this record in ${owner}.`
});

// Seller workspace integrated from Kyla's CultureFrame seller module.
router.use("/seller", sellerPortalRouter);
router.use("/api/integrations/payments", paymentIntegrationRouter);
router.use("/api/integrations/analytics", analyticsIntegrationRouter);
router.use("/discover", discoverRouter);

// Multer setup for product image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), "public", "uploads"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage });

// ==================== PUBLIC ROUTES ====================

// Homepage
router.get("/", homePage);

// Dev helper: expose session for debugging (only when not in production)
router.get('/dev/session', (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).send('Not found');
  // send a minimal session view to avoid leaking secrets
  const safeSession = {
    isAuthenticated: !!req.session.isAuthenticated,
    user: req.session.user || null,
    cartCount: Array.isArray(req.session.cart) ? req.session.cart.length : 0,
    wishlistCount: Array.isArray(req.session.wishlist) ? req.session.wishlist.length : 0
  };
  res.json(safeSession);
});

// Test route to simulate login and redirect
router.get('/dev/test-login', (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).send('Not found');
  
  console.log('🧪 Test login route accessed');
  
  // Simulate setting session
  req.session.isAuthenticated = true;
  req.session.userRole = 'customer';
  req.session.userId = 1;
  req.session.userEmail = 'test@example.com';
  req.session.userName = 'Test User';
  
  console.log('🧪 Session set:', {
    isAuthenticated: req.session.isAuthenticated,
    userRole: req.session.userRole,
    userId: req.session.userId
  });
  
  // Save session and redirect
  req.session.save((err) => {
    if (err) {
      console.error('❌ Test session save error:', err);
      return res.status(500).send('Session save failed');
    }
    
    console.log('✅ Test session saved, redirecting to customer dashboard');
    return res.redirect('/customer/dashboard');
  });
});

// Auth Routes
router.get("/login", loginPage);
router.post("/login", loginUser);
router.get("/register", registerPage);
router.post("/register", registerUser); // ⭐⭐ DITO NAGPAPROCESS NG REGISTRATION ⭐⭐
router.get("/forgot-password", forgotPasswordPage);
router.get("/logout", logoutUser);

// Terms and Conditions
router.get("/terms", (req, res) => {
  res.render("terms", { title: "Terms and Conditions" });
});

// Main dashboard route - redirects based on role
router.get("/dashboard", dashboardPage);

// Visitor content is published by the Visitor Information system.
// Compatibility redirects keep saved links working without duplicate pages.
router.get("/heritage", (_req, res) => res.redirect(301, "/discover/heritage"));
router.get("/heritage/:id", (_req, res) => res.redirect(301, "/discover/heritage"));

// Shop Routes (Public)
router.get("/shop", productcontroller.shop);
router.get("/shop/product/:id", productcontroller.detail);
// Cart/Wishlist actions
router.post('/cart/add', requireAuth, cartController.addToCart);
router.post('/cart/remove', requireAuth, cartController.removeFromCart);
router.post('/cart/update', requireAuth, cartController.updateCart);
router.post('/wishlist/add', requireAuth, cartController.addToWishlist);
router.post('/wishlist/remove', requireAuth, cartController.removeFromWishlist);
router.get('/cart', requireAuth, cartController.viewCart);
router.get('/wishlist', requireAuth, cartController.viewWishlist);
router.get("/checkout", ordercontroller.checkout);
router.post("/checkout", ordercontroller.checkout);
router.post("/order/create", ordercontroller.create);

router.get("/events", (_req, res) => res.redirect(301, "/discover/events"));
router.get("/events/:id", (_req, res) => res.redirect(301, "/discover/events"));
router.get("/events/:id/register", (_req, res) => res.redirect(301, "/discover/events"));
router.post("/events/:id/register", retiredWriteRoute("Visitor Information"));
router.get("/scenic", (_req, res) => res.redirect(301, "/discover/attractions"));
router.get("/scenic/:id", (_req, res) => res.redirect(301, "/discover/attractions"));
router.get("/crafts", (_req, res) => res.redirect(301, "/discover/traditions"));
router.get("/crafts/:id", (_req, res) => res.redirect(301, "/discover/traditions"));

// ==================== CUSTOMER DASHBOARD ROUTES ====================
router.get("/customer/dashboard", requireAuth, customerDashboard);
router.get("/customer/events", requireAuth, (_req, res) => res.redirect(301, "/discover/events"));
// Customer profile edit
router.get("/customer/profile/edit", requireAuth, renderCustomerProfileEdit);
router.post("/customer/profile/edit", requireAuth, upload.single('profileImage'), handleCustomerProfileEdit);
// Backwards-compatible: profile page -> redirect to edit
router.get('/customer/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user && req.session.user.id;
    if (!userId) return res.redirect('/login');
    let photos = [];
    try {
      const { Moment } = await import('../models/Moment.js');
      const rows = await Moment.findAll({ where: { user_id: userId }, order: [['createdAt','DESC']], limit: 50 });
      photos = rows.map(r => ({ id: r.id, url: '/uploads/' + r.filename, caption: r.caption, createdAt: r.createdAt }));
    } catch (e) {
      photos = req.session.photos || [];
    }
    res.render('customer/profile', { title: 'Your Profile', user: req.session.user || {}, photos });
  } catch (err) {
    console.error('render profile error', err);
    res.redirect('/customer/dashboard');
  }
});

// Get moment creation page
router.get('/customer/moment/new', requireAuth, (req, res) => {
  res.render('customer/moment-new', { 
    title: 'Post a Moment', 
    user: req.session.user || {} 
  });
});

// View all moments page
router.get('/customer/moments', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user && req.session.user.id;
    if (!userId) return res.redirect('/login');
    
    const { Moment } = await import('../models/Moment.js');
    const rows = await Moment.findAll({ 
      where: { user_id: userId }, 
      order: [['createdAt','DESC']]
    });
    const photos = rows.map(r => ({ 
      id: r.id,
      url: r.filename ? '/uploads/' + r.filename : null, 
      caption: r.caption, 
      createdAt: r.createdAt 
    }));
    
    res.render('customer/moments', { 
      title: 'My Moments', 
      user: req.session.user || {}, 
      photos 
    });
  } catch (err) {
    console.error('moments page error', err);
    res.redirect('/customer/dashboard');
  }
});

// Get customer photos/moments
router.get('/customer/photos', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user && req.session.user.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Not logged in' });
    
    const { Moment } = await import('../models/Moment.js');
    const rows = await Moment.findAll({ 
      where: { user_id: userId }, 
      order: [['createdAt','DESC']], 
      limit: 50 
    });
    const photos = rows.map(r => ({ 
      id: r.id,
      url: r.filename ? '/uploads/' + r.filename : null, 
      caption: r.caption, 
      createdAt: r.createdAt 
    }));
    return res.json({ success: true, photos });
  } catch (err) {
    console.error('fetch photos error', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch photos' });
  }
});

// Delete a moment
router.delete('/customer/moment/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user && req.session.user.id;
    const momentId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not logged in' });
    }
    
    const { Moment } = await import('../models/Moment.js');
    
    // Find the moment
    const moment = await Moment.findOne({ 
      where: { 
        id: momentId, 
        user_id: userId 
      } 
    });
    
    if (!moment) {
      return res.status(404).json({ success: false, message: 'Moment not found or unauthorized' });
    }
    
    // Delete the moment
    await moment.destroy();
    
    console.log('✅ Moment deleted:', momentId);
    
    return res.json({ 
      success: true, 
      message: 'Moment deleted successfully' 
    });
  } catch (err) {
    console.error('❌ Delete moment error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to delete moment' 
    });
  }
});

// Create a moment (text post or photo+caption)
router.post('/customer/moment', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    console.log('📸 Creating moment...');
    console.log('User ID:', req.session.user?.id);
    console.log('Request body:', req.body);
    console.log('File:', req.file);
    
    const userId = req.session.user && req.session.user.id;
    if (!userId) {
      console.log('❌ No user ID found');
      return res.status(401).json({ success: false, message: 'Not logged in' });
    }
    
    const caption = req.body.caption || req.body.text || '';
    const filename = req.file ? req.file.filename : null;
    
    console.log('Caption:', caption);
    console.log('Filename:', filename);
    
    // Import and sync Moment model
    const { Moment } = await import('../models/Moment.js');
    
    // Ensure table exists
    await Moment.sync();
    console.log('✅ Moment table synced');
    
    // Create moment
    const m = await Moment.create({ 
      user_id: userId, 
      filename: filename, 
      caption: caption 
    });
    
    console.log('✅ Moment created:', m.id);
    
    // Update session fallback
    if (filename) {
      req.session.photos = req.session.photos || [];
      req.session.photos.unshift({ 
        url: '/uploads/' + filename, 
        caption, 
        uploadedAt: new Date().toISOString() 
      });
      req.session.user = req.session.user || {};
      req.session.user.profileImage = filename;
    }
    
    return res.json({ 
      success: true, 
      moment: { 
        id: m.id, 
        filename: m.filename, 
        caption: m.caption, 
        createdAt: m.createdAt 
      } 
    });
  } catch (err) {
    console.error('❌ Create moment error:', err);
    console.error('Error stack:', err.stack);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create moment: ' + err.message 
    });
  }
});
// Customer orders
router.get('/customer/orders', requireAuth, ordercontroller.customerIndex);
router.get('/customer/orders/:id', requireAuth, ordercontroller.customerDetail);
router.post('/customer/orders/:id/feedback', requireAuth, ordercontroller.submitFeedback);

// Backwards-compatible redirect: keep old `/orders` working for customers
router.get('/orders', requireAuth, (req, res) => {
  res.redirect('/customer/orders');
});

// ==================== ADMIN ROUTES ====================

// ⭐⭐⭐ ADD THIS MISSING ROUTE ⭐⭐⭐
router.get("/admin/dashboard", requireAdmin, adminDashboard);

// Legacy admin route (redirect to new dashboard)
router.get("/admin", requireAdmin, async (req, res) => {
  res.redirect("/admin/dashboard");
});

// Duplicate management pages are retired. Records remain available to the
// integration APIs, but edits happen only in the system that owns the module.
const visitorAdminRedirect = redirectToSystem("VISITOR_INFORMATION_URL", "/admin/dashboard", "Visitor Information");
router.get(["/admin/heritage", "/admin/heritage/add", "/admin/heritage/edit/:id"], requireAdmin, visitorAdminRedirect);
router.post(["/admin/heritage/add", "/admin/heritage/update/:id", "/admin/heritage/delete"], requireAdmin, retiredWriteRoute("Visitor Information"));

router.get(["/admin/products", "/admin/products/add", "/admin/products/edit/:id"], requireAdmin, (req, res) => {
  req.flash("success_msg", "Product catalog management belongs to seller accounts in the Seller Workspace.");
  return res.redirect("/admin/dashboard");
});
router.post(["/admin/products/add", "/admin/products/update/:id", "/admin/products/delete"], requireAdmin, retiredWriteRoute("the Seller Workspace"));

// Admin - Order Management
router.get("/admin/orders", requireAdmin, ordercontroller.adminIndex);
router.get("/admin/orders/:id", requireAdmin, ordercontroller.adminDetail);
router.get("/admin/orders/edit/:id", requireAdmin, ordercontroller.adminEdit);
router.post("/admin/orders/update-status/:id", requireAdmin, ordercontroller.updateStatus);

router.get(["/admin/events", "/admin/events/add", "/admin/events/edit/:id"], requireAdmin, visitorAdminRedirect);
router.post(["/admin/events/add", "/admin/events/update/:id", "/admin/events/delete"], requireAdmin, retiredWriteRoute("Visitor Information"));
router.get(["/admin/scenic", "/admin/scenic/add", "/admin/scenic/edit/:id"], requireAdmin, visitorAdminRedirect);
router.post(["/admin/scenic/add", "/admin/scenic/update/:id", "/admin/scenic/delete"], requireAdmin, retiredWriteRoute("Visitor Information"));
router.get(["/admin/crafts", "/admin/crafts/add", "/admin/crafts/edit/:id"], requireAdmin, visitorAdminRedirect);
router.post(["/admin/crafts/add", "/admin/crafts/update/:id", "/admin/crafts/delete"], requireAdmin, retiredWriteRoute("Visitor Information"));

// Admin - Feedbacks
router.get('/admin/feedbacks', requireAdmin, ordercontroller.adminFeedbackList);

// ==================== ADMIN – SELLERS ====================
import { sellerController } from "../controllers/sellerController.js";
router.get('/admin/sellers', requireAdmin, sellerController.index);
router.get('/admin/sellers/add', requireAdmin, sellerController.addForm);
router.post('/admin/sellers/add', requireAdmin, sellerController.add);
router.get('/admin/sellers/edit/:id', requireAdmin, sellerController.editForm);
router.post('/admin/sellers/edit/:id', requireAdmin, sellerController.update);
router.post('/admin/sellers/delete/:id', requireAdmin, sellerController.delete);

// ==================== ADMIN – CUSTOMERS ====================
import { customerMgmtController } from "../controllers/customerMgmtController.js";
router.get('/admin/customers', requireAdmin, customerMgmtController.index);
router.get('/admin/customers/:id', requireAdmin, customerMgmtController.detail);
router.post('/admin/customers/toggle-status/:id', requireAdmin, customerMgmtController.toggleStatus);

// ==================== ADMIN – PAYMENTS ====================
const paymentAdminRedirect = redirectToSystem("PAYMENT_SYSTEM_URL", "/admin/dashboard", "CultureFrame Payments");
router.get(["/admin/payments", "/admin/payments/add", "/admin/payments/:id"], requireAdmin, paymentAdminRedirect);
router.post(["/admin/payments/add", "/admin/payments/update-status/:id"], requireAdmin, retiredWriteRoute("CultureFrame Payments"));

// ==================== ADMIN – ANALYTICS ====================
const analyticsRedirect = redirectToSystem("CULTUREMETRICS_SYSTEM_URL", "/admin/dashboard", "CultureMetrics");
router.get(["/admin/analytics/sales", "/admin/analytics/business"], requireAdmin, analyticsRedirect);

// API: Get live dashboard stats
router.get('/api/customer/dashboard-stats', requireAuth, async (req, res) => {
  try {
    const { Order } = await import('../models/Order.js');
    const { CartItem } = await import('../models/CartItem.js');
    const { WishlistItem } = await import('../models/WishlistItem.js');
    let cartCount = 0;
    let wishlistCount = 0;
    let orderCount = 0;
    if (req.session.user && req.session.user.id) {
      cartCount = await CartItem.count({ where: { user_id: req.session.user.id } });
      wishlistCount = await WishlistItem.count({ where: { user_id: req.session.user.id } });
    }
    if (req.session.userEmail) {
      orderCount = await Order.count({ where: { customer_email: req.session.userEmail } });
    }
    res.json({
      cartCount,
      wishlistCount,
      orderCount
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// API: Get recent activity for the logged-in customer
router.get('/api/customer/recent-activity', requireAuth, async (req, res) => {
  try {
    const { CartItem } = await import('../models/CartItem.js');
    const { WishlistItem } = await import('../models/WishlistItem.js');
    const { EventRegistration } = await import('../models/EventRegistration.js');
    const { Order } = await import('../models/Order.js');
    const { Product } = await import('../models/Product.js');
    const { Event } = await import('../models/Event.js');

    const userId = req.session.user && req.session.user.id;
    const userEmail = req.session.userEmail || (req.session.user && req.session.user.email);

    let activities = [];

    if (userId) {
      const cartItems = await CartItem.findAll({ where: { user_id: userId }, order: [['updatedAt', 'DESC']], limit: 10 });
      for (const it of cartItems) {
        const product = await Product.findByPk(it.product_id);
        activities.push({
          type: 'cart',
          title: product ? `Added to cart: ${product.name}` : `Added to cart (product ${it.product_id})`,
          createdAt: it.updatedAt || it.createdAt
        });
      }

      const wishlist = await WishlistItem.findAll({ where: { user_id: userId }, order: [['createdAt', 'DESC']], limit: 10 });
      for (const it of wishlist) {
        const product = await Product.findByPk(it.product_id);
        activities.push({
          type: 'wishlist',
          title: product ? `Saved to wishlist: ${product.name}` : `Saved to wishlist (product ${it.product_id})`,
          createdAt: it.createdAt
        });
      }

      const events = await EventRegistration.findAll({ where: { user_id: userId }, order: [['createdAt', 'DESC']], limit: 10 });
      for (const it of events) {
        const ev = await Event.findByPk(it.event_id);
        activities.push({
          type: 'event',
          title: ev ? `Registered for: ${ev.title}` : `Registered for event ${it.event_id}`,
          createdAt: it.createdAt
        });
      }
    }

    if (userEmail) {
      const orders = await Order.findAll({ where: { customer_email: userEmail }, order: [['createdAt', 'DESC']], limit: 10 });
      for (const o of orders) {
        activities.push({
          type: 'order',
          title: `Placed order: ${o.id} — ₱${o.total_amount}`,
          createdAt: o.createdAt
        });
      }
    }

    // Sort by createdAt desc
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Respect query param `all` or `limit`.
    const all = req.query.all === '1' || req.query.all === 'true';
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : (all ? activities.length : 10);
    if (!all) activities = activities.slice(0, limit);

    res.json({ activities });
  } catch (err) {
    console.error('Failed to fetch recent activity', err);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

export default router;
