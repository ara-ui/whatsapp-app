const DEFAULT_JWT_EXPIRES_IN = "1d";

function getAppUrl() {
    const appUrl = (process.env.APP_URL || "").trim().replace(/\/$/, "");

    if (!appUrl) {
        throw new Error("APP_URL must be configured");
    }

    return appUrl;
}

function getAllowedOrigins() {
    const configured = (process.env.CORS_ORIGINS || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

    if (configured.length > 0) {
        return configured;
    }

    return [getAppUrl()];
}

function getJwtExpiresIn() {
    return process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN;
}

function validateSecurityConfig() {
    getAppUrl();

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "replace_with_a_long_random_secret") {
        throw new Error("JWT_SECRET must be configured with a non-default secret");
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_gemini_api_key") {
        throw new Error("GEMINI_API_KEY must be configured");
    }
}

module.exports = {
    getAllowedOrigins,
    getAppUrl,
    getJwtExpiresIn,
    validateSecurityConfig
};
