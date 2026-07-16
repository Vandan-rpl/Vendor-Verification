const express = require("express");
const router = express.Router();
const upload = require("../Middlewares/uploadMiddleware");
const { uploadVendorExcel } = require("../Controller/vendorUpload");
const { getVendorList } = require("../Controller/vendorListController");
const { getVendorDetail } = require("../Controller/vendorDetailController");

// GET /api/vendors?status=pending&batchId=3&search=acme&page=1&limit=20
router.get("/getVendorList", getVendorList);
router.get("/:id/verification-details", getVendorDetail);

module.exports = router;