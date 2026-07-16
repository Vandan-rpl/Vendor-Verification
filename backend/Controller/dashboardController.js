const { getDashboardSummary } = require("../services/dashboardService");

const getSummary = async (req, res) => {
  try {
    const summary = await getDashboardSummary();
    return res.status(200).json({ success: true, summary });
  } catch (err) {
    console.error("Fetching dashboard summary failed:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch dashboard summary" });
  }
};

module.exports = { getSummary };