const mongoose = require("mongoose");
const dotenv = require("dotenv").config();
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL, {
      connectTimeoutMS: 30000,
      socketTimeoutMS: 0,
      serverSelectionTimeoutMS: 50000,
    });
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
