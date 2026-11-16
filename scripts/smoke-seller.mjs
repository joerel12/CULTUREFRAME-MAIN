const baseUrl = (process.env.CULTUREFRAME_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const email = process.env.CULTUREFRAME_SELLER_EMAIL;
const password = process.env.CULTUREFRAME_SELLER_PASSWORD;
if (!email || !password) throw new Error("Set CULTUREFRAME_SELLER_EMAIL and CULTUREFRAME_SELLER_PASSWORD for the seller smoke test.");

const login = await fetch(`${baseUrl}/login`, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ email, password }),
  redirect: "manual"
});
const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
if (login.status !== 302 || !cookie) throw new Error(`Seller login failed (HTTP ${login.status}).`);

const checks = [
  ["/seller/dashboard", "Product performance"],
  ["/seller/orders", "Transactions & payments"],
  ["/seller/walk-in", "Recent walk-in sales"]
];
const results = [];
for (const [route, text] of checks) {
  const response = await fetch(`${baseUrl}${route}`, { headers: { cookie }, redirect: "manual" });
  const html = await response.text();
  results.push({ route, status: response.status, passed: response.status === 200 && html.includes(text) && !html.includes("Server Error") });
  if (route === "/seller/orders") {
    const match = html.match(/href="(\/seller\/orders\/\d+)"/);
    if (match) checks.push([match[1], "Payment records & proof"]);
  }
}
const anonymous = await fetch(`${baseUrl}/seller/orders`, { redirect: "manual" });
results.push({ route: "anonymous /seller/orders", status: anonymous.status, passed: anonymous.status === 302 && anonymous.headers.get("location") === "/login" });
const stylesheet = await fetch(`${baseUrl}/tailwind.css?v=seller-workspace-20261117`);
const css = await stylesheet.text();
results.push({ route: "/tailwind.css", status: stylesheet.status, passed: stylesheet.status === 200 && css.includes(".bg-emerald-950") && css.includes(".rounded-3xl") });
console.log(JSON.stringify({ passed: results.filter(result => result.passed).length, total: results.length, results }, null, 2));
if (results.some(result => !result.passed)) process.exitCode = 1;
