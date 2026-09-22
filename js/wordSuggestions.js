let wordSuggestionInput;
let wordSuggestionContainer;

// Fast local vocabulary. These suggestions render immediately without waiting
// for the network, while contextual AI suggestions are fetched in the background.
const commonWords = {
    the:1000,to:980,and:960,a:940,of:920,in:900,is:880,you:860,for:840,on:820,with:800,
    i:790,am:780,are:770,was:760,we:750,it:740,this:730,that:720,have:710,has:700,had:690,
    do:680,does:670,did:660,can:650,could:640,will:630,would:620,should:610,just:600,
    go:590,going:580,gone:570,good:560,great:550,get:540,getting:530,got:520,make:510,making:500,
    home:490,there:480,here:470,today:460,tomorrow:450,now:440,later:430,soon:420,back:410,
    yes:400,no:390,okay:380,ok:370,sure:360,thanks:350,thank:340,please:330,sorry:320,
    hello:310,hi:300,hey:290,bye:280,goodbye:270,maybe:260,probably:250,really:240,actually:230,
    what:220,when:210,where:200,why:190,who:180,how:170,which:160,whose:150,
    meet:140,meeting:135,come:130,coming:125,call:120,calling:115,send:110,sent:105,message:100,chat:95,
    talk:90,talking:85,wait:80,waiting:75,know:70,think:65,thinking:60,feel:55,feeling:50,
    want:48,wanted:46,need:44,needed:42,like:40,liked:38,love:36,loved:34,see:32,seen:30,
    look:28,looking:26,read:24,reading:22,watch:20,watching:18,work:16,working:14,done:12,ready:10,
    fine:9,nice:8,cool:7,awesome:6,fun:5,busy:4,free:3,available:2
};

const phraseSuggestions = {
    "how": ["are you?", "is your day going?", "was your day?"],
    "what": ["are you doing?", "are you up to?", "do you think?"],
    "where": ["are you?", "are you going?", "do you want to meet?"],
    "when": ["are you free?", "should we meet?", "can we talk?"],
    "are": ["you free?", "you doing?", "you coming?"],
    "can": ["you help me?", "we talk?", "you call me?"],
    "will": ["you be there?", "you come?", "you let me know?"],
    "i": ["am on my way.", "will call you later.", "think so too."],
    "hey": ["how are you?", "what are you doing?", "are you free?"],
    "hi": ["how are you?", "what's up?", "how is your day?"],
    "thanks": ["for your help!", "a lot!", "so much!"],
    "good": ["morning!", "night!", "to hear that!"],
    "see": ["you soon!", "you tomorrow!", "you there!"],
    "let": ["me know.", "me check.", "us talk later."]
};

let aiSuggestionTimer = null;
let lastAiRequestAt = 0;
let aiRequestSequence = 0;
const AI_DEBOUNCE_MS = 450;
const AI_MIN_INTERVAL_MS = 1400;

function initializeWordSuggestions() {
    wordSuggestionInput = document.getElementById("messageInput");
    wordSuggestionContainer = document.getElementById("predictiveSuggestions");

    if (!wordSuggestionInput || !wordSuggestionContainer) {
        return;
    }

    wordSuggestionInput.addEventListener("input", handleWordInput);
}

function handleWordInput() {
    const text = wordSuggestionInput.value;
    const trimmed = text.trim();

    if (!trimmed) {
        clearWordSuggestionTimer();
        hideWordSuggestions();
        return;
    }

    const words = trimmed.split(/\s+/);
    const currentWord = words[words.length - 1];
    const localSuggestions = getWordSuggestions(currentWord);
    const phraseKey = currentWord.toLowerCase();
    const phrases = phraseSuggestions[phraseKey] || [];

    renderWordSuggestions(localSuggestions, phrases, []);
    scheduleAISuggestions(text);
}

function getWordSuggestions(prefix) {
    const normalizedPrefix = prefix.toLowerCase();
    if (!normalizedPrefix) return [];

    return Object.entries(commonWords)
        .filter(([word]) => word.startsWith(normalizedPrefix) && word !== normalizedPrefix)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
        .map(([word]) => word);
}

function scheduleAISuggestions(text) {
    clearWordSuggestionTimer();

    if (text.trim().length < 3 || typeof BASE_URL === "undefined" || typeof token === "undefined") {
        return;
    }

    const now = Date.now();
    if (now - lastAiRequestAt < AI_MIN_INTERVAL_MS) return;

    aiSuggestionTimer = window.setTimeout(() => {
        requestAISuggestions(text);
    }, AI_DEBOUNCE_MS);
}

async function requestAISuggestions(text) {
    const requestId = ++aiRequestSequence;
    lastAiRequestAt = Date.now();

    try {
        const recentMessages = getRecentMessagesForWordAI();
        const response = await axios.post(
            `${BASE_URL}/ai/predictive`,
            { text, recentMessages },
            { headers: { Authorization: token } }
        );

        if (requestId !== aiRequestSequence || document.activeElement !== wordSuggestionInput) return;

        const suggestions = Array.isArray(response.data?.suggestions)
            ? response.data.suggestions.slice(0, 3).filter(Boolean)
            : [];

        if (suggestions.length) {
            const currentText = wordSuggestionInput.value;
            const words = currentText.trim().split(/\s+/);
            const currentWord = words[words.length - 1] || "";
            const local = getWordSuggestions(currentWord);
            const phrases = phraseSuggestions[currentWord.toLowerCase()] || [];
            renderWordSuggestions(local, phrases, suggestions);
        }
    } catch (error) {
        // Local suggestions remain available when AI is slow, unavailable, or rate-limited.
    }
}

function getRecentMessagesForWordAI() {
    if (typeof renderedMessages === "undefined") return [];
    return Array.from(renderedMessages.values())
        .slice(-5)
        .map(message => message?.content)
        .filter(Boolean);
}

function renderWordSuggestions(localSuggestions, phrases = [], aiSuggestions = []) {
    if (!wordSuggestionContainer) return;
    wordSuggestionContainer.innerHTML = "";

    const items = [];
    for (const item of [...localSuggestions, ...phrases, ...aiSuggestions]) {
        const value = String(item).trim();
        if (value && !items.some(existing => existing.toLowerCase() === value.toLowerCase())) {
            items.push(value);
        }
    }

    const limited = items.slice(0, 5);
    if (!limited.length) {
        hideWordSuggestions();
        return;
    }

    limited.forEach(suggestion => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "predictive-btn";
        button.textContent = suggestion;
        button.addEventListener("click", () => applyWordSuggestion(suggestion));
        wordSuggestionContainer.appendChild(button);
    });

    wordSuggestionContainer.classList.remove("hidden");
}

function applyWordSuggestion(suggestion) {
    const text = wordSuggestionInput.value;
    const words = text.trim().split(/\s+/);
    const currentWord = words[words.length - 1] || "";
    const isContinuation = suggestion.includes(" ") || /[.!?]$/.test(suggestion);

    if (isContinuation && words.length > 1) {
        words[words.length - 1] = `${currentWord} ${suggestion}`.trim();
        wordSuggestionInput.value = words.join(" ") + " ";
    } else {
        words[words.length - 1] = suggestion;
        wordSuggestionInput.value = words.join(" ") + " ";
    }

    wordSuggestionInput.focus();
    hideWordSuggestions();
}

function clearWordSuggestionTimer() {
    if (aiSuggestionTimer) {
        window.clearTimeout(aiSuggestionTimer);
        aiSuggestionTimer = null;
    }
}

function hideWordSuggestions() {
    clearWordSuggestionTimer();
    if (!wordSuggestionContainer) return;
    wordSuggestionContainer.innerHTML = "";
    wordSuggestionContainer.classList.add("hidden");
}

document.addEventListener("chatAppComponentsLoaded", initializeWordSuggestions);
