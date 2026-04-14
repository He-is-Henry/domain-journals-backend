const { supabase } = require("../config/supabase");
module.exports.uploadPdf = async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "No file selected" });

  const fileName = `${Date.now()}_${file.originalname
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")}`;

  try {
    const { error } = await supabase.storage
      .from("archive")
      .upload(fileName, file.buffer, { contentType: file.mimetype });

    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from("archive").getPublicUrl(fileName);
    res.json({ url: data.publicUrl, path: fileName });
  } catch (e) {
    console.log(e.message);
  }
};

module.exports.deletePdf = async (req, res) => {
  const { filePath } = req.body;
  try {
    const { error } = await supabase.storage.from("archive").remove([filePath]);
    if (error) throw new Error(error.message);
    res.json({ success: true });
  } catch (e) {
    console.log(e.message);
  }
};

module.exports.getPdfUrl = async (req, res) => {
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: "filePath required" });

  const response = handlePdfURL(filePath);
  res.json(response);
};

module.exports.wake = async (req, res) => {
  try {
    await supabase.storage.from("archive").list("", { limit: 1 });
    res.json({ success: true, message: "Supabase awake" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const handlePdfURL = (filePath) => {
  if (Array.isArray(filePath)) {
    const urls = {};
    filePath.forEach((fp) => {
      const { data } = supabase.storage.from("archive").getPublicUrl(fp);
      urls[fp] = data.publicUrl;
    });
    return { urls };
  }
  const { data } = supabase.storage.from("archive").getPublicUrl(filePath);
  return { url: data.publicUrl };
};
