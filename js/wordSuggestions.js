
let wordSuggestionInput;
let wordSuggestionContainer;

// COMMON WORD DICTIONARY

const commonWords = {

    "the": 1000,
    "to": 950,
    "and": 900,
    "a": 850,
    "of": 800,
    "in": 750,
    "is": 700,
    "you": 680,
    "for": 650,
    "on": 620,
    "with": 600,

    "i": 590,
    "am": 580,
    "are": 570,
    "was": 560,
    "we": 550,
    "it": 540,
    "this": 530,
    "that": 520,
    "have": 510,
    "has": 500,

    "go": 480,
    "going": 470,
    "good": 460,
    "great": 450,
    "got": 440,
    "get": 430,
    "getting": 420,

    "home": 410,
    "there": 400,
    "here": 390,
    "today": 380,
    "tomorrow": 370,
    "now": 360,
    "later": 350,

    "yes": 340,
    "no": 330,
    "okay": 320,
    "ok": 310,
    "sure": 300,
    "thanks": 290,
    "thank": 280,

    "please": 270,
    "sorry": 260,
    "hello": 250,
    "hi": 240,

    "can": 230,
    "could": 220,
    "will": 210,
    "would": 200,
    "should": 190,

    "meet": 180,
    "meeting": 170,
    "come": 160,
    "coming": 150,
    "call": 140,
    "calling": 130,

    "send": 120,
    "sent": 110,
    "message": 100,
    "chat": 90
};

// INITIALIZATION

function initializeWordSuggestions() {

    wordSuggestionInput =
        document.getElementById("messageInput");

    wordSuggestionContainer =
        document.getElementById(
            "predictiveSuggestions"
        );


    if (
        !wordSuggestionInput ||
        !wordSuggestionContainer
    ) {

        console.error(
            "❌ Word suggestion elements not found"
        );

        return;
    }


    console.log(
        "⌨️ Local word suggestions initialized"
    );


    wordSuggestionInput.addEventListener(
        "input",
        handleWordInput
    );
}

// HANDLE USER TYPING

function handleWordInput() {

    const text =
        wordSuggestionInput.value.trim();


    if (!text) {

        hideWordSuggestions();

        return;
    }


    const words =
        text.split(/\s+/);


    const currentWord =
        words[words.length - 1];


    if (!currentWord) {

        hideWordSuggestions();

        return;
    }


    const suggestions =
        getWordSuggestions(
            currentWord
        );


    renderWordSuggestions(
        suggestions
    );
}

// FIND MATCHING WORDS

function getWordSuggestions(
    prefix
) {

    const normalizedPrefix =
        prefix.toLowerCase();


    return Object.entries(
        commonWords
    )
        .filter(
            ([word]) =>
                word.startsWith(
                    normalizedPrefix
                )
        )
        .sort(
            ([, frequencyA],
             [, frequencyB]) =>
                frequencyB - frequencyA
        )
        .slice(0, 3)
        .map(
            ([word]) => word
        );
}
// RENDER SUGGESTIONS

function renderWordSuggestions(
    suggestions
) {

    wordSuggestionContainer.innerHTML =
        "";


    if (
        suggestions.length === 0
    ) {

        hideWordSuggestions();

        return;
    }


    suggestions.forEach(
        suggestion => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "predictive-btn";


            button.textContent =
                suggestion;


            button.addEventListener(
                "click",
                () => {

                    applyWordSuggestion(
                        suggestion
                    );

                }
            );


            wordSuggestionContainer.appendChild(
                button
            );

        }
    );


    wordSuggestionContainer.classList.remove(
        "hidden"
    );
}

// APPLY WORD SUGGESTION

function applyWordSuggestion(
    suggestion
) {

    const text =
        wordSuggestionInput.value;


    const words =
        text.split(/\s+/);


    words[words.length - 1] =
        suggestion;


    wordSuggestionInput.value =
        words.join(" ") + " ";


    wordSuggestionInput.focus();


    hideWordSuggestions();
}
// HIDE

function hideWordSuggestions() {

    if (!wordSuggestionContainer) {
        return;
    }


    wordSuggestionContainer.innerHTML =
        "";


    wordSuggestionContainer.classList.add(
        "hidden"
    );
}

// INITIALIZE AFTER COMPONENTS LOAD

document.addEventListener(
    "chatAppComponentsLoaded",
    initializeWordSuggestions
);