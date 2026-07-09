const express = require('express');
const Router = express.Router();
const userController = require("../Controller/authController");

Router.post('/login',userController.postLogin);

module.exports = Router;