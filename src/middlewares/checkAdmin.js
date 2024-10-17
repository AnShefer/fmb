const jwt = require("jsonwebtoken");
const Admin = require("../models/adminModels");
require("dotenv").config();


// Middleware to check if user is an admin
const checkAdmin = async (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await Admin.findById(decoded.id).select("role");
    if (!admin) {
      return res.status(403).json({ message: "Access denied !" });
    }

    req.user = admin;
    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = checkAdmin;
