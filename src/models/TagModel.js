const mongoose = require("mongoose");

const TagSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: " ",
      trim: true,
    },
    activated: {
      type: Boolean,
      default: false,
    },
    recordedDate: {
      type: Date,
     
    },
    description: {
      type: String,
      trim: true,
      default: " ",
    },
    file: {
      type: String,
      default: " ",
    },
    mainUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MainUser",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("tag", TagSchema);
