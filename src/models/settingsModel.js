const mongoose = require("mongoose");

const SettingsSchema = new mongoose.Schema({
  maxFileSize: {
    type: Number,
    required: true,
    default: 250 * 1024 * 1024,
  },
});

module.exports = mongoose.model("Settings", SettingsSchema);
