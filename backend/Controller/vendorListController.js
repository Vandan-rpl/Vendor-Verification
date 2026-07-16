const { listVendors } = require("../Services/vendorListService");

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

module.exports = { getVendorList };