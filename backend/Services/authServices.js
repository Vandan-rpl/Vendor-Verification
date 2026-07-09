const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authModel = require("../Models/authModel");
require("dotenv").config();

const login = async (email,password) => {
    const user = await authModel.getUserByEmail(email);

    if(!user) {
        throw new Error("User not found");
    }

    const isMatch = await bcrypt.compare(password,user.PasswordHash);

    if(!isMatch) {
        throw new Error("Invalid password");
    }

    const token = jwt.sign({
        userId: user.UserId,
        email: user.Email,
        role: user.Role
    },process.env.JWT_SECRET,{
        expiresIn: "8h"
    })
    return {
        token,
        user: {
            userId: user.UserId,
            email: user.Email,
            userName: user.Username,
            role: user.Role
        }
    }
}

module.exports = {
    login
}