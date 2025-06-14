const { Accepted } = require("../model/AcceptedManuscripts");

const getByIssue = async (req, res) => {
  const { name, issue } = req.param;
  const currentIssue = await Accepted.find({
    journal: name,
    issue,
  });
  res.json(currentIssue);
};

module.exports = { getByIssue };
