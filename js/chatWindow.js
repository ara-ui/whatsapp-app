
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

let currentRoom = null;

// Opening a conversation

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

    div.innerHTML = `
        ${!isMine ? `<div class="sender">${escapeHtml(msg.senderName || "Unknown")}</div>` : ""}
        <div class="text">${escapeHtml(msg.content)}</div>
        <div class="time">${time}</div>
    `;

    messagesContainer.appendChild(div);
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Sending messages

function sendCurrentMessage() {
    const content = messageInput.value.trim();

    if (!content) return;

    if (!currentRoom) {
        alert("Open a conversation first");
        return;
    }

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

// Real-time incoming messages

socket.on("room:message", (msg) => {
    if (!currentRoom || msg.roomId !== currentRoom.id) {
        return;
    }

    const emptyEl = messagesContainer.querySelector(".empty-state");
    if (emptyEl) emptyEl.remove();

    appendMessage(msg);
    scrollToBottom();
});
