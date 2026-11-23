import { User } from "../models/userModel.js";
import { Order } from "../models/Order.js";
import { Op } from "sequelize";
import { sequelize } from "../models/db.js";
import { customerOrderWhere, customersOrderWhere, summarizeCustomerOrders } from "../services/adminCustomerOrders.js";
import { revokeAccountSessions } from "../services/revokeAccountSessions.js";

const dateLabel = value => value ? new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila", year: "numeric", month: "short", day: "numeric"
}).format(new Date(value)) : "Never";

const customerMgmtController = {

  index: async (req, res) => {
    try {
      const status = ["active", "inactive"].includes(req.query.status) ? req.query.status : "all";
      const search = String(req.query.search || "").trim().slice(0, 100);
      const where = { role: "customer" };
      if (status !== "all") where.status = status;
      if (search) where[Op.or] = [
        { name:  { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
      const customers = await User.findAll({ where, attributes: { exclude: ["password"] }, order: [["createdAt","DESC"]] });
      const orders = customers.length ? await Order.findAll({
        where: customersOrderWhere(customers),
        attributes: ["user_id", "customer_email", "total_amount", "payment_status"],
        raw: true
      }) : [];
      const summaries = summarizeCustomerOrders(customers, orders);
      const enriched = customers.map(customer => {
        const summary = summaries.get(Number(customer.id));
        return {
          id: customer.id, name: customer.name, email: customer.email,
          phone: customer.phone, status: customer.status,
          joinedLabel: dateLabel(customer.createdAt),
          orderCount: summary.orderCount,
          totalSpend: (summary.paidCents / 100).toFixed(2)
        };
      });
      const counts = {
        all:      await User.count({ where: { role:"customer" } }),
        active:   await User.count({ where: { role:"customer", status:"active" } }),
        inactive: await User.count({ where: { role:"customer", status:"inactive" } })
      };
      res.render("admin/customer-list", { title:"Customer Management", activePage:"customers", customers: enriched, counts, filter: status, search });
    } catch (err) {
      console.error(err);
      res.status(500).send("Error loading customers");
    }
  },

  detail: async (req, res) => {
    try {
      const customer = await User.findOne({ where: { id: req.params.id, role:"customer" }, attributes: { exclude:["password"] } });
      if (!customer) return res.status(404).send("Not found");
      const orders = await Order.findAll({ where: customerOrderWhere(customer), order: [["createdAt","DESC"]] });
      const summary = summarizeCustomerOrders([customer], orders).get(Number(customer.id));
      res.render("admin/customer-detail", {
        title:`Customer: ${customer.name}`, activePage:"customers", customer,
        orders: orders.map(order => ({ ...order.get({ plain: true }), dateLabel: dateLabel(order.createdAt) })),
        totalSpend: (summary.paidCents / 100).toFixed(2),
        joinedLabel: dateLabel(customer.createdAt),
        lastLoginLabel: dateLabel(customer.lastLogin)
      });
    } catch (err) { console.error(err); res.status(500).send("Error loading customer"); }
  },

  toggleStatus: async (req, res) => {
    try {
      const customer = await sequelize.transaction(async transaction => {
        const record = await User.findOne({
          where: { id: req.params.id, role: "customer" }, transaction,
          lock: transaction.LOCK.UPDATE
        });
        if (!record) return null;
        const nextStatus = record.status === "active" ? "inactive" : "active";
        await record.update({ status: nextStatus }, { transaction });
        if (nextStatus === "inactive") await revokeAccountSessions(sequelize, record.id, transaction);
        return record;
      });
      if (!customer) return res.status(404).send("Not found");
      req.flash("success_msg", `Customer ${customer.name} status updated.`);
      res.redirect(`/admin/customers/${req.params.id}`);
    } catch (err) {
      req.flash("error_msg", "Failed.");
      res.redirect("/admin/customers");
    }
  }
};

export { customerMgmtController };
