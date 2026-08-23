const User = require("../models/User");
const mailService = require("../services/mailService");
const ForgotPasswordRequest = require("../models/ForgotPassword");

const bcrypt = require("bcrypt");


exports.forgotPassword = async (req, res) => {

    try {

        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        const user = await User.findOne({
            where: { email }
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

       // Invalidate previous reset links
        await ForgotPasswordRequest.update(
            {
                isActive: false
            },
            {
                where: {
                    userId: user.id,
                    isActive: true
                }
            }
        );

        //create new reset request

        const request= await ForgotPasswordRequest.create({
            userId: user.id,
            isActive: true
        });

        //send reset mail
        await mailService.sendMail(email, request.id);

        return res.status(200).json({
            message: "Reset Password Link sent successfully"
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            message: "Something went wrong"
        });

    }

};

exports.resetPassword = async (req, res) => {

    try {

        const id = req.params.id;

        const request = await ForgotPasswordRequest.findOne({
            where: {
                id: id,
                isActive: true
            }
        });

        if (!request) {

            return res.status(400).send("Invalid or Expired Reset Link");

        }

        // Expire link after 15 minutes
        const fifteenMinutes = 15 * 60 * 1000;

        if (Date.now() - new Date(request.createdAt).getTime() > fifteenMinutes) {

            request.isActive = false;
            await request.save();

            return res.status(400).send("Reset link has expired");

        }

        res.sendFile(
            require("path").join(__dirname, "../public/resetpassword.html")
        );

    }
    catch (err) {

        console.log(err);

        res.status(500).json({
            message: "Something went wrong"
        });

    }

};

exports.updatePassword = async (req, res) => {

    try {

        const id = req.params.id;

        const { password } = req.body;

        if (!password || password.length < 5) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 5 characters"
            });
        }

        const request = await ForgotPasswordRequest.findOne({

            where: {
                id: id,
                isActive: true
            },

            include: User

        });

        if (!request) {

            return res.status(400).json({
                message: "Invalid or Expired Reset Link"
            });

        }

        // Expire link after 15 minutes
        const fifteenMinutes = 15 * 60 * 1000;

        if (Date.now() - new Date(request.createdAt).getTime() > fifteenMinutes) {

            request.isActive = false;
            await request.save();

            return res.status(400).json({
                message: "Reset link has expired"
            });

        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.update(

            {

                password: hashedPassword

            },

            {

                where: {
                    id: request.userId
                }

            }

        );

        request.isActive = false;

        await request.save();

        return res.status(200).json({

            message: "Password Updated Successfully"

        });

    }

    catch (err) {

        console.log(err);

        return res.status(500).json({

            message: "Something went wrong"

        });

    }

};