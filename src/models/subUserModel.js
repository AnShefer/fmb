const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const SubUserSchema = new mongoose.Schema(
  {
    mainUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MainUser",
      required: true,
    },
    profilePic: {
      type: String,
      default: "https://cdn-icons-png.flaticon.com/512/6596/6596121.png",
    },
    usertype: {
      type: String,
      enum: ["Primary", "Secondary"],
      default: "Secondary",
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 255,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      minlength: 6,
      maxlength: 255,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      maxlength: 1024,
    },
    status: {
      type: Boolean,
      default: true,
    },
    videos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    images: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Image",
      },
    ],
    otp: {
      type: String,
    },
    otpExpiry: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to hash the password before saving
SubUserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare passwords
SubUserSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("SubUser", SubUserSchema);
