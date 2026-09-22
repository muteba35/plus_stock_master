import { checkAnyPermission } from "./authMiddleware.js";

// Export authorization supplements (never replaces) the route's read/scope guard.
export const checkExportPermission = (...permissions) => (req, res, next) => {
  if (req.query.export !== "1") return next();
  return checkAnyPermission(...permissions)(req, res, next);
};
