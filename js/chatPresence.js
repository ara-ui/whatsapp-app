
let typingTimer = null;

let isTyping = false;

const TYPING_TIMEOUT = 1200;

// START TYPING

function startTyping() {

    if (!currentRoom || !socket) {
        return;
    }

  if (!isTyping) {

        isTyping = true;

        socket.emit(
            "typing:start",
            {
                roomId: currentRoom.id
            }
        );
    }


    // Reset the timeout every time
    // the user types.
    clearTimeout(typingTimer);


    typingTimer = setTimeout(
        stopTyping,
        TYPING_TIMEOUT
    );
}

// STOP TYPING

function stopTyping() {

    clearTimeout(
        typingTimer
    );

    typingTimer = null;


    if (!isTyping) {
        return;
    }


    isTyping = false;


    if (!currentRoom || !socket) {
        return;
    }


    socket.emit(
        "typing:stop",
        {
            roomId: currentRoom.id
        }
    );
}

// RESET WHEN CHAT CHANGES

function resetTypingState() {

    clearTimeout(
        typingTimer
    );

    typingTimer = null;

    isTyping = false;
}

// RECEIVE TYPING START

socket.on(
    "typing:start",
    ({ userId, userName }) => {

        if (!currentRoom) {
            return;
        }


        // Ignore our own typing event.
        if (
            Number(userId) ===
            Number(currentUser.userId)
        ) {
            return;
        }


        chatWindowSubtitle.textContent =
            `${userName} is typing...`;
    }
);

// RECEIVE TYPING STOP

socket.on(
    "typing:stop",
    ({ userId }) => {

        if (!currentRoom) {
            return;
        }


        if (
            Number(userId) ===
            Number(currentUser.userId)
        ) {
            return;
        }


        restoreRoomSubtitle();
    }
);

// RESTORE NORMAL CHAT SUBTITLE

function restoreRoomSubtitle() {

    if (!currentRoom) {
        return;
    }


    if (
        currentRoom.type === "community"
    ) {

        chatWindowSubtitle.textContent =
            "Everyone can chat here";

        return;
    }


    if (
        currentRoom.type === "group"
    ) {

        chatWindowSubtitle.textContent =
            "Group chat";

        return;
    }


    chatWindowSubtitle.textContent =
        "";
}