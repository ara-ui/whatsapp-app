
const chatListEl = document.getElementById("chatList");
const searchInput = document.getElementById("searchInput");

const newChatBtn = document.getElementById("newChatBtn");
const newGroupBtn = document.getElementById("newGroupBtn");

const menuBtn = document.getElementById("menuBtn");
const menuDropdown = document.getElementById("menuDropdown");
const logoutBtn = document.getElementById("logoutBtn");


const createGroupModal = document.getElementById("createGroupModal");
const groupNameInput = document.getElementById("groupNameInput");
const groupMembersInput = document.getElementById("groupMembersInput");
const groupPurposeInput = document.getElementById("groupPurposeInput");
const createGroupSubmitBtn = document.getElementById("createGroupSubmitBtn");
const createGroupCancelBtn = document.getElementById("createGroupCancelBtn");
const createGroupCancelBtnSecondary = document.getElementById("createGroupCancelBtnSecondary");
const spaceConnectedMembers = document.getElementById("spaceConnectedMembers");
const spaceCreateFeedback = document.getElementById("spaceCreateFeedback");

let allRooms = [];



// Small shared helpers (also used by chatWindow.js)

function roomIcon(type) {
    if (type === "personal") return "👤";
    if (type === "group") return "✦";
    return "🌍";
}

function formatTime(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatLastMessagePreview(lastMessage) {
    if (lastMessage.messageType === "image") return "📷 Photo";
    if (lastMessage.messageType === "video") return "🎥 Video";
    if (lastMessage.messageType === "file") return "📄 " + (lastMessage.fileName || "File");
    return lastMessage.content || "";
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str === null || str === undefined ? "" : String(str);
    return div.innerHTML;
}


// Loading + rendering the chat list


async function loadRooms() {
    try {
        const response = await axios.get(`${BASE_URL}/rooms`, {
            headers: { Authorization: token }
        });

        allRooms = response.data.rooms || [];

        applySearchFilter();

    } catch (err) {
        console.log(err);
        chatListEl.innerHTML = `<div class="empty-state error">Couldn't load your chats. Reload to try again.</div>`;
    }
}

function applySearchFilter() {
    const term = searchInput.value.trim().toLowerCase();

    if (!term) {
        renderRoomList(allRooms);
        return;
    }

    const filtered = allRooms.filter((r) =>
        (r.name || "").toLowerCase().includes(term)
    );

    renderRoomList(filtered);
}

function renderRoomList(rooms) {
    chatListEl.innerHTML = "";

    if (rooms.length === 0) {
        chatListEl.innerHTML = `<div class="empty-state">No chats yet — search to start one.</div>`;
        return;
    }

    rooms.forEach((room) => {

        const item = document.createElement("div");
        item.className = "chat-list-item";
        item.dataset.roomId = room.id;

        const unreadCount = room.unreadCount || 0;
        const hasUnread = unreadCount > 0;

        const preview = hasUnread
            ? (unreadCount === 1 ? "New message" : "New messages")
            : room.lastMessage
                ? (room.lastMessage.senderId === currentUser.userId ? "You: " : "") + formatLastMessagePreview(room.lastMessage)
                : "No messages yet";

        const time = room.lastMessage ? formatTime(room.lastMessage.createdAt) : "";

        item.className =
            "chat-list-item" + (hasUnread ? " has-unread" : "");

        item.innerHTML = `
            <div class="chat-avatar">${roomIcon(room.type)}</div>
            <div class="chat-info">
                <div class="chat-row-top">
                    <span class="chat-name">${escapeHtml(room.name || "Unnamed")}</span>
                    <span class="chat-time">${escapeHtml(time)}</span>
                </div>
                <div class="chat-row-bottom">
                    <div class="chat-preview${hasUnread ? " unread-preview" : ""}">${escapeHtml(preview)}</div>
                    ${hasUnread ? `<span class="unread-badge">${unreadCount > 99 ? "99+" : unreadCount}</span>` : ""}
                </div>
            </div>
        `;

        item.addEventListener("click", () => {
            document.querySelectorAll(".chat-list-item").forEach((el) => el.classList.remove("active"));
            item.classList.add("active");
            openRoom(room);
        });

        chatListEl.appendChild(item);
    });
}

searchInput.addEventListener("input", applySearchFilter);


// ---------------------------------------------------------
// Connections
// ---------------------------------------------------------

newChatBtn.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("chatOpenConnections"));
});

// ---------------------------------------------------------
// Create Connectly Space
// ---------------------------------------------------------

async function loadSpaceConnectedMembers() {
    if (!spaceConnectedMembers) return;
    spaceConnectedMembers.innerHTML = `<div class="empty-state">Loading connections…</div>`;

    try {
        const response = await axios.get(`${BASE_URL}/connections`, {
            headers: { Authorization: token }
        });
        const users = response.data.users || [];

        if (!users.length) {
            spaceConnectedMembers.innerHTML = `<div class="empty-state">No connections yet. Use email invitations below.</div>`;
            return;
        }

        spaceConnectedMembers.innerHTML = users.map(connection => `
            <label class="space-member-option">
                <input type="checkbox" value="${connection.user.id}" data-email="${escapeHtml(connection.user.email)}">
                <span class="space-member-avatar">👤</span>
                <span class="space-member-copy">
                    <strong>${escapeHtml(connection.user.name)}</strong>
                    <small>${escapeHtml(connection.user.email)}</small>
                </span>
            </label>
        `).join("");
    } catch (err) {
        spaceConnectedMembers.innerHTML = `<div class="empty-state error">Couldn't load connections.</div>`;
    }
}

newGroupBtn.addEventListener("click", async () => {
    groupNameInput.value = "";
    groupMembersInput.value = "";
    if (groupPurposeInput) groupPurposeInput.value = "";
    if (spaceCreateFeedback) spaceCreateFeedback.classList.add("hidden");
    createGroupModal.classList.remove("hidden");
    await loadSpaceConnectedMembers();
    groupNameInput.focus();
});

function closeSpaceModal() {
    createGroupModal.classList.add("hidden");
}

createGroupCancelBtn.addEventListener("click", closeSpaceModal);
createGroupCancelBtnSecondary.addEventListener("click", closeSpaceModal);

createGroupSubmitBtn.addEventListener("click", async () => {
    const name = groupNameInput.value.trim();
    const purpose = groupPurposeInput ? groupPurposeInput.value.trim() : "";
    const memberEmails = groupMembersInput.value
        .split(",")
        .map(value => value.trim().toLowerCase())
        .filter(Boolean);
    const memberUserIds = [...spaceConnectedMembers.querySelectorAll("input[type='checkbox']:checked")]
        .map(input => Number(input.value))
        .filter(Boolean);

    if (!name) {
        alert("Please enter a Space name");
        return;
    }

    if (!memberEmails.length && !memberUserIds.length) {
        alert("Select at least one connected person or enter an email address.");
        return;
    }

    createGroupSubmitBtn.disabled = true;
    createGroupSubmitBtn.textContent = "Creating…";

    try {
        const response = await axios.post(
            `${BASE_URL}/rooms/spaces`,
            { name, purpose, memberUserIds, memberEmails },
            { headers: { Authorization: token } }
        );

        closeSpaceModal();
        const room = response.data.room;
        await loadRooms();
        openRoom(room);

        if (typeof showConnectionToast === "function") {
            showConnectionToast(response.data.message || "Space created and invitations sent.");
        }
    } catch (err) {
        const message = err.response?.data?.message || "Couldn't create the Space.";
        if (spaceCreateFeedback) {
            spaceCreateFeedback.textContent = message;
            spaceCreateFeedback.classList.remove("hidden", "success", "error");
            spaceCreateFeedback.classList.add("error");
        } else {
            alert(message);
        }
    } finally {
        createGroupSubmitBtn.disabled = false;
        createGroupSubmitBtn.textContent = "Create Space & Invite";
    }
});


// Menu / logout


menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    menuDropdown.classList.toggle("hidden");
});

document.addEventListener("click", () => {
    menuDropdown.classList.add("hidden");
});

logoutBtn.addEventListener("click", () => {
    socket.disconnect();
    localStorage.removeItem("token");
    window.location.href = "login.html";
});



socket.on("room:message", () => {
    loadRooms();
});



// Initial load

loadRooms();
