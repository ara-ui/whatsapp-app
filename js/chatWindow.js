// ============================================================
// chatWindow.js
// ONE reusable conversation view used for personal, group, AND
// community chats alike — there is no separate "personal" or
// "group" chat window, just this one driven by whichever room
// object openRoom() was called with.
//
// Depends on globals from socketClient.js (BASE_URL, token,
// currentUser, socket) and helpers from home.js (roomIcon,
// escapeHtml).
// ============================================================

const chatWindowPanel = document.getElementById("chatWindowPanel");
const chatWindowEmptyState = document.getElementById("chatWindowEmptyState");
const chatWindowActive = document.getElementById("chatWindowActive");

const chatWindowAvatar = document.getElementById("chatWindowAvatar");
const chatWindowTitle = document.getElementById("chatWindowTitle");
const chatWindowSubtitle = document.getElementById("chatWindowSubtitle");

const messagesContainer = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const backBtn = document.getElementById("backBtn");

const attachBtn = document.getElementById("attachBtn");
const mediaFileInput = document.getElementById("mediaFileInput");

let currentRoom = null;


// ---------------------------------------------------------
// Opening a conversation
// ---------------------------------------------------------

async function openRoom(room) {
    currentRoom = room;

    chatWindowEmptyState.classList.add("hidden");
    chatWindowActive.classList.remove("hidden");
    chatWindowPanel.classList.add("mobile-visible");

    chatWindowAvatar.textContent = roomIcon(room.type);
    chatWindowTitle.textContent = room.name || "Unnamed";

    chatWindowSubtitle.textContent =
        room.type === "community" ? "Everyone can chat here" :
        room.type === "group" ? "Group chat" :
        "";

    messagesContainer.innerHTML = `<div class="empty-state">Loading messages…</div>`;

    // Ask the server to authorize + join this room's socket channel.
    // The server independently re-verifies membership — this call
    // can silently fail (via a "room:error" event) if it doesn't.
    socket.emit("room:join", room.id);

    await loadMessageHistory(room.id);
}

async function loadMessageHistory(roomId) {
    try {
        const response = await axios.get(
            `${BASE_URL}/rooms/${roomId}/messages`,
            { headers: { Authorization: token } }
        );

        renderMessages(response.data.messages || []);

    } catch (err) {
        console.log(err);
        messagesContainer.innerHTML = `<div class="empty-state error">Couldn't load message history.</div>`;
    }
}


// ---------------------------------------------------------
// Rendering messages
// ---------------------------------------------------------

function renderMessages(messages) {
    messagesContainer.innerHTML = "";

    if (messages.length === 0) {
        messagesContainer.innerHTML = `<div class="empty-state">No messages yet. Say hello!</div>`;
        return;
    }

    messages.forEach(appendMessage);
    scrollToBottom();
}

function appendMessage(msg) {
    const div = document.createElement("div");

    const time = new Date(msg.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });

    const isMine = msg.senderId === currentUser.userId;

    div.className = "message " + (isMine ? "mine" : "other");

    const senderLabel = !isMine
        ? `<div class="sender">${escapeHtml(msg.senderName || "Unknown")}</div>`
        : "";

    div.innerHTML = `
        ${senderLabel}
        ${renderMessageBody(msg)}
        <div class="time">${time}</div>
    `;

    messagesContainer.appendChild(div);
}

// Renders the content portion of a message differently depending on
// messageType. "text" (or missing/unknown types, e.g. very old rows)
// falls back to the original plain-text rendering so nothing existing
// breaks.
function renderMessageBody(msg) {
    if (msg.messageType === "image") {
        return `<img class="message-media-image" src="${escapeHtml(msg.mediaUrl)}" alt="${escapeHtml(msg.fileName || "image")}">`;
    }

    if (msg.messageType === "video") {
        return `
            <video class="message-media-video" controls>
                <source src="${escapeHtml(msg.mediaUrl)}" type="${escapeHtml(msg.mimeType || "")}">
            </video>
        `;
    }

    if (msg.messageType === "file") {
        return `
            <a class="message-media-file" href="${escapeHtml(msg.mediaUrl)}" target="_blank" rel="noopener noreferrer">
                📄 ${escapeHtml(msg.fileName || "Download file")}
            </a>
        `;
    }

    return `<div class="text">${escapeHtml(msg.content)}</div>`;
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}


// ---------------------------------------------------------
// Sending messages
// ---------------------------------------------------------

function sendCurrentMessage() {
    const content = messageInput.value.trim();

    if (!content) return;

    if (!currentRoom) {
        alert("Open a conversation first");
        return;
    }

    // We do NOT optimistically render this locally. We wait for the
    // server's "room:message" broadcast (which includes us, since we
    // joined the room) so sender and receivers always render an
    // identical, server-confirmed message — no local/duplicate drift.
    socket.emit("room:send", {
        roomId: currentRoom.id,
        content: content
    });

    messageInput.value = "";
}

sendBtn.addEventListener("click", sendCurrentMessage);

messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        sendCurrentMessage();
    }
});

backBtn.addEventListener("click", () => {
    chatWindowPanel.classList.remove("mobile-visible");
});


// ---------------------------------------------------------
// Sending media (images / videos / files)
// ---------------------------------------------------------

attachBtn.addEventListener("click", () => {
    if (!currentRoom) {
        alert("Open a conversation first");
        return;
    }

    mediaFileInput.click();
});

mediaFileInput.addEventListener("change", async () => {
    const file = mediaFileInput.files[0];

    // Always clear the input so selecting the SAME file again still
    // fires a "change" event next time.
    mediaFileInput.value = "";

    if (!file || !currentRoom) {
        return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("roomId", currentRoom.id);

    attachBtn.disabled = true;
    attachBtn.textContent = "⏳";

    try {
        // We do NOT render anything from this response. Just like
        // sendCurrentMessage(), we wait for the server's "room:message"
        // broadcast (which reaches us too, since we're joined to this
        // room) so every client — including the uploader — renders an
        // identical, server-confirmed message with no duplication.
        await axios.post(
            `${BASE_URL}/media/upload`,
            formData,
            { headers: { Authorization: token } }
        );

    } catch (err) {
        console.log(err);

        if (err.response && err.response.data && err.response.data.message) {
            alert(err.response.data.message);
        } else {
            alert("Failed to upload file");
        }

    } finally {
        attachBtn.disabled = false;
        attachBtn.textContent = "📎";
    }
});


// ---------------------------------------------------------
// Real-time incoming messages
// ---------------------------------------------------------

socket.on("room:message", (msg) => {
    if (!currentRoom || msg.roomId !== currentRoom.id) {
        return;
    }

    const emptyEl = messagesContainer.querySelector(".empty-state");
    if (emptyEl) emptyEl.remove();

    appendMessage(msg);
    scrollToBottom();
});
