const { Admin, SettingsModel } = require("../models");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const {
  MainUserModel,
  SubUserModel,
  VideoModel,
  ImageModel,
} = require("../models");
const { deleteFileFromDO } = require("../utils/DeleteFiles");
const saveErrorLogs = require('../utils/saveLogs');

// Create a new admin
const createAdmin = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const newAdmin = new Admin({ username, email, password });
    await newAdmin.save();

    res.status(201).json({ message: "Admin created successfully" });
  } catch (error) {
    await saveErrorLogs(error, 'AdminController createAdmin');
    console.error("Error creating admin:", error);
    res.status(500).json({ message: "Failed to create admin" });
  }
};

// Get all admins
const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find();
    res.status(200).json({ admins });
  } catch (error) {
    await saveErrorLogs(error, 'AdminController getAllAdmins');
    console.error("Error fetching admins:", error);
    res.status(500).json({ message: "Failed to fetch admins" });
  }
};

// Get a single admin by ID
const getAdminById = async (req, res) => {
  const authenticatedUserId = req.admin._id;

  try {
    const admin = await Admin.findById(authenticatedUserId).select("-password");
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json({ admin });
  } catch (error) {
    await saveErrorLogs(error, 'AdminController getAdminById');
    console.error("Error fetching admin:", error);
    res.status(500).json({ message: "Failed to fetch admin" });
  }
};
// Update an admin by ID
const updateAdmin = async (req, res) => {
  const { _id } = req.admin;
  const { username, oldPassword, newPassword, confirmPassword } = req.body;

  try {
    const admin = await Admin.findById(_id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Handle password change
    if (newPassword) {
      if (!oldPassword || !confirmPassword) {
        return res.status(400).json({
          message:
            "Old password and confirmation are required to change password",
        });
      }

      // Check if the old password matches
      const isMatch = await admin.comparePassword(oldPassword);
      if (!isMatch) {
        return res.status(400).json({ message: "Old password is incorrect" });
      }

      // Validate new password confirmation
      if (newPassword !== confirmPassword) {
        return res
          .status(400)
          .json({ message: "New password and confirmation do not match" });
      }

      // Set the new password
      admin.password = newPassword;
    }

    // Update username if provided
    if (username) {
      admin.username = username;
    }

    // Save the updated admin document
    await admin.save();

    res.status(200).json({ message: "Admin updated successfully" });
  } catch (error) {
    await saveErrorLogs(error, 'AdminController updateAdmin');
    console.error("Error updating admin:", error);
    res.status(500).json({ message: "Failed to update admin" });
  }
};
// Delete an admin by ID
const deleteAdmin = async (req, res) => {
  const { id } = req.params;

  try {
    const admin = await Admin.findByIdAndDelete(id);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json({ message: "Admin deleted successfully" });
  } catch (error) {
    await saveErrorLogs(error, 'AdminController deleteAdmin');
    console.error("Error deleting admin:", error);
    res.status(500).json({ message: "Failed to delete admin" });
  }
};

// Login Admin
const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    await saveErrorLogs(error, 'AdminController loginAdmin');
    console.error("Error logging in admin:", error);
    res.status(500).json({ message: "Failed to log in" });
  }
};

const getAdminStatistics = async (req, res) => {
  try {
    const totalMainUsers = await MainUserModel.countDocuments();
    const totalSubUsers = await SubUserModel.countDocuments();
    const totalVideos = await VideoModel.countDocuments();
    const totalImages = await ImageModel.countDocuments();

    const statistics = {
      totalMainUsers,
      totalSubUsers,
      totalVideos,
      totalImages,
    };

    res.status(200).json(statistics);
  } catch (error) {
    await saveErrorLogs(error, 'AdminController getAdminStatistics');
    console.error("Error fetching statistics:", error);
    res.status(500).json({ message: "Error fetching statistics" });
  }
};

const getAdminMainUserStatistics = async (req, res) => {
  try {
    // Find all main users
    const mainUsers = await MainUserModel.find({}).select(
      "fullname email status"
    );

    // Prepare the final statistics object
    const statistics = await Promise.all(
      mainUsers.map(async (mainUser) => {
        const subUsers = await SubUserModel.find({
          mainUser: mainUser._id,
        }).select("_id");
        const subUserIds = subUsers.map((subUser) => subUser._id);

        const subUserCount = subUserIds.length;
        const videoCount = await VideoModel.countDocuments({
          subUser: { $in: subUserIds },
        });
        const imageCount = await ImageModel.countDocuments({
          subUser: { $in: subUserIds },
        });

        return {
          id: mainUser._id,
          fullname: mainUser.fullname,
          email: mainUser.email,
          status: mainUser.status,
          subUserCount,
          videoCount,
          imageCount,
        };
      })
    );

    // Return the results
    res.status(200).json(statistics);
  } catch (error) {
    await saveErrorLogs(error, 'AdminController getAdminMainUserStatistics');
    console.error("Error fetching main user statistics:", error);
    res.status(500).json({ message: "Error fetching main user statistics" });
  }
};

const toggleMainUserStatus = async (req, res) => {
  const { mainUserId } = req.params;

  try {
    // Find the main user
    const mainUser = await MainUserModel.findById(mainUserId);
    if (!mainUser) {
      return res.status(404).json({ message: "Main user not found" });
    }

    // Toggle the status of the main user
    mainUser.status = !mainUser.status;
    await mainUser.save();

    res.status(200).json({
      message: `Main user status updated to ${
        mainUser.status ? "active" : "blocked"
      }`,
    });
  } catch (error) {
    await saveErrorLogs(error, 'AdminController toggleMainUserStatus');
    console.error("Error toggling main user status:", error);
    res.status(500).json({ message: "Error toggling main user status" });
  }
};

const deleteMainUser = async (req, res) => {
  const bucketName = "forever-messages-dev-01";

  try {
    const { mainUserId } = req.params;

    // Find the main user and populate their sub-users
    const mainUser = await MainUserModel.findById(mainUserId).populate({
      path: "subusers",
      populate: [{ path: "videos" }, { path: "images" }],
    });
    if (!mainUser) {
      return res.status(404).json({ message: "Main user not found" });
    }

    // Delete associated videos, images, and profile picture from DigitalOcean
    const deletePromises = [];

    // Process sub-users
    for (const subUser of mainUser.subusers) {
      // Delete videos
      for (const video of subUser.videos) {
        const videoKey = video.file.split("/").pop();
        deletePromises.push(
          new Promise((resolve, reject) => {
            deleteFileFromDO(bucketName, videoKey, async (error) => {
              if (error) {
                reject(error);
              } else {
                await VideoModel.findByIdAndDelete(video._id);
                resolve();
              }
            });
          })
        );
      }

      // Delete images
      for (const image of subUser.images) {
        const imageKey = image.file.split("/").pop();
        deletePromises.push(
          new Promise((resolve, reject) => {
            deleteFileFromDO(bucketName, imageKey, async (error) => {
              if (error) {
                reject(error);
              } else {
                await ImageModel.findByIdAndDelete(image._id);
                resolve();
              }
            });
          })
        );
      }

      // Delete profile picture if it's not the default one
      if (
        subUser.profilePic !==
        "https://cdn-icons-png.flaticon.com/512/6596/6596121.png"
      ) {
        const profilePicKey = subUser.profilePic.split("/").pop();
        deletePromises.push(
          new Promise((resolve, reject) => {
            deleteFileFromDO(bucketName, profilePicKey, (error) => {
              if (error) {
                reject(error);
              } else {
                resolve();
              }
            });
          })
        );
      }
    }

    // Wait for all delete operations to complete
    await Promise.all(deletePromises);

    // Remove all sub-users and their references from the main user
    await SubUserModel.deleteMany({ mainUser: mainUserId });

    // Remove the main user
    await MainUserModel.findByIdAndDelete(mainUserId);

    res.status(200).json({
      message:
        "Main user and all associated data have been deleted successfully",
    });
  } catch (err) {
    await saveErrorLogs(err, 'AdminController deleteMainUser');
    console.error("Error deleting main user:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Set a new max file size
async function setMaxFileSize(req, res) {
  const { maxFileSize } = req.body;
  if (!maxFileSize || typeof maxFileSize !== "number") {
    return res.status(400).json({ message: "Invalid file size" });
  }

  // Convert MBs to bytes
  const maxFileSizeInBytes = maxFileSize * 1024 * 1024;

  try {
    let settings = await SettingsModel.findOne();
    if (!settings) {
      settings = new SettingsModel();
    }
    settings.maxFileSize = maxFileSizeInBytes;
    await settings.save();

    res.status(200).json({ message: "Max file size updated successfully" });
  } catch (error) {
    await saveErrorLogs(error, 'AdminController setMaxFileSize');
    console.error("Error setting max file size:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports = {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  loginAdmin,
  getAdminStatistics,
  getAdminMainUserStatistics,
  toggleMainUserStatus,
  deleteMainUser,
  setMaxFileSize,
};
