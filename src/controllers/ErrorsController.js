const { ErrorLogs } = require("../models");
const saveErrorLogs = require("../utils/saveLogs");

const getErrorLogs = async (req, res) => {
  try {
    const errorLogs = await ErrorLogs.find();
    res.status(200).json(errorLogs);
  } catch (error) {
    await saveErrorLogs(error, "ErrorController getErrorLogs");
    console.log(error);
    res.status(500).json(error);
  }
};

module.exports = { getErrorLogs };
