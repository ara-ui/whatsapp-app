// CHAT SCROLL

function scrollToLatest() {

    if (!messagesContainer) {
        return;
    }

    requestAnimationFrame(() => {

        messagesContainer.scrollTop =
            messagesContainer.scrollHeight;

    });
}

// SCROLL AFTER MESSAGE HISTORY LOAD

function scrollToLatestAfterHistory() {

    if (!messagesContainer) {
        return;
    }

    requestAnimationFrame(() => {

        messagesContainer.scrollTop =
            messagesContainer.scrollHeight;

    });
}