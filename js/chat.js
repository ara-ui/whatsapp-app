const BASE_URL = "http://localhost:3000";

const token = localStorage.getItem("token");

if (!token) {
    alert("Please login first");
    window.location.href = "login.html";
}

const messagesContainer = document.getElementById("messages");
const messageInput = document.getElementById("message");

// Decode JWT
function getUser() {
    return JSON.parse(atob(token.split(".")[1]));
}

const currentUser = getUser();


// Socket.io connection

const socket = io("http://localhost:3000", {
    auth: {
        token: token
    }
});


//connection logs

socket.on("connect", () => {
    console.log("Socket.IO Connected");
});

socket.on("disconnect", () => {
    console.log("Socket.IO Disconnected");
});

socket.on("connect_error", (err) => {
    console.log(err);
});


// When another user sends a community message
socket.on("refresh-chat",()=>{
    loadMessages();
});


// Load community Messages
async function loadMessages() {

    try {

        const response = await axios.get(
            `${BASE_URL}/chat/messages`,
            {
                headers: {
                    Authorization: token
                }
            }
        );

        const chats = response.data.chats;

        messagesContainer.innerHTML = "";

        chats.forEach(chat => {

            // Skip old messages with no user
            if (!chat.User) return;

            const messageDiv = document.createElement("div");

            const time = new Date(chat.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            });

            if (chat.userId === currentUser.userId) {

                messageDiv.className = "message mine";

                messageDiv.innerHTML = `
                    <div class="text">
                        ${chat.message}
                    </div>

                    <div class="time">
                        ${time}
                    </div>
                `;

            } else {

                messageDiv.className = "message other";

                messageDiv.innerHTML = `
                    <div class="sender">
                        ${chat.User.name}
                    </div>

                    <div class="text">
                        ${chat.message}
                    </div>

                    <div class="time">
                        ${time}
                    </div>
                `;

            }

            messagesContainer.appendChild(messageDiv);

        });

        // Scroll to latest message
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

    } catch (err) {
        console.log(err);
    }
}

// Send community Message
async function sendMessage() {

    const message = messageInput.value.trim();

    if (message === "") return;



    // COMMUNITY CHAT
    try {

        await axios.post(
            `${BASE_URL}/chat/send`,
            {
                message
            },
            {
                headers: {
                    Authorization: token
                }
            }
        );

        messageInput.value = "";

        // Notify connected users

        socket.emit("new-message");

    } catch (err) {

        console.log(err);

    }
}

//enter key support
messageInput.addEventListener("keypress", function (e) {

    if (e.key === "Enter") {
        sendMessage();
    }

});
// Initial load
loadMessages();