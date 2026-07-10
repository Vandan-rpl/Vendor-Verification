const authService = require('../Services/authServices');

const postLogin = async (req,res) => {
    try {
        const {email,password} = req.body;
        const result = await authService.login(email,password);

        res.cookie('token',result.token,{
            httpOnly:true,
            secure: process.env.NODE_ENV === 'production',
            sameSite:'strict',
            maxAge: 8 * 60 * 60 * 1000 //8 hours
        })

        return res.status(200).json({
            success:true,
            message:"Login successful",
            data:result
        })
    } catch (error) {
        console.error("Error while login: ",error);
        return res.status(500).json({message:"Internal server error"});
    }
}

const postLogout = async (req,res) => {
    try {
        res.clearCookie('token',{
            httpOnly:true,
            sameSite:"lax",
            secure:process.env.NODE_ENV === "production"
        })

        res.json({
            success:true,
            message:"Logged out successfully."
        })
    } catch (error) {
        console.log("Error while logout: ",error);
        return res.status(500).json({message:"Internal server error"});
    }
}

const getMe = (req,res) => {
    try {
        res.status(200).json({
            success:true,
            user:req.user
        })
    } catch (error) {
        console.log("Error while fetching loggedin user details: ",error);
        return res.status(500).json({message:"Internal server error"});
    }
}

module.exports = {
    postLogin,
    postLogout,
    getMe
}