const Archive = require("../model/Archive");

const addNewArchive = async (req, res) => {
  const { volume, issue, file, journal } = req.body;
  console.log({ volume, issue, file, journal });
  if (isNaN(volume) || isNaN(issue))
    return res.status(400).json({ error: "Invalid volume or issue" });
  const alreadyExistingArchive = await Archive.findOne({
    volume,
    issue,
    journal,
  });
  if (alreadyExistingArchive) await alreadyExistingArchive.deleteOne();
  await Archive.create({ volume, issue, file, journal });
  const message = alreadyExistingArchive
    ? `Successfully replaced archive in volume ${volume}, issue ${issue} journal ${journal}`
    : `Successfully created archive record for volume ${volume}, issue ${issue} journal ${journal}`;

  res.json(message);
};

const getAllArchives = async (req, res) => {
  const archiveList = await Archive.find();
  res.json(archiveList);
};

module.exports = { addNewArchive, getAllArchives };
