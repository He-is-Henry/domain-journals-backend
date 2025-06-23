const axios = require("axios");
const path = require("path");

const downloadFile = async (req, res) => {
  const fileId = req.query.url;

  if (!fileId || !fileId.startsWith("https://res.cloudinary.com")) {
    return res.status(400).json({ error: "Invalid or missing file URL." });
  }
  const rawFilename = path.basename(fileId);

  try {
    const response = await axios.get(fileId, {
      responseType: "arraybuffer",
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${rawFilename}.pdf"`,
    });

    return res.send(response.data);
  } catch (err) {
    console.error("Download error:", err.message);
    return res.status(500).json({ error: "Failed to download file." });
  }
};

const uploadFile = (req, res) => {
  try {
    console.log("Trying to upload file");
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const fileUrl = req.file.path;
    const extension = req.body.extension;

    return res.status(200).json({ url: fileUrl, extension });
  } catch (err) {
    console.log("Upload error:", err.stack);
    return res.status(500).json({ error: "Failed to upload file" });
  }
};
const uploadAvatar = (req, res) => {
  try {
    console.log("Trying to upload file");
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const fileUrl = req.file.path;
    console.log(fileUrl);

    return res.status(200).json({ url: fileUrl });
  } catch (err) {
    console.log("Upload error:", err.stack);
    return res.status(500).json({ error: "Failed to upload file" });
  }
};

module.exports = {
  uploadFile,
  uploadAvatar,
  downloadFile,
};
