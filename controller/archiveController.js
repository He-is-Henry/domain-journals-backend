const { supabase } = require("../config/supabase");
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
  await Archive.create({ issue, file, journal, year });
  const message = alreadyExistingArchive
    ? `Successfully replaced archive in journal ${journal}`
    : `Successfully created archive record for ${journal}`;

  res.json(message);
};

const getAllArchives = async (req, res) => {
  const archiveList = await Archive.find().lean();
  const result = archiveList.map((a) => ({
    ...a,
    fileUrl: a.file?.startsWith("http")
      ? a.file
      : supabase.storage.from("archive").getPublicUrl(a.file).data.publicUrl,
  }));
  res.json(result);
};

const deleteArchive = async (req, res) => {
  const { id } = req.params;
  const archive = await Archive.findByIdAndDelete(id);
  if (!archive) return res.json({ error: "No archive found" });
  res.json({ message: `Deleted ${id} successfully` });
};

module.exports = { addNewArchive, getAllArchives, deleteArchive };
