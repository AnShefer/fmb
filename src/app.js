const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");
const cors = require("cors");
const connectDB = require("./config/db");
const {
  MainUserRoutes,
  MediaRoutes,
  SettingsRoutes,
  SubUserRoutes,
  ContactRoutes,
  AdminRoutes,
  TagRoutes,
} = require("./routes");

dotenv.config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(morgan("dev"));

// User Routes
app.use("/api/v1/user", MainUserRoutes);
app.use("/api/v1/media", MediaRoutes);
app.use("/api/v1/contact", ContactRoutes);

// Sub User Routes
app.use("/api/v1/user/member", SubUserRoutes);

// Admin Routes
app.use("/api/v1/admin", AdminRoutes);

app.use("/api/v1", SettingsRoutes);

// Tag Routes
app.use("/api/v1/tag", TagRoutes);

// Connect to Database
connectDB();

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
