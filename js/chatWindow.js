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


let currentRoom = null;

// ROOM

async function openRoom(room) {

    // If user changes rooms while an attachment is pending,
    // cancel that attachment so it cannot be sent to the
    // wrong room.
    clearPendingAttachment();

    currentRoom = room;

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
                : "";

    messagesContainer.innerHTML =
        `<div class="empty-state">
            Loading messages…
        </div>`;

    socket.emit(
        "room:join",
        room.id
    );

    await loadMessageHistory(room.id);

    // Opening a room is also what marks its messages read
    // server-side (see the "room:join" handler), which clears
    // this room's unread badge. Refresh the chat list so that
    // badge disappears immediately instead of waiting for the
    // next unrelated "room:message" event to trigger a reload.
    if (typeof loadRooms === "function") {
        loadRooms();
    }
}


// MESSAGE HISTORY

async function loadMessageHistory(roomId) {

    try {

        const response = await axios.get(
            `${BASE_URL}/rooms/${roomId}/messages`,
            {
                headers: {
                    Authorization: token
                }
            }
        );

        renderMessages(
            response.data.messages || [],
            messagesContainer
        );

        scrollToBottom();

    } catch (err) {

        console.log(err);

        messagesContainer.innerHTML =
            `<div class="empty-state error">
                Couldn't load message history.
            </div>`;
    }
}
// SCROLL

function scrollToBottom() {

    requestAnimationFrame(() => {

        messagesContainer.scrollTop =
            messagesContainer.scrollHeight;

        setTimeout(() => {

            messagesContainer.scrollTop =
                messagesContainer.scrollHeight;

        }, 50);

    });

}


// ============================================================
// TEXT MESSAGE
// ============================================================

function sendCurrentMessage() {

    const content =
        messageInput.value.trim();

    if (!content) {
        return;
    }

    if (!currentRoom) {

        alert(
            "Open a conversation first"
        );

        return;
    }

    socket.emit(
        "room:send",
        {
            roomId: currentRoom.id,
            content: content
        }
    );

    messageInput.value = "";
}


sendBtn.addEventListener(
    "click",
    sendCurrentMessage
);


messageInput.addEventListener(
    "keypress",
    (event) => {

        if (event.key === "Enter") {
            sendCurrentMessage();
        }
    }
);

// MOBILE BACK BUTTON


backBtn.addEventListener(
    "click",
    () => {

        chatWindowPanel.classList.remove(
            "mobile-visible"
        );
    }
);

// MEDIA VIEWER CLICK

messagesContainer.addEventListener(
    "click",
    (event) => {

        const mediaElement =
            event.target.closest(
                "[data-media-action='view']"
            );

        if (!mediaElement) {
            return;
        }

        const messageElement =
            mediaElement.closest(".message");

        if (!messageElement) {
            return;
        }

        const messageId =
            messageElement.dataset.messageId;

        const message =
            findMessageById(messageId);

        if (!message) {
            return;
        }

        openMediaViewer(message);
    }
);

// SOCKET.IO - NEW MESSAGE
socket.on("room:message", (msg) => {

    console.log("📩 room:message received:", msg);

    const isForOpenRoom =
        currentRoom && msg.roomId === currentRoom.id;

    if (!isForOpenRoom) {

        // Not the conversation the user currently has open.
        // Delivery is already handled server-side the moment
        // this event reaches our socket (see socket-io/handlers/
        // room.js), and the chat list's unread badge is kept in
        // sync separately (see home.js's own "room:message"
        // listener, which reloads the room list). There is
        // nothing to render here.
        console.log("❌ Wrong room");
        return;
    }

    const emptyEl =
        messagesContainer.querySelector(".empty-state");

    if (emptyEl) {
        emptyEl.remove();
    }

    appendMessage(msg, messagesContainer);
    scrollToBottom();

    if (
    msg.senderId !== currentUser.userId &&
    typeof loadSmartReplies === "function"
    ) {

        // Pass the actual incoming message straight through so
        // smart replies are always generated for THIS message,
        // never accidentally for whatever happens to be last in
        // the rendered list (which could be our own message).
        loadSmartReplies(msg.content);

    }

    // We're actively looking at this conversation right now,
    // so any message that just arrived in it is READ, not just
    // delivered. (Delivery itself — the gray tick — is decided
    // server-side based on whether the recipient's socket was
    // online, regardless of which room they had open.)
    if (msg.senderId !== currentUser.userId) {

        socket.emit(
            "room:markRead",
            {
                messageId: msg.id
            }
        );
    }

});

// SOCKET.IO - MESSAGE STATUS UPDATE

socket.on("room:messageStatus", ({ messageId, status }) => {

    

    updateMessageStatus(
        messageId,
        status
    );
});

// INITIALIZE MEDIA PREVIEW

initializeMediaPreview();