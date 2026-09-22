const connectionModal = document.getElementById("connectionModal");
const connectionModalCloseBtn = document.getElementById("connectionModalCloseBtn");
const connectionEmailInput = document.getElementById("connectionEmailInput");
const sendConnectionRequestBtn = document.getElementById("sendConnectionRequestBtn");
const pendingConnections = document.getElementById("pendingConnections");
const spaceInvitations = document.getElementById("spaceInvitations");
const sentSpaceInvitations = document.getElementById("sentSpaceInvitations");
const connectedUsers = document.getElementById("connectedUsers");
const connectionFeedback = document.getElementById("connectionFeedback");
const connectionRequestBadge = document.getElementById("connectionRequestBadge");
const connectionToastContainer = document.getElementById("connectionToastContainer");

function showConnectionFeedback(message, isError = false) {
    connectionFeedback.textContent = message;
    connectionFeedback.classList.remove("hidden", "success", "error");
    connectionFeedback.classList.add(isError ? "error" : "success");
}

function showConnectionToast(message) {
    if (!connectionToastContainer) return;
    const toast = document.createElement("div");
    toast.className = "connection-toast";
    toast.textContent = message;
    connectionToastContainer.appendChild(toast);
    window.setTimeout(() => {
        toast.classList.add("is-hiding");
        window.setTimeout(() => toast.remove(), 180);
    }, 3500);
}

function setConnectionRequestBadge(count) {
    if (!connectionRequestBadge) return;
    const safeCount = Math.max(0, Number(count) || 0);
    connectionRequestBadge.textContent = safeCount > 99 ? "99+" : String(safeCount);
    connectionRequestBadge.classList.toggle("hidden", safeCount === 0);
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
    spaceInvitations.innerHTML = `<div class="empty-state">Loading…</div>`;
    if (sentSpaceInvitations) sentSpaceInvitations.innerHTML = `<div class="empty-state">Loading…</div>`;
    connectedUsers.innerHTML = `<div class="empty-state">Loading…</div>`;

    try {
        const [pendingResponse, connectedResponse, invitationsResponse, sentInvitationsResponse] = await Promise.all([
            axios.get(`${BASE_URL}/connections/pending`, { headers: { Authorization: token } }),
            axios.get(`${BASE_URL}/connections`, { headers: { Authorization: token } }),
            axios.get(`${BASE_URL}/rooms/spaces/invitations`, { headers: { Authorization: token } }),
            axios.get(`${BASE_URL}/rooms/spaces/invitations/sent`, { headers: { Authorization: token } })
        ]);

        const requests = pendingResponse.data.requests || [];
        const invitations = invitationsResponse.data.invitations || [];
        const sentInvitations = sentInvitationsResponse.data.invitations || [];
        const incomingConnectionCount = requests.filter(request => request.direction === "incoming").length;
        setConnectionRequestBadge(incomingConnectionCount + invitations.length);

        renderPendingConnections(requests);
        renderSpaceInvitations(invitations);
        renderSentSpaceInvitations(sentInvitations);
        renderConnectedUsers(connectedResponse.data.users || []);
    } catch (err) {
        pendingConnections.innerHTML = `<div class="empty-state error">Couldn't load connection requests.</div>`;
        spaceInvitations.innerHTML = `<div class="empty-state error">Couldn't load Space invitations.</div>`;
        if (sentSpaceInvitations) sentSpaceInvitations.innerHTML = `<div class="empty-state error">Couldn't load sent Space invitations.</div>`;
        connectedUsers.innerHTML = `<div class="empty-state error">Couldn't load connections.</div>`;
    }
}

function renderPendingConnections(requests) {
    pendingConnections.innerHTML = "";

    if (!requests.length) {
        pendingConnections.innerHTML = `<div class="empty-state">No pending connection requests.</div>`;
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
        if (acceptBtn) acceptBtn.addEventListener("click", () => respondToConnection(request.id, "accept"));
        if (rejectBtn) rejectBtn.addEventListener("click", () => respondToConnection(request.id, "reject"));
        pendingConnections.appendChild(item);
    });
}

function renderSpaceInvitations(invitations) {
    spaceInvitations.innerHTML = "";
    if (!invitations.length) {
        spaceInvitations.innerHTML = `<div class="empty-state">No pending Space invitations.</div>`;
        return;
    }

    invitations.forEach(invitation => {
        const item = document.createElement("div");
        item.className = "connection-item";
        item.innerHTML = `
            <div class="connection-avatar">✦</div>
            <div class="connection-info">
                <strong>${escapeHtml(invitation.room?.name || "Connectly Space")}</strong>
                <span>${escapeHtml(invitation.inviter?.name || "Someone")} invited you</span>
                <small>${escapeHtml(invitation.inviter?.email || "")}</small>
            </div>
            <div class="connection-actions">
                <button type="button" class="btn-primary space-accept-btn">Join</button>
                <button type="button" class="btn-secondary space-reject-btn">Decline</button>
            </div>
        `;

        item.querySelector(".space-accept-btn").addEventListener("click", async () => {
            await respondToSpaceInvitation(invitation.id, "accept", item);
        });
        item.querySelector(".space-reject-btn").addEventListener("click", async () => {
            await respondToSpaceInvitation(invitation.id, "reject", item);
        });
        spaceInvitations.appendChild(item);
    });
}

async function respondToSpaceInvitation(invitationId, action, item) {
    const buttons = item.querySelectorAll("button");
    buttons.forEach(button => { button.disabled = true; });

    try {
        const response = await axios.post(
            `${BASE_URL}/rooms/spaces/invitations/${invitationId}/${action}`,
            {},
            { headers: { Authorization: token } }
        );

        if (action === "accept") {
            await loadRooms();
            const room = allRooms.find(candidate => Number(candidate.id) === Number(response.data.roomId));
            if (room) {
                closeConnectionsModal();
                openRoom(room);
            }
            showConnectionToast("You joined the Space.");
        } else {
            showConnectionToast("Space invitation declined.");
        }

        await loadConnectionData();
    } catch (err) {
        buttons.forEach(button => { button.disabled = false; });
        showConnectionFeedback(err.response?.data?.message || "Couldn't update the Space invitation.", true);
    }
}

function renderSentSpaceInvitations(invitations) {
    if (!sentSpaceInvitations) return;
    sentSpaceInvitations.innerHTML = "";

    if (!invitations.length) {
        sentSpaceInvitations.innerHTML = `<div class="empty-state">No Space invitations sent yet.</div>`;
        return;
    }

    const spaces = new Map();
    invitations.forEach(invitation => {
        const roomId = Number(invitation.room?.id);
        const key = Number.isInteger(roomId) && roomId > 0
            ? String(roomId)
            : `${invitation.room?.name || "Connectly Space"}:${invitation.room?.createdAt || ""}`;

        if (!spaces.has(key)) {
            spaces.set(key, {
                room: invitation.room || {},
                invitations: []
            });
        }
        spaces.get(key).invitations.push(invitation);
    });

    spaces.forEach(({ room, invitations: spaceInvitationsForRoom }) => {
        const item = document.createElement("div");
        item.className = "sent-space-group";

        const purpose = room.SpaceDetail?.purpose || room.spaceDetails?.purpose || "";
        const invitationRows = spaceInvitationsForRoom.map((invitation, index) => {
            const statusLabel = invitation.status === "accepted"
                ? "Joined"
                : invitation.status === "left"
                    ? "Left Space"
                    : invitation.status === "rejected"
                        ? "Declined"
                        : "Pending";
            const inviteeEmail = invitation.invitee?.email || invitation.invitee?.name || "Invitee";
            const branch = index === spaceInvitationsForRoom.length - 1 ? "└──" : "├──";

            return `
                <div class="sent-space-invite-row">
                    <span class="sent-space-branch">${branch}</span>
                    <span class="sent-space-invitee">${escapeHtml(inviteeEmail)}</span>
                    <span class="space-invite-status ${escapeHtml(invitation.status || "pending")}">${escapeHtml(statusLabel)}</span>
                </div>
            `;
        }).join("");

        item.innerHTML = `
            <div class="sent-space-title">✦ ${escapeHtml(room.name || "Connectly Space")}</div>
            ${purpose ? `<div class="sent-space-purpose">${escapeHtml(purpose)}</div>` : ""}
            <div class="sent-space-members-label">Members / invitations</div>
            <div class="sent-space-invite-list">${invitationRows}</div>
        `;

        sentSpaceInvitations.appendChild(item);
    });
}

function renderConnectedUsers(users) {
    connectedUsers.innerHTML = "";

    if (!users.length) {
        connectedUsers.innerHTML = `<div class="empty-state">No connected people yet.</div>`;
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
                showConnectionFeedback(err.response?.data?.message || "Couldn't open the chat.", true);
            }
        });

        item.querySelector(".connection-disconnect-btn").addEventListener("click", async () => {
            const confirmed = window.confirm(
                `Disconnect from ${connection.user.name}? Your existing conversation will remain, but you won't be able to send new private messages until you connect again.`
            );
            if (!confirmed) return;

            const button = item.querySelector(".connection-disconnect-btn");
            button.disabled = true;
            button.textContent = "Disconnecting…";
            try {
                await axios.delete(`${BASE_URL}/connections/${connection.connectionId}`, { headers: { Authorization: token } });
                showConnectionFeedback(`Disconnected from ${connection.user.name}.`);
                await loadConnectionData();
                await loadRooms();
            } catch (err) {
                button.disabled = false;
                button.textContent = "Disconnect";
                showConnectionFeedback(err.response?.data?.message || "Couldn't disconnect.", true);
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
        await axios.post(`${BASE_URL}/connections/request`, { email }, { headers: { Authorization: token } });
        connectionEmailInput.value = "";
        showConnectionFeedback("Connection request sent.");
        await loadConnectionData();
    } catch (err) {
        showConnectionFeedback(err.response?.data?.message || "Couldn't send the request.", true);
    } finally {
        sendConnectionRequestBtn.disabled = false;
    }
}

async function respondToConnection(connectionId, action) {
    try {
        await axios.post(`${BASE_URL}/connections/${connectionId}/${action}`, {}, { headers: { Authorization: token } });
        await loadConnectionData();
        await loadRooms();
    } catch (err) {
        showConnectionFeedback(err.response?.data?.message || "Couldn't update the request.", true);
    }
}

sendConnectionRequestBtn.addEventListener("click", sendConnectionRequest);
connectionEmailInput.addEventListener("keydown", event => {
    if (event.key === "Enter") sendConnectionRequest();
});
connectionModalCloseBtn.addEventListener("click", closeConnectionsModal);
connectionModal.addEventListener("click", event => {
    if (event.target === connectionModal) closeConnectionsModal();
});
document.addEventListener("chatOpenConnections", openConnectionsModal);

socket.on("connection:request", payload => {
    const requesterName = payload?.requester?.name || "Someone";
    showConnectionToast(`${requesterName} sent you a connection request.`);
    loadConnectionData();
});

socket.on("connection:accepted", () => {
    showConnectionToast("Your connection request was accepted.");
    loadConnectionData();
    loadRooms();
});

socket.on("connection:rejected", () => {
    loadConnectionData();
});

socket.on("connection:disconnected", () => {
    loadConnectionData();
    loadRooms();
});

socket.on("space:invitation", payload => {
    showConnectionToast(`${payload?.inviter?.name || "Someone"} invited you to ${payload?.spaceName || "a Space"}.`);
    loadConnectionData();
});

socket.on("space:invitationAccepted", payload => {
    showConnectionToast(`${payload?.user?.name || "Someone"} joined your Space.`);
    loadConnectionData();
    loadRooms();
});

socket.on("space:invitationRejected", payload => {
    showConnectionToast(`${payload?.user?.name || "Someone"} declined your Space invitation.`);
    loadConnectionData();
});

socket.on("space:memberLeft", ({ roomId, userId }) => {
    if (typeof currentRoom !== "undefined" && currentRoom && Number(currentRoom.id) === Number(roomId)) {
        if (Number(userId) !== Number(currentUser.userId)) {
            showConnectionToast("A member left this Space.");
        }
    }
});

loadConnectionData();
