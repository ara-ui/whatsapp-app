let pendingFile = null;
let pendingPreviewUrl = null;


const attachmentPreview = document.createElement("div");

attachmentPreview.id = "attachmentPreview";
attachmentPreview.className = "attachment-preview hidden";

attachmentPreview.innerHTML = `
    <div class="attachment-preview-content">

        <div id="attachmentPreviewBody"></div>

        <div class="attachment-preview-info">

            <span id="attachmentPreviewName"></span>

            <div class="attachment-preview-actions">

                <button
                    type="button"
                    id="cancelAttachmentBtn"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    id="sendAttachmentBtn"
                >
                    Send
                </button>

            </div>

        </div>

    </div>
`;

document.body.appendChild(attachmentPreview);


const previewBody =
    document.getElementById("attachmentPreviewBody");

const previewName =
    document.getElementById("attachmentPreviewName");

const cancelAttachmentBtn =
    document.getElementById("cancelAttachmentBtn");

const sendAttachmentBtn =
    document.getElementById("sendAttachmentBtn");


function clearPendingAttachment() {

    pendingFile = null;

    if (pendingPreviewUrl) {
        URL.revokeObjectURL(pendingPreviewUrl);
        pendingPreviewUrl = null;
    }

    previewBody.innerHTML = "";
    previewName.textContent = "";

    mediaFileInput.value = "";

    attachmentPreview.classList.add("hidden");
}


function showAttachmentPreview(file) {

    pendingFile = file;

    if (pendingPreviewUrl) {
        URL.revokeObjectURL(pendingPreviewUrl);
        pendingPreviewUrl = null;
    }

    previewBody.innerHTML = "";
    previewName.textContent = file.name;


    if (file.type.startsWith("image/")) {

        pendingPreviewUrl =
            URL.createObjectURL(file);

        const img = document.createElement("img");

        img.src = pendingPreviewUrl;
        img.alt = file.name;

        previewBody.appendChild(img);
    }


    else if (file.type.startsWith("video/")) {

        pendingPreviewUrl =
            URL.createObjectURL(file);

        const video = document.createElement("video");

        video.src = pendingPreviewUrl;
        video.controls = true;

        previewBody.appendChild(video);
    }


    else {

        previewBody.innerHTML = `
            <div class="attachment-file-icon">
                📄
            </div>
        `;
    }


    attachmentPreview.classList.remove("hidden");
}


async function uploadSelectedFile() {

    if (!pendingFile || !currentRoom) {
        return;
    }

    if (sendAttachmentBtn.disabled) {
        return;
    }


    const file = pendingFile;

    const formData = new FormData();

    formData.append("file", file);
    formData.append("roomId", currentRoom.id);


    sendAttachmentBtn.disabled = true;
    cancelAttachmentBtn.disabled = true;

    sendAttachmentBtn.textContent = "Uploading...";


    try {

        const response = await axios.post(
            `${BASE_URL}/media/upload`,
            formData,
            {
                headers: {
                    Authorization: token
                }
            }
        );


        const uploadedMessage =
            response.data.message;


        if (uploadedMessage) {

            appendMessage(
                uploadedMessage,
                messagesContainer
            );

            scrollToBottom();
        }


        clearPendingAttachment();


    } catch (err) {

        console.log(err);

        if (
            err.response &&
            err.response.data &&
            err.response.data.message
        ) {

            alert(
                err.response.data.message
            );

        } else {

            alert(
                "Failed to upload file"
            );
        }


    } finally {

        sendAttachmentBtn.disabled = false;
        cancelAttachmentBtn.disabled = false;

        sendAttachmentBtn.textContent = "Send";
    }
}


function initializeMediaPreview() {

    attachBtn.addEventListener("click", () => {

        if (!currentRoom) {

            alert(
                "Open a conversation first"
            );

            return;
        }

        mediaFileInput.click();
    });


    mediaFileInput.addEventListener(
        "change",
        () => {

            const file =
                mediaFileInput.files[0];

            if (!file || !currentRoom) {
                return;
            }

            showAttachmentPreview(file);
        }
    );


    cancelAttachmentBtn.addEventListener(
        "click",
        clearPendingAttachment
    );


    sendAttachmentBtn.addEventListener(
        "click",
        uploadSelectedFile
    );
}