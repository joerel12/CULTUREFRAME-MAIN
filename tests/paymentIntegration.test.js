import test from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/test";
process.env.SKIP_DATABASE_AUTHENTICATION = "true";

const service = await import("../services/paymentIntegrationService.js");
const { requirePaymentIntegrationToken } = await import("../middleware/integrationTokenAuth.js");
const { sequelize } = await import("../models/db.js");
const { Order } = await import("../models/Order.js");
const { OrderItem } = await import("../models/Orderitem.js");
const { Product } = await import("../models/Product.js");
const { Seller } = await import("../models/Seller.js");
const { Payment } = await import("../models/Payment.js");
const { PaymentIntegrationEvent } = await import("../models/PaymentIntegrationEvent.js");
const { ordercontroller } = await import("../controllers/ordercontroller.js");

const responseDouble = () => {
  const response = { statusCode: 200, body: null };
  response.status = code => { response.statusCode = code; return response; };
  response.json = body => { response.body = body; return response; };
  return response;
};

test("payment integration token is required and accepted", () => {
  process.env.PAYMENT_INTEGRATION_TOKEN = "a-secure-test-token-with-more-than-32-characters";

  const missingResponse = responseDouble();
  requirePaymentIntegrationToken({ get: () => "" }, missingResponse, () => {});
  assert.equal(missingResponse.statusCode, 401);

  let continued = false;
  const acceptedResponse = responseDouble();
  requirePaymentIntegrationToken({
    get: name => name === "authorization"
      ? `Bearer ${process.env.PAYMENT_INTEGRATION_TOKEN}`
      : ""
  }, acceptedResponse, () => { continued = true; });
  assert.equal(continued, true);
});

test("seller-owned order lines are normalized for the payment service", async () => {
  const originals = {
    orderItems: OrderItem.findAll,
    order: Order.findByPk,
    product: Product.findByPk,
    seller: Seller.findByPk
  };

  const item = {
    id: 42,
    order_id: 15,
    product_id: 7,
    product_name: "Handwoven market tote",
    quantity: 2,
    price: "625.00",
    updatedAt: new Date("2026-11-10T01:00:00.000Z")
  };

  try {
    OrderItem.findAll = async () => [item];
    Order.findByPk = async () => ({
      id: 15,
      user_id: 3,
      customer_name: "Test Customer",
      customer_email: "customer@example.com",
      customer_phone: "09123456789",
      shipping_address: "Mansalay, Oriental Mindoro"
    });
    Product.findByPk = async () => ({ id: 7, seller_id: 4, name: item.product_name, category: "handicraft" });
    Seller.findByPk = async () => ({
      id: 4,
      business_name: "Test Artisan",
      email: "seller@example.com",
      category: "handicraft",
      address: "Mansalay, Oriental Mindoro"
    });

    const page = await service.listPaymentOrders({});
    assert.equal(page.orders.length, 1);
    assert.equal(page.orders[0].externalId, "CF-ORDER-15-ITEM-42");
    assert.equal(page.orders[0].amountCents, 125000);
    assert.equal(page.orders[0].seller.externalId, "CF-SELLER-4");
    assert.equal(page.nextCursor, null);
    assert.equal(page.skipped, 0);
  } finally {
    OrderItem.findAll = originals.orderItems;
    Order.findByPk = originals.order;
    Product.findByPk = originals.product;
    Seller.findByPk = originals.seller;
  }
});

test("verified payment events create an integrated payment and update the order", async () => {
  const originals = {
    transaction: sequelize.transaction,
    eventFind: PaymentIntegrationEvent.findOne,
    eventCreate: PaymentIntegrationEvent.create,
    itemFind: OrderItem.findByPk,
    itemList: OrderItem.findAll,
    orderFind: Order.findByPk,
    orderUpdate: Order.update,
    productFind: Product.findByPk,
    paymentFind: Payment.findOne,
    paymentCreate: Payment.create,
    paymentList: Payment.findAll
  };
  const item = { id: 42, order_id: 15, product_id: 7, quantity: 2, price: "625.00" };
  const order = { id: 15, customer_name: "Test Customer", customer_email: "customer@example.com" };
  let createdPayment;
  let updatedStatus;

  try {
    sequelize.transaction = async callback => callback({});
    PaymentIntegrationEvent.findOne = async () => null;
    PaymentIntegrationEvent.create = async values => values;
    OrderItem.findByPk = async () => item;
    OrderItem.findAll = async () => [item];
    Order.findByPk = async () => order;
    Order.update = async values => { updatedStatus = values.payment_status; };
    Product.findByPk = async () => ({ id: 7, seller_id: 4 });
    Payment.findOne = async () => null;
    Payment.create = async values => {
      createdPayment = { id: 9, ...values };
      return createdPayment;
    };
    Payment.findAll = async () => [createdPayment];

    const result = await service.applyPaymentEvent({
      externalId: "CF-ORDER-15-ITEM-42",
      idempotencyKey: "payment-event-test-0001",
      payload: {
        paymentReference: "PAY-2026-TEST",
        status: "SUCCEEDED",
        amountCents: 125000,
        providerReference: "TRANSFER-TEST-001"
      }
    });

    assert.equal(result.accepted, true);
    assert.equal(result.replayed, false);
    assert.equal(result.paymentStatus, "paid");
    assert.equal(createdPayment.integration_external_id, "CF-ORDER-15-ITEM-42");
    assert.equal(createdPayment.amount, "1250.00");
    assert.equal(updatedStatus, "paid");
  } finally {
    sequelize.transaction = originals.transaction;
    PaymentIntegrationEvent.findOne = originals.eventFind;
    PaymentIntegrationEvent.create = originals.eventCreate;
    OrderItem.findByPk = originals.itemFind;
    OrderItem.findAll = originals.itemList;
    Order.findByPk = originals.orderFind;
    Order.update = originals.orderUpdate;
    Product.findByPk = originals.productFind;
    Payment.findOne = originals.paymentFind;
    Payment.create = originals.paymentCreate;
    Payment.findAll = originals.paymentList;
  }
});

test("checkout ignores browser prices and stores database-authoritative totals", async () => {
  const originals = {
    transaction: sequelize.transaction,
    productFind: Product.findOne,
    orderCreate: Order.create,
    itemCreate: OrderItem.create,
    paymentCreate: Payment.create
  };
  const product = {
    id: 7,
    name: "Handwoven market tote",
    price: "625.00",
    stocks: 10,
    save: async () => {}
  };
  let orderValues;
  let itemValues;
  let paymentValues;
  let rendered;

  try {
    sequelize.transaction = async callback => callback({ LOCK: { UPDATE: "UPDATE" } });
    Product.findOne = async () => product;
    Order.create = async values => {
      orderValues = values;
      return { id: 15, ...values };
    };
    OrderItem.create = async values => { itemValues = values; return values; };
    Payment.create = async values => {
      paymentValues = values;
      return { get: () => ({ id: 22, ...values }), ...values };
    };

    const req = {
      body: {
        customer_name: "Test Customer",
        customer_email: "spoofed@example.com",
        customer_phone: "09123456789",
        shipping_address: "Mansalay, Oriental Mindoro",
        payment_method: "gcash",
        payment_reference: "GCASH-TEST-0001",
        total_amount: "0.02",
        cart_items: JSON.stringify([{ product_id: 7, quantity: 2, price: "0.01", name: "Fake name" }])
      },
      session: { cart: [], userEmail: "customer@example.com" }
    };
    const res = {
      redirect: value => { throw new Error(`Unexpected redirect: ${value}`); },
      render: (view, values) => { rendered = { view, values }; }
    };

    await ordercontroller.create(req, res);

    assert.equal(orderValues.total_amount, "1250.00");
    assert.equal(orderValues.customer_email, "customer@example.com");
    assert.equal(itemValues.price, "625.00");
    assert.equal(itemValues.product_name, product.name);
    assert.equal(paymentValues.reference_number, "GCASH-TEST-0001");
    assert.equal(paymentValues.status, "pending");
    assert.equal(product.stocks, 8);
    assert.equal(rendered.view, "shop/order-success");
  } finally {
    sequelize.transaction = originals.transaction;
    Product.findOne = originals.productFind;
    Order.create = originals.orderCreate;
    OrderItem.create = originals.itemCreate;
    Payment.create = originals.paymentCreate;
  }
});

test("online checkout requires a payment reference or uploaded proof", async () => {
  const req = {
    body: {
      customer_name: "Test Customer",
      customer_phone: "09123456789",
      shipping_address: "Mansalay, Oriental Mindoro",
      payment_method: "gcash",
      payment_reference: "",
      cart_items: JSON.stringify([{ product_id: 7, quantity: 1 }])
    },
    session: { cart: [], userEmail: "customer@example.com" }
  };
  let redirected;
  const res = { redirect: value => { redirected = value; } };

  await ordercontroller.create(req, res);

  assert.equal(redirected, "/checkout");
  assert.match(req.session.error_msg, /payment reference number or upload a payment receipt/i);
});

test("online orders cannot advance until payment evidence is approved", async () => {
  const originals = { orderFind: Order.findByPk, orderUpdate: Order.update };
  let updateCalled = false;
  let message = "";
  let redirected = "";
  try {
    Order.findByPk = async () => ({
      id: 44,
      payment_method: "gcash",
      payment_status: "unpaid"
    });
    Order.update = async () => { updateCalled = true; };
    const req = {
      params: { id: "44" },
      body: { status: "shipped" },
      flash: (_type, value) => { message = value; }
    };
    const res = { redirect: value => { redirected = value; } };

    await ordercontroller.updateStatus(req, res);

    assert.equal(updateCalled, false);
    assert.equal(redirected, "/admin/orders/edit/44");
    assert.match(message, /approve the submitted payment evidence/i);
  } finally {
    Order.findByPk = originals.orderFind;
    Order.update = originals.orderUpdate;
  }
});

test("another customer cannot open an order payment receipt", async () => {
  const originalOrderFind = Order.findByPk;
  let statusCode = 200;
  let body = "";
  try {
    Order.findByPk = async () => ({
      id: 51,
      user_id: 7,
      customer_email: "owner@example.com"
    });
    const req = {
      params: { id: "51" },
      session: { userId: 8, userEmail: "other@example.com", userRole: "customer" }
    };
    const res = {
      status: value => { statusCode = value; return res; },
      send: value => { body = value; return res; }
    };

    await ordercontroller.paymentProof(req, res);

    assert.equal(statusCode, 403);
    assert.equal(body, "Forbidden");
  } finally {
    Order.findByPk = originalOrderFind;
  }
});
