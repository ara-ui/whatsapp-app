const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const chatBody = document.querySelector(".chat-body");

function sendMessage() {

    const text = input.value.trim();

    if(text === "") return;

    const message = document.createElement("div");
    message.className = "message sent";

    message.innerHTML = `
        <p>${text}</p>
        <span>${getCurrentTime()}</span>
    `;

    chatBody.appendChild(message);

    chatBody.scrollTop = chatBody.scrollHeight;

    input.value = "";
}

sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keypress", function(e){

    if(e.key === "Enter"){
        sendMessage();
    }

});

function getCurrentTime(){

    const now = new Date();

    let hours = now.getHours();
    let minutes = now.getMinutes();

    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    hours = hours || 12;

    minutes = minutes < 10 ? "0"+minutes : minutes;

    return `${hours}:${minutes} ${ampm}`;

}