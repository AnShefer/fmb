const mongoose = require("mongoose");

const ErrorSchema = new mongoose.Schema({
  error: {
    type: String,
    required: true,
  },
  apiName: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const ErrorLogs = mongoose.model("ErrorLogs", ErrorSchema, "ErrorsLogs");
module.exports = ErrorLogs;
