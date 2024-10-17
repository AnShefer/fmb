const mongoose = require("mongoose");

const VideoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    recordedDate: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: " ",
    },
    file: {
      type: String,
      required: true,
    },
    subUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubUser",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Video", VideoSchema);
