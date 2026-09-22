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

const chatWindowActionsBtn =
    document.getElementById("chatWindowActionsBtn");

const chatWindowActionsMenu =
    document.getElementById("chatWindowActionsMenu");

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
            ? (room.purpose || "Connectly Space")
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




function closeChatActionsMenu() {
    if (chatWindowActionsMenu) chatWindowActionsMenu.classList.add("hidden");
}

function closeCurrentRoom() {
    resetTypingState();
    currentRoom = null;
    chatWindowActive.classList.add("hidden");
    chatWindowEmptyState.classList.remove("hidden");
    chatWindowPanel.classList.remove("mobile-visible");
    closeChatActionsMenu();
}

function renderChatActionsMenu() {
    if (!chatWindowActionsMenu || !currentRoom) return;
    chatWindowActionsMenu.innerHTML = "";

    if (currentRoom.type === "personal") {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "chat-action-menu-item danger";
        button.textContent = "Disconnect";
        button.addEventListener("click", async () => {
            closeChatActionsMenu();
            const name = currentRoom.name || "this person";
            if (!window.confirm(`Disconnect from ${name}? Your existing conversation will remain, but new private messages will be blocked until you reconnect.`)) return;
            try {
                await axios.delete(`${BASE_URL}/connections/user/${currentRoom.otherUserId}`, { headers: { Authorization: token } });
                if (typeof showConnectionToast === "function") showConnectionToast(`Disconnected from ${name}.`);
                await loadRooms();
                closeCurrentRoom();
            } catch (err) {
                if (typeof showConnectionToast === "function") showConnectionToast(err.response?.data?.message || "Couldn't disconnect.");
            }
        });
        chatWindowActionsMenu.appendChild(button);
    } else if (currentRoom.type === "group") {
        const infoButton = document.createElement("button");
        infoButton.type = "button";
        infoButton.className = "chat-action-menu-item";
        infoButton.textContent = "Space info";
        infoButton.addEventListener("click", async () => {
            closeChatActionsMenu();
            await showSpaceInfo(currentRoom.id);
        });
        chatWindowActionsMenu.appendChild(infoButton);

        const membersButton = document.createElement("button");
        membersButton.type = "button";
        membersButton.className = "chat-action-menu-item";
        membersButton.textContent = "Members";
        membersButton.addEventListener("click", async () => {
            closeChatActionsMenu();
            await showSpaceInfo(currentRoom.id);
        });
        chatWindowActionsMenu.appendChild(membersButton);

        const button = document.createElement("button");
        button.type = "button";
        button.className = "chat-action-menu-item danger";
        button.textContent = "Leave Space";
        button.addEventListener("click", async () => {
            closeChatActionsMenu();
            const name = currentRoom.name || "this Space";
            if (!window.confirm(`Leave ${name}? You will no longer see this Space or its information unless you are invited and join again.`)) return;
            try {
                await axios.delete(`${BASE_URL}/rooms/${currentRoom.id}/leave`, { headers: { Authorization: token } });
                if (typeof showConnectionToast === "function") showConnectionToast(`You left ${name}.`);
                closeCurrentRoom();
                await loadRooms();
            } catch (err) {
                if (typeof showConnectionToast === "function") showConnectionToast(err.response?.data?.message || "Couldn't leave the Space.");
            }
        });
        chatWindowActionsMenu.appendChild(button);
    } else {
        const info = document.createElement("div");
        info.className = "chat-action-menu-info";
        info.textContent = "Community Chat is shared with everyone.";
        chatWindowActionsMenu.appendChild(info);
    }
}

chatWindowActionsBtn?.addEventListener("click", event => {
    event.stopPropagation();
    if (!currentRoom || !chatWindowActionsMenu) return;
    renderChatActionsMenu();
    chatWindowActionsMenu.classList.toggle("hidden");
});

document.addEventListener("click", event => {
    if (chatWindowActionsMenu && !event.target.closest(".chat-window-actions")) closeChatActionsMenu();
});

socket.on("space:left", ({ roomId }) => {
    if (currentRoom && Number(currentRoom.id) === Number(roomId)) {
        closeCurrentRoom();
        if (typeof loadRooms === "function") loadRooms();
    }
});



async function showSpaceInfo(roomId) {
    try {
        const response = await axios.get(`${BASE_URL}/rooms/spaces/${roomId}/info`, {
            headers: { Authorization: token }
        });
        const space = response.data.space;

        let modal = document.getElementById("spaceInfoModal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "spaceInfoModal";
            modal.className = "space-info-modal-overlay";
            document.body.appendChild(modal);
        }

        const members = (space.members || []).map(member => `
            <div class="space-info-member">
                <span class="space-info-avatar">👤</span>
                <div><strong>${escapeHtml(member.name)}</strong><small>${escapeHtml(member.email)}</small></div>
            </div>
        `).join("") || `<div class="empty-state">No members.</div>`;

        const pending = (space.pendingInvitations || []).map(invite => `
            <div class="space-info-member">
                <span class="space-info-avatar">✦</span>
                <div><strong>${escapeHtml(invite.invitee.name)}</strong><small>${escapeHtml(invite.invitee.email)} · Pending</small></div>
            </div>
        `).join("");

        modal.innerHTML = `
            <div class="space-info-modal" role="dialog" aria-modal="true" aria-label="Space information">
                <div class="space-info-header">
                    <div>
                        <h3>${escapeHtml(space.name)}</h3>
                        <p>${escapeHtml(space.purpose || "Connectly Space")}</p>
                    </div>
                    <button type="button" class="modal-close-btn space-info-close" aria-label="Close">×</button>
                </div>
                <div class="space-info-section">
                    <h4>Members (${space.members?.length || 0})</h4>
                    <div class="space-info-list">${members}</div>
                </div>
                ${space.isCreator && pending ? `
                    <div class="space-info-section">
                        <h4>Pending invitations</h4>
                        <div class="space-info-list">${pending}</div>
                    </div>
                ` : ""}
            </div>
        `;
        modal.classList.add("visible");

        const close = () => {
            modal.classList.remove("visible");
            window.setTimeout(() => modal.remove(), 160);
        };
        modal.querySelector(".space-info-close").addEventListener("click", close);
        modal.addEventListener("click", event => {
            if (event.target === modal) close();
        }, { once: true });
    } catch (err) {
        if (typeof showConnectionToast === "function") {
            showConnectionToast(err.response?.data?.message || "Couldn't load Space information.");
        }
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