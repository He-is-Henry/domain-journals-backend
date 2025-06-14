const { Journal } = require("../model/Journal");

const getCurrentIssue = async (req, res) => {
  const { name } = req.params;
  const journal = await Journal.find({ name });
  if (!journal) return res.status(404).json({ error: "Invalid journal name" });
  const issue = journal.issue;
  res.json({ issue });
};
const changeCurrentIssue = async (req, res) => {
  const { name } = req.params;
  const { issue } = req.body;
  const journal = await Journal.find({ name });
  if (!journal) return res.status(404).json({ error: "Invalid journal name" });
  journal.issue = Number(issue);
  const result = journal.save();
  res.json({ issue });
};

module.exports = { getCurrentIssue, changeCurrentIssue };
