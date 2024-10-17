// saveLogs.js
const { ErrorLogs } = require("../models");

const saveErrorLogs = async (error, apiName) => {
  const newError = new ErrorLogs({
    error: error,
    apiName: apiName,
  });
  await newError.save();
};

module.exports = saveErrorLogs;