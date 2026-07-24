const express = require("express");
const cors = require("cors");
require("dotenv").config();
const authRoutes = require("./Routes/authRoutes");
const uploadRoutes = require("./Routes/uploadRoutes");
const vendorRoutes = require("./Routes/vendorRoutes");
const dashboardRoutes = require("./Routes/dashboardRoutes");
const verifyRoutes = require("./Routes/verifyRoutes");
const errorHandler = require("./Middlewares/errorHandler");

// const dns = require("node:dns");
// dns.setDefaultResultOrder("ipv4first");

const { poolConnect } = require("./Config/db");
const cookieParser = require("cookie-parser");

const app = express();
app.use(cors({origin: process.env.CLIENT_URL, credentials:true}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api", authRoutes);
app.use("/api",uploadRoutes);
app.use("/api",vendorRoutes);
app.use("/api",dashboardRoutes);
app.use("/api", verifyRoutes);
app.use(errorHandler);

const PORT = process.env.LOCALHOST_PORT || 5000;

const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const server = process.env.DB_SERVER;
const database = process.env.DB_DATABASE;

poolConnect
  .then(() => {
    console.log("Connected to SQL Server");

    app.listen(PORT, () => {
      console.log(`Server running on port http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
