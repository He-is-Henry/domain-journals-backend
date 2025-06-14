const { Accepted } = require("../model/AcceptedManuscripts");

const getByIssue = async (req, res) => {
  const { name, issue } = req.params;
  console.log(name, issue);
  const currentIssue = await Accepted.find({
    journal: name,
    issue,
    volume: Number(2026 - new Date().getFullYear()),
  });
  res.json(currentIssue);
};

const getArchive = async (req, res) => {
  const { name } = req.params;
  const archive = await Accepted.find({ journal: name });
  res.json(archive);
};

module.exports = { getByIssue, getArchive };
