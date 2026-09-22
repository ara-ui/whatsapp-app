const renderedMessageIds = new Set();
const renderedMessages = new Map();

const pendingStatusUpdates = new Map();

function renderMessages(messages, container) {
    container.innerHTML = "";

    renderedMessageIds.clear();
    renderedMessages.clear();
    pendingStatusUpdates.clear();

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

    const div = createMessageElement(msg);
    container.appendChild(div);

    if (pendingStatusUpdates.has(messageId)) {

        const pendingStatus =
            pendingStatusUpdates.get(messageId);

        pendingStatusUpdates.delete(messageId);

        updateMessageStatus(messageId, pendingStatus);
    }
}


function prependMessages(messages, container) {
    if (!Array.isArray(messages) || messages.length === 0) {
        return;
    }

    // The API returns older messages in chronological order. Insert them
    // before the current first message so the visible history stays ordered.
    const firstMessage = container.querySelector(".message");
    const fragment = document.createDocumentFragment();

    messages.forEach(message => {
        if (!message || !message.id) {
            return;
        }

        const messageId = String(message.id);

        if (renderedMessageIds.has(messageId)) {
            return;
        }

        renderedMessageIds.add(messageId);
        renderedMessages.set(messageId, message);

        const div = createMessageElement(message);
        fragment.appendChild(div);
    });

    if (firstMessage) {
        container.insertBefore(fragment, firstMessage);
    } else {
        container.appendChild(fragment);
    }

    messages.forEach(message => {
        const messageId = String(message && message.id);
        if (pendingStatusUpdates.has(messageId)) {
            const pendingStatus = pendingStatusUpdates.get(messageId);
            pendingStatusUpdates.delete(messageId);
            updateMessageStatus(messageId, pendingStatus);
        }
    });
}

function createMessageElement(msg) {
    const div = document.createElement("div");
    const messageId = String(msg.id);

    const time = new Date(msg.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });

    const isMine =
        Number(msg.senderId) === Number(currentUser.userId);

    div.className =
        "message " + (isMine ? "mine" : "other");

    div.dataset.messageId = messageId;

    const senderLabel = !isMine
        ? `<div class="sender">
                ${escapeHtml(msg.senderName || "Unknown")}
           </div>`
        : "";

    div.innerHTML = `
        ${senderLabel}
        ${renderMessageBody(msg)}
        <div class="time">
            <span>${time}</span>
            ${
                isMine
                    ? `
                        <span
                            class="message-status"
                            data-status-for="${messageId}"
                        >
                            ${renderStatus(msg.status || "sent")}
                        </span>
                    `
                    : ""
            }
        </div>
    `;

    return div;
}


// MESSAGE STATUS

function renderStatus(status) {

    if (status === "read") {
        return `
            <span
                class="status-ticks status-read"
                title="Read"
            >✓✓</span>
        `;
    }

    if (status === "delivered") {
        return `
            <span
                class="status-ticks status-delivered"
                title="Delivered"
            >✓✓</span>
        `;
    }

    return `
        <span
            class="status-ticks status-sent"
            title="Sent"
        >✓</span>
    `;
}


function updateMessageStatus(messageId, status) {

    const id = String(messageId);

    console.log(
        "Updating UI status:",
        id,
        status
    );

    const message =
        renderedMessages.get(id);

    if (message) {
        message.status = status;
    }

    const statusElement =
        document.querySelector(
            `.message[data-message-id="${id}"] .message-status`
        );

    if (!statusElement) {

         console.log(
            "Status element not found for message (buffering):",
            id
        );

        pendingStatusUpdates.set(id, status);

        return;
    }

    statusElement.innerHTML =
        renderStatus(status);

    console.log(
        "UI status updated:",
        id,
        status
    );
}

// MESSAGE BODY

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
            <div
                class="message-video-wrapper"
                data-media-action="view"
            >
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
            <div
                class="message-media-file"
                data-media-action="view"
            >
                📄 ${escapeHtml(
                    msg.fileName || "Open file"
                )}
            </div>
        `;
    }

    return `
        <div class="text">
            ${escapeHtml(msg.content || "")}
        </div>
    `;
}


function findMessageById(messageId) {
    return renderedMessages.get(
        String(messageId)
    );
}


function hasRenderedMessage(messageId) {
    return renderedMessageIds.has(
        String(messageId)
    );
}
function removeRenderedMessage(messageId) {
    const id = String(messageId);
    const element = document.querySelector(
        `.message[data-message-id="${id}"]`
    );

    if (element) {
        element.remove();
    }

    renderedMessageIds.delete(id);
    renderedMessages.delete(id);
    pendingStatusUpdates.delete(id);
}
