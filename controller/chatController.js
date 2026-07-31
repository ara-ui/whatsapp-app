const Chat = require("../models/Chat");
const User = require("../models/User");


//send message
exports.sendMessage = async (req, res) => {

    try {

        const { message } = req.body;

        if (!message || message.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Message cannot be empty"
            });
        }

        const chat = await Chat.create({

            message,

            userId: req.user.id

        });

        res.status(201).json({
            success: true,
            chat
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }

};


//get all messages

exports.getMessages = async (req, res) => {

    try {

        const chats = await Chat.findAll({

            include: [
                {
                    model: User,
                    attributes: ["id", "name"]
                }
            ],

            order: [
                ["createdAt", "ASC"]
            ]

        });
        console.log(JSON.stringify(chats, null, 2));

        
        res.status(200).json({
            success: true,
            chats
        });

    }

    catch (err) {

        console.log(err);

        res.status(500).json({
            success: false,
            message: "Server Error"
        });

    }

};