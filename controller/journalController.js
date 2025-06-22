const { Journal } = require("../model/Journal");

const getCurrentIssue = async (req, res) => {
  const { name } = req.params;
  if (!name) return res.status(500).json({ error: "Invalid journal name" });
  const journal = await Journal.findOne({ name });
  if (!journal) return res.status(404).json({ error: "Invalid journal name" });
  const issue = Number(journal.issue);
  res.json({ issue });
};

const changeCurrentIssue = async (req, res) => {
  const { name } = req.params;
  const journal = await Journal.findOne({ name });
  if (!journal) return res.status(404).json({ error: "Invalid journal name" });
  console.log(journal);
  journal.issue++;
  console.log(journal);
  const result = await journal.save();
  res.json(result);
};

module.exports = { getCurrentIssue, changeCurrentIssue };
