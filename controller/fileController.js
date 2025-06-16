const uploadFile = (req, res) => {
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
};
