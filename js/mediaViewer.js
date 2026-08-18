const mediaViewerOverlay =
    document.createElement("div");

mediaViewerOverlay.id = "mediaViewer";
mediaViewerOverlay.className =
    "media-viewer hidden";

mediaViewerOverlay.innerHTML = `
    <button
        type="button"
        class="media-viewer-close"
        id="mediaViewerCloseBtn"
    >
        &times;
    </button>

    <div
        class="media-viewer-content"
        id="mediaViewerContent"
    ></div>
`;

document.body.appendChild(
    mediaViewerOverlay
);


const mediaViewerContent =
    document.getElementById(
        "mediaViewerContent"
    );

const mediaViewerCloseBtn =
    document.getElementById(
        "mediaViewerCloseBtn"
    );


// ============================================================
// CLOSE VIEWER
// ============================================================

function closeMediaViewer() {

    const video =
        mediaViewerContent.querySelector(
            "video"
        );

    if (video) {
        video.pause();
    }

    mediaViewerContent.innerHTML = "";

    mediaViewerOverlay.classList.add(
        "hidden"
    );
}


mediaViewerCloseBtn.addEventListener(
    "click",
    closeMediaViewer
);


mediaViewerOverlay.addEventListener(
    "click",
    (event) => {

        if (
            event.target ===
            mediaViewerOverlay
        ) {
            closeMediaViewer();
        }

    }
);


document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Escape" &&
            !mediaViewerOverlay.classList.contains(
                "hidden"
            )
        ) {
            closeMediaViewer();
        }

    }
);


// ============================================================
// LOADING / ERROR
// ============================================================

function renderViewerLoading() {

    mediaViewerContent.innerHTML =
        `<div class="media-viewer-loading">
            Loading…
        </div>`;
}


function renderViewerError(text) {

    mediaViewerContent.innerHTML =
        `<div class="media-viewer-error">
            ${escapeHtml(text)}
        </div>`;
}


// ============================================================
// DOWNLOAD
// ============================================================

async function triggerMediaDownload(
    messageId,
    fallbackFileName
) {

    try {

        const response =
            await axios.get(
                `${BASE_URL}/media/${messageId}/download`,
                {
                    headers: {
                        Authorization: token
                    }
                }
            );

        const link =
            document.createElement("a");

        link.href =
            response.data.downloadUrl;

        link.download =
            response.data.fileName ||
            fallbackFileName ||
            "download";

        document.body.appendChild(link);

        link.click();

        link.remove();

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
                "Failed to download file. Please try again."
            );

        }

    }
}


// ============================================================
// OPEN MEDIA VIEWER
// ============================================================

async function openMediaViewer(message) {

    if (
        !message ||
        !message.id
    ) {
        return;
    }


    mediaViewerOverlay.classList.remove(
        "hidden"
    );

    renderViewerLoading();


    let fresh;

    try {

        const response =
            await axios.get(
                `${BASE_URL}/media/${message.id}/url`,
                {
                    headers: {
                        Authorization: token
                    }
                }
            );

        fresh =
            response.data;

    } catch (err) {

        console.log(err);

        if (
            err.response &&
            err.response.status === 403
        ) {

            renderViewerError(
                "You don't have access to this media."
            );

        } else if (
            err.response &&
            err.response.status === 404
        ) {

            renderViewerError(
                "This media could not be found."
            );

        } else {

            renderViewerError(
                "Couldn't load this media. Please try again."
            );
        }

        return;
    }


    if (
        mediaViewerOverlay.classList.contains(
            "hidden"
        )
    ) {
        return;
    }


    const messageType =
        fresh.messageType ||
        message.messageType;

    const fileName =
        fresh.fileName ||
        message.fileName ||
        "file";

    const mimeType =
        fresh.mimeType ||
        message.mimeType ||
        "";

    const url =
        fresh.mediaUrl;


    // IMAGE
    if (
        messageType === "image"
    ) {

        mediaViewerContent.innerHTML = `

            <div class="media-viewer-inner">

                <img
                    class="media-viewer-image"
                    src="${escapeHtml(url)}"
                    alt="${escapeHtml(fileName)}"
                >

                <div class="media-viewer-actions">

                    <button
                        type="button"
                        class="media-viewer-btn"
                        id="mediaViewerOpenBtn"
                    >
                        Open
                    </button>

                    <button
                        type="button"
                        class="media-viewer-btn primary"
                        id="mediaViewerDownloadBtn"
                    >
                        Download
                    </button>

                </div>

            </div>
        `;
    }


    // VIDEO
    else if (
        messageType === "video"
    ) {

        mediaViewerContent.innerHTML = `

            <div class="media-viewer-inner">

                <video
                    class="media-viewer-video"
                    controls
                    autoplay
                >

                    <source
                        src="${escapeHtml(url)}"
                        type="${escapeHtml(mimeType)}"
                    >

                    Your browser doesn't support
                    playing this video.

                </video>

                <div class="media-viewer-actions">

                    <button
                        type="button"
                        class="media-viewer-btn"
                        id="mediaViewerOpenBtn"
                    >
                        Open
                    </button>

                    <button
                        type="button"
                        class="media-viewer-btn primary"
                        id="mediaViewerDownloadBtn"
                    >
                        Download
                    </button>

                </div>

            </div>
        `;
    }


    // FILE
    else {

        mediaViewerContent.innerHTML = `

            <div class="media-viewer-file">

                <div class="media-viewer-file-icon">
                    📄
                </div>

                <div class="media-viewer-file-name">
                    ${escapeHtml(fileName)}
                </div>

                <div class="media-viewer-actions">

                    <button
                        type="button"
                        class="media-viewer-btn"
                        id="mediaViewerOpenBtn"
                    >
                        Open
                    </button>

                    <button
                        type="button"
                        class="media-viewer-btn primary"
                        id="mediaViewerDownloadBtn"
                    >
                        Download
                    </button>

                </div>

            </div>
        `;
    }


    document
        .getElementById(
            "mediaViewerOpenBtn"
        )
        .addEventListener(
            "click",
            () => {

                window.open(
                    url,
                    "_blank",
                    "noopener,noreferrer"
                );

            }
        );


    document
        .getElementById(
            "mediaViewerDownloadBtn"
        )
        .addEventListener(
            "click",
            () => {

                triggerMediaDownload(
                    message.id,
                    fileName
                );

            }
        );
}