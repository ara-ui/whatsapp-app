const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');


// Generate JWT Access Token
function generateAccessToken(id, name,email) {
    return jwt.sign(
        {
            userId: id,
            name: name,
            email:email
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1d"
        }
    );
}


// =========================
// SIGNUP USER
// =========================

const createUser = async (req, res) => {
    try {

        const { name, email, phone, password } = req.body;

        // Check all fields
        if (!name || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }


        // Check if email or phone already exists
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [
                    { email: email },
                    { phone: phone }
                ]
            }
        });

        console.log("Existing user:", existingUser);


        // If user already exists
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists"
            });
        }


        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);


        // Create user
        const user = await User.create({
            name: name,
            email: email,
            phone: phone,
            password: hashedPassword
        });


        console.log("User created successfully:", user.id);


        return res.status(201).json({
            success: true,
            message: "Signup successful"
        });

    } catch (err) {

        console.error("Signup error:", err);

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};


// =========================
// LOGIN USER
// =========================

const loginUser = async (req, res) => {

    try {

        const { emailOrPhone, password } = req.body;


        // Check fields
        if (!emailOrPhone || !password) {
            return res.status(400).json({
                success: false,
                message: "Email/Phone and password are required"
            });
        }


        // Find user using email OR phone
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    {
                        email: emailOrPhone
                    },
                    {
                        phone: emailOrPhone
                    }
                ]
            }
        });


        console.log("Login user:", user);


        // User doesn't exist
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }


        // Compare password
        const result = await bcrypt.compare(password, user.password);


        // Incorrect password
        if (!result) {
            return res.status(401).json({
                success: false,
                message: "Incorrect password"
            });
        }


        // Generate JWT token
        const token = generateAccessToken(
            user.id,
            user.name,
            user.email
        );


        // Send response
        return res.status(200).json({
            success: true,
            message: "Login successful",
            token: token
        });

    } catch (err) {

        console.error("Login error:", err);

        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};
const checkUser = async (req, res) => {

    try {

        const { email } = req.query;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const user = await User.findOne({
            where: {
                email: email
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }
};

// Export controllers
module.exports = {
    createUser,
    loginUser,
    checkUser
};
