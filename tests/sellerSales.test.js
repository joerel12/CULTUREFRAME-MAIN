import test from "node:test";
import assert from "node:assert/strict";

process.env.SKIP_DATABASE_AUTHENTICATION = "true";
process.env.NODE_ENV = "test";

const { loadSellerSales } = await import("../services/sellerSalesService.js");
const { sellerPaymentProof } = await import("../controllers/sellerPortalController.js");
const { Product } = await import("../models/Product.js");
const { Order } = await import("../models/Order.js");
const { OrderItem } = await import("../models/Orderitem.js");
const { Payment } = await import("../models/Payment.js");
const { savePaymentProof, discardPaymentProof } = await import("../services/paymentProofService.js");

const row = value => ({ ...value, get: () => value });

test("seller sales use only owned order lines and their payment records", async () => {
  const originals = {
    products: Product.findAll, items: OrderItem.findAll,
    orders: Order.findAll, payments: Payment.findAll
  };
  const now = new Date();
  const products = [
    { id: 7, seller_id: 3, name: "Woven Basket", price: "125.00", stocks: 3, status: "active" },
    { id: 9, seller_id: 3, name: "Beadwork", price: "80.00", stocks: 5, status: "active" }
  ];
  Product.findAll = async options => {
    assert.deepEqual(options.where, { seller_id: 3 });
    return products.map(row);
  };
  OrderItem.findAll = async options => {
    assert.deepEqual(options.where.product_id[Object.getOwnPropertySymbols(options.where.product_id)[0]], [7, 9]);
    return [
      row({ id: 1, order_id: 44, product_id: 7, product_name: "Woven Basket", quantity: 2, price: "125.00" }),
      row({ id: 2, order_id: 45, product_id: 9, product_name: "Beadwork", quantity: 1, price: "80.00" })
    ];
  };
  Order.findAll = async () => [
    row({ id: 45, createdAt: now, status: "pending", payment_status: "unpaid", payment_method: "gcash", customer_name: "Visitor A" }),
    row({ id: 44, createdAt: now, status: "confirmed", payment_status: "partial", payment_method: "gcash", customer_name: "Visitor B" })
  ];
  Payment.findAll = async () => [
    row({ id: 10, order_id: 44, integration_external_id: "CF-ORDER-44-ITEM-999", status: "paid", amount: "1000.00", reference_number: "OTHER-SELLER", notes: "" , createdAt: now }),
    row({ id: 11, order_id: 44, integration_external_id: "CF-ORDER-44-ITEM-1", status: "paid", amount: "250.00", reference_number: "OWN-SELLER", notes: "", createdAt: now }),
    row({ id: 12, order_id: 44, integration_external_id: null, status: "pending", amount: "1250.00", reference_number: "CUSTOMER-REF", notes: JSON.stringify({ proofFile: "receipt.jpg" }), createdAt: now })
  ];
  try {
    const sales = await loadSellerSales(3);
    assert.equal(sales.totals.paidRevenue, "250.00");
    assert.equal(sales.totals.paidUnits, 2);
    assert.equal(sales.totals.orderCount, 2);
    assert.equal(sales.totals.awaitingPaymentCount, 1);
    assert.equal(sales.productPerformance[0].name, "Woven Basket");
    assert.equal(sales.productPerformance[0].paidUnits, 2);
    assert.equal(sales.orders[1].subtotal, "250.00");
    assert.deepEqual(sales.orders[1].payments.map(payment => payment.reference_number), ["OWN-SELLER", "CUSTOMER-REF"]);
    assert.equal(sales.orders[1].payments[1].proofPath, "/seller/orders/44/payments/12/proof");
  } finally {
    Product.findAll = originals.products;
    OrderItem.findAll = originals.items;
    Order.findAll = originals.orders;
    Payment.findAll = originals.payments;
  }
});

test("seller cannot open another seller's line-specific payment proof", async () => {
  const originals = { products: Product.findAll, items: OrderItem.findAll, payment: Payment.findOne };
  Product.findAll = async () => [{ id: 7 }];
  OrderItem.findAll = async () => [{ id: 1 }];
  Payment.findOne = async () => ({ id: 10, order_id: 44, integration_external_id: "CF-ORDER-44-ITEM-999" });
  const response = { status(code) { this.code = code; return this; }, send(message) { this.message = message; return this; } };
  try {
    await sellerPaymentProof({ seller: { id: 3 }, params: { orderId: "44", paymentId: "10" } }, response, error => { throw error; });
    assert.equal(response.code, 404);
    assert.equal(response.message, "Payment proof not found");
  } finally {
    Product.findAll = originals.products;
    OrderItem.findAll = originals.items;
    Payment.findOne = originals.payment;
  }
});

test("seller can open a private receipt for an order containing their product", async () => {
  const originals = { products: Product.findAll, items: OrderItem.findAll, payment: Payment.findOne };
  const proofFile = await savePaymentProof({ mimetype: "image/png", buffer: Buffer.from([137, 80, 78, 71]) });
  Product.findAll = async () => [{ id: 7 }];
  OrderItem.findAll = async () => [{ id: 1 }];
  Payment.findOne = async () => ({ id: 12, order_id: 44, integration_external_id: null, notes: JSON.stringify({ proofFile }) });
  const headers = {};
  const response = {
    setHeader(name, value) { headers[name] = value; },
    sendFile(file) { this.file = file; return this; },
    status(code) { this.code = code; return this; },
    send(message) { this.message = message; return this; }
  };
  try {
    await sellerPaymentProof({ seller: { id: 3 }, params: { orderId: "44", paymentId: "12" } }, response, error => { throw error; });
    assert.match(response.file, /private-uploads[\\/]payment-proofs/);
    assert.equal(headers["Cache-Control"], "private, no-store, max-age=0");
    assert.equal(headers["X-Content-Type-Options"], "nosniff");
  } finally {
    await discardPaymentProof(proofFile);
    Product.findAll = originals.products;
    OrderItem.findAll = originals.items;
    Payment.findOne = originals.payment;
  }
});
