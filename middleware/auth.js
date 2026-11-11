/*
  CultureFrame — Auth Middleware
  requireLogin: redirects unauthenticated requests to /login.
  Attach to any route that must be protected.
*/

export function requireLogin(req, res, next) {
  if (req.session && req.session.sellerId) {
    return next();
  }
  req.flash("error_msg", "Please log in to access the Seller Dashboard.");
  res.redirect("/login");
}
