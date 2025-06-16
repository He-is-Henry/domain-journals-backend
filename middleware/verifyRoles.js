const verifyRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req?.roles)
      return res
        .status(403)
        .json({ error: "User not authorized to perform this action" });

    const rolesArray = [...allowedRoles];
    console.log(rolesArray);
    const userRoles = req.user.roles;

    const hasRole = userRoles.some((role) => rolesArray.includes(role));

    if (!hasRole) return res.sendStatus(403);
    next();
  };
};

module.exports = verifyRoles;
