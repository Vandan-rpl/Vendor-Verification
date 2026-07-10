const express = require('express');
const Router = express.Router();
const userController = require("../Controller/authController");
const protect = require('../Middlewares/Protect');

Router.post('/login',userController.postLogin);
Router.post('/logout',userController.postLogout);
Router.get('/me',protect,userController.getMe);

module.exports = Router;