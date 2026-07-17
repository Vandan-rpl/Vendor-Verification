const { getVendorVerificationDetail } = require("../Services/vendorDetailService");

const getVendorDetail = async (req, res) => {
  const vendorId = parseInt(req.params.id, 10);

  if (isNaN(vendorId)) {
    return res.status(400).json({ success: false, message: "Invalid vendor id" });
  }

  try {
    const detail = await getVendorVerificationDetail(vendorId);
    return res.status(200).json({ success: true, ...detail });
  } catch (err) {
    console.error("Fetching vendor detail failed:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.statusCode ? err.message : "Failed to fetch vendor detail",
    });
  }
};

module.exports = { getVendorDetail };