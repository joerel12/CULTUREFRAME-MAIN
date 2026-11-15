import { sequelize } from "../models/db.js";
import "../models/userModel.js";
import "../models/Heritage.js";
import "../models/Product.js";
import "../models/ProductCategory.js";
import "../models/Order.js";
import "../models/Orderitem.js";
import "../models/Event.js";
import "../models/Admin.js";
import "../models/Moment.js";
import "../models/CartItem.js";
import "../models/WishlistItem.js";
import "../models/EventRegistration.js";
import "../models/Feedback.js";
import "../models/Scenic.js";
import "../models/Craft.js";
import "../models/Seller.js";
import "../models/Payment.js";
import "../models/PaymentIntegrationEvent.js";
import "../models/StoredFile.js";
import "../models/SessionRecord.js";

try {
  await sequelize.authenticate();
  await sequelize.sync();
  console.log("CultureFrame database schema ready.");
} finally {
  await sequelize.close();
}
