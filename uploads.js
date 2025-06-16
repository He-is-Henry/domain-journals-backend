const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "manuscripts",
    resource_type: "raw",
  },
});

const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "avatars",
    resource_type: "image",
  },
});

const upload = multer({ storage });
const uploadImage = multer({ storage: imageStorage });
module.exports = { upload, uploadImage };
