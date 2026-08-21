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

        const messages =
            response.data.messages || [];


        // Render message history
        renderMessages(
            messages,
            messagesContainer
        );


        // Scroll to latest message
        scrollToLatestAfterHistory();

         // AI SMART REPLIES
      
        const latestMessage =
            messages[messages.length - 1];


        if (
            latestMessage &&
            Number(latestMessage.senderId) !==
                Number(currentUser.userId) &&
            latestMessage.content
        ) {

            loadSmartReplies(
                latestMessage.content,
                latestMessage.id,
                latestMessage.roomId
            );

        } else {

            clearAISuggestions();

        }


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
    if (
        typeof clearAISuggestions === "function"
    ) {

        clearAISuggestions();

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
        Number(msg.senderId) !== Number(currentUser.userId) &&
        typeof loadSmartReplies === "function"
    ) {

        loadSmartReplies(
            msg.content,
            msg.id,
            msg.roomId
        );
    }

 // READ RECEIPT
  
    if (
        Number(msg.senderId) !== Number(currentUser.userId)
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