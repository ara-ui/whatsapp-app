const { Op } = require("sequelize");
const Connection = require("../models/Connection");
const User = require("../models/User");
const { normalizePair } = require("../utils/connection");

function publicUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email
    };
}

async function findTargetUser(req) {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const userId = Number(req.body?.userId);

    if (email) {
        return User.findOne({ where: { email } });
    }

    if (Number.isInteger(userId) && userId > 0) {
        return User.findByPk(userId);
    }

    return null;
}

exports.sendRequest = async (req, res) => {
    try {
        const currentUserId = Number(req.user.id);
        const targetUser = await findTargetUser(req);

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (Number(targetUser.id) === currentUserId) {
            return res.status(400).json({
                success: false,
                message: "You cannot connect with yourself"
            });
        }

        const pair = normalizePair(currentUserId, targetUser.id);
        const requestedById = currentUserId;

        let connection = await Connection.findOne({ where: pair });

        if (connection) {
            if (connection.status === "accepted") {
                return res.status(409).json({
                    success: false,
                    message: "You are already connected"
                });
            }

            if (
                connection.status === "pending" &&
                Number(connection.requestedById) === currentUserId
            ) {
                return res.status(409).json({
                    success: false,
                    message: "Connection request is already pending"
                });
            }

            if (connection.status === "pending") {
                return res.status(409).json({
                    success: false,
                    message: "This user has already sent you a connection request"
                });
            }

            connection.status = "pending";
            connection.requestedById = requestedById;
            connection.respondedAt = null;
            await connection.save();
        } else {
            connection = await Connection.create({
                ...pair,
                requestedById,
                status: "pending"
            });
        }

        const io = req.app.get("io");
        if (io) {
            io.to(`user:${targetUser.id}`).emit("connection:request", {
                connectionId: connection.id,
                requester: publicUser(req.user)
            });
        }

        return res.status(201).json({
            success: true,
            connection: {
                id: connection.id,
                status: connection.status,
                requestedById: connection.requestedById,
                user: publicUser(targetUser)
            }
        });
    } catch (err) {
        console.error("Send connection request error:", err.message);
        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

exports.getPendingRequests = async (req, res) => {
    try {
        const userId = Number(req.user.id);
        const connections = await Connection.findAll({
            where: {
                status: "pending",
                [Op.or]: [
                    { userAId: userId },
                    { userBId: userId }
                ]
            },
            order: [["createdAt", "DESC"]]
        });

        const otherIds = connections.map(connection =>
            Number(connection.requestedById) === userId
                ? (Number(connection.userAId) === userId ? connection.userBId : connection.userAId)
                : connection.requestedById
        );

        const users = otherIds.length
            ? await User.findAll({ where: { id: [...new Set(otherIds)] } })
            : [];
        const userMap = new Map(users.map(user => [Number(user.id), user]));

        return res.status(200).json({
            success: true,
            requests: connections.map(connection => {
                const isOutgoing = Number(connection.requestedById) === userId;
                const otherId = isOutgoing
                    ? (Number(connection.userAId) === userId ? connection.userBId : connection.userAId)
                    : connection.requestedById;

                return {
                    id: connection.id,
                    status: connection.status,
                    direction: isOutgoing ? "outgoing" : "incoming",
                    user: publicUser(userMap.get(Number(otherId)))
                };
            })
        });
    } catch (err) {
        console.error("Pending connection requests error:", err.message);
        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

exports.acceptRequest = async (req, res) => {
    return respondToRequest(req, res, "accepted");
};

exports.rejectRequest = async (req, res) => {
    return respondToRequest(req, res, "rejected");
};

async function respondToRequest(req, res, status) {
    try {
        const userId = Number(req.user.id);
        const connection = await Connection.findByPk(req.params.connectionId);

        if (!connection || connection.status !== "pending") {
            return res.status(404).json({
                success: false,
                message: "Pending connection request not found"
            });
        }

        const isParticipant =
            Number(connection.userAId) === userId ||
            Number(connection.userBId) === userId;

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: "You are not part of this connection request"
            });
        }

        if (Number(connection.requestedById) === userId) {
            return res.status(403).json({
                success: false,
                message: "Only the recipient can respond to this request"
            });
        }

        connection.status = status;
        connection.respondedAt = new Date();
        await connection.save();

        const otherUserId = Number(connection.requestedById);
        const io = req.app.get("io");
        if (io) {
            io.to(`user:${otherUserId}`).emit(
                status === "accepted" ? "connection:accepted" : "connection:rejected",
                { connectionId: connection.id, userId }
            );
        }

        return res.status(200).json({
            success: true,
            connection: {
                id: connection.id,
                status: connection.status
            }
        });
    } catch (err) {
        console.error(`Connection ${status} error:`, err.message);
        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
}

exports.getConnectedUsers = async (req, res) => {
    try {
        const userId = Number(req.user.id);
        const connections = await Connection.findAll({
            where: {
                status: "accepted",
                [Op.or]: [
                    { userAId: userId },
                    { userBId: userId }
                ]
            },
            order: [["updatedAt", "DESC"]]
        });

        const otherIds = connections.map(connection =>
            Number(connection.userAId) === userId
                ? connection.userBId
                : connection.userAId
        );

        const users = otherIds.length
            ? await User.findAll({ where: { id: [...new Set(otherIds)] } })
            : [];
        const userMap = new Map(users.map(user => [Number(user.id), user]));

        return res.status(200).json({
            success: true,
            users: connections
                .map(connection => {
                    const otherUser = userMap.get(
                        Number(connection.userAId) === userId
                            ? Number(connection.userBId)
                            : Number(connection.userAId)
                    );

                    return otherUser
                        ? {
                            connectionId: connection.id,
                            user: publicUser(otherUser)
                        }
                        : null;
                })
                .filter(Boolean)
        });
    } catch (err) {
        console.error("Connected users error:", err.message);
        return res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};
