

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

let pendingFile = null;
let pendingPreviewUrl = null;
const renderedMessageIds = new Set();

const attachmentPreview = document.createElement("div");

attachmentPreview.id = "attachmentPreview";
attachmentPreview.className = "attachment-preview hidden";

attachmentPreview.innerHTML = `
    <div class="attachment-preview-content">
        <div id="attachmentPreviewBody"></div>

        <div class="attachment-preview-info">
            <span id="attachmentPreviewName"></span>

            <div class="attachment-preview-actions">
                <button type="button" id="cancelAttachmentBtn">
                    Cancel
                </button>

                <button type="button" id="sendAttachmentBtn">
                    Send
                </button>
            </div>
        </div>
    </div>
`;

const previewBody = attachmentPreview.querySelector("#attachmentPreviewBody");
const previewName = attachmentPreview.querySelector("#attachmentPreviewName");
const cancelAttachmentBtn =
    attachmentPreview.querySelector("#cancelAttachmentBtn");
const sendAttachmentBtn =
    attachmentPreview.querySelector("#sendAttachmentBtn");

document.body.appendChild(attachmentPreview);

function clearPendingAttachment() {
    pendingFile = null;

    if (pendingPreviewUrl) {
        URL.revokeObjectURL(pendingPreviewUrl);
        pendingPreviewUrl = null;
    }

    previewBody.innerHTML = "";
    previewName.textContent = "";
    mediaFileInput.value = "";

    attachmentPreview.classList.add("hidden");
}

async function openRoom(room) {

    clearPendingAttachment();
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


function renderMessages(messages) {
    messagesContainer.innerHTML = "";
    renderedMessageIds.clear();

    if (messages.length === 0) {
        messagesContainer.innerHTML =
            `<div class="empty-state">No messages yet. Say hello!</div>`;
        return;
    }

    messages.forEach(appendMessage);
    scrollToBottom();
}


function appendMessage(msg) {
    if (!msg || !msg.id) {
        return;
    }

    const messageId = String(msg.id);

    if (renderedMessageIds.has(messageId)) {
        return;
    }

    renderedMessageIds.add(messageId);

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



attachBtn.addEventListener("click", () => {
    if (!currentRoom) {
        alert("Open a conversation first");
        return;
    }

    mediaFileInput.click();
});

mediaFileInput.addEventListener("change", () => {
    const file = mediaFileInput.files[0];

    if (!file || !currentRoom) {
        return;
    }

    pendingFile = file;

    if (pendingPreviewUrl) {
        URL.revokeObjectURL(pendingPreviewUrl);
        pendingPreviewUrl = null;
    }

    previewBody.innerHTML = "";
    previewName.textContent = file.name;

    if (file.type.startsWith("image/")) {
        pendingPreviewUrl = URL.createObjectURL(file);

        const img = document.createElement("img");
        img.src = pendingPreviewUrl;
        img.alt = file.name;

        previewBody.appendChild(img);
    }

    else if (file.type.startsWith("video/")) {
        pendingPreviewUrl = URL.createObjectURL(file);

        const video = document.createElement("video");
        video.src = pendingPreviewUrl;
        video.controls = true;

        previewBody.appendChild(video);
    }

    else {
        previewBody.innerHTML = `
            <div class="attachment-file-icon">📄</div>
        `;
    }

    attachmentPreview.classList.remove("hidden");
});

cancelAttachmentBtn.addEventListener("click", () => {
    clearPendingAttachment();
});

async function uploadSelectedFile() {
    if (!pendingFile || !currentRoom) {
        return;
    }
    if (sendAttachmentBtn.disabled) {
    return;
    }

    const file = pendingFile;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("roomId", currentRoom.id);

    sendAttachmentBtn.disabled = true;
    cancelAttachmentBtn.disabled = true;

    sendAttachmentBtn.textContent = "Uploading...";

    try {
        const response = await axios.post(
            `${BASE_URL}/media/upload`,
            formData,
            {
                headers: {
                    Authorization: token
                }
            }
        );

        const uploadedMessage = response.data.message;

        if (uploadedMessage) {
            appendMessage(uploadedMessage);
            scrollToBottom();
        }
        
        clearPendingAttachment();


    } catch (err) {
        console.log(err);

        if (
            err.response &&
            err.response.data &&
            err.response.data.message
        ) {
            alert(err.response.data.message);
        } else {
            alert("Failed to upload file");
        }

    } finally {
        sendAttachmentBtn.disabled = false;
        cancelAttachmentBtn.disabled = false;
        sendAttachmentBtn.textContent = "Send";
    }
}

// ADD THIS
sendAttachmentBtn.addEventListener("click", async () => {
    await uploadSelectedFile();
});

socket.on("room:message", (msg) => {
    if (!currentRoom || msg.roomId !== currentRoom.id) {
        return;
    }

    const beforeCount = renderedMessageIds.size;

    appendMessage(msg);

    if (renderedMessageIds.size === beforeCount) {
        return;
    }

    const emptyEl = messagesContainer.querySelector(".empty-state");
    if (emptyEl) {
        emptyEl.remove();
    }

    scrollToBottom();
});