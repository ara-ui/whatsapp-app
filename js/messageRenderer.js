const renderedMessageIds = new Set();
const renderedMessages = new Map();

function renderMessages(messages, container) {
    container.innerHTML = "";

    renderedMessageIds.clear();
    renderedMessages.clear();

    if (messages.length === 0) {
        container.innerHTML =
            `<div class="empty-state">No messages yet. Say hello!</div>`;
        return;
    }

    messages.forEach(message => {
        appendMessage(message, container);
    });
}

function appendMessage(msg, container) {
    if (!msg || !msg.id) {
        return;
    }

    const messageId = String(msg.id);

    if (renderedMessageIds.has(messageId)) {
        return;
    }

    renderedMessageIds.add(messageId);
    renderedMessages.set(messageId, msg);

    const div = document.createElement("div");

    const time = new Date(msg.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });

    const isMine = msg.senderId === currentUser.userId;

    div.className = "message " + (isMine ? "mine" : "other");
    div.dataset.messageId = messageId;

    const senderLabel = !isMine
        ? `<div class="sender">${escapeHtml(msg.senderName || "Unknown")}</div>`
        : "";

    div.innerHTML = `
        ${senderLabel}
        ${renderMessageBody(msg)}
        <div class="time">${time}</div>
    `;

    container.appendChild(div);
}

function renderMessageBody(msg) {
    if (msg.messageType === "image") {
        return `
            <img
                class="message-media-image"
                src="${escapeHtml(msg.mediaUrl)}"
                alt="${escapeHtml(msg.fileName || "image")}"
                data-media-action="view"
            >
        `;
    }

    if (msg.messageType === "video") {
        return `
            <div class="message-video-wrapper" data-media-action="view">
                <video
                    class="message-media-video"
                    muted
                    preload="metadata"
                >
                    <source
                        src="${escapeHtml(msg.mediaUrl)}"
                        type="${escapeHtml(msg.mimeType || "")}"
                    >
                </video>

                <div class="video-view-overlay">
                    ▶
                </div>
            </div>
        `;
    }

    if (msg.messageType === "file") {
        return `
            <a
                class="message-media-file"
                href="${escapeHtml(msg.mediaUrl)}"
                target="_blank"
                rel="noopener noreferrer"
            >
                📄 ${escapeHtml(msg.fileName || "Open file")}
            </a>
        `;
    }

    return `<div class="text">${escapeHtml(msg.content || "")}</div>`;
}

function findMessageById(messageId) {
    return renderedMessages.get(String(messageId));
}

function hasRenderedMessage(messageId) {
    return renderedMessageIds.has(String(messageId));
}