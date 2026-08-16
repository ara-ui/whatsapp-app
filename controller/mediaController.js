const crypto = require("crypto");
const multer = require("multer");
const { PutObjectCommand } = require("@aws-sdk/client-s3");

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


// =========================================================
// POST /media/upload
// multipart/form-data fields: file, roomId
//
// 1. Authenticate (via the existing `authenticate` middleware, same
//    as every other route).
// 2. Parse the multipart body (multer) — rejects bad type/size here.
// 3. Re-verify the room exists and the user is actually a member of
//    it, using the SAME isAuthorizedForRoom() helper the REST message
//    history endpoint and the Socket.IO room handler both use — one
//    authorization rule, enforced identically everywhere.
// 4. Upload to S3. Only if that succeeds do we write to the DB —
//    never create a Message row pointing at a file that isn't there.
// 5. Broadcast over the existing "room:message" Socket.IO event,
//    scoped to just this room (io.to(roomId)), so it reaches exactly
//    the same audience a text message would and nobody else.
// =========================================================
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

            // Strip anything but safe filename characters before using
            // it in the S3 key (defense against path traversal / weird
            // unicode in the object key), while keeping the ORIGINAL
            // name for display/download purposes in fileName below.
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

            const mediaUrl =
                `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

            const message = await Message.create({
                roomId: room.id,
                senderId: currentUserId,
                content: null,
                messageType,
                mediaUrl,
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
                mediaUrl: message.mediaUrl,
                fileName: message.fileName,
                mimeType: message.mimeType,
                createdAt: message.createdAt
            };

            // Same event name/shape as text messages ("room:message"),
            // scoped to just this room — everyone currently joined to
            // it (including the sender, who joined on openRoom()) gets
            // it once, in real time. No separate media event needed.
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
