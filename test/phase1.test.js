const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }

test("media controller uses MessageRecipient delivery/read pipeline", () => {
  const source = read("controller/mediaController.js");
  assert.match(source, /createRecipientRows/);
  assert.match(source, /markDelivered/);
  assert.match(source, /getMessageStatus/);
});

test("room history includes archived messages", () => {
  const source = read("controller/messageController.js");
  assert.match(source, /ArchivedMessage\.findAll/);
  assert.match(source, /byId/);
});

test("forgot-password response does not reveal account existence", () => {
  const source = read("controller/forgotPassword.js");
  assert.match(source, /If the account exists, a password reset link has been sent/);
  assert.doesNotMatch(source, /status\(404\).*User not found/s);
});

test("password reset email uses APP_URL", () => {
  const source = read("services/mailService.js");
  assert.match(source, /process\.env\.APP_URL/);
});

test("frontend API/socket clients are not hardcoded to localhost", () => {
  for (const file of ["js/signup.js", "js/login.js", "js/socketClient.js"]) {
    assert.doesNotMatch(read(file), /http:\/\/localhost:3000/);
  }
});

test("socket authentication does not log the decoded JWT payload", () => {
  const source = read("socket-io/middleware.js");
  assert.doesNotMatch(source, /console\.log\([\s\S]*decoded\)/);
});

test("message history supports bounded cursor pagination", () => {
  const source = read("controller/messageController.js");
  assert.match(source, /normalizeLimit/);
  assert.match(source, /decodeCursor/);
  assert.match(source, /limit: fetchLimit/);
  assert.match(source, /nextCursor/);
  assert.match(source, /hasMore/);
});

test("pagination uses a stable createdAt + id cursor", () => {
  const source = read("utils/messagePagination.js");
  assert.match(source, /createdAt/);
  assert.match(source, /id/);
  assert.match(source, /Op\.lt/);
  assert.match(source, /base64url/);
});

test("delete-for-me uses a per-user deletion record", () => {
  const controller = read("controller/messageController.js");
  const model = read("models/MessageDeletion.js");
  assert.match(controller, /markMessageDeletedForUser/);
  assert.match(controller, /deleteMessageForMe/);
  assert.match(model, /messageId/);
  assert.match(model, /userId/);
  assert.match(model, /unique: true/);
});

test("delete-for-me hides media without deleting the shared S3 object", () => {
  const media = read("controller/mediaController.js");
  const deletion = read("utils/messageDeletion.js");
  assert.match(media, /getDeletedMessageIdsForUser/);
  assert.match(media, /Media not found/);
  assert.match(deletion, /MessageDeletion\.findOrCreate/);
});

test("message history excludes messages deleted for the current user", () => {
  const controller = read("controller/messageController.js");
  assert.match(controller, /visibleMessages/);
  assert.match(controller, /deletedIds\.has/);
});

test("delete-for-me route requires authentication", () => {
  const routes = read("routes/messageRoutes.js");
  assert.match(routes, /router\.delete\("\/messages\/:messageId\/me", authenticate/);
});


test("delete-for-everyone is sender-authorized and deletes S3 media", () => {
  const controller = read("controller/messageController.js");
  const routes = read("routes/messageRoutes.js");
  assert.match(controller, /deleteMessageForEveryone/);
  assert.match(controller, /Only the sender can delete this message for everyone/);
  assert.match(controller, /DeleteObjectCommand/);
  assert.match(controller, /Message\.destroy/);
  assert.match(controller, /ArchivedMessage\.destroy/);
  assert.match(routes, /router\.delete\("\/messages\/:messageId\/everyone", authenticate/);
});

test("delete-for-everyone broadcasts a room deletion event", () => {
  const controller = read("controller/messageController.js");
  const frontend = read("js/chatMessages.js");
  assert.match(controller, /room:messageDeleted/);
  assert.match(frontend, /room:messageDeleted/);
  assert.match(frontend, /removeRenderedMessage\(messageId\)/);
});

test("message delete actions are available from the context menu", () => {
  const renderer = read("js/messageRenderer.js");
  const chatWindow = read("js/chatWindow.js");
  assert.doesNotMatch(renderer, /data-delete-message-id/);
  assert.doesNotMatch(renderer, /Delete for everyone/);
  assert.match(chatWindow, /contextmenu/);
  assert.match(chatWindow, /Delete for me/);
  assert.match(chatWindow, /Delete for everyone/);
  assert.match(chatWindow, /isMine/);
});

test("connection model stores one normalized relationship with request status", () => {
  const model = read("models/Connection.js");
  const util = read("utils/connection.js");
  assert.match(model, /userAId/);
  assert.match(model, /userBId/);
  assert.match(model, /requestedById/);
  assert.match(model, /pending/);
  assert.match(model, /accepted/);
  assert.match(model, /rejected/);
  assert.match(model, /unique: true/);
  assert.match(util, /normalizePair/);
});

test("connection routes expose request, pending, accept, reject, and connected-user operations", () => {
  const routes = read("routes/connectionRoutes.js");
  assert.match(routes, /\/request/);
  assert.match(routes, /\/pending/);
  assert.match(routes, /\/accept/);
  assert.match(routes, /\/reject/);
  assert.match(routes, /getConnectedUsers/);
  assert.match(routes, /router\.use\(authenticate\)/);
});

test("personal rooms require an accepted connection", () => {
  const controller = read("controller/roomController.js");
  assert.match(controller, /areUsersConnected/);
  assert.match(controller, /only start a personal chat with a connected user/);
});

test("text and media personal messaging enforce connection state", () => {
  const socket = read("socket-io/handlers/room.js");
  const media = read("controller/mediaController.js");
  assert.match(socket, /areUsersConnected/);
  assert.match(socket, /must be connected to this user to send messages/);
  assert.match(media, /areUsersConnected/);
  assert.match(media, /must be connected to this user to send messages/);
});

test("connection UI supports pending requests, badge, toast, and connected users", () => {
  const component = read("public/components/connectionModal.html");
  const header = read("public/components/sidebarHeader.html");
  const script = read("js/connections.js");
  assert.match(component, /Pending requests/);
  assert.match(component, /Connected users/);
  assert.match(header, /connectionRequestBadge/);
  assert.match(header, /connectionToastContainer/);
  assert.match(script, /connection:request/);
  assert.match(script, /showConnectionToast/);
  assert.match(script, /setConnectionRequestBadge/);
  assert.match(script, /connection:accepted/);
  assert.match(script, /accept/);
  assert.match(script, /reject/);
});


test("disconnect removes only the connection and broadcasts the event", () => {
  const controller = read("controller/connectionController.js");
  const routes = read("routes/connectionRoutes.js");
  assert.match(controller, /disconnectUser/);
  assert.match(controller, /connection\.destroy\(\)/);
  assert.match(controller, /connection:disconnected/);
  assert.match(routes, /router\.delete\("\/:connectionId", disconnectUser\)/);
});

test("disconnect UI provides a confirmation and refreshes connection data", () => {
  const script = read("js/connections.js");
  const css = read("css/home.css");
  assert.match(script, /connection-disconnect-btn/);
  assert.match(script, /window\.confirm/);
  assert.match(script, /axios\.delete/);
  assert.match(script, /connection:disconnected/);
  assert.match(css, /\.btn-danger/);
});

test("AI routes require authentication and per-user rate limiting", () => {
  const routes = read("routes/aiRoutes.js");
  const limiter = read("middleware/aiRateLimiter.js");
  assert.match(routes, /authenticate/);
  assert.match(routes, /smartRepliesLimiter/);
  assert.match(routes, /predictiveLimiter/);
  assert.match(limiter, /express-rate-limit/);
  assert.match(limiter, /req\.user\?\.id/);
});

test("AI controller bounds request payloads before calling Gemini", () => {
  const controller = read("controller/aiController.js");
  assert.match(controller, /MAX_MESSAGE_LENGTH = 1000/);
  assert.match(controller, /MAX_RECENT_MESSAGES = 8/);
  assert.match(controller, /normalizeRecentMessages/);
  assert.match(controller, /slice\(-maxItems\)/);
});

test("JWT expiry is configurable through environment settings", () => {
  const controller = read("controller/userController.js");
  const env = read(".env.example");
  assert.match(controller, /getJwtExpiresIn/);
  assert.match(env, /JWT_EXPIRES_IN=/);
});

test("CORS is restricted to configured origins", () => {
  const app = read("app.js");
  const socket = read("socket-io/index.js");
  const config = read("utils/config.js");
  assert.match(app, /origin: getAllowedOrigins\(\)/);
  assert.match(socket, /origin: getAllowedOrigins\(\)/);
  assert.match(config, /CORS_ORIGINS/);
  assert.doesNotMatch(app, /app\.use\(cors\(\)\)/);
});

test("security configuration rejects default JWT and Gemini placeholders", () => {
  const config = read("utils/config.js");
  assert.match(config, /replace_with_a_long_random_secret/);
  assert.match(config, /your_gemini_api_key/);
  assert.match(config, /JWT_SECRET must be configured/);
});

test("authentication and socket logs do not expose JWT payloads or user identity", () => {
  const auth = read("middleware/authentication.js");
  const socket = read("socket-io/middleware.js");
  const socketIndex = read("socket-io/index.js");
  const users = read("controller/userController.js");
  assert.doesNotMatch(auth, /console\.log\(err\)/);
  assert.doesNotMatch(socket, /decoded\.userId/);
  assert.doesNotMatch(socketIndex, /console\.log\([\s\S]*socket\.user\.userId/);
  assert.doesNotMatch(socketIndex, /console\.log\([\s\S]*socket\.user\.name/);
  assert.doesNotMatch(users, /console\.log\("User created successfully:/);
  assert.doesNotMatch(users, /console\.log\("Login successful for user:/);
});
