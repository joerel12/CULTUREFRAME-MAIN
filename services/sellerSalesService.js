import { Op } from "sequelize";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { OrderItem } from "../models/Orderitem.js";
import { Payment } from "../models/Payment.js";

const toCents = amount => Math.round(Number(amount || 0) * 100);
const money = cents => (cents / 100).toFixed(2);
const formatDate = date => new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila", year: "numeric", month: "short", day: "numeric",
  hour: "numeric", minute: "2-digit"
}).format(new Date(date));

const hasProof = payment => {
  try {
    return typeof JSON.parse(payment.notes || "{}").proofFile === "string";
  } catch {
    return false;
  }
};

const paymentForItem = (item, payments) => {
  const externalId = `CF-ORDER-${item.order_id}-ITEM-${item.id}`;
  return payments.find(payment => payment.integration_external_id === externalId)
    || payments.find(payment => !payment.integration_external_id);
};

const hasRecordedPayment = (order, payment) => {
  if (payment) return payment.status === "paid" || payment.status === "partially_refunded";
  return order.payment_status === "paid";
};

export const loadSellerSales = async sellerId => {
  const products = (await Product.findAll({ where: { seller_id: sellerId } }))
    .map(product => product.get({ plain: true }));
  const productIds = products.map(product => product.id);
  const items = productIds.length ? (await OrderItem.findAll({
    where: { product_id: { [Op.in]: productIds } }
  })).map(item => item.get({ plain: true })) : [];
  const orderIds = [...new Set(items.map(item => item.order_id))];
  const [orderRows, paymentRows] = orderIds.length ? await Promise.all([
    Order.findAll({ where: { id: { [Op.in]: orderIds } }, order: [["createdAt", "DESC"]] }),
    Payment.findAll({ where: { order_id: { [Op.in]: orderIds } }, order: [["createdAt", "DESC"]] })
  ]) : [[], []];
  const itemsByOrder = new Map();
  for (const item of items) {
    if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
    itemsByOrder.get(item.order_id).push(item);
  }
  const paymentsByOrder = new Map();
  for (const row of paymentRows) {
    const payment = row.get({ plain: true });
    if (!paymentsByOrder.has(payment.order_id)) paymentsByOrder.set(payment.order_id, []);
    paymentsByOrder.get(payment.order_id).push(payment);
  }

  const performance = new Map(products.map(product => [product.id, {
    ...product, paidUnits: 0, paidCents: 0, orderCount: 0
  }]));
  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const totals = {
    orderCount: 0, walkInCount: 0, paidUnits: 0, paidCents: 0,
    walkInPaidCents: 0, onlinePaidCents: 0,
    paid30DaysCents: 0, awaitingPaymentCount: 0
  };

  const orders = orderRows.map(row => {
    const order = row.get({ plain: true });
    const sellerItems = itemsByOrder.get(order.id) || [];
    const allPayments = paymentsByOrder.get(order.id) || [];
    const sellerExternalIds = new Set(sellerItems.map(item => `CF-ORDER-${order.id}-ITEM-${item.id}`));
    const sellerPayments = allPayments.filter(payment => !payment.integration_external_id || sellerExternalIds.has(payment.integration_external_id));
    let subtotalCents = 0;
    let paidCents = 0;
    let paidLines = 0;
    const lines = sellerItems.map(item => {
      const lineCents = toCents(item.price) * Number(item.quantity);
      const payment = paymentForItem(item, sellerPayments);
      const paid = hasRecordedPayment(order, payment);
      const product = performance.get(item.product_id);
      subtotalCents += lineCents;
      product.orderCount += 1;
      if (paid) paidLines += 1;
      if (paid && order.status !== "cancelled") {
        paidCents += lineCents;
        product.paidUnits += Number(item.quantity);
        product.paidCents += lineCents;
        totals.paidUnits += Number(item.quantity);
      }
      return {
        ...item,
        lineTotal: money(lineCents),
        paid,
        image_url: product.image_url
      };
    });

    const isWalkIn = String(order.payment_method).startsWith("walk_in_");
    totals.orderCount += 1;
    if (isWalkIn) totals.walkInCount += 1;
    totals.paidCents += paidCents;
    if (isWalkIn) totals.walkInPaidCents += paidCents;
    else totals.onlinePaidCents += paidCents;
    if (new Date(order.createdAt).getTime() >= monthAgo) totals.paid30DaysCents += paidCents;
    if (order.status !== "cancelled" && paidLines < lines.length && (sellerPayments.length === 0 || sellerPayments.some(payment => payment.status === "pending"))) {
      totals.awaitingPaymentCount += 1;
    }

    const paymentStatus = sellerPayments.some(payment => payment.status === "partially_refunded") ? "partial refund"
      : paidLines === lines.length && lines.length ? "paid"
      : paidLines ? "partial"
      : sellerPayments.some(payment => payment.status === "failed") ? "failed"
      : sellerPayments.some(payment => payment.status === "refunded") ? "refunded"
      : "unpaid";
    return {
      id: order.id,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      shipping_address: order.shipping_address,
      status: order.status,
      paymentStatus,
      payment_method: order.payment_method,
      isWalkIn,
      createdAt: order.createdAt,
      dateLabel: formatDate(order.createdAt),
      subtotal: money(subtotalCents),
      paidTotal: money(paidCents),
      itemCount: lines.reduce((count, item) => count + Number(item.quantity), 0),
      lines,
      payments: sellerPayments.map(payment => {
        let notes = {};
        try { notes = JSON.parse(payment.notes || "{}"); } catch { notes = {}; }
        return {
          ...payment,
          dateLabel: formatDate(payment.createdAt),
          productAmount: payment.integration_external_id ? money(toCents(payment.amount)) : null,
          cashTendered: notes.cash_tendered || null,
          change: notes.change != null && Number.isFinite(Number(notes.change)) ? money(toCents(notes.change)) : null,
          reviewNote: typeof notes.reviewNote === "string" ? notes.reviewNote : null,
          proofPath: hasProof(payment) ? `/seller/orders/${order.id}/payments/${payment.id}/proof` : null
        };
      })
    };
  });

  const productPerformance = [...performance.values()]
    .map(product => ({ ...product, paidRevenue: money(product.paidCents) }))
    .sort((a, b) => b.paidUnits - a.paidUnits || b.paidCents - a.paidCents || a.name.localeCompare(b.name));

  return {
    products,
    productPerformance,
    orders,
    totals: {
      ...totals,
      paidRevenue: money(totals.paidCents),
      paid30Days: money(totals.paid30DaysCents),
      walkInPaidRevenue: money(totals.walkInPaidCents),
      onlinePaidRevenue: money(totals.onlinePaidCents)
    }
  };
};
