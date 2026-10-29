/*
  MIT License
  Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
  Mindoro State University - Philippines
*/

import express from "express";
import { homePage } from "../controllers/homeController.js";
import sellerRouter from "./seller.js";

const router = express.Router();

router.get("/", homePage);

// Seller dashboard — all routes under /seller
router.use("/seller", sellerRouter);

export default router;
