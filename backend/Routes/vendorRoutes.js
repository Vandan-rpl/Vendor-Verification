const express = require("express");
const router = express.Router();
const upload = require("../Middlewares/uploadMiddleware");
const { uploadVendorExcel } = require("../Controller/vendorUpload");
const { getVendorList, getUploadBatches, deleteVendorBatchController } = require("../Controller/vendorListController");
const { getVendorDetail } = require("../Controller/vendorDetailController");

// GET /api/vendors?status=pending&batchId=3&search=acme&page=1&limit=20
router.get("/getVendorList", getVendorList);
router.get("/getUploadBatches", getUploadBatches);
router.get("/:id/verification-details", getVendorDetail);

router.delete("/deleteVendorBatch/:batchId", deleteVendorBatchController);
router.post("/deleteVendorBatch/:batchId", deleteVendorBatchController); // compatibility alias for clients using POST

module.exports = router;