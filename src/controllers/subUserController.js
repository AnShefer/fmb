const { SubUserModel } = require("../models");
const generateOtp = require("../services/OtpGenrator");
const sendEmail = require("../utils/nodeMailer");
const generateToken = require("../utils/tokenGenrator");
const axios = require("axios");
const {
  generateToken: VideoToken,
  decryptToken,
} = require("../utils/generate-video-token");
const saveErrorLogs = require("../utils/saveLogs");

async function getFileAsBuffer(url) {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
  });

  return Buffer.from(response.data, "binary").toString("base64");
}
// Login a subuser
async function subUserLogin(req, res) {
  const { email, password } = req.body;
  const lowerCaseEmail = email.toLowerCase();

  try {
    const subUser = await SubUserModel.findOne({ email: lowerCaseEmail });
    if (!subUser) {
      return res.status(400).json({ message: "Email or password is wrong" });
    }

    if (!subUser.status) {
      return res.status(403).json({
        message:
          "Your account is currently blocked. Please contact your admin or account provider for assistance",
      });
    }

    const isMatch = await subUser.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Email or password is wrong" });
    }

    const otp = await generateOtp();

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #dddddd; border-radius: 10px;">
      <img src="https://forever-messages-dev-01.syd1.cdn.digitaloceanspaces.com/Eamil%20Logo.png" alt="Forever Messages Logo" style="max-width: 100px;">
        <h2 style="color: #4CAF50;">Welcome back !</h2>
        <p>Hi ${subUser?.name},</p>
        <p>Thank you for signing In. Your One-Time Password (OTP) is:</p>
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

    subUser.otp = otp;
    subUser.otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes
    await subUser.save();

    res.json({ message: "Login successful. Please check your email for OTP" });
  } catch (err) {
    await saveErrorLogs(err, "subUserController subUserLogin");
    console.error("Error in subUserLogin:", err);
    res.status(500).json({ message: err.message });
  }
}

// Verify OTP

async function verifyOtp(req, res) {
  const { email, otp } = req.body;

  try {
    // Find the sub-user and populate the main user details
    const subUser = await SubUserModel.findOne({
      email: email.toLowerCase(),
    }).populate("mainUser", "fullname image");

    if (!subUser) {
      return res.status(400).json({ message: "Invalid email or OTP" });
    }

    if (!subUser.status) {
      profilePic;
      return res.status(403).json({
        message:
          "Your account is temporarily blocked. Please contact your admin or account provider.",
      });
    }

    if (subUser.otp !== otp || Date.now() > subUser.otpExpiry) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    subUser.otp = undefined;
    subUser.otpExpiry = undefined;
    await subUser.save();

    const token = await generateToken(subUser._id, subUser.usertype);

    const {
      password,
      otp: userOtp,
      otpExpiry,
      videos,
      images,
      status,
      ...userDetails
    } = subUser.toObject();

    // Include main user details in the response
    const response = {
      message: "OTP verified successfully",
      token,
      user: {
        ...userDetails,
        mainUser: {
          name: subUser.mainUser?.fullname || "N/A",
          profilePic: subUser.mainUser?.image || "",
        },
      },
    };

    res.json(response);
  } catch (err) {
    await saveErrorLogs(err, "subUserController verifyOtp");
    console.error("Error in verifyOtp:", err);
    res.status(500).json({ message: err.message });
  }
}

// Get media of user
const getUserMedia = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await SubUserModel.findById(userId)
      .populate("images")
      .populate("videos");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.status) {
      return res.status(403).json({
        message:
          "Your account is temporarily blocked. Please contact your admin or account provider.",
      });
    }

    // Process images concurrently with Promise.all
    const imageMediaPromises = user.images.map(async (image) => {
      const videoToken = await VideoToken(
        user._id,
        user.usertype,
        image._id,
        "image"
      );
      const secure_url = `${process.env.SERVER_URL}/api/v1/media/stream/${videoToken}`;
      const download_url = `/api/v1/media/download/${videoToken}`;
      return {
        id: image._id,
        type: "image",
        title: image.title,
        desp: image.description,
        createdAt: image.createdAt,
        thumbnail: secure_url,
        download_url,
        // fileBuffer: buffer, // Convert buffer to JSON array
      };
    });

    // Process videos concurrently with Promise.all
    const videoMediaPromises = user.videos.map(async (video) => {
      const videoToken = await VideoToken(
        user._id,
        user.usertype,
        video._id,
        "video"
      );
      const secure_url = `${process.env.SERVER_URL}/api/v1/media/stream/${videoToken}`;
      const download_url = `/api/v1/media/download/${videoToken}`;
      return {
        id: video._id,
        type: "video",
        title: video.title,
        desp: video.description,
        createdAt: video.createdAt,
        thumbnail: secure_url,
        download_url,
        // fileBuffer: buffer, // Convert buffer to JSON array
      };
    });

    // Resolve all media promises
    const [imageMedia, videoMedia] = await Promise.all([
      Promise.all(imageMediaPromises),
      Promise.all(videoMediaPromises),
    ]);

    // Combine and sort media
    const media = [...imageMedia, ...videoMedia].sort(
      (a, b) => b.createdAt - a.createdAt
    );

    res.status(200).json(media);
  } catch (err) {
    await saveErrorLogs(err, "subUserController getUserMedia");
    console.error("Error in getUserMedia:", err);

    res.status(500).json({ message: "Internal server error" });
  }
};
const updateUser = async (req, res) => {
  const { oldPassword, password } = req.body;

  try {
    const userId = req.user.id;

    const user = await SubUserModel.findById(userId).populate(
      "mainUser",
      "fullname image"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.status) {
      return res.status(403).json({
        message:
          "Your account is temporarily blocked. Please contact your admin or account provider.",
      });
    }

    const Updateimg = req?.file?.location;
    if (Updateimg) {
      user.profilePic = Updateimg;
    }

    if (oldPassword || password) {
      if (!oldPassword || !password) {
        return res.status(400).json({
          message: "Both old and new passwords are required to update password",
        });
      }

      const isMatch = await user.comparePassword(oldPassword);
      if (!isMatch) {
        return res.status(400).json({ message: "Old password is incorrect" });
      }

      user.password = password;
    }

    await user.save();

    const {
      password: userPassword,
      otp,
      otpExpiry,
      videos,
      images,
      ...userDetails
    } = user.toObject();

    const response = {
      message: "Settings updated successfully",
      user: {
        ...userDetails,
        mainUser: {
          name: user.mainUser?.fullname || "N/A",
          profilePic: user.mainUser?.image || "",
        },
      },
    };

    res.status(200).json(response);
  } catch (err) {
    await saveErrorLogs(err, "subUserController updateUser");
    console.error("Error in updateUser:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  subUserLogin,
  verifyOtp,
  getUserMedia,
  updateUser,
};
