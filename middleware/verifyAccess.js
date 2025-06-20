const verifyAccess = (journalName) => {
  return (req, res, next) => {
    if (!req?.access) return res.status(403).json({ error: "Not allowed" });

    const allowed = journalName === req.access;
    if (!allowed) return res.sendStatus(403);
    next();
  };
};

module.exports = verifyAccess;
