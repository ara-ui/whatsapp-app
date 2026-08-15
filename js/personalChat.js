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

joinRoomBtn.addEventListener("click", () => {

    const email =
        userEmailInput.value.trim();


    if (!email) {

        alert(
            "Please enter the user's email"
        );

        return;

    }


    // Create room ID

    const roomId =
        `${currentUser.userId}_${email}`;


    currentRoom = roomId;


    // Tell server to join the room

    socket.emit(
        "join_room",
        currentRoom
    );


    console.log(
        "Joined personal room:",
        currentRoom
    );


    alert(
        `Joined chat with ${email}`
    );

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