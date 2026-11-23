import { Op } from "sequelize";
import { Seller } from "../models/Seller.js";
import { Product } from "../models/Product.js";
import { User } from "../models/userModel.js";
import { sequelize } from "../models/db.js";
import { revokeAccountSessions } from "../services/revokeAccountSessions.js";

const accountStatusForSeller = sellerStatus => sellerStatus === "inactive" ? "inactive" : "active";
const isStrongPassword = password => typeof password === "string" && password.length >= 12 && password.length <= 128 &&
  /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
const validStatuses = new Set(["active", "inactive", "pending"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sellerInput = body => ({
  business_name: String(body.business_name || "").trim(),
  contact_name: String(body.contact_name || "").trim(),
  email: String(body.email || "").trim().toLowerCase(),
  phone: String(body.phone || "").trim() || null,
  address: String(body.address || "").trim() || null,
  category: String(body.category || "").trim() || null,
  status: String(body.status || "pending"),
  commission_rate: body.commission_rate === "" || body.commission_rate == null ? 10 : Number(body.commission_rate),
  notes: String(body.notes || "").trim() || null
});
const sellerInputError = input => {
  if (input.business_name.length < 2 || input.business_name.length > 150) return "Business name must have 2–150 characters.";
  if (input.contact_name.length < 2 || input.contact_name.length > 150) return "Contact name must have 2–150 characters.";
  if (!emailPattern.test(input.email) || input.email.length > 254) return "Enter a valid seller email address.";
  if (!validStatuses.has(input.status)) return "Select a valid seller status.";
  if (!Number.isFinite(input.commission_rate) || input.commission_rate < 0 || input.commission_rate > 100) return "Commission rate must be 0–100%.";
  return null;
};

const sellerController = {
  index: async (req, res) => {
    try {
      const status = validStatuses.has(req.query.status) ? req.query.status : "all";
      const search = String(req.query.search || "").trim().slice(0, 100);
      const where = {};
      if (status !== "all") where.status = status;
      if (search) {
        const likeOperator = sequelize.getDialect() === "postgres" ? Op.iLike : Op.like;
        where[Op.or] = [
          { business_name: { [likeOperator]: `%${search}%` } },
          { email: { [likeOperator]: `%${search}%` } }
        ];
      }

      const sellerRows = await Seller.findAll({ where, order: [["createdAt", "DESC"]] });
      const sellerIds = sellerRows.map(seller => seller.id);
      const userIds = sellerRows.map(seller => seller.user_id).filter(Boolean);
      const [userRows, productRows] = await Promise.all([
        userIds.length ? User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ["id", "email", "role", "status"], raw: true }) : [],
        sellerIds.length ? Product.findAll({
          where: { seller_id: { [Op.in]: sellerIds } },
          attributes: ["seller_id", [sequelize.fn("COUNT", sequelize.col("id")), "productCount"]],
          group: ["seller_id"], raw: true
        }) : []
      ]);
      const usersById = new Map(userRows.map(user => [Number(user.id), user]));
      const productsBySeller = new Map(productRows.map(row => [Number(row.seller_id), Number(row.productCount)]));
      const sellers = sellerRows.map(row => {
        const seller = row.get({ plain: true });
        const user = usersById.get(Number(seller.user_id));
        const loginState = !user ? "Needs login"
          : user.role !== "seller" || user.email !== seller.email ? "Check account"
          : user.status !== "active" ? "Disabled"
          : seller.status === "pending" ? "Awaiting approval"
          : seller.status === "inactive" ? "Paused" : "Ready";
        return { ...seller, productCount: productsBySeller.get(Number(seller.id)) || 0, loginState };
      });
      const counts = {
        all: await Seller.count(),
        active: await Seller.count({ where: { status: "active" } }),
        pending: await Seller.count({ where: { status: "pending" } }),
        inactive: await Seller.count({ where: { status: "inactive" } })
      };
      res.render("admin/seller-list", {
        title: "Seller Management",
        activePage: "sellers",
        sellers,
        counts,
        filter: status,
        search
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error loading sellers");
    }
  },

  addForm: (_req, res) => res.render("admin/seller-add", {
    title: "Add Seller",
    activePage: "sellers"
  }),

  add: async (req, res) => {
    const input = sellerInput(req.body);
    const inputError = sellerInputError(input);
    if (inputError) {
      req.flash("error_msg", inputError);
      return res.redirect("/admin/sellers/add");
    }
    const temporary_password = req.body.temporary_password;

    if (!isStrongPassword(temporary_password)) {
      req.flash("error_msg", "The temporary password must be 12-128 characters with uppercase, lowercase, number, and symbol characters.");
      return res.redirect("/admin/sellers/add");
    }

    try {
      await sequelize.transaction(async transaction => {
        const existingUser = await User.findOne({ where: { email: input.email }, transaction });
        if (existingUser) throw new Error("A login account already uses this email address.");

        const sellerUser = await User.create({
          name: input.contact_name,
          email: input.email,
          password: temporary_password,
          role: "seller",
          status: accountStatusForSeller(input.status),
          phone: input.phone,
          address: input.address
        }, { transaction });

        await Seller.create({
          user_id: sellerUser.id,
          ...input
        }, { transaction });
      });

      req.flash("success_msg", `Seller "${input.business_name}" and its login account were added.`);
      res.redirect("/admin/sellers");
    } catch (error) {
      req.flash("error_msg", `Failed: ${error.message}`);
      res.redirect("/admin/sellers/add");
    }
  },

  editForm: async (req, res) => {
    try {
      const seller = await Seller.findByPk(req.params.id);
      if (!seller) return res.status(404).send("Not found");
      const loginUser = seller.user_id ? await User.findByPk(seller.user_id, { attributes: ["id", "role"] }) : null;
      res.render("admin/seller-edit", {
        title: "Edit Seller",
        activePage: "sellers",
        seller,
        hasLoginAccount: loginUser?.role === "seller"
      });
    } catch (_error) {
      res.status(500).send("Error");
    }
  },

  update: async (req, res) => {
    const input = sellerInput(req.body);
    const inputError = sellerInputError(input);
    if (inputError) {
      req.flash("error_msg", inputError);
      return res.redirect(`/admin/sellers/edit/${req.params.id}`);
    }
    const reset_password = req.body.reset_password;

    if (reset_password && !isStrongPassword(reset_password)) {
      req.flash("error_msg", "The new password must be 12-128 characters with uppercase, lowercase, number, and symbol characters.");
      return res.redirect(`/admin/sellers/edit/${req.params.id}`);
    }

    try {
      let accountCreated = false;
      await sequelize.transaction(async transaction => {
        const seller = await Seller.findByPk(req.params.id, { transaction });
        if (!seller) throw new Error("Seller not found.");

        let user = seller.user_id ? await User.findByPk(seller.user_id, { transaction }) : null;
        if (user && user.role !== "seller") throw new Error("This seller is linked to a different account role.");
        if (!user && input.status === "active" && !reset_password) {
          throw new Error("Set a login password before activating this seller.");
        }
        if (!user && reset_password) {
          const emailOwner = await User.findOne({ where: { email: input.email }, transaction });
          if (emailOwner) throw new Error("A login account already uses this email address.");
          user = await User.create({
            name: input.contact_name,
            email: input.email,
            password: reset_password,
            role: "seller",
            status: accountStatusForSeller(input.status),
            phone: input.phone,
            address: input.address
          }, { transaction });
          seller.user_id = user.id;
          accountCreated = true;
        } else if (user) {
          const emailOwner = await User.findOne({
            where: { email: input.email, id: { [Op.ne]: user.id } },
            transaction
          });
          if (emailOwner) throw new Error("A login account already uses this email address.");

          const identityChanged = user.email !== input.email || user.status !== accountStatusForSeller(input.status) || seller.status !== input.status;
          user.name = input.contact_name;
          user.email = input.email;
          user.status = accountStatusForSeller(input.status);
          user.phone = input.phone;
          user.address = input.address;
          if (reset_password) user.password = reset_password;
          await user.save({ transaction });
          if (identityChanged || reset_password) await revokeAccountSessions(sequelize, user.id, transaction);
        }

        await seller.update({
          user_id: seller.user_id,
          ...input
        }, { transaction });
      });

      req.flash("success_msg", accountCreated ? "Seller updated and login account created." : "Seller updated.");
      res.redirect("/admin/sellers");
    } catch (error) {
      req.flash("error_msg", `Failed: ${error.message}`);
      res.redirect(`/admin/sellers/edit/${req.params.id}`);
    }
  },

  delete: async (req, res) => {
    try {
      await sequelize.transaction(async transaction => {
        const seller = await Seller.findByPk(req.params.id, { transaction });
        if (!seller) throw new Error("Seller not found.");

        const productCount = await Product.count({ where: { seller_id: seller.id }, transaction });
        if (productCount > 0) {
          throw new Error("This seller has products. Set the seller to inactive instead of deleting it.");
        }

        const userId = seller.user_id;
        const linkedUser = userId ? await User.findByPk(userId, { transaction }) : null;
        if (linkedUser && linkedUser.role !== "seller") {
          throw new Error("This seller is linked to a different account role and cannot be deleted.");
        }
        await seller.destroy({ transaction });
        if (linkedUser) {
          await revokeAccountSessions(sequelize, userId, transaction);
          await linkedUser.destroy({ transaction });
        }
      });
      req.flash("success_msg", "Seller and its login account were deleted.");
    } catch (error) {
      req.flash("error_msg", error.message || "Failed to delete seller.");
    }
    res.redirect("/admin/sellers");
  }
};

export { sellerController };
