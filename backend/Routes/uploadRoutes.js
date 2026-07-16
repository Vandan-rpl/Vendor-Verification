const express = require("express");
const router = express.Router();
const protect = require("../Middlewares/Protect");
const upload = require("../Middlewares/uploadMiddleware");
const { uploadVendorExcel } = require("../Controller/vendorUpload");

router.post("/upload", protect, upload.single("file"), uploadVendorExcel);

module.exports = router;