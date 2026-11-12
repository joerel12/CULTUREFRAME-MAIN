import test from "node:test";
import assert from "node:assert/strict";

process.env.SKIP_DATABASE_AUTHENTICATION = "true";

const { createWalkInSale } = await import("../controllers/sellerPortalController.js");
const { Product } = await import("../models/Product.js");
const { Order } = await import("../models/Order.js");
const { OrderItem } = await import("../models/Orderitem.js");
const { Payment } = await import("../models/Payment.js");
const { sequelize } = await import("../models/db.js");

test("walk-in sale trusts database prices, belongs to the seller, and records paid inventory", async () => {
  const originals = {
    findOne: Product.findOne,
    orderCreate: Order.create,
    itemCreate: OrderItem.create,
    paymentCreate: Payment.create,
    transaction: sequelize.transaction
  };
  const calls = { items: [], payments: [], flashes: [] };
  const product = {
    id: 7,
    name: "Mangyan Woven Basket",
    price: "125.00",
    stocks: 5,
    async save() { calls.savedStock = this.stocks; }
  };

  Product.findOne = async options => {
    calls.productWhere = options.where;
    return product;
  };
  Order.create = async values => {
    calls.order = values;
    return { id: 44, ...values };
  };
  OrderItem.create = async values => { calls.items.push(values); return values; };
  Payment.create = async values => { calls.payments.push(values); return values; };
  sequelize.transaction = async callback => callback({ LOCK: { UPDATE: "UPDATE" } });

  const req = {
    seller: { id: 3, business_name: "Mansalay Crafts", phone: "09170000000" },
    body: {
      quantities: { 7: "2" },
      customer_name: "Walk-in Guest",
      payment_method: "cash",
      cash_tendered: "300.00"
    },
    flash(type, message) { calls.flashes.push({ type, message }); }
  };
  const res = { redirect(location) { calls.redirect = location; } };

  try {
    await createWalkInSale(req, res, error => { throw error; });
    assert.deepEqual(calls.productWhere, { id: 7, seller_id: 3, status: "active" });
    assert.equal(calls.order.total_amount, "250.00");
    assert.equal(calls.order.payment_status, "paid");
    assert.equal(calls.order.status, "completed");
    assert.equal(calls.items[0].price, "125.00");
    assert.equal(calls.savedStock, 3);
    assert.equal(calls.payments[0].status, "paid");
    assert.equal(calls.redirect, "/seller/walk-in");
    assert.match(calls.flashes[0].message, /Change PHP 50\.00/);
  } finally {
    Product.findOne = originals.findOne;
    Order.create = originals.orderCreate;
    OrderItem.create = originals.itemCreate;
    Payment.create = originals.paymentCreate;
    sequelize.transaction = originals.transaction;
  }
});
