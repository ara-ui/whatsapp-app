// Shared config for media validation — kept in one place so the
// allowed-type list and size limit aren't duplicated across files.

const ALLOWED_MIME_TYPES = [
    // images
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    // videos
    "video/mp4",
    "video/webm",
    "video/quicktime", // .mov
    // documents
    "application/pdf"
];

// Size limit is configurable via env (MEDIA_MAX_FILE_SIZE_MB) so it's
// easy to change without touching code. Falls back to 15MB, a
// reasonable ceiling for a student/demo app.
const MAX_FILE_SIZE_MB = Number(process.env.MEDIA_MAX_FILE_SIZE_MB) || 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function getMessageTypeFromMime(mimeType) {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    return "file";
}

module.exports = {
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE_MB,
    MAX_FILE_SIZE_BYTES,
    getMessageTypeFromMime
};
