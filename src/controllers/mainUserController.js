const {
  MainUserModel,
  SubUserModel,
  ImageModel,
  VideoModel,
} = require("../models");
const generateOtp = require("../services/OtpGenrator");
const crypto = require("crypto");

const sendEmail = require("../utils/nodeMailer");
const generateToken = require("../utils/tokenGenrator");
const { deleteFileFromDO } = require("../utils/DeleteFiles");
const jwt = require("jsonwebtoken");
const saveErrorLogs = require("../utils/saveLogs");

// Create a new main user
async function createUser(req, res) {
  try {
    const { fullname, email, dob, password } = req.body;

    const lowerCaseEmail = email.toLowerCase();

    // Check if the email already exists
    const existingUser = await MainUserModel.findOne({ email: lowerCaseEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const existingSubUser = await SubUserModel.findOne({
      email: lowerCaseEmail,
    });
    if (existingSubUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    if (age < 18) {
      return res
        .status(400)
        .json({ message: "User must be at least 18 years old" });
    }

    // Generate OTP
    const otps = await generateOtp();

    const expireOtp = (otpExpiry = Date.now() + 5 * 60 * 1000); // 5 minutes

    const mainUser = new MainUserModel({
      fullname,
      email: lowerCaseEmail,
      dob,
      password,
      otp: otps,
      otpExpiry: expireOtp,
    });

    // Validate schema
    const validationError = mainUser.validateSync();
    if (validationError) {
      return res.status(400).json({ message: validationError.message });
    }

    // Try sending the email
    try {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #dddddd; border-radius: 10px;">
          <img src="https://forever-messages-dev-01.syd1.cdn.digitaloceanspaces.com/Eamil%20Logo.png" alt="Forever Messages Logo" style="max-width: 100px;">
          <h2 style="color: #4CAF50;">Welcome to Our Service!</h2>
          <p>Hi ${fullname},</p>
          <p>Thank you for signing up. Your One-Time Password (OTP) is:</p>
          <h3 style="color: #333333;">${otps}</h3>
          <p>Please enter this OTP to complete your registration.</p>
          <p style="color: #ff0000;">Note: This OTP will expire in 5 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
          <p>Best regards,<br>Forever Messages</p>
        </div>
      `;
      await sendEmail({
        to: email,
        subject: "Your OTP Code",
        html: emailHtml,
      });

      // Save user if email is sent successfully
      await mainUser.save();
      res.status(201).json({
        message: "OTP code sent successfully. Please check your email.",
      });
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      res.status(400).json({ message: "Please enter a valid email address." });
    }
  } catch (err) {
    console.log("🚀 ~ createUser ~ err:", err);
    res.status(400).json({ message: err.message });
  }
}

async function getUserData(req, res) {
  try {
    if (!req.user) {
      return res.status(404).json({ message: "User not authenticated" });
    }
    const user = await MainUserModel.findById(req.user.id)
      .select("tag")
      .populate({
        path: "tag",
        select: "activated",
      });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const Finaluser = {
      id: req.user.id,
      hasTag: user.tag?.activated || false,
      
    };
    Finaluser.tagId = Finaluser.hasTag ? user.tag._id.toString() : null;

    res.status(200).json(Finaluser);
  } catch (err) {
    console.log("🚀 ~ getUserData ~ err:", err);
  }
}
// Verify OTP

async function verifyOtp(req, res) {
  try {
    const { email, otp, type } = req.body;
    const lowerCaseEmail = email.toLowerCase();

    // Find the user by email
    const user = await MainUserModel.findOne({
      email: lowerCaseEmail,
    }).populate({
      path: "tag",
      select: "activated",
    });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Check if the OTP matches
    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.verified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;

    await user.save();

    const Finaluser = user.toObject();
    delete Finaluser.password;
    delete Finaluser.subusers;
    delete Finaluser.otp;
    Finaluser.hasTag = user.tag?.activated || false;
    Finaluser.tagId = Finaluser.hasTag ? user.tag._id.toString() : null;
    delete Finaluser.tag;

    // Generate and send JWT token

    if (type === "register") {
      return res.status(200).json({ message: "User verified successfully" });
    } else {
      const token = await generateToken(user._id, user.usertype);

      return res
        .status(200)
        .json({ user: Finaluser, token, message: "Login successfully" });
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// Login a main user
async function login(req, res) {
  const { email, password } = req.body;

  const lowerCaseEmail = email.toLowerCase();

  try {
    const user = await MainUserModel.findOne({ email: lowerCaseEmail });
    if (!user) {
      return res.status(400).json({ message: "Email or password is wrong" });
    }

    if (!user.status) {
      return res.status(403).json({
        message:
          "Your account is temporarily blocked. Please contact the superadmin for further assistance.",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Email or password is wrong" });
    }

    const otp = await generateOtp();

    const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #dddddd; border-radius: 10px;">
      <img src="https://forever-messages-dev-01.syd1.cdn.digitaloceanspaces.com/Eamil%20Logo.png" alt="Forever Messages Logo" style="max-width: 100px;">
      <h2 style="color: #4CAF50;">Welcome back!</h2>
      <p>Hi ${user.fullname},</p>
      <p>Thank you for signing in. Your One-Time Password (OTP) is:</p>
      <h3 style="color: #333333;">${otp}</h3>
      <p>Please enter this OTP to complete your login.</p>
      <p style="color: #ff0000;">Note: This OTP will expire in 5 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
      <p>Best regards,<br>Forever Messages</p>
    </div>
    `;

    await sendEmail({
      to: email,
      subject: "Your OTP Code",
      html: emailHtml,
    });

    // Update the OTP in the database
    user.otp = otp;
    await user.save();

    res.json({ message: "Login successful. Please check your email for OTP" });
  } catch (err) {
    await saveErrorLogs(err, "mainUserController login");
    res.status(500).json({ message: err.message });
  }
}

// Update a main user by ID
async function updateUserById(req, res) {
  try {
    const { fullname, password, oldPassword } = req.body;
    const userId = req.user.id;

    if (userId !== req.params.id) {
      return res.status(403).json({ message: "You are not authorized" });
    }

    // Find the user by ID
    let user = await MainUserModel.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.status) {
      return res.status(403).json({
        message:
          "Your account is temporarily blocked. Please contact the superadmin for further assistance.",
      });
    }

    if (password) {
      const isMatch = await user.comparePassword(oldPassword);
      if (!isMatch) {
        return res.status(400).json({ message: "Old password is incorrect" });
      }
    }

    const fileUrl = req?.file?.location;

    // Update user fields
    if (fileUrl) {
      user.image = fileUrl;
    }
    user.fullname = fullname || user.fullname;
    user.email = user.email;
    user.dob = user.dob;
    user.password = password || user.password;

    const updateUser = await user.save();
    const Finaluser = updateUser.toObject();
    delete Finaluser.password;
    delete Finaluser.subusers;
    delete Finaluser.otp;

    res.json({ user: Finaluser, message: "Updated successfully" });
  } catch (err) {
    await saveErrorLogs(err, "mainUserController updateUserById");
    res.status(400).json({ message: err.message });
  }
}

async function createSubUser(req, res) {
  try {
    const { name, email, password } = req.body;

    const lowerCaseEmail = email.toLowerCase();

    const existingSubUser = await SubUserModel.findOne({
      email: lowerCaseEmail,
    });
    if (existingSubUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const existingUser = await MainUserModel.findOne({ email: lowerCaseEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const fileurl = req?.file?.location;

    const subUser = new SubUserModel({
      mainUser: req.user.id,
      profilePic: fileurl,
      name,
      email: lowerCaseEmail,
      password,
    });

    // Save the subuser
    await subUser.save();

    // Find the main user and add the subuser's ID
    const mainUser = await MainUserModel.findById(req.user.id);
    mainUser.subusers.push(subUser._id);
    await mainUser.save();

    res.status(201).json({
      message: "Family and friend member created successfully",
    });
  } catch (err) {
    await saveErrorLogs(err, "mainUserController createSubUser");
    console.log("🚀 ~ createSubUser ~ err:", err);
    res.status(400).json({ message: err.message });
  }
}

// Get All Subusers

const getAllSubUsers = async (req, res) => {
  const mainUserId = req.user?.id;

  try {
    const mainUser = await MainUserModel.findById(mainUserId)
      .populate({
        path: "subusers",
        select: "-password",
      })
      .sort({ createdAt: -1 });

    if (!mainUser) {
      return res.status(404).json({ message: "Main user not found" });
    }

    if (!mainUser.status) {
      return res.status(403).json({
        message:
          "Your account is temporarily blocked. Please contact the superadmin for further assistance.",
      });
    }

    res.status(200).json({ subusers: mainUser.subusers });
  } catch (error) {
    await saveErrorLogs(error, "mainUserController getAllSubUsers");
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

async function toggleSubUserStatus(req, res) {
  try {
    const { subUserId } = req.params;

    // Find the subuser
    const subUser = await SubUserModel.findById(subUserId);
    if (!subUser) {
      return res.status(404).json({ message: "SubUser not found" });
    }

    if (subUser.mainUser.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You are not authorized to perform this action" });
    }

    subUser.status = !subUser.status;
    await subUser.save();

    res.status(200).json({ message: "Status updated successfully" });
  } catch (err) {
    await saveErrorLogs(err, "mainUserController toggleSubUserStatus");
    console.error("Error toggling subuser status:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// Delete subuser

const deleteSubUser = async (req, res) => {
  const bucketName = "forever-messages-dev-01";

  try {
    const { subUserId } = req.params;
    const mainUserId = req.user.id;

    // Find the sub-user
    const subUser = await SubUserModel.findById(subUserId).populate(
      "videos images"
    );
    if (!subUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the sub-user belongs to the main user
    if (subUser.mainUser.toString() !== mainUserId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to perform this action" });
    }

    // Delete associated videos, images, and profile picture from DigitalOcean
    const deletePromises = [];

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

    // Wait for all delete operations to complete
    await Promise.all(deletePromises);

    // Delete the sub-user
    await SubUserModel.findByIdAndDelete(subUserId);

    // Remove reference from the main user
    await MainUserModel.findByIdAndUpdate(mainUserId, {
      $pull: { subusers: subUserId },
    });

    res
      .status(200)
      .json({ message: "Your user has been deleted successfully" });
  } catch (err) {
    await saveErrorLogs(err, "mainUserController deleteSubUser");
    console.error("Error deleting sub-user:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get Single SubUser

async function getSingleSubUser(req, res) {
  try {
    const { subUserId } = req.params;
    const mainUserId = req.user.id;

    // Find the sub-user
    const subUser = await SubUserModel.findById(subUserId).select("-password");
    if (!subUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the sub-user belongs to the main user
    if (subUser.mainUser.toString() !== mainUserId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to perform this action" });
    }

    res.status(200).json(subUser);
  } catch (error) {
    await saveErrorLogs(error, "mainUserController getSingleSubUser");
    console.error("Error getting sub-user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function updateSubUser(req, res) {
  try {
    const { subUserId } = req.params;
    const { name, email, password } = req.body;
    const mainUserId = req.user.id;

    // Find the sub-user
    const subUser = await SubUserModel.findById(subUserId);
    if (!subUser) {
      return res.status(404).json({ message: "SubUser not found" });
    }

    // Check if the sub-user belongs to the main user
    if (subUser.mainUser.toString() !== mainUserId) {
      return res
        .status(403)
        .json({ message: "You are not authorized to update this user" });
    }

    // Update sub-user fields
    if (name) subUser.name = name;
    // if (email) subUser.email = email.toLowerCase();
    if (password) subUser.password = password;
    if (req.file && req.file.location) {
      subUser.profilePic = req.file.location;
    }

    await subUser.save();

    res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    await saveErrorLogs(error, "mainUserController updateSubUser");
    console.error("Error updating sub-user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

function generateRandomPassword(length = 8) {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
}

// Request to reset password
async function requestPasswordReset(req, res) {
  const { email, admin } = req.body;

  try {
    const user = admin
      ? await MainUserModel.findOne({ email })
      : await SubUserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Generate reset token using user ID and a random string
    const resetToken = jwt.sign(
      { userId: user._id, admin: admin },
      process.env.JWT_SECRET,
      {
        expiresIn: "15m",
      }
    );

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 900000;
    await user.save();

    // Send email with reset link
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #dddddd; border-radius: 10px;">
        <img src="https://forever-messages-dev-01.syd1.cdn.digitaloceanspaces.com/Eamil%20Logo.png" alt="Forever Messages Logo" style="max-width: 100px;">
        <h2 style="color: #4CAF50;">Password Reset Request</h2>
        <p>Hi ${user.fullname},</p>
        <p>You requested for a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="color: #4CAF50;">Reset Password</a>
        <p style="color: #ff0000;">Note: This Link will expire in 5 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Best regards,<br>Forever Messages</p>
      </div>
    `;
    await sendEmail({
      to: user.email,
      subject: "Password Reset",
      html: emailHtml,
    });

    res.status(200).json({ message: "Password reset link sent successfully" });
  } catch (err) {
    await saveErrorLogs(err, "mainUserController requestPasswordReset");
    console.error("Error in requestPasswordReset:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// Reset Password
async function resetPassword(req, res) {
  const { token, newPassword } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Token required" });
  }

  if (!newPassword) {
    return res.status(400).json({ message: "New password required" });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = decoded.admin;
    const userId = decoded.userId;
    console.log(decoded);

    // Find the user by ID and ensure the token is valid
    const user = admin
      ? await MainUserModel.findById(userId)
      : await SubUserModel.findById(userId);

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Update the user's password and clear the reset token
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res
        .status(400)
        .json({ message: "Link expired please request again " });
    }

    await saveErrorLogs(err, "mainUserController resetPassword");
    console.error("Error in resetPassword:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports = {
  createUser,
  updateUserById,
  login,
  getUserData,
  verifyOtp,
  createSubUser,
  getAllSubUsers,
  toggleSubUserStatus,
  deleteSubUser,
  getSingleSubUser,
  updateSubUser,
  requestPasswordReset,
  resetPassword,
};
