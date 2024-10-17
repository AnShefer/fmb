const multer = require("multer");
const multerS3 = require("multer-s3");
const s3Client = require("../config/digitalOcean");
const { SettingsModel } = require("../models");

// Fetch maximum file size limit
async function fetchMaxFileSize(req, res, next) {
  try {
    const settings = await SettingsModel.findOne();
    req.maxFileSize = settings.maxFileSize;
    next();
  } catch (error) {
    console.error("Error fetching max file size:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// Create multer storage configuration
const storage = multerS3({
  s3: s3Client,
  bucket: "forever-messages-dev-01",
  acl: "public-read",
  key: function (request, file, cb) {
    cb(null, Date.now().toString());
  },
  metadata: function (request, file, cb) {
    cb(null, { fieldName: file.fieldname });
  },
  contentType: function (request, file, cb) {
    cb(null, file.mimetype);
  },
});

// Middleware to check file size
function checkFileSize(req, res, next) {
  const upload = multer({
    storage: storage,
    limits: { fileSize: req.maxFileSize },
  }).single("file");

  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res
        .status(400)
        .json({
          message: `File size exceeds the limit of ${
            req.maxFileSize / (1024 * 1024)
          }MB`,
        });
    } else if (err) {
      return res.status(500).json({ message: "File upload error" });
    }
    next();
  });
}

module.exports = { fetchMaxFileSize, checkFileSize };
