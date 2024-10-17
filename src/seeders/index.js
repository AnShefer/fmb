const connectDB = require("../config/db");
const saveErrorLogs = require("../utils/saveLogs");
connectDB();


const error = `
Error 404: Database is not configure
`;

const saveSeeders = async () => {
  try {
    await saveErrorLogs(error, "contactUs");
  } catch (error) {
    console.log(error);
  }
};

saveSeeders();
