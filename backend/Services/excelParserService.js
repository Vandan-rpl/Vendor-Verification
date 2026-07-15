const XLSX = require("xlsx");

/**
 * Expected Excel columns (case-insensitive, spaces ignored), matching the
 * Vendor table: VendorCode, VendorName, AddressLine1, AddressLine2, City,
 * State, Pincode, plus Email1, Email2, Email3, ... (any column containing "email")
 *
 * Adjust COLUMN_MAP below if your actual Excel headers differ.
 */
const COLUMN_MAP = {
  vendorcode: "VendorCode",
  code: "VendorCode",
  vendorname: "VendorName",
  addressline1: "AddressLine1",
  address1: "AddressLine1",
  addressline2: "AddressLine2",
  address2: "AddressLine2",
  city: "City",
  state: "State",
  pincode: "Pincode",
};

const normalizeHeader = (header) =>
  String(header)
    .toLowerCase()
    .replace(/[\s_\.]/g, "")
    .replace(/[^a-z0-9]/g, "");

const isPlaceholder = (val) => {
  if (val === undefined || val === null) return true;
  const s = String(val).trim().toLowerCase();
  return s === "" || s === "-" || s === "na" || s === "n/a" || s === "none" || s === "null";
};

/**
 * Reads the uploaded file buffer and returns raw row objects
 * (keyed by original Excel headers).
 */
const parseExcelBuffer = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
};

/**
 * Transforms a raw Excel row into { vendorFields: {...}, emails: [...] }
 */
const mapRow = (rawRow) => {
  const vendorFields = {};
  const emails = [];

  for (const [rawHeader, value] of Object.entries(rawRow)) {
    if (value === undefined || value === null || value === "") continue;

    const normalized = normalizeHeader(rawHeader);

    if (isPlaceholder(value)) continue;

    if (normalized.includes("email")) {
      const emailValue = String(value).trim();
      // only keep likely-valid emails
      if (emailValue && emailValue.includes("@") && !isPlaceholder(emailValue)) {
        emails.push({
          email: emailValue,
          emailType: normalized.replace("email", "") || "primary",
        });
      }
      continue;
    }

    // try explicit map first
    let mappedField = COLUMN_MAP[normalized];
    // handle common header variations not listed in COLUMN_MAP
    if (!mappedField) {
      if (normalized.startsWith("vendorname")) mappedField = "VendorName";
      else if (normalized.startsWith("postcode") || normalized === "postcode" || normalized === "pincode" || normalized === "zip") mappedField = "Pincode";
      else if (normalized.startsWith("city")) mappedField = "City";
    }

    if (mappedField) {
      // don't overwrite if we've already set this field from another header
      if (!vendorFields[mappedField]) vendorFields[mappedField] = String(value).trim();
    }
  }

  return { vendorFields, emails };
};

module.exports = { parseExcelBuffer, mapRow };