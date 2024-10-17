const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MainUserSchema = new mongoose.Schema(
  {
    fullname: {
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
    },
    usertype: {
      type: String,
      enum: ["Primary", "Secondary"],
      default: "Primary",
    },
    dob: {
      type: Date,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      maxlength: 1024,
    },
    otp: {
      type: String,
    },
    otpExpiry: {
      type: Date,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    image: {
      type: String,
      default: "https://cdn-icons-png.flaticon.com/512/6596/6596121.png",
    },
    status: {
      type: Boolean,
      default: true,
    },
    subusers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubUser",
      },
    ],
    tag: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tag",
    },

    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to hash the password before saving
MainUserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare passwords
MainUserSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("MainUser", MainUserSchema);
