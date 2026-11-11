import test from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/test";
process.env.SKIP_DATABASE_AUTHENTICATION = "true";

const { sellerController } = await import("../controllers/sellerController.js");
const { requireSeller } = await import("../middleware/requireSeller.js");
const { sequelize } = await import("../models/db.js");
const { Seller } = await import("../models/Seller.js");
const { Product } = await import("../models/Product.js");
const { User } = await import("../models/userModel.js");

function requestAndResponse(body = {}) {
  const messages = [];
  const req = { body, params: { id: "5" }, flash: (...message) => messages.push(message) };
  const res = {
    locals: {},
    redirect: path => { res.redirected = path; },
    status: code => { res.statusCode = code; return res; },
    render: (view, values) => { res.rendered = { view, values }; }
  };
  return { req, res, messages };
}

test("seller ownership is persisted against a unique nullable user account", () => {
  const link = Seller.getAttributes().user_id;
  assert.ok(link, "Seller.user_id must survive future merges");
  assert.equal(link.allowNull, true);
  assert.equal(link.unique, true);
  assert.equal(link.references.model, "users");
});

test("administrator creates a seller and its login in one transaction", async t => {
  const transaction = {};
  const created = {};
  t.mock.method(sequelize, "transaction", async callback => callback(transaction));
  t.mock.method(User, "findOne", async () => null);
  t.mock.method(User, "create", async (values, options) => {
    assert.equal(options.transaction, transaction);
    created.user = values;
    return { id: 12 };
  });
  t.mock.method(Seller, "create", async (values, options) => {
    assert.equal(options.transaction, transaction);
    created.seller = values;
  });
  const { req, res, messages } = requestAndResponse({
    business_name: "Mansalay Crafts", contact_name: "Test Seller",
    email: " SELLER@example.com ", temporary_password: "test-seller-password",
    status: "active"
  });
  await sellerController.add(req, res);
  assert.equal(created.user.role, "seller");
  assert.equal(created.user.email, "seller@example.com");
  assert.equal(created.seller.user_id, 12);
  assert.equal(res.redirected, "/admin/sellers");
  assert.equal(messages[0][0], "success_msg");
});

test("administrator can attach a login to an existing unlinked seller", async t => {
  const transaction = {};
  let saved;
  const seller = { id: 5, user_id: null, update: async values => { saved = values; } };
  t.mock.method(sequelize, "transaction", async callback => callback(transaction));
  t.mock.method(Seller, "findByPk", async () => seller);
  t.mock.method(User, "findOne", async () => null);
  t.mock.method(User, "create", async () => ({ id: 12 }));
  const { req, res } = requestAndResponse({
    business_name: "Mansalay Crafts", contact_name: "Test Seller",
    email: "seller@example.com", reset_password: "test-seller-password", status: "active"
  });
  await sellerController.update(req, res);
  assert.equal(saved.user_id, 12);
  assert.equal(res.redirected, "/admin/sellers");
});

test("sellers with inventory cannot be deleted", async t => {
  t.mock.method(sequelize, "transaction", async callback => callback({}));
  t.mock.method(Seller, "findByPk", async () => ({
    id: 5, user_id: 12, destroy: async () => assert.fail("Seller with products was deleted")
  }));
  t.mock.method(Product, "count", async () => 1);
  const { req, res, messages } = requestAndResponse();
  await sellerController.delete(req, res);
  assert.equal(messages[0][0], "error_msg");
  assert.match(messages[0][1], /has products/);
  assert.equal(res.redirected, "/admin/sellers");
});

test("seller portal accepts only the active profile belonging to the logged-in seller", async t => {
  const { req, res } = requestAndResponse();
  req.session = { isAuthenticated: true, userRole: "seller", userId: 12 };
  t.mock.method(Seller, "findOne", async options => {
    assert.deepEqual(options.where, { user_id: 12, status: "active" });
    return null;
  });
  await requireSeller(req, res, () => assert.fail("Inactive seller was admitted"));
  assert.equal(res.statusCode, 403);
});
