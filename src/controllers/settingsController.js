const { SettingsModel } = require("../models");
const saveErrorLogs = require("../utils/saveLogs");

// Get the current max file size
async function getMaxFileSize(req, res) {
  try {
    const settings = await SettingsModel.findOne();
    if (!settings) {
      return res.status(404).json({ message: "Settings not found" });
    }
    res.status(200).json({ maxFileSize: settings.maxFileSize });
  } catch (error) {
    await saveErrorLogs(error, "SettingsController getMaxFileSize");
    console.error("Error getting max file size:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}


module.exports = {
  getMaxFileSize,
};
