// const { createClient } = require("@supabase/supabase-js/dist/index.cjs");
const { createClient } = require("@supabase/supabase-js/dist/index.cjs");
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

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

module.exports.wake = async (req, res) => {
  try {
    // This completely bypasses the broken anon gateway mappings and ignores all RLS rules
    const { data, error } = await supabaseAdmin
      .from("heartbeat")
      .select("id")
      .limit(1);

    if (error) throw error;

    return res.json({
      success: true,
      message: "Database pinged successfully via admin service layer!",
      data,
    });
  } catch (err) {
    console.error("Wake administrative bypass failed:", err.message);
    return res.status(500).json({ error: err.message });
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
