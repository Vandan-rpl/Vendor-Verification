const express = require("express");
const router = express.Router();
const upload = require("../Middlewares/uploadMiddleware");
const { uploadVendorExcel } = require("../Controller/vendorUpload");

router.post("/upload", upload.single("file"), uploadVendorExcel);

module.exports = router;