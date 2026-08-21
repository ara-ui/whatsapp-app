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


// INITIALIZE MEDIA PREVIEW

initializeMediaPreview();