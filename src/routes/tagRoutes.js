const router = require("express").Router();
const { TagController } = require("../controllers");
const {verifyToken, verifyQRToken} = require("../middlewares/Authmuddleware");
const SecurityCheckPost = require("../middlewares/checkPost");
const { fetchMaxFileSize, checkFileSize } = require("../utils/UploadFiles");

// Get tag info
router.get(
  "/",
  SecurityCheckPost,
  verifyToken,
  TagController.getTagInfo
);

// Get pablic tag info
router.post(
  "/public",
  SecurityCheckPost,
  verifyQRToken,
  TagController.getTagInfo
);

//Create a tag
router.post(
  "/activate",
  SecurityCheckPost,
  verifyToken,
  TagController.createTag
);

// Upload tag Media
router.post(
  "/upload",
  SecurityCheckPost,
  verifyToken,
  fetchMaxFileSize,
  checkFileSize,
  TagController.uploadMedia
);

// Edit tag Media
router.put(
  "/edit",
  SecurityCheckPost,
  verifyToken,
  fetchMaxFileSize,
  checkFileSize,
  TagController.editMedia
);

// Remove tag Media
router.post(
  "/remove",
  SecurityCheckPost,
  verifyToken,
  TagController.deleteMedia
);

// Get Stream tag Media
router.get(
  "/stream/:token",
  
  TagController.getStreamVideo
);


module.exports = router;
