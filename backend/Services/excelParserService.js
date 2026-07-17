const XLSX = require("xlsx");

/**
 * Expected Excel columns (case-insensitive, spaces ignored), matching the
 * Vendor table: VendorCode, VendorName, AddressLine1, AddressLine2, City,
 * State, Pincode, MobileNumber, plus Email1, Email2, Email3, ... (any column
 * containing "email")
 *
 * Adjust COLUMN_MAP below if your actual Excel headers differ.
 * NOTE: keys here must be the NORMALIZED form (lowercase, no spaces/symbols)
 * since normalizeHeader() is always applied before lookup.
 */
const COLUMN_MAP = {
  vendorcode: "VendorCode",
  code: "VendorCode",
  vendorname: "VendorName",
  addressline1: "AddressLine1",
  addressline2: "AddressLine2",
  city: "City",
  state: "State",
  pincode: "Pincode",
  phonenumber: "MobileNumber",   // ✅ fixed: was "PhoneNumber" (wrong case, never matched)
  mobilenumber: "MobileNumber",
  mobile: "MobileNumber",        // optional extra alias
  contactnumber: "MobileNumber", // optional extra alias
};

// Fields in the Vendor table that are numeric (int) and need Number() coercion
const NUMERIC_FIELDS = new Set(["VendorCode"]);

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
      else if (normalized.startsWith("phone") || normalized.startsWith("mobile") || normalized.startsWith("contact")) mappedField = "MobileNumber";
    }

    if (mappedField) {
      // don't overwrite if we've already set this field from another header
      if (!vendorFields[mappedField]) {
        const rawValue = String(value).trim();

        if (NUMERIC_FIELDS.has(mappedField)) {
          // strip any non-digit characters (spaces, dashes, +91 etc.) before parsing
          const digitsOnly = rawValue.replace(/[^\d]/g, "");
          vendorFields[mappedField] = digitsOnly ? Number(digitsOnly) : null;
        } else {
          vendorFields[mappedField] = rawValue;
        }
      }
    }
  }

  return { vendorFields, emails };
};

module.exports = { parseExcelBuffer, mapRow };