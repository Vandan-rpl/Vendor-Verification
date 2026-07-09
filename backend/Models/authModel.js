const sql = require("mssql");
require("dotenv").config();
const {poolConnect} = require("../Config/db");

const getUserByEmail = async (email) => {
    const pool = await poolConnect;

    const result = await pool.request()
        .input("Email",sql.NVarChar,email)
        .query("SELECT UserId,Email,PasswordHash,Username,Role FROM Users WHERE Email = @Email");

    return result.recordset[0];
}

module.exports = {getUserByEmail};