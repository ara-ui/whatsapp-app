const DEFAULT_JWT_EXPIRES_IN = "1d";

function getAllowedOrigins() {
    const configured = (process.env.CORS_ORIGINS || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

    if (configured.length > 0) {
        return configured;
    }

    if (process.env.APP_URL) {
        return [process.env.APP_URL.replace(/\/$/, "")];
    }

    return ["http://localhost:3000"];
}

function getJwtExpiresIn() {
    return process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN;
}

function validateSecurityConfig() {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "replace_with_a_long_random_secret") {
        throw new Error("JWT_SECRET must be configured with a non-default secret");
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_gemini_api_key") {
        throw new Error("GEMINI_API_KEY must be configured");
    }
}

module.exports = {
    getAllowedOrigins,
    getJwtExpiresIn,
    validateSecurityConfig
};
