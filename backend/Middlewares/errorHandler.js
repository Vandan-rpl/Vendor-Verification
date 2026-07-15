const multer = require("multer");

const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError || err.name === "MulterError") {
    console.error("MulterError:", err);

    return res.status(400).json({
      success: false,
      error: err.message,
      code: err.code || null,
    });
  }

  // Handle all other errors
  console.error(err);

  return res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
};

module.exports = errorHandler;