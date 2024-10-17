const jwt = require("jsonwebtoken");
const Admin = require("../models/adminModels");
require("dotenv").config();

// Middleware to verify if the user is a super admin
const verifySuperAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the admin by ID
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Check if the admin is a super admin
    if (admin.role !== "SuperAdmin") {
      return res
        .status(403)
        .json({ message: "Access denied you can't perform this action" });
    }

    // Attach admin to request object
    req.admin = admin;
    next();
  } catch (error) {
    console.error("Error verifying super admin:", error);
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = verifySuperAdmin;
