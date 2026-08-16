const BASE_URL = "http://localhost:3000";

const token = localStorage.getItem("token");

if (!token) {
    alert("Please login first");
    window.location.href = "login.html";
}


function getCurrentUser() {
    return JSON.parse(atob(token.split(".")[1]));
}

const currentUser = getCurrentUser();
const socket = io(BASE_URL, {
    auth: {
        token: token
    }
});

socket.on("connect", () => {
    console.log("Socket.IO connected:", socket.id);
});

socket.on("disconnect", () => {
    console.log("Socket.IO disconnected");
});

socket.on("connect_error", (err) => {
    console.log("Socket.IO connection error:", err.message);
});


socket.on("room:error", (err) => {
    console.log("Room error:", err && err.message);
    alert((err && err.message) || "Something went wrong");
});
