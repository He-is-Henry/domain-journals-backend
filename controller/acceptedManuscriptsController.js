const { Accepted } = require("../model/AcceptedManuscripts");

const getByIssue = async (req, res) => {
  const { name } = req.param;
  const { issue } = req.body;
  const currentIssue = await Accepted.find({
    journal: name,
    issue,
  });
  res.json(currentIssue);
};

module.exports = { getByIssue };
