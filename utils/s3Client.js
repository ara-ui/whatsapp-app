const { S3Client } = require("@aws-sdk/client-s3");

// One shared S3 client for the whole app. Credentials come ONLY from
// environment variables (see .env.example) — never hardcoded, never
// sent to the frontend. The frontend never talks to S3 directly; it
// only ever calls our own POST /media/upload endpoint.
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

module.exports = s3Client;
