const Archive = require("../model/Archive");

const addNewArchive = async (req, res) => {
  const { issue, file, journal, year } = req.body;
  if (isNaN(issue)) return res.status(400).json({ error: "Invalid  issue" });
  const alreadyExistingArchive = await Archive.findOne({
    issue,
    journal,
    year,
  });
  if (alreadyExistingArchive) await alreadyExistingArchive.deleteOne();
  await Archive.create({ issue, file, journal });
  const message = alreadyExistingArchive
    ? `Successfully replaced archive in journal ${journal}`
    : `Successfully created archive record for ${journal}`;

  res.json(message);
};

const getAllArchives = async (req, res) => {
  const archiveList = await Archive.find();
  res.json(archiveList);
};

module.exports = { addNewArchive, getAllArchives };
