const express = require("express");
const cors = require("cors");
require("dotenv").config();
const authRoutes = require("./Routes/authRoutes");

const { poolConnect } = require("./Config/db");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", authRoutes);

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
