const dashboardModel = require("../models/dashboardModel");

const getDashboardSummary = async () => {
  const counts = await dashboardModel.getSummaryCounts();

  return {
    totalVendors: counts.TotalVendors,
    pending: counts.PendingCount,
    verified: counts.VerifiedCount,
    rejected: counts.RejectedCount,
    emailsSentToday: counts.EmailsSentToday,
  };
};

module.exports = { getDashboardSummary };