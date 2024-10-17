const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
require("dotenv").config();

const {
  createAdmin,
  updateAdmin,
  loginAdmin,
  getAdminStatistics,
  getAdminMainUserStatistics,
  toggleMainUserStatus,
  deleteMainUser,
  setMaxFileSize,
  getAdminById,
} = require("../controllers/AdminController");
const SecurityCheckPost = require("../middlewares/checkPost");
const verifySuperAdmin = require("../middlewares/verifysuperAdmin");
const { ErrorLogsController } = require("../controllers");

// Create admin
router.post("/register", SecurityCheckPost, verifySuperAdmin, createAdmin);

// Login Admin

router.post("/login", SecurityCheckPost, loginAdmin);

router.post(
  "/settings/max-file-size",
  SecurityCheckPost,
  verifySuperAdmin,
  setMaxFileSize
);

router.get(
  "/statictics",
  SecurityCheckPost,
  verifySuperAdmin,
  getAdminStatistics
);

router.get(
  "/users",
  SecurityCheckPost,
  verifySuperAdmin,
  getAdminMainUserStatistics
);

router.patch(
  "/main-user/status/:mainUserId",
  SecurityCheckPost,
  verifySuperAdmin,
  toggleMainUserStatus
);

// Update admin by ID
router.put("/update/profile", SecurityCheckPost, verifySuperAdmin, updateAdmin);

router.delete(
  "/main-user/remove/:mainUserId",
  SecurityCheckPost,
  verifySuperAdmin,
  deleteMainUser
);

router.get("/logs", ErrorLogsController.getErrorLogs);

router.get("/profile", SecurityCheckPost, verifySuperAdmin, getAdminById);

router.get("/protected", (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.status(200).json({
      message: "Access Granted",
    });
  } catch (error) {
    res.status(401).json({
      message: "Access denied: Invalid or expired token",
    });
  }
});

module.exports = router;
