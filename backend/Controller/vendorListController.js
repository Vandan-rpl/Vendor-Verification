const { listVendors, listUploadBatches, deleteVendorBatch } = require("../Services/vendorListService");

const getVendorList = async (req, res) => {
  try {
    const result = await listVendors(req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error("Fetching vendor list failed:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.statusCode ? err.message : "Failed to fetch vendors",
    });
  }
};

const getUploadBatches = async (req, res) => {
  try {
    const result = await listUploadBatches();
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error("Fetching upload batches failed:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.statusCode ? err.message : "Failed to fetch upload batches",
    });
  }
};

const deleteVendorBatchController = async (req, res) => {
  console.log("DELETE HIT:", req.params.batchId);
  try {
    const result = await deleteVendorBatch(req.params.batchId);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error("Deleting vendor batch failed:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.statusCode ? err.message : "Failed to delete vendor batch",
    });
  }
};

// const getUploadBatches = async (req, res) => {
//   try {
//     const result = await listUploadBatches();
//     return res.status(200).json({ success: true, ...result });
//   } catch (err) {
//     console.error("Fetching upload batches failed:", err);
//     return res.status(err.statusCode || 500).json({
//       success: false,
//       message: err.statusCode ? err.message : "Failed to fetch upload batches",
//     });
//   }
// };

module.exports = { getVendorList, getUploadBatches, deleteVendorBatchController };