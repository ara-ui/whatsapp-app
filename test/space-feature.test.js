const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Space invitations have a dedicated persistent model', () => {
    const model = read('models/SpaceInvitation.js');
    assert.match(model, /roomId/);
    assert.match(model, /inviterId/);
    assert.match(model, /inviteeId/);
    assert.match(model, /pending.*accepted.*rejected/s);
});

test('Space creation uses invite-first membership flow', () => {
    const controller = read('controller/spaceController.js');
    assert.match(controller, /exports\.createSpace/);
    assert.match(controller, /SpaceInvitation\.create/);
    assert.match(controller, /RoomMember\.create\(\{ roomId: room\.id, userId: inviterId \}/);
});

test('Space invite routes expose accept and reject actions', () => {
    const routes = read('routes/roomRoutes.js');
    assert.match(routes, /\/spaces\/invitations/);
    assert.match(routes, /accept/);
    assert.match(routes, /reject/);
});

test('Space invitations do not grant membership before acceptance', () => {
    const controller = read('controller/spaceController.js');
    const createBlock = controller.slice(controller.indexOf('exports.createSpace'), controller.indexOf('exports.getInvitations'));
    assert.doesNotMatch(createBlock, /RoomMember\.create\(\{ roomId: room\.id, userId: invitee/);
    assert.match(createBlock, /SpaceInvitation\.create/);
});

test('Leaving a Space removes membership and socket room access', () => {
    const controller = read('controller/spaceController.js');
    assert.match(controller, /exports\.leaveSpace/);
    assert.match(controller, /membership\.destroy/);
    assert.match(controller, /socketsLeave\(String\(roomId\)\)/);
});

test('Private chat has a direct disconnect action in the chat menu', () => {
    const header = read('public/components/chatWindowHeader.html');
    const script = read('js/chatWindow.js');
    assert.match(header, /chatWindowActionsBtn/);
    assert.match(script, /connections\/user\/\$\{currentRoom\.otherUserId\}/);
    assert.match(script, /Disconnect/);
});

test('Space chat has a Leave Space action in the chat menu', () => {
    const script = read('js/chatWindow.js');
    assert.match(script, /rooms\/\$\{currentRoom\.id\}\/leave/);
    assert.match(script, /Leave Space/);
});

test('Space creation UI supports both connected people and email invitations', () => {
    const modal = read('public/components/groupChatModal.html');
    const home = read('js/home.js');
    assert.match(modal, /spaceConnectedMembers/);
    assert.match(modal, /groupMembersInput/);
    assert.match(home, /memberUserIds/);
    assert.match(home, /memberEmails/);
});

test('Space invitations appear in the shared request badge', () => {
    const connections = read('js/connections.js');
    assert.match(connections, /rooms\/spaces\/invitations/);
    assert.match(connections, /incomingConnectionCount \+ invitations\.length/);
    assert.match(connections, /space:invitation/);
});

test('Sidebar icons are Connectly-specific: create Space first, connections second', () => {
    const header = read('public/components/sidebarHeader.html');
    assert.ok(header.indexOf('id="newGroupBtn"') < header.indexOf('id="newChatBtn"'));
    assert.match(header, /id="newGroupBtn"[\s\S]*?➕/);
    assert.match(header, /id="newChatBtn"[\s\S]*?👤/);
});

test('Space creator can view sent invitation status', () => {
    const controller = read('controller/spaceController.js');
    const routes = read('routes/roomRoutes.js');
    assert.match(controller, /exports\.getSentInvitations/);
    assert.match(controller, /status = 'left'/);
    assert.match(routes, /spaces\/invitations\/sent/);
});

test('Space info is restricted to current members and creator sees pending invites', () => {
    const controller = read('controller/spaceController.js');
    assert.match(controller, /exports\.getSpaceInfo/);
    assert.match(controller, /You are not a member of this Space/);
    assert.match(controller, /pendingInvitations/);
});

test('Space purpose is persisted separately from the existing Room record', () => {
    const model = read('models/SpaceDetails.js');
    const controller = read('controller/spaceController.js');
    assert.match(model, /purpose/);
    assert.match(controller, /SpaceDetails\.create/);
});

test('Leaving a Space removes it from the current UI session', () => {
    const script = read('js/chatWindow.js');
    assert.match(script, /You will no longer see this Space/);
    assert.match(script, /closeCurrentRoom\(\);/);
    assert.match(script, /loadRooms\(\);/);
});

test('Space UI exposes creator sent invitations and purpose', () => {
    const modal = read('public/components/connectionModal.html');
    const spaceModal = read('public/components/groupChatModal.html');
    const connections = read('js/connections.js');
    assert.match(modal, /sentSpaceInvitations/);
    assert.match(spaceModal, /groupPurposeInput/);
    assert.match(connections, /renderSentSpaceInvitations/);
});


test('Sent Space information is visible only while the inviter remains a member', () => {
    const controller = read('controller/spaceController.js');
    assert.match(controller, /where: \{ inviterId, roomId: \{ \[Op\.in\]: memberRoomIds \} \}/);
});
test('Sent Space invitations are grouped under one Space entry', () => {
    const connections = read('js/connections.js');
    assert.match(connections, /const spaces = new Map\(\)/);
    assert.match(connections, /spaces\.get\(key\)\.invitations\.push\(invitation\)/);
    assert.match(connections, /Members \/ invitations/);
    assert.match(connections, /sent-space-invite-row/);
});

