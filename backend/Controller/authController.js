const authService = require('../Services/authServices');

const postLogin = async (req,res) => {
    try {
        const {email,password} = req.body;
        const result = await authService.login(email,password);

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

module.exports = {
    postLogin
}