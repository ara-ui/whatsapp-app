
const chatListEl = document.getElementById("chatList");
const searchInput = document.getElementById("searchInput");

const newChatBtn = document.getElementById("newChatBtn");
const newGroupBtn = document.getElementById("newGroupBtn");

const menuBtn = document.getElementById("menuBtn");
const menuDropdown = document.getElementById("menuDropdown");
const logoutBtn = document.getElementById("logoutBtn");

const startChatModal = document.getElementById("startChatModal");
const startChatEmailInput = document.getElementById("startChatEmailInput");
const startChatSubmitBtn = document.getElementById("startChatSubmitBtn");
const startChatCancelBtn = document.getElementById("startChatCancelBtn");

const createGroupModal = document.getElementById("createGroupModal");
const groupNameInput = document.getElementById("groupNameInput");
const groupMembersInput = document.getElementById("groupMembersInput");
const createGroupSubmitBtn = document.getElementById("createGroupSubmitBtn");
const createGroupCancelBtn = document.getElementById("createGroupCancelBtn");

let allRooms = [];



// Small shared helpers (also used by chatWindow.js)

function roomIcon(type) {
    if (type === "personal") return "👤";
    if (type === "group") return "👥";
    return "🌍";
}

function formatTime(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
                ? (room.lastMessage.senderId === currentUser.userId ? "You: " : "") + room.lastMessage.content
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
// Start personal chat
// ---------------------------------------------------------

newChatBtn.addEventListener("click", () => {
    startChatEmailInput.value = "";
    startChatModal.classList.remove("hidden");
    startChatEmailInput.focus();
});

startChatCancelBtn.addEventListener("click", () => {
    startChatModal.classList.add("hidden");
});

startChatSubmitBtn.addEventListener("click", async () => {
    const email = startChatEmailInput.value.trim();

    if (!email) {
        alert("Please enter an email");
        return;
    }

    try {
        const response = await axios.post(
            `${BASE_URL}/rooms/personal`,
            { email },
            { headers: { Authorization: token } }
        );

        startChatModal.classList.add("hidden");

        const room = response.data.room;

        await loadRooms();
        openRoom(room);

    } catch (err) {
        console.log(err);

        if (err.response && err.response.status === 404) {
            alert("No user found with that email");
        } else if (err.response && err.response.data && err.response.data.message) {
            alert(err.response.data.message);
        } else {
            alert("Something went wrong");
        }
    }
});


// ---------------------------------------------------------
// Create group
// ---------------------------------------------------------

newGroupBtn.addEventListener("click", () => {
    groupNameInput.value = "";
    groupMembersInput.value = "";
    createGroupModal.classList.remove("hidden");
    groupNameInput.focus();
});

createGroupCancelBtn.addEventListener("click", () => {
    createGroupModal.classList.add("hidden");
});

createGroupSubmitBtn.addEventListener("click", async () => {
    const name = groupNameInput.value.trim();
    const emailsRaw = groupMembersInput.value.trim();

    if (!name) {
        alert("Please enter a group name");
        return;
    }

    if (!emailsRaw) {
        alert("Please enter at least one member email");
        return;
    }

    const memberEmails = emailsRaw
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

    try {
        const response = await axios.post(
            `${BASE_URL}/rooms/group`,
            { name, memberEmails },
            { headers: { Authorization: token } }
        );

        createGroupModal.classList.add("hidden");

        const room = response.data.room;

        await loadRooms();
        openRoom(room);

    } catch (err) {
        console.log(err);

        if (err.response && err.response.data && err.response.data.message) {
            alert(err.response.data.message);
        } else {
            alert("Something went wrong");
        }
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
