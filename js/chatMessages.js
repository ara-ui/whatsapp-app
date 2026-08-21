// CHAT MESSAGES

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

        scrollToLatestAfterHistory();

    } catch (err) {

        console.log(err);

        messagesContainer.innerHTML =
            `<div class="empty-state error">
                Couldn't load message history.
            </div>`;
    }
}

// SEND MESSAGE

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

// SOCKET.IO - NEW MESSAGE

socket.on("room:message", (msg) => {

    console.log(
        "📩 room:message received:",
        msg
    );


    const isForOpenRoom =
        currentRoom &&
        Number(msg.roomId) === Number(currentRoom.id);


    if (!isForOpenRoom) {

        console.log(
            "❌ Message belongs to another room"
        );

        return;
    }


    const emptyEl =
        messagesContainer.querySelector(
            ".empty-state"
        );


    if (emptyEl) {
        emptyEl.remove();
    }


    appendMessage(msg, messagesContainer);
    scrollToLatest();

 // AI SMART REPLIES

    if (
        msg.senderId !== currentUser.userId &&
        typeof loadSmartReplies === "function"
    ) {

        loadSmartReplies(
            msg.content
        );
    }

 // READ RECEIPT
  
    if (
        msg.senderId !== currentUser.userId
    ) {

        socket.emit(
            "room:markRead",
            {
                messageId: msg.id
            }
        );
    }

});

// SOCKET.IO - MESSAGE STATUS

socket.on(
    "room:messageStatus",
    ({ messageId, status }) => {

        updateMessageStatus(
            messageId,
            status
        );

    }
);
// MESSAGE INPUT EVENTS

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