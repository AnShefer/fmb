const router = require("express").Router();
const { MainUserController } = require("../controllers");
const { verifyToken } = require("../middlewares/Authmuddleware");
const SecurityCheckPost = require("../middlewares/checkPost");
const { fetchMaxFileSize, checkFileSize } = require("../utils/UploadFiles");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Register a new main user
router.post("/register", SecurityCheckPost, MainUserController.createUser);

// Verify OTP
router.post("/verify", SecurityCheckPost, MainUserController.verifyOtp);

// Login a main user
router.post("/login", SecurityCheckPost, MainUserController.login);

router.get("/", SecurityCheckPost,verifyToken, MainUserController.getUserData);

// Create a sub user
router.post(
  "/create-subuser",
  SecurityCheckPost,
  verifyToken,
  fetchMaxFileSize,
  checkFileSize,
  MainUserController.createSubUser
);

// Update a main user by ID
router.put(
  "/:id",
  SecurityCheckPost,
  verifyToken,
  fetchMaxFileSize,
  checkFileSize,
  MainUserController.updateUserById
);

// Get all sub users
router.get(
  "/subusers",
  SecurityCheckPost,
  verifyToken,
  MainUserController.getAllSubUsers
);

// Get Single
router.get(
  "/subusers/single/:subUserId",
  SecurityCheckPost,
  verifyToken,
  MainUserController.getSingleSubUser
);

// Toggle sub user status
router.put(
  "/subusers/status/:subUserId",
  SecurityCheckPost,
  verifyToken,
  MainUserController.toggleSubUserStatus
);

// Delete a sub user
router.delete(
  "/subusers/:subUserId",
  SecurityCheckPost,
  verifyToken,
  MainUserController.deleteSubUser
);

router.put(
  "/subusers/:subUserId",
  SecurityCheckPost,
  verifyToken,
  fetchMaxFileSize,
  checkFileSize,
  MainUserController.updateSubUser
);

// Forgot Password
router.post(
  "/forgot-password",
  SecurityCheckPost,
  MainUserController.requestPasswordReset
);
router.post(
  "/reset-password",
  SecurityCheckPost,
  MainUserController.resetPassword
);

router.get("/protected", (req, res) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ accessGranted: false });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    res.status(200).json({ accessGranted: true });
  } catch (err) {
    res.status(401).json({ accessGranted: false });
  }
});

module.exports = router;
