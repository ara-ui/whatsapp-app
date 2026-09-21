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
