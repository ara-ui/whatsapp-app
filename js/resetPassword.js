// RESET PASSWORD

const resetForm =
    document.getElementById("resetForm");

const passwordInput =
    document.getElementById("password");

const confirmPasswordInput =
    document.getElementById(
        "confirmPassword"
    );

const passwordStrength =
    document.getElementById(
        "passwordStrength"
    );

const passwordError =
    document.getElementById(
        "passwordError"
    );

const updatePasswordBtn =
    document.getElementById(
        "updatePasswordBtn"
    );

// PASSWORD STRENGTH

passwordInput.addEventListener(
    "input",
    updatePasswordStrength
);


function updatePasswordStrength() {

    const password =
        passwordInput.value;

    if (!password) {

        passwordStrength.textContent =
            "Password strength: —";

        return;
    }

    let score = 0;

    if (password.length >= 5) {
        score++;
    }

    if (/[A-Z]/.test(password)) {
        score++;
    }

    if (/[a-z]/.test(password)) {
        score++;
    }

    if (/[0-9]/.test(password)) {
        score++;
    }

    if (/[^A-Za-z0-9]/.test(password)) {
        score++;
    }


    if (score <= 1) {

        passwordStrength.textContent =
            "Password strength: Weak";

    } else if (score <= 3) {

        passwordStrength.textContent =
            "Password strength: Medium";

    } else {

        passwordStrength.textContent =
            "Password strength: Strong";
    }
}

// CLEAR ERROR

passwordInput.addEventListener(
    "input",
    clearPasswordError
);

confirmPasswordInput.addEventListener(
    "input",
    clearPasswordError
);


function clearPasswordError() {

    passwordError.textContent = "";

    passwordError.style.color = "";
}

// FORM SUBMIT

resetForm.addEventListener(
    "submit",
    updatePassword
);

// UPDATE PASSWORD

async function updatePassword(event) {

    event.preventDefault();

    const password =
        passwordInput.value;

    const confirmPassword =
        confirmPasswordInput.value;


    // Password length

    if (password.length < 5) {

        showError(
            "Password must be at least 5 characters."
        );

        return;
    }


    // Confirm password

    if (
        password !==
        confirmPassword
    ) {

        showError(
            "Passwords do not match."
        );

        return;
    }


    // Get UUID from URL

    const resetToken =
        getResetToken();


    if (!resetToken) {

        showError(
            "Invalid password reset link."
        );

        return;
    }


    setLoadingState(true);


    try {

        const response =
            await axios.post(
                `/password/updatepassword/${encodeURIComponent(resetToken)}`,
                {
                    password
                }
            );


        showSuccess(
            response.data.message ||
            "Password updated successfully."
        );


        updatePasswordBtn.textContent =
            "Password Updated";


        passwordInput.disabled = true;

        confirmPasswordInput.disabled = true;


        setTimeout(
            () => {

                window.location.href =
                    "/login.html";

            },
            1500
        );


    } catch (error) {

        console.error(
            "Reset password error:",
            error
        );


        showError(
            error.response?.data?.message ||
            "Something went wrong. Please try again."
        );


        setLoadingState(false);
    }
}

// GET RESET TOKEN

function getResetToken() {

    const pathParts =
        window.location.pathname
            .split("/")
            .filter(Boolean);


    if (
        pathParts.length === 0
    ) {
        return null;
    }


    const token =
        pathParts[pathParts.length - 1];


    if (
        !token ||
        token === "resetpassword"
    ) {
        return null;
    }


    return token;
}

// LOADING STATE

function setLoadingState(
    isLoading
) {

    updatePasswordBtn.disabled =
        isLoading;

    if (isLoading) {

        updatePasswordBtn.textContent =
            "Updating Password...";

    } else {

        updatePasswordBtn.textContent =
            "Update Password";
    }
}

// ERROR

function showError(message) {

    passwordError.style.color =
        "#dc3545";

    passwordError.textContent =
        message;
}

// SUCCESS

function showSuccess(message) {

    passwordError.style.color =
        "#15803d";

    passwordError.textContent =
        message;
}