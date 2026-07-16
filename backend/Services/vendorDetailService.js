const vendorDetailModel = require("../models/vendorDetailModel");

const getVendorVerificationDetail = async (vendorId) => {
  const vendor = await vendorDetailModel.getVendorById(vendorId);

  if (!vendor) {
    const err = new Error("Vendor not found");
    err.statusCode = 404;
    throw err;
  }

  const rows = await vendorDetailModel.getVendorEmailsWithRequests(vendorId);

  // Group flat rows by EmailId, since one email can have multiple
  // VerificationRequests rows if it was resent.
  const emailMap = new Map();

  for (const row of rows) {
    if (!emailMap.has(row.EmailId)) {
      emailMap.set(row.EmailId, {
        emailId: row.EmailId,
        email: row.Email,
        emailType: row.EmailType,
        isActive: row.IsActive,
        requests: [],
      });
    }

    if (row.RequestId) {
      emailMap.get(row.EmailId).requests.push({
        requestId: row.RequestId,
        status: row.RequestStatus,
        sentAt: row.SentAt,
        expiresAt: row.ExpiresAt,
        verifiedAt: row.VerifiedAt,
      });
    }
  }

  return {
    vendor,
    emails: Array.from(emailMap.values()),
  };
};

module.exports = { getVendorVerificationDetail };