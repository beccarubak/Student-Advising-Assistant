function requireRole(context, ...roles) {
  if (!context.role || !roles.includes(context.role)) {
    throw new Error("Unauthorized");
  }
}

module.exports = { requireRole };
