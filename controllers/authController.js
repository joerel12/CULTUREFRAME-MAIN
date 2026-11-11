/*
  CultureFrame — Auth Controller
  Handles: register, login, logout
  Passwords are hashed with bcryptjs (pure JS — no native build tools needed).
*/

import bcrypt from "bcryptjs";
import { Seller } from "../models/index.js";

const SALT_ROUNDS = 12;   // recommended minimum for bcrypt in 2025

// ── Register (GET) ─────────────────────────────────────────────────────
export const registerPage = (req, res) => {
  res.render("register", { title: "Create Account" });
};

// ── Register (POST) ────────────────────────────────────────────────────
export const registerPost = async (req, res) => {
  const fullName        = (req.body.full_name       || "").trim();
  const email           = (req.body.email           || "").trim().toLowerCase();
  const password        = (req.body.password        || "");
  const confirmPassword = (req.body.confirm_password|| "");

  // ── Server-side validation ────────────────────────────────────────
  const errors = [];

  if (!fullName || fullName.length < 2)
    errors.push("Full name is required (minimum 2 characters).");
  if (fullName.length > 150)
    errors.push("Full name must be 150 characters or fewer.");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email))
    errors.push("A valid email address is required.");

  if (!password || password.length < 8)
    errors.push("Password must be at least 8 characters.");

  if (password !== confirmPassword)
    errors.push("Passwords do not match.");

  if (errors.length > 0) {
    return res.render("register", {
      title:    "Create Account",
      errors,
      old: { full_name: fullName, email }
    });
  }

  // ── Check for duplicate email ─────────────────────────────────────
  try {
    const existing = await Seller.findOne({ where: { email } });
    if (existing) {
      return res.render("register", {
        title:  "Create Account",
        errors: ["An account with this email already exists. Please log in."],
        old:    { full_name: fullName, email }
      });
    }
  } catch (err) {
    console.error("Register lookup error:", err.message);
    return res.render("register", {
      title:  "Create Account",
      errors: ["Database error. Please try again."],
      old:    { full_name: fullName, email }
    });
  }

  // ── Hash password and save ────────────────────────────────────────
  try {
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const seller = await Seller.create({ full_name: fullName, email, password_hash });

    // Log them straight in after registration
    req.session.sellerId   = seller.id;
    req.session.sellerName = seller.full_name;
    req.session.sellerEmail = seller.email;

    req.flash("success_msg", `Welcome, ${seller.full_name}! Your account has been created.`);
    console.log(`✅ New seller registered: ID ${seller.id} — ${seller.email}`);
    res.redirect("/seller/dashboard");

  } catch (err) {
    console.error("Register save error:", err.message);
    res.render("register", {
      title:  "Create Account",
      errors: ["Could not create account. Please try again."],
      old:    { full_name: fullName, email }
    });
  }
};

// ── Login (GET) ────────────────────────────────────────────────────────
export const loginPage = (req, res) => {
  // If already logged in, go straight to dashboard
  if (req.session && req.session.sellerId) {
    return res.redirect("/seller/dashboard");
  }
  res.render("login", { title: "Log In" });
};

// ── Login (POST) ───────────────────────────────────────────────────────
export const loginPost = async (req, res) => {
  const email    = (req.body.email    || "").trim().toLowerCase();
  const password = (req.body.password || "");

  const errors = [];
  if (!email)    errors.push("Email address is required.");
  if (!password) errors.push("Password is required.");

  if (errors.length > 0) {
    return res.render("login", { title: "Log In", errors, old: { email } });
  }

  try {
    const seller = await Seller.findOne({ where: { email } });

    // Use a constant-time compare even when seller is not found
    // to prevent timing-based email enumeration
    const dummyHash = "$2a$12$invalidhashfortimingnnnnnnnnnnnnnnnnnnnnnnnnnnn";
    const hashToCheck = seller ? seller.password_hash : dummyHash;
    const match = await bcrypt.compare(password, hashToCheck);

    if (!seller || !match) {
      return res.render("login", {
        title:  "Log In",
        errors: ["Incorrect email or password."],
        old:    { email }
      });
    }

    // Store minimal info in session — never store the hash
    req.session.sellerId    = seller.id;
    req.session.sellerName  = seller.full_name;
    req.session.sellerEmail = seller.email;

    console.log(`✅ Seller logged in: ID ${seller.id} — ${seller.email}`);
    res.redirect("/seller/dashboard");

  } catch (err) {
    console.error("Login error:", err.message);
    res.render("login", {
      title:  "Log In",
      errors: ["Database error. Please try again."],
      old:    { email }
    });
  }
};

// ── Logout (GET) ───────────────────────────────────────────────────────
export const logout = (req, res) => {
  const name = req.session.sellerName || "Seller";
  req.session.destroy((err) => {
    if (err) console.error("Session destroy error:", err.message);
    console.log(`🔒 Seller logged out: ${name}`);
    res.redirect("/login");
  });
};
