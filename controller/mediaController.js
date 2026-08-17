const crypto = require("crypto");
const multer = require("multer");
const {
    PutObjectCommand,
    GetObjectCommand
} = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = require("../utils/s3Client");
const Room = require("../models/Room");
const Message = require("../models/Message");

const { isAuthorizedForRoom } = require("../utils/roomAuthorization");

const {
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE_MB,
    MAX_FILE_SIZE_BYTES,
    getMessageTypeFromMime
} = require("../utils/mediaConfig");


// Buffer the file in memory (no temp files on disk) — files are
// capped at MAX_FILE_SIZE_BYTES, which keeps this safe for a
// demo-scale app. fileFilter rejects unsupported types before the
// file is even fully read.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type: ${file.mimetype}`));
        }
    }
}).single("file");


exports.uploadMedia = (req, res) => {
    upload(req, res, async (uploadErr) => {

        if (uploadErr) {
            const isTooLarge = uploadErr.code === "LIMIT_FILE_SIZE";

            return res.status(400).json({
                success: false,
                message: isTooLarge
                    ? `File too large. Max size is ${MAX_FILE_SIZE_MB}MB`
                    : (uploadErr.message || "Upload failed")
            });
        }

        try {
            const currentUserId = req.user.id;
            const file = req.file;
            const roomId = parseInt(req.body.roomId, 10);

            if (!file) {
                return res.status(400).json({
                    success: false,
                    message: "No file was provided"
                });
            }

            if (isNaN(roomId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid room id"
                });
            }

            const room = await Room.findByPk(roomId);

            if (!room) {
                return res.status(404).json({
                    success: false,
                    message: "Room not found"
                });
            }

            // Never trust the frontend's roomId as authorization by
            // itself — same membership check used everywhere else.
            const authorized = await isAuthorizedForRoom(currentUserId, room);

            if (!authorized) {
                return res.status(403).json({
                    success: false,
                    message: "You are not a member of this room"
                });
            }

            const messageType = getMessageTypeFromMime(file.mimetype);
           const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
            const s3Key = `media/${roomId}/${crypto.randomUUID()}-${safeName}`;

            try {
                await s3Client.send(new PutObjectCommand({
                    Bucket: process.env.AWS_S3_BUCKET,
                    Key: s3Key,
                    Body: file.buffer,
                    ContentType: file.mimetype
                }));
            } catch (s3Err) {
                console.log(s3Err);
                // Upload to S3 failed — do NOT create a Message row.
                return res.status(502).json({
                    success: false,
                    message: "Failed to upload file to storage"
                });
            }
            // Generate temporary URL for the private S3 object
            const mediaUrl = await getSignedUrl(
                s3Client,
                new GetObjectCommand({
                    Bucket: process.env.AWS_S3_BUCKET,
                    Key: s3Key
                }),
                { expiresIn: 3600 }
            );


            const message = await Message.create({
                roomId: room.id,
                senderId: currentUserId,
                content: null,
                messageType,
                mediaUrl:null,
                mediaKey: s3Key,
                fileName: file.originalname,
                mimeType: file.mimetype
            });

            const payload = {
                id: message.id,
                roomId: room.id,
                senderId: currentUserId,
                senderName: req.user.name,
                messageType: message.messageType,
                content: null,
                mediaUrl,
                fileName: message.fileName,
                mimeType: message.mimeType,
                createdAt: message.createdAt
            };

             const io = req.app.get("io");

            if (io) {
                io.to(String(room.id)).emit("room:message", payload);
            }

            return res.status(201).json({
                success: true,
                message: payload
            });

        } catch (err) {
            console.log(err);
            return res.status(500).json({
                success: false,
                message: "Server Error"
            });
        }
    });
};
