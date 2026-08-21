async function loadComponent(elementId, componentPath) {

    const element = document.getElementById(elementId);

    if (!element) {
        console.error(
            `❌ Container not found: ${elementId}`
        );
        return false;
    }

    try {

        const response = await fetch(componentPath);

        if (!response.ok) {
            throw new Error(
                `${response.status} ${response.statusText}`
            );
        }

        element.innerHTML = await response.text();

        console.log(
            `✅ Component loaded: ${componentPath}`
        );

        return true;

    } catch (error) {

        console.error(
            `❌ Failed to load component: ${componentPath}`,
            error
        );

        return false;
    }
}


async function loadComponents() {

    console.log("🔄 Loading UI components...");

    await loadComponent(
        "sidebarHeader",
        "/components/sidebarHeader.html"
    );

    await loadComponent(
        "chatListSection",
        "/components/chatList.html"
    );

    await loadComponent(
        "chatWindowHeader",
        "/components/chatWindowHeader.html"
    );

    await loadComponent(
        "messagesContainer",
        "/components/messages.html"
    );

    await loadComponent(
        "aiSuggestions",
        "/components/aiSuggestions.html"
    );

    await loadComponent(
        "chatInput",
        "/components/chatInput.html"
    );

    await loadComponent(
        "personalChatModal",
        "/components/personalChatModal.html"
    );

    await loadComponent(
        "groupChatModal",
        "/components/groupChatModal.html"
    );

    console.log("✅ UI components finished loading");

    initializeApplication();
}


function loadScript(src) {

    return new Promise((resolve, reject) => {

        const script =
            document.createElement("script");

        script.src = src;

        script.onload = () => {

            console.log(
                `✅ Script loaded: ${src}`
            );

            resolve();
        };

        script.onerror = () => {

            console.error(
                `❌ Script failed: ${src}`
            );

            reject(
                new Error(`Failed to load ${src}`)
            );
        };

        document.body.appendChild(script);
    });
}


async function initializeApplication() {

    console.log(
        "🚀 Initializing ChatApp..."
    );

    try {

        // Socket / global variables
        await loadScript(
            "/js/socketClient.js"
        );

        // Chat list / sidebar
        await loadScript(
            "/js/home.js"
        );

        await loadScript("/js/chatState.js");
        
        // Message rendering
        await loadScript(
            "/js/messageRenderer.js"
        );

        // Chat scrolling
        await loadScript(
            "/js/chatScroll.js"
        );

        // Message operations
        await loadScript(
            "/js/chatMessages.js"
        );
        // Media viewer
        await loadScript(
            "/js/mediaViewer.js"
        );

        // Media preview
        await loadScript(
            "/js/mediaPreview.js"
        );

        // Chat window
        await loadScript(
            "/js/chatWindow.js"
        );

        await loadScript(
            "/js/aiSuggestions.js"
        );


        console.log(
            "🎉 ChatApp initialized successfully"
        );

         document.dispatchEvent(
            new CustomEvent("chatAppComponentsLoaded")
        );

    } catch (error) {

        console.error(
            "❌ ChatApp initialization failed:",
            error
        );
    }
}


loadComponents();