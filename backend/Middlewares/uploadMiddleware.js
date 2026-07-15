const multer = require("multer");
const path = require("path");

// Store file in memory (we parse it directly, no need to save to disk)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExts = [".xlsx", ".xls"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only .xlsx or .xls files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

module.exports = upload;