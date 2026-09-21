const { Op } = require("sequelize");

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

function normalizeLimit(value) {
    const parsed = Number.parseInt(value, 10);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return DEFAULT_LIMIT;
    }

    return Math.min(parsed, MAX_LIMIT);
}

function encodeCursor(createdAt, id) {
    return Buffer.from(
        JSON.stringify({
            createdAt: new Date(createdAt).toISOString(),
            id: Number(id)
        }),
        "utf8"
    ).toString("base64url");
}

function decodeCursor(value) {
    if (!value) {
        return null;
    }

    try {
        const decoded = JSON.parse(
            Buffer.from(value, "base64url").toString("utf8")
        );

        const createdAt = new Date(decoded.createdAt);
        const id = Number(decoded.id);

        if (
            Number.isNaN(createdAt.getTime()) ||
            !Number.isInteger(id) ||
            id <= 0
        ) {
            return null;
        }

        return { createdAt, id };
    } catch (_err) {
        return null;
    }
}

function buildBeforeWhere(roomId, cursor) {
    const where = { roomId };

    if (!cursor) {
        return where;
    }

    where[Op.or] = [
        {
            createdAt: {
                [Op.lt]: cursor.createdAt
            }
        },
        {
            createdAt: cursor.createdAt,
            id: {
                [Op.lt]: cursor.id
            }
        }
    ];

    return where;
}

module.exports = {
    DEFAULT_LIMIT,
    MAX_LIMIT,
    normalizeLimit,
    encodeCursor,
    decodeCursor,
    buildBeforeWhere
};
