
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


    // Community
    if (
        currentRoom.type === "community"
    ) {

        chatWindowSubtitle.textContent =
            "Everyone can chat here";

        return;
    }


    // Group
    if (
        currentRoom.type === "group"
    ) {

        chatWindowSubtitle.textContent =
            "Group chat";

        return;
    }


    requestPresenceStatus();
}

// REQUEST CURRENT USER PRESENCE

function requestPresenceStatus() {

    if (!currentRoom || !socket) {
        return;
    }

    // Presence is currently handled
    // only for personal chats.
    if (
        currentRoom.type !== "personal"
    ) {
        return;
    }

    if (!currentRoom.otherUserId) {
        return;
    }

    socket.emit(
        "presence:getStatus",
        {
            userId:
                currentRoom.otherUserId
        }
    );
}

// RECEIVE CURRENT USER PRESENCE

socket.on(
    "presence:status",
    ({
        userId,
        online,
        lastSeenAt
    }) => {

        if (!currentRoom) {
            return;
        }

        // Ignore status belonging
        // to another user.
        if (
            Number(userId) !==
            Number(currentRoom.otherUserId)
        ) {
            return;
        }


        if (online) {

            chatWindowSubtitle.textContent =
                "Online";

            return;
        }


        if (lastSeenAt) {

            chatWindowSubtitle.textContent =
                formatLastSeen(
                    lastSeenAt
                );

            return;
        }


        chatWindowSubtitle.textContent =
            "Offline";
    }
);

// FORMAT LAST SEEN

function formatLastSeen(
    lastSeenAt
) {

    const date =
        new Date(lastSeenAt);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "Offline";
    }


    const now =
        new Date();


    const isToday =
        date.toDateString() ===
        now.toDateString();


    if (isToday) {

        return (
            "last seen today at " +
            date.toLocaleTimeString(
                [],
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            )
        );
    }


    const yesterday =
        new Date(now);

    yesterday.setDate(
        now.getDate() - 1
    );


    if (
        date.toDateString() ===
        yesterday.toDateString()
    ) {

        return (
            "last seen yesterday at " +
            date.toLocaleTimeString(
                [],
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            )
        );
    }


    return (
        "last seen " +
        date.toLocaleDateString(
            [],
            {
                day: "numeric",
                month: "short"
            }
        ) +
        " at " +
        date.toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        )
    );
}

// other USER CAME ONLINE

socket.on(
    "presence:userOnline",
    ({ userId }) => {

        if (!currentRoom) {
            return;
        }

        if (
            currentRoom.type !== "personal"
        ) {
            return;
        }

        if (
            Number(userId) !==
            Number(currentRoom.otherUserId)
        ) {
            return;
        }

        chatWindowSubtitle.textContent =
            "Online";
    }
);

// other USER WENT OFFLINE

socket.on(
    "presence:userOffline",
    ({
        userId,
        lastSeenAt
    }) => {

        if (!currentRoom) {
            return;
        }

        if (
            currentRoom.type !== "personal"
        ) {
            return;
        }

        if (
            Number(userId) !==
            Number(currentRoom.otherUserId)
        ) {
            return;
        }


        if (lastSeenAt) {

            chatWindowSubtitle.textContent =
                formatLastSeen(
                    lastSeenAt
                );

        } else {

            chatWindowSubtitle.textContent =
                "Offline";
        }
    }
);