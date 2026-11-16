# CultureFrame integration verification

The required [CULTUREFRAME-MAIN repository](https://github.com/joerel12/CULTUREFRAME-MAIN)
on branch `main` is the source for the deployed system. The groupmates' original
repositories are separate repositories, not branches of one another. Their code
has been brought into the required repository. New commits in an original
repository do not appear in the deployed system until they are integrated into
`CULTUREFRAME-MAIN/main`.

| Part | Original source | Location in the required repository | Connection |
| --- | --- | --- | --- |
| Main accounts and admin | [Jenny's CultureFrame](https://github.com/JennyJoyIrmo/jennycultureframe) | Repository root | Signs in users and admins; owns the shared commerce data. Jenny's commits are retained in `main` history. |
| Seller | [Kyla's CultureFrame](https://github.com/kylasalmorin08-ui/CultureFrame) | `routes/sellerPortal.js`, `controllers/sellerPortalController.js`, `middleware/requireSeller.js`, `models/Seller.js` | Seller products use the same `Product` model read by `/shop`. Walk-in sales create shared `Order`, `OrderItem`, and `Payment` records. Seller pages require an active seller login. Kyla's source commit `83afe885` has the same tree as integrated commit `7a8975b`. |
| Visitor information | [Visitor-Information](https://github.com/gregoriobea/Visitor-Information) | `subsystems/visitor-information` | The main `/discover` pages use the visitor API; signed handoffs connect customer and admin accounts. The source tree at `8765888` matches the imported subtree at `dbd0ef4`. |
| Payments | [cultureframe-payment-](https://github.com/Alexander23-Zues/cultureframe-payment-) | `subsystems/cultureframe-payments` and the main payment integration routes | The payment service and main app exchange orders and payment events using a private integration token. The source head `b3f2752` is in `main` history. |
| CultureMetrics | Local CultureMetrics project | `subsystems/culturemetrics` and the main analytics integration routes | Admin handoff and a private analytics API connect the dashboard to main orders, products, and content. Its history was imported in commit `9604488`. |

The seller is part of the main web service; it does not need a fifth deployment.
The visitor, payment, and metrics modules run as separate Render web services
declared in `render.yaml`. The main service also runs there. The services use
private tokens or signed handoffs for protected requests.

## Reproduce the checks

1. In GitHub, open `CULTUREFRAME-MAIN` on `main`. Inspect the seller files at the
   root and the three directories under `subsystems`. The seller source is also
   traceable through Kyla's commits in the repository history.
2. Run `npm.cmd run test:integration` from the repository root on Windows. On
   2026-11-16, all 31 tests passed, including seller walk-in inventory and order
   records, payment events, visitor pages and handoffs, analytics, and login
   protections.
3. Open the [public shop](https://cultureframe-joerel-main.onrender.com/shop).
   The [seller dashboard](https://cultureframe-joerel-main.onrender.com/seller/dashboard)
   should require a seller login. The main, visitor, metrics, and payment health
   endpoints all returned HTTP 200 on 2026-11-16.
4. For a transaction demonstration, sign in as an active seller, add a product,
   and check that it appears in the public shop. Place an order from a customer
   account, then inspect the order and payment in admin and the product stock in
   seller. This authenticated live transaction still needs to be performed with
   test accounts; the public checks and automated tests do not prove it by
   themselves.

For future updates, each member should branch from `CULTUREFRAME-MAIN/main`,
commit only their module changes, and merge a reviewed pull request into `main`.
If a member continues to work in an original repository, bring those commits
into the required repository before deployment.
