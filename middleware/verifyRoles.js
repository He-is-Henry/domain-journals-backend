const verifyRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req?.role)
      return res
        .status(403)
        .json({ error: "User not authorized to perform this action" });

    const rolesArray = [...allowedRoles];
    console.log(rolesArray);

    const hasRole = rolesArray.find((role) => role === req.role);
    if (!hasRole)
      return res
        .status(403)
        .json({ error: "User not authorized to perform this action" });
    next();
  };
};

module.exports = verifyRoles;
