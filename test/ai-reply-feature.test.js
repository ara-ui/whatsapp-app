const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Predictive typing is removed from the frontend', () => {
    const loader = read('js/componentsLoader.js');
    const aiComponent = read('public/components/aiSuggestions.html');
    assert.doesNotMatch(loader, /wordSuggestions\.js/);
    assert.doesNotMatch(aiComponent, /predictiveSuggestions/);
    assert.equal(fs.existsSync(path.join(root, 'js/wordSuggestions.js')), false);
});

test('Predictive AI endpoint and limiter are removed', () => {
    const routes = read('routes/aiRoutes.js');
    const limiter = read('middleware/aiRateLimiter.js');
    const controller = read('controller/aiController.js');
    const service = read('services/aiService.js');
    assert.doesNotMatch(routes, /predictive/);
    assert.doesNotMatch(limiter, /predictive/);
    assert.doesNotMatch(controller, /predictive/);
    assert.doesNotMatch(service, /predictive/);
});

test('Smart replies use only the latest three messages', () => {
    const controller = read('controller/aiController.js');
    const client = read('js/aiSuggestions.js');
    const service = read('services/aiService.js');
    assert.match(controller, /MAX_RECENT_MESSAGES = 3/);
    assert.match(client, /slice\(-3\)/);
    assert.match(service, /slice\(-3\)/);
});

test('Smart replies render four contextual suggestions and have a timeout', () => {
    const client = read('js/aiSuggestions.js');
    const service = read('services/aiService.js');
    assert.match(client, /slice\(0, 4\)/);
    assert.match(client, /timeout: 8000/);
    assert.match(service, /Generate exactly 4 short smart replies/);
});

test('Reply metadata is persisted on live and archived messages', () => {
    const message = read('models/Message.js');
    const archived = read('models/ArchivedMessage.js');
    const archiveJob = read('jobs/archiveMessage.js');
    assert.match(message, /replyToMessageId/);
    assert.match(archived, /replyToMessageId/);
    assert.match(archiveJob, /replyToMessageId: message\.replyToMessageId/);
});

test('Text messages validate reply targets against the same room', () => {
    const socket = read('socket-io/handlers/room.js');
    assert.match(socket, /getAuthorizedReplyTarget/);
    assert.match(socket, /Reply target not found in this room/);
    assert.match(socket, /replyToMessageId: replyTarget \? replyTarget\.id : null/);
});

test('Media messages preserve reply metadata', () => {
    const media = read('controller/mediaController.js');
    assert.match(media, /req\.body\.replyToMessageId/);
    assert.match(media, /replyToMessageId: replyTarget \? replyTarget\.id : null/);
    assert.match(media, /replyToMessage:/);
});

test('Message history returns reply previews', () => {
    const controller = read('controller/messageController.js');
    assert.match(controller, /replyPreviewMap/);
    assert.match(controller, /replyToMessageId: m\.replyToMessageId/);
    assert.match(controller, /replyToMessage:/);
});

test('Every message exposes a visible Reply action', () => {
    const renderer = read('js/messageRenderer.js');
    const chatWindow = read('js/chatWindow.js');
    assert.match(renderer, /class="message-reply-btn"/);
    assert.match(renderer, /startReplyToMessage/);
    assert.match(chatWindow, /function startReplyToMessage/);
    assert.match(chatWindow, /Replying to/);
});

test('Reply selection is sent with the next text or media message', () => {
    const chatMessages = read('js/chatMessages.js');
    const media = read('js/mediaPreview.js');
    assert.match(chatMessages, /replyToMessageId: typeof getReplyToMessageId/);
    assert.match(media, /formData\.append\("replyToMessageId", replyId\)/);
});
