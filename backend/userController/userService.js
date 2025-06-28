const { userSchemaModel } = require('./userModel');
const jwt = require('jsonwebtoken');

// CREATE USER
module.exports.userCreateService = async (UserDetails) => {
    try {

        const existingUser = await userSchemaModel.findOne({ email: UserDetails.email });

        if (existingUser) {
            return { status: false, message: "Email already exists. Please use a different email." };
        }
        
        var userModelData = new userSchemaModel({
            name: UserDetails.name,
            email: UserDetails.email,
            password: UserDetails.password
        });

        var result = await userModelData.save();
        
        if (result) {
            console.log(`${userModelData.name} is registered successfully`);
            return { status: true, message: "User registration successful!" };
        } else {
            return { status: false, message: "Registration failed" };
        }
    } catch (error) {
        console.error('Error occurred while creating user:', error);
        return { status: false, message: "Error: " + error.message };
    }
};
module.exports.userLoginService = async (UserDetails) => {
  try {
    const cleanEmail = UserDetails.email.trim().toLowerCase();
    console.log("Normalized email:", cleanEmail);

    const user = await userSchemaModel.findOne({ email: cleanEmail });
    // console.log("User from DB:", user);

    if (!user) {
      return { status: false, message: 'User not found' };
    }

    if (user.password !== UserDetails.password) {
      return { status: false, message: 'Invalid password' };
    }

    const tokenPayload = {
      userId: user._id,
      email: user.email,
    };

    const token = jwt.sign(tokenPayload, '1234', { expiresIn: '1h' });

    const userResponse = {
      name: user.name,
      email: user.email,
    };

    return {
      status: true,
      message: 'Login successful',
      token,
      user: userResponse,
    };

  } catch (error) {
    console.error("Error in userLoginService:", error);
    return { status: false, message: 'Error: ' + error.message };
  }
};


module.exports.userDetailsService = async (UserDetails) => {
    try {
        const user = await userSchemaModel.findOne({ email: UserDetails.email });
        if (user) {  
            return { status: true, message: "Details retrived",user:user };
        } else {
            return { status: false, message: "User not found" };
        }
    } catch (error) {
        console.error('Error occurred while creating user:', error);
        return { status: false, message: "Error: " + error.message };
    }
};