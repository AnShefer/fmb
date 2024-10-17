const router = require("express").Router();
const { MediaController } = require("../controllers");
const { verifyToken }= require("../middlewares/Authmuddleware");
const SecurityCheckPost = require("../middlewares/checkPost");
const {
  upload,
  fetchMaxFileSize,
  checkFileSize,
} = require("../utils/UploadFiles");

router.post(
  "/upload",
  SecurityCheckPost,
  verifyToken,
  fetchMaxFileSize,
  checkFileSize,
  MediaController.uploadMedia
);

router.put(
  "/edit",
  SecurityCheckPost,
  verifyToken,
  fetchMaxFileSize,
  checkFileSize,
  MediaController.editMedia
);

router.get(
  "/:subUserId/media",
  SecurityCheckPost,
  verifyToken,
  MediaController.getMedia
);

router.post(
  "/remove",
  SecurityCheckPost,
  verifyToken,
  MediaController.deleteMedia
);
router.get("/stream/:token", MediaController.getStreamVideo);
router.get("/download/:token", MediaController.downloadVideo);

module.exports = router;
