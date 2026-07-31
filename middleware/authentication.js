const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.authenticate = async (req, res, next) => {
    try {

        // Get token from request header
        const token = req.header("Authorization");

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Token not found"
            });
        }

        // Verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find user in database
        const user = await User.findByPk(decoded.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        // Attach user to request
        req.user = user;

        next();

    } catch (err) {

        console.log(err);

        return res.status(401).json({
            success: false,
            message: "Invalid token."
        });

    }
};