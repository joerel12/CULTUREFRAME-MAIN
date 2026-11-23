import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import hbs from "hbs";

process.env.SKIP_DATABASE_AUTHENTICATION = "true";

const { Op } = await import("sequelize");
const { User } = await import("../models/userModel.js");
const { Seller } = await import("../models/Seller.js");
const { Product } = await import("../models/Product.js");
const { Order } = await import("../models/Order.js");
const { sequelize } = await import("../models/db.js");
const { sellerController } = await import("../controllers/sellerController.js");
const { customerMgmtController } = await import("../controllers/customerMgmtController.js");
const { customerOrderWhere, customersOrderWhere, summarizeCustomerOrders } = await import("../services/adminCustomerOrders.js");
const { revokeAccountSessions } = await import("../services/revokeAccountSessions.js");

const makeResponse = () => ({
  render(view, data) { this.view = view; this.data = data; },
  redirect(location) { this.location = location; },
  status(code) { this.code = code; return this; },
  send(message) { this.message = message; }
});

test("seller and customer admin templates render with the versioned stylesheet", () => {
  const handlebars = hbs.handlebars;
  handlebars.registerHelper("eq", (left, right) => left === right);
  for (const name of ["head", "admin-sidebar"]) {
    handlebars.registerPartial(name, fs.readFileSync(path.join("views", "partials", `${name}.xian`), "utf8"));
  }
  for (const name of ["seller-list", "seller-add", "seller-edit", "customer-list", "customer-detail"]) {
    const source = fs.readFileSync(path.join("views", "admin", `${name}.xian`), "utf8");
    const html = handlebars.compile(source)({
      title: name, activePage: name.startsWith("seller") ? "sellers" : "customers",
      counts: { all: 1, active: 1, pending: 0, inactive: 0 }, filter: "all",
      sellers: [], customers: [], orders: [], seller: { id: 1 }, customer: { id: 1, name: "Test", status: "active" }
    });
    assert.match(html, /\/tailwind\.css\?v=admin-people-20261124/);
    assert.match(html, /\/cultureframe\.css\?v=admin-people-20261124/);
    assert.match(html, /cf-admin-sidebar/);
  }
});

test("customer order summaries use account IDs and count only paid spend", () => {
  const customers = [
    { id: 7, email: "first@example.test" },
    { id: 8, email: "second@example.test" }
  ];
  const totals = summarizeCustomerOrders(customers, [
    { user_id: 7, customer_email: "old@example.test", total_amount: "125.00", payment_status: "paid" },
    { user_id: null, customer_email: "FIRST@example.test", total_amount: "50.00", payment_status: "paid" },
    { user_id: 8, customer_email: "second@example.test", total_amount: "75.00", payment_status: "unpaid" },
    { user_id: 999, customer_email: "first@example.test", total_amount: "999.00", payment_status: "paid" }
  ]);
  assert.deepEqual(totals.get(7), { orderCount: 2, paidCents: 17500 });
  assert.deepEqual(totals.get(8), { orderCount: 1, paidCents: 0 });
});

test("seller management shows the linked login and inventory", async () => {
  const original = { sellers: Seller.findAll, count: Seller.count, users: User.findAll, products: Product.findAll };
  Seller.findAll = async () => [{
    id: 4, user_id: 7,
    get: () => ({ id: 4, user_id: 7, email: "maker@example.test", status: "active" })
  }];
  Seller.count = async () => 1;
  User.findAll = async () => [{ id: 7, email: "maker@example.test", role: "seller", status: "active" }];
  Product.findAll = async () => [{ seller_id: 4, productCount: "3" }];
  const res = makeResponse();
  try {
    await sellerController.index({ query: {} }, res);
    assert.equal(res.view, "admin/seller-list");
    assert.equal(res.data.sellers[0].loginState, "Ready");
    assert.equal(res.data.sellers[0].productCount, 3);
  } finally {
    Seller.findAll = original.sellers;
    Seller.count = original.count;
    User.findAll = original.users;
    Product.findAll = original.products;
  }
});

test("adding a seller creates a linked account and keeps zero commission", async () => {
  const original = { transaction: sequelize.transaction, findOne: User.findOne, createUser: User.create, createSeller: Seller.create };
  const saved = {};
  sequelize.transaction = async callback => callback({});
  User.findOne = async () => null;
  User.create = async value => { saved.user = value; return { id: 7 }; };
  Seller.create = async value => { saved.seller = value; return value; };
  const req = {
    body: {
      business_name: "Mansalay Weavers", contact_name: "Local Maker",
      email: "Maker@Example.test", temporary_password: "StrongSeller2026!",
      status: "active", commission_rate: "0"
    },
    flash() {}
  };
  const res = makeResponse();
  try {
    await sellerController.add(req, res);
    assert.equal(res.location, "/admin/sellers");
    assert.equal(saved.user.role, "seller");
    assert.equal(saved.user.email, "maker@example.test");
    assert.equal(saved.seller.user_id, 7);
    assert.equal(saved.seller.commission_rate, 0);
  } finally {
    sequelize.transaction = original.transaction;
    User.findOne = original.findOne;
    User.create = original.createUser;
    Seller.create = original.createSeller;
  }
});

test("updating seller identity synchronizes login and revokes its old sessions", async () => {
  const original = { transaction: sequelize.transaction, findSeller: Seller.findByPk, findUser: User.findByPk, findOwner: User.findOne, query: sequelize.query };
  const saved = { revoked: false };
  sequelize.transaction = async callback => callback({});
  const seller = {
    id: 4, user_id: 7, status: "active",
    async update(value) { saved.seller = value; }
  };
  const user = {
    id: 7, role: "seller", email: "old@example.test", status: "active",
    async save() { saved.user = { email: this.email, status: this.status }; }
  };
  Seller.findByPk = async () => seller;
  User.findByPk = async () => user;
  User.findOne = async () => null;
  sequelize.query = async sql => {
    if (sql.startsWith("SELECT")) return [{ table_name: "session_records" }];
    saved.revoked = true;
    return [];
  };
  const req = {
    params: { id: "4" },
    body: {
      business_name: "Mansalay Weavers", contact_name: "Local Maker",
      email: "new@example.test", status: "inactive", commission_rate: "0"
    },
    flash() {}
  };
  const res = makeResponse();
  try {
    await sellerController.update(req, res);
    assert.equal(res.location, "/admin/sellers");
    assert.deepEqual(saved.user, { email: "new@example.test", status: "inactive" });
    assert.equal(saved.seller.email, "new@example.test");
    assert.equal(saved.seller.commission_rate, 0);
    assert.equal(saved.revoked, true);
  } finally {
    sequelize.transaction = original.transaction;
    Seller.findByPk = original.findSeller;
    User.findByPk = original.findUser;
    User.findOne = original.findOwner;
    sequelize.query = original.query;
  }
});

test("legacy seller cannot be activated without a login password", async () => {
  const original = { transaction: sequelize.transaction, findSeller: Seller.findByPk };
  sequelize.transaction = async callback => callback({});
  Seller.findByPk = async () => ({ id: 4, user_id: null });
  const messages = [];
  const req = {
    params: { id: "4" },
    body: {
      business_name: "Mansalay Weavers", contact_name: "Local Maker",
      email: "maker@example.test", status: "active", commission_rate: "10"
    },
    flash(_type, message) { messages.push(message); }
  };
  const res = makeResponse();
  try {
    await sellerController.update(req, res);
    assert.equal(res.location, "/admin/sellers/edit/4");
    assert.match(messages[0], /login password/i);
  } finally {
    sequelize.transaction = original.transaction;
    Seller.findByPk = original.findSeller;
  }
});

test("customer management finds orders by account and searches phone", async () => {
  const original = { users: User.findAll, count: User.count, orders: Order.findAll };
  User.findAll = async () => [{
    id: 11, name: "Visitor Customer", email: "visitor@example.test",
    phone: "09170000000", status: "active", createdAt: new Date("2026-11-01")
  }];
  User.count = async () => 1;
  Order.findAll = async options => {
    assert.ok(options.where[Op.or]);
    return [
      { user_id: 11, customer_email: "old@example.test", total_amount: "200.00", payment_status: "paid" },
      { user_id: 11, customer_email: "visitor@example.test", total_amount: "20.00", payment_status: "unpaid" }
    ];
  };
  const res = makeResponse();
  try {
    await customerMgmtController.index({ query: { search: "0917" } }, res);
    assert.equal(res.view, "admin/customer-list");
    assert.equal(res.data.customers[0].orderCount, 2);
    assert.equal(res.data.customers[0].totalSpend, "200.00");
  } finally {
    User.findAll = original.users;
    User.count = original.count;
    Order.findAll = original.orders;
  }
});

test("deactivating a customer revokes database-backed sessions", async () => {
  const original = { transaction: sequelize.transaction, findOne: User.findOne, query: sequelize.query };
  const customer = {
    id: 11, name: "Visitor Customer", status: "active",
    async update(values) { this.status = values.status; }
  };
  sequelize.transaction = async callback => callback({ LOCK: { UPDATE: "UPDATE" } });
  User.findOne = async () => customer;
  let revoked = false;
  sequelize.query = async sql => {
    if (sql.startsWith("SELECT")) return [{ table_name: "session_records" }];
    revoked = true;
    return [];
  };
  const req = { params: { id: "11" }, flash() {} };
  const res = makeResponse();
  try {
    await customerMgmtController.toggleStatus(req, res);
    assert.equal(customer.status, "inactive");
    assert.equal(revoked, true);
    assert.equal(res.location, "/admin/customers/11");
  } finally {
    sequelize.transaction = original.transaction;
    User.findOne = original.findOne;
    sequelize.query = original.query;
  }
});

test("seller counts and customer order filters execute against local PostgreSQL", {
  skip: process.env.RUN_ADMIN_PEOPLE_DB_TEST !== "true"
}, async () => {
  assert.match(new URL(process.env.DATABASE_URL).hostname, /^(?:localhost|127\.0\.0\.1)$/);
  try {
    await Promise.all([
      Product.findAll({
        where: { seller_id: { [Op.in]: [0] } },
        attributes: ["seller_id", [sequelize.fn("COUNT", sequelize.col("id")), "productCount"]],
        group: ["seller_id"], raw: true
      }),
      Order.findAll({
        where: customersOrderWhere([{ id: 0, email: "nobody@example.invalid" }]),
        attributes: ["user_id", "customer_email", "total_amount", "payment_status"],
        raw: true
      }),
      Order.findAll({
        where: customerOrderWhere({ id: 0, email: "nobody@example.invalid" }),
        attributes: ["id"], raw: true
      })
    ]);
    await sequelize.transaction(transaction => revokeAccountSessions(sequelize, -1, transaction));
  } finally {
    await sequelize.close();
  }
});
