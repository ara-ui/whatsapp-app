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

        // 1. Socket / global variables
        await loadScript(
            "/js/socketClient.js"
        );

        // 2. Chat list / sidebar
        await loadScript(
            "/js/home.js"
        );

        // 3. Message rendering
        await loadScript(
            "/js/messageRenderer.js"
        );

        // 4. Media viewer
        await loadScript(
            "/js/mediaViewer.js"
        );

        // 5. Media preview
        await loadScript(
            "/js/mediaPreview.js"
        );

        // 6. Chat window
        await loadScript(
            "/js/chatWindow.js"
        );

        await loadScript(
            "/js/aiSuggestions.js"
        );

        console.log(
            "🎉 ChatApp initialized successfully"
        );

        // Let modules that couldn't run at parse-time (because
        // they depend on other modules/DOM elements that load
        // after them — e.g. aiSuggestions.js needs the
        // aiSuggestions.html component's elements to exist)
        // know that the whole app is now wired up and ready.
        //
        // ROOT CAUSE FIX: aiSuggestions.js has always listened
        // for this exact event to call initializeAISuggestions()
        // (which wires up the smart-reply panel AND the
        // predictive-typing input listener). Nothing was ever
        // dispatching it, so initializeAISuggestions() never ran,
        // the panel elements stayed undefined, and both smart
        // replies and predictive typing silently failed.
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