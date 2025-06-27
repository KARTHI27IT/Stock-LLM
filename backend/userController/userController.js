const userService = require("./userService");

var userCreate = async (req, res) => {
    try {
        
        var result = await userService.userCreateService(req.body);
        
        if (result) {
            res.status(200).json({ status: true, message: result.message });
        } else {
            res.status(400).json({ status: false, message: result.message });
        }
    } catch (error) {
        console.error("Controller Error:", error);
        res.status(500).json({ status: false, message: "Error: " + error.message });
    }
};

var userLogin = async (req, res) => {
    try {
        
        var result = await userService.userLoginService(req.body);
        
        if (result) {
            res.status(200).json({ status: true, message: result.message, token:result.token, user:result.user });
        } else {
            res.status(400).json({ status: false, message: result.message });
        }
    } catch (error) {
        console.error("Controller Error:", error);
        res.status(500).json({ status: false, message: "Error: " + error.message });
    }
};


module.exports = { 
    userCreate,
    userLogin
}