const chatWindowPanel =
    document.getElementById("chatWindowPanel");

const chatWindowEmptyState =
    document.getElementById("chatWindowEmptyState");

const chatWindowActive =
    document.getElementById("chatWindowActive");

const chatWindowAvatar =
    document.getElementById("chatWindowAvatar");

const chatWindowTitle =
    document.getElementById("chatWindowTitle");

const chatWindowSubtitle =
    document.getElementById("chatWindowSubtitle");

const messagesContainer =
    document.getElementById("messages");

const messageInput =
    document.getElementById("messageInput");

const sendBtn =
    document.getElementById("sendBtn");

const backBtn =
    document.getElementById("backBtn");

const attachBtn =
    document.getElementById("attachBtn");

const mediaFileInput =
    document.getElementById("mediaFileInput");


// ROOM

async function openRoom(room) {

    clearPendingAttachment();

    resetTypingState();
    
    currentRoom = room;

    requestPresenceStatus();

    chatWindowEmptyState.classList.add("hidden");
    chatWindowActive.classList.remove("hidden");
    chatWindowPanel.classList.add("mobile-visible");

    chatWindowAvatar.textContent =
        roomIcon(room.type);

    chatWindowTitle.textContent =
        room.name || "Unnamed";

    chatWindowSubtitle.textContent =
    room.type === "community"
        ? "Everyone can chat here"
        : room.type === "group"
            ? "Group chat"
            : "Checking status...";

    messagesContainer.innerHTML =
        `<div class="empty-state">
            Loading messages…
        </div>`;

    socket.emit(
        "room:join",
        room.id
    );

    await loadMessageHistory(room.id);
 
    if (typeof loadRooms === "function") {
        loadRooms();
    }
}




// MOBILE BACK BUTTON


backBtn.addEventListener(
    "click",
    () => {

        chatWindowPanel.classList.remove(
            "mobile-visible"
        );
    }
);

// MESSAGE ACTIONS / MEDIA VIEWER

let messageContextMenu = null;
let messageLongPressTimer = null;
let messageLongPressTarget = null;

function hideMessageContextMenu() {
    if (messageContextMenu) {
        messageContextMenu.remove();
        messageContextMenu = null;
    }
}

function showMessageContextMenu(messageElement, x, y) {
    hideMessageContextMenu();
    const messageId = messageElement.dataset.messageId;
    const message = findMessageById(messageId);
    if (!message) return;

    const isMine = Number(message.senderId) === Number(currentUser.userId);
    const menu = document.createElement("div");
    menu.className = "message-context-menu";
    menu.setAttribute("role", "menu");

    const deleteForMeButton = document.createElement("button");
    deleteForMeButton.type = "button";
    deleteForMeButton.className = "message-context-item";
    deleteForMeButton.textContent = "Delete for me";
    deleteForMeButton.addEventListener("click", async () => {
        hideMessageContextMenu();
        await deleteMessageForMe(messageId);
    });
    menu.appendChild(deleteForMeButton);

    if (isMine) {
        const deleteForEveryoneButton = document.createElement("button");
        deleteForEveryoneButton.type = "button";
        deleteForEveryoneButton.className = "message-context-item message-context-danger";
        deleteForEveryoneButton.textContent = "Delete for everyone";
        deleteForEveryoneButton.addEventListener("click", async () => {
            hideMessageContextMenu();
            await deleteMessageForEveryone(messageId);
        });
        menu.appendChild(deleteForEveryoneButton);
    }

    document.body.appendChild(menu);
    messageContextMenu = menu;
    const margin = 8;
    const rect = menu.getBoundingClientRect();
    const left = Math.min(x, window.innerWidth - rect.width - margin);
    const top = Math.min(y, window.innerHeight - rect.height - margin);
    menu.style.left = `${Math.max(margin, left)}px`;
    menu.style.top = `${Math.max(margin, top)}px`;
}

messagesContainer.addEventListener("contextmenu", event => {
    const messageElement = event.target.closest(".message");
    if (!messageElement || !messagesContainer.contains(messageElement)) return;
    event.preventDefault();
    showMessageContextMenu(messageElement, event.clientX, event.clientY);
});

messagesContainer.addEventListener("click", event => {
    const mediaElement = event.target.closest("[data-media-action='view']");
    if (!mediaElement) return;
    const messageElement = mediaElement.closest(".message");
    if (!messageElement) return;
    const message = findMessageById(messageElement.dataset.messageId);
    if (message) openMediaViewer(message);
});

// Long press provides the same action menu on touch devices.
messagesContainer.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse") return;
    const messageElement = event.target.closest(".message");
    if (!messageElement) return;
    messageLongPressTarget = messageElement;
    messageLongPressTimer = window.setTimeout(() => {
        showMessageContextMenu(messageLongPressTarget, event.clientX, event.clientY);
        messageLongPressTarget = null;
    }, 550);
});

function cancelMessageLongPress() {
    if (messageLongPressTimer) window.clearTimeout(messageLongPressTimer);
    messageLongPressTimer = null;
    messageLongPressTarget = null;
}

messagesContainer.addEventListener("pointerup", cancelMessageLongPress);
messagesContainer.addEventListener("pointercancel", cancelMessageLongPress);
messagesContainer.addEventListener("pointerleave", cancelMessageLongPress);

document.addEventListener("click", event => {
    if (messageContextMenu && !event.target.closest(".message-context-menu")) hideMessageContextMenu();
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape") hideMessageContextMenu();
});
window.addEventListener("resize", hideMessageContextMenu);
messagesContainer.addEventListener("scroll", hideMessageContextMenu);

// INITIALIZE MEDIA PREVIEW

initializeMediaPreview();