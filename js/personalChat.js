const BASE_URL = "http://localhost:3000";
const token = localStorage.getItem("token");

if (!token) {

    alert("Please login first");

    window.location.href = "login.html";
}


// HTML elements

const messagesContainer =
    document.getElementById("messages");

const messageInput =
    document.getElementById("message");

const joinRoomBtn =
    document.getElementById("joinRoomBtn");

const userEmailInput =
    document.getElementById("userEmail");

const sendBtn =
    document.getElementById("sendBtn");


// Decode JWT

function getUser() {

    return JSON.parse(
        atob(token.split(".")[1])
    );
}

//generate room id

function generateRoomId(email1, email2) {

    const emails = [email1, email2].sort();

    return `${emails[0]}_${emails[1]}`;
}


const currentUser = getUser();



// Current personal room

let currentRoom = null;


// Socket.IO connection

const socket = io("http://localhost:3000", {

    auth: {
        token: token
    }

});


// Connection logs

socket.on("connect", () => {

    console.log("Socket.IO Connected");

});


socket.on("disconnect", () => {

    console.log("Socket.IO Disconnected");

});


socket.on("connect_error", (err) => {

    console.log(
        "Socket.IO Error:",
        err.message
    );

});


// Join Personal Room
joinRoomBtn.addEventListener("click", async () => {

    const email = userEmailInput.value.trim();

    if (!email) {
        alert("Please enter a user's email");
        return;
    }

    try {

        // Step 1: Check whether the other user exists
        const response = await axios.get(
            `${BASE_URL}/user/check-user`,
            {
                params: {
                    email: email
                }
            }
        );

        if (!response.data.success) {
            alert("User not found");
            return;
        }

        // Step 2: Generate the same room ID for both users
        const roomId = generateRoomId(
            currentUser.email,
            email
        );

        // Step 3: Store current room
        currentRoom = roomId;

        // Step 4: Join the room
        socket.emit("join_room", currentRoom);

        console.log("Joined room:", currentRoom);

    } catch (err) {

        console.log(err);

        if (err.response && err.response.status === 404) {

            alert("User not found");

        } else {

            alert("Something went wrong");

        }

    }

});


// Receive Personal Message

socket.on("new_message", (data) => {

    console.log(
        "Personal message received:",
        data
    );


    // Ignore messages from another room

    if (data.room !== currentRoom) {

        return;

    }


    const messageDiv =
        document.createElement("div");


    if (
        data.senderId ===
        currentUser.userId
    ) {

        messageDiv.className =
            "message mine";

    } else {

        messageDiv.className =
            "message other";

    }


    messageDiv.innerHTML = `

        <div class="sender">
            ${data.senderName}
        </div>

        <div class="text">
            ${data.message}
        </div>

    `;


    messagesContainer.appendChild(
        messageDiv
    );


    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;

});


// Send Personal Message

function sendPersonalMessage() {

    const message =
        messageInput.value.trim();


    if (!message) {

        return;

    }


    if (!currentRoom) {

        alert(
            "Please start a personal chat first"
        );

        return;

    }


    socket.emit("new_message", {

        room: currentRoom,

        message: message

    });


    messageInput.value = "";

}


// Send button

sendBtn.addEventListener(
    "click",
    sendPersonalMessage
);


// Enter key

messageInput.addEventListener(
    "keypress",
    function (e) {

        if (e.key === "Enter") {

            sendPersonalMessage();

        }

    }
);