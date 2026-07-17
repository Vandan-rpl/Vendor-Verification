const vendorListModel = require("../Models/vendorListModel");

const VALID_STATUSES = ["pending", "verified", "rejected"];

const listVendors = async (queryParams) => {
  const { status, batchId, search } = queryParams;

  if (status && !VALID_STATUSES.includes(status)) {
    const err = new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
    err.statusCode = 400;
    throw err;
  }

  const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 20, 1), 100); // cap at 100/page

  const { vendors, totalCount } = await vendorListModel.getVendors({
    status: status || null,
    batchId: batchId ? parseInt(batchId, 10) : null,
    search: search || null,
    page,
    limit,
  });

  return {
    vendors,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
};

module.exports = { listVendors };