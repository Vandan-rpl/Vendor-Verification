const { processVendorExcel } = require("../Services/uploadService");

const uploadVendorExcel = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  try {
    const uploadedBy = req.user?.userId ?? req.user?.id ?? req.user?.user_id ?? null;

    const result = await processVendorExcel({
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname,
      uploadedBy,
    });

    return res.status(200).json({
      success: true,
      message: "Excel processed",
      ...result,
    });
  } catch (err) {
    console.error("Upload failed:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.statusCode ? err.message : "Upload failed, all changes rolled back",
      error: err.message,
    });
  }
};

module.exports = { uploadVendorExcel };