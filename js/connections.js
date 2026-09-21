const connectionModal = document.getElementById("connectionModal");
const connectionModalCloseBtn = document.getElementById("connectionModalCloseBtn");
const connectionEmailInput = document.getElementById("connectionEmailInput");
const sendConnectionRequestBtn = document.getElementById("sendConnectionRequestBtn");
const pendingConnections = document.getElementById("pendingConnections");
const connectedUsers = document.getElementById("connectedUsers");
const connectionFeedback = document.getElementById("connectionFeedback");

function showConnectionFeedback(message, isError = false) {
    connectionFeedback.textContent = message;
    connectionFeedback.classList.remove("hidden", "success", "error");
    connectionFeedback.classList.add(isError ? "error" : "success");
}

function openConnectionsModal() {
    connectionModal.classList.remove("hidden");
    connectionFeedback.classList.add("hidden");
    loadConnectionData();
}

function closeConnectionsModal() {
    connectionModal.classList.add("hidden");
}

async function loadConnectionData() {
    pendingConnections.innerHTML = `<div class="empty-state">Loading…</div>`;
    connectedUsers.innerHTML = `<div class="empty-state">Loading…</div>`;

    try {
        const [pendingResponse, connectedResponse] = await Promise.all([
            axios.get(`${BASE_URL}/connections/pending`, {
                headers: { Authorization: token }
            }),
            axios.get(`${BASE_URL}/connections`, {
                headers: { Authorization: token }
            })
        ]);

        renderPendingConnections(pendingResponse.data.requests || []);
        renderConnectedUsers(connectedResponse.data.users || []);
    } catch (err) {
        pendingConnections.innerHTML = `<div class="empty-state error">Couldn't load connection data.</div>`;
        connectedUsers.innerHTML = `<div class="empty-state error">Couldn't load connections.</div>`;
    }
}

function renderPendingConnections(requests) {
    pendingConnections.innerHTML = "";

    if (!requests.length) {
        pendingConnections.innerHTML = `<div class="empty-state">No pending requests.</div>`;
        return;
    }

    requests.forEach(request => {
        const item = document.createElement("div");
        item.className = "connection-item";
        const user = request.user;

        item.innerHTML = `
            <div class="connection-avatar">👤</div>
            <div class="connection-info">
                <strong>${escapeHtml(user.name)}</strong>
                <span>${escapeHtml(user.email)}</span>
                <small>${request.direction === "incoming" ? "Wants to connect with you" : "Request sent"}</small>
            </div>
            <div class="connection-actions">
                ${request.direction === "incoming" ? `
                    <button type="button" class="btn-primary connection-accept-btn">Accept</button>
                    <button type="button" class="btn-secondary connection-reject-btn">Reject</button>
                ` : ""}
            </div>
        `;

        const acceptBtn = item.querySelector(".connection-accept-btn");
        const rejectBtn = item.querySelector(".connection-reject-btn");

        if (acceptBtn) {
            acceptBtn.addEventListener("click", () => respondToConnection(request.id, "accept"));
        }
        if (rejectBtn) {
            rejectBtn.addEventListener("click", () => respondToConnection(request.id, "reject"));
        }

        pendingConnections.appendChild(item);
    });
}

function renderConnectedUsers(users) {
    connectedUsers.innerHTML = "";

    if (!users.length) {
        connectedUsers.innerHTML = `<div class="empty-state">No connected users yet.</div>`;
        return;
    }

    users.forEach(connection => {
        const item = document.createElement("div");
        item.className = "connection-item";
        item.innerHTML = `
            <div class="connection-avatar">👤</div>
            <div class="connection-info">
                <strong>${escapeHtml(connection.user.name)}</strong>
                <span>${escapeHtml(connection.user.email)}</span>
            </div>
            <div class="connection-actions">
                <button type="button" class="btn-primary connection-chat-btn">Chat</button>
                <button type="button" class="btn-danger connection-disconnect-btn">Disconnect</button>
            </div>
        `;

        item.querySelector(".connection-chat-btn").addEventListener("click", async () => {
            try {
                const response = await axios.post(
                    `${BASE_URL}/rooms/personal`,
                    { email: connection.user.email },
                    { headers: { Authorization: token } }
                );
                closeConnectionsModal();
                await loadRooms();
                openRoom(response.data.room);
            } catch (err) {
                showConnectionFeedback(
                    err.response?.data?.message || "Couldn't open the chat.",
                    true
                );
            }
        });

        item.querySelector(".connection-disconnect-btn").addEventListener("click", async () => {
            const confirmed = window.confirm(
                `Disconnect from ${connection.user.name}? Your existing conversation will remain, but you won't be able to send new private messages until you connect again.`
            );

            if (!confirmed) {
                return;
            }

            const button = item.querySelector(".connection-disconnect-btn");
            button.disabled = true;
            button.textContent = "Disconnecting…";

            try {
                await axios.delete(
                    `${BASE_URL}/connections/${connection.connectionId}`,
                    { headers: { Authorization: token } }
                );

                showConnectionFeedback(`Disconnected from ${connection.user.name}.`);
                await loadConnectionData();
                if (typeof loadRooms === "function") {
                    await loadRooms();
                }
            } catch (err) {
                button.disabled = false;
                button.textContent = "Disconnect";
                showConnectionFeedback(
                    err.response?.data?.message || "Couldn't disconnect.",
                    true
                );
            }
        });

        connectedUsers.appendChild(item);
    });
}

async function sendConnectionRequest() {
    const email = connectionEmailInput.value.trim();

    if (!email) {
        showConnectionFeedback("Enter an email address.", true);
        return;
    }

    sendConnectionRequestBtn.disabled = true;

    try {
        await axios.post(
            `${BASE_URL}/connections/request`,
            { email },
            { headers: { Authorization: token } }
        );

        connectionEmailInput.value = "";
        showConnectionFeedback("Connection request sent.");
        await loadConnectionData();
    } catch (err) {
        showConnectionFeedback(
            err.response?.data?.message || "Couldn't send the request.",
            true
        );
    } finally {
        sendConnectionRequestBtn.disabled = false;
    }
}

async function respondToConnection(connectionId, action) {
    try {
        await axios.post(
            `${BASE_URL}/connections/${connectionId}/${action}`,
            {},
            { headers: { Authorization: token } }
        );
        await loadConnectionData();
        if (typeof loadRooms === "function") {
            await loadRooms();
        }
    } catch (err) {
        showConnectionFeedback(
            err.response?.data?.message || "Couldn't update the request.",
            true
        );
    }
}

sendConnectionRequestBtn.addEventListener("click", sendConnectionRequest);
connectionEmailInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        sendConnectionRequest();
    }
});
connectionModalCloseBtn.addEventListener("click", closeConnectionsModal);
connectionModal.addEventListener("click", event => {
    if (event.target === connectionModal) {
        closeConnectionsModal();
    }
});

document.addEventListener("chatOpenConnections", openConnectionsModal);

socket.on("connection:request", () => {
    if (!connectionModal.classList.contains("hidden")) {
        loadConnectionData();
    }
});

socket.on("connection:accepted", () => {
    if (!connectionModal.classList.contains("hidden")) {
        loadConnectionData();
    }
    if (typeof loadRooms === "function") {
        loadRooms();
    }
});

socket.on("connection:rejected", () => {
    if (!connectionModal.classList.contains("hidden")) {
        loadConnectionData();
    }
});


socket.on("connection:disconnected", () => {
    if (!connectionModal.classList.contains("hidden")) {
        loadConnectionData();
    }
    if (typeof loadRooms === "function") {
        loadRooms();
    }
});
