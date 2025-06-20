const { Journal } = require("../model/Journal");

const getCurrentIssue = async (req, res) => {
  const { name } = req.params;
  if (!name) return res.status(500).json({ error: "Invalid journal name" });
  const journal = await Journal.find({ name });
  if (!journal) return res.status(404).json({ error: "Invalid journal name" });
  const issue = Number(journal[0].issue);
  res.json({ issue });
};

const changeCurrentIssue = async (req, res) => {
  const { name } = req.params;
  const journal = await Journal.find({ name });
  if (!journal) return res.status(404).json({ error: "Invalid journal name" });
  journal.issue++;
  const result = await journal.save();
  res.json(result);
};

module.exports = { getCurrentIssue, changeCurrentIssue };
