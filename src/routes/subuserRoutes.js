const router = require("express").Router();
const { SubUserController } = require("../controllers");
const { verifyToken } = require("../middlewares/Authmuddleware");
const SecurityCheckPost = require("../middlewares/checkPost");
const { fetchMaxFileSize, checkFileSize } = require("../utils/UploadFiles");

// Login a main user
router.post("/login", SecurityCheckPost, SubUserController.subUserLogin);

// Verify OTP

router.post("/verify-otp", SecurityCheckPost, SubUserController.verifyOtp);

router.get(
  "/media",
  SecurityCheckPost,
  verifyToken,
  SubUserController.getUserMedia
);

router.post(
  "/update",
  SecurityCheckPost,
  verifyToken,
  fetchMaxFileSize,
  checkFileSize,
  SubUserController.updateUser
);

module.exports = router;
