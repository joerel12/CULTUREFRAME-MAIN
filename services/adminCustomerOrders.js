import { Op, col, fn, where } from "sequelize";

const normalizeEmail = value => String(value || "").trim().toLowerCase();

export const customerOrderWhere = customer => ({
  [Op.or]: [
    { user_id: Number(customer.id) },
    { user_id: null, [Op.and]: [where(fn("lower", col("customer_email")), normalizeEmail(customer.email))] }
  ]
});

export const customersOrderWhere = customers => ({
  [Op.or]: [
    { user_id: { [Op.in]: customers.map(customer => Number(customer.id)) } },
    { user_id: null, [Op.and]: [where(fn("lower", col("customer_email")), {
      [Op.in]: [...new Set(customers.map(customer => normalizeEmail(customer.email)))]
    })] }
  ]
});

export const summarizeCustomerOrders = (customers, orders) => {
  const byId = new Map(customers.map(customer => [Number(customer.id), Number(customer.id)]));
  const byEmail = new Map(customers.map(customer => [normalizeEmail(customer.email), Number(customer.id)]));
  const totals = new Map(customers.map(customer => [Number(customer.id), { orderCount: 0, paidCents: 0 }]));

  for (const order of orders) {
    const customerId = order.user_id == null
      ? byEmail.get(normalizeEmail(order.customer_email))
      : byId.get(Number(order.user_id));
    const summary = totals.get(customerId);
    if (!summary) continue;
    summary.orderCount += 1;
    if (order.payment_status === "paid") {
      summary.paidCents += Math.round(Number(order.total_amount || 0) * 100);
    }
  }
  return totals;
};
