const { supabase } = require("../config/supabase");
module.exports.uploadPdf = async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "No file selected" });

  const fileName = `${Date.now()}_${file.originalname
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")}`;

  const { error } = await supabase.storage
    .from("archive")
    .upload(fileName, file.buffer, { contentType: file.mimetype });

  if (error) return res.status(500).json({ error: error.message });

  const { data } = supabase.storage.from("archive").getPublicUrl(fileName);
  res.json({ url: data.publicUrl, path: fileName });
};

module.exports.deletePdf = async (req, res) => {
  const { filePath } = req.body;
  const { error } = await supabase.storage.from("archive").remove([filePath]);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};

module.exports.getPdfUrl = (req, res) => {
  const { filePath } = req.query;
  if (!filePath) return res.status(400).json({ error: "filePath required" });
  const { data } = supabase.storage.from("archive").getPublicUrl(filePath);
  res.json({ url: data.publicUrl });
};
