
const forgotForm =
    document.getElementById("forgotForm");

const emailInput =
    document.getElementById("email");

const sendResetButton =
    document.getElementById("sendResetButton");

const forgotPasswordMessage =
    document.getElementById(
        "forgotPasswordMessage"
    );

let isSubmitting = false;

// FORM SUBMIT

forgotForm.addEventListener(
    "submit",
    sendResetRequest
);


async function sendResetRequest(event) {

    event.preventDefault();

    if (isSubmitting) {
        return;
    }

    const email =
        emailInput.value.trim();

    if (!email) {

        showMessage(
            "Please enter your email address.",
            "error"
        );

        return;
    }

    isSubmitting = true;

    setLoadingState(true);

    try {

        const response =
            await axios.post(
                "/password/forgotpassword",
                {
                    email
                }
            );

        showMessage(
            response.data.message ||
            "If an account exists for this email, a password reset link has been sent.",
            "success"
        );

        forgotForm.reset();
        setTimeout(() => {

        window.location.href = "/login.html";

        }, 1500);

    } catch (error) {

        console.error(
            "Forgot password error:",
            error
        );

        showMessage(
            error.response?.data?.message ||
            "Something went wrong. Please try again.",
            "error"
        );

    } finally {

        isSubmitting = false;

        setLoadingState(false);
    }
}

// LOADING STATE

function setLoadingState(isLoading) {

    sendResetButton.disabled =
        isLoading;

    emailInput.disabled =
        isLoading;

    if (isLoading) {

        sendResetButton.textContent =
            "Sending...";

    } else {

        sendResetButton.textContent =
            "Send Email";
    }
}


// MESSAGE

function showMessage(
    message,
    type
) {

    forgotPasswordMessage.textContent =
        message;

    forgotPasswordMessage.className =
        `form-message ${type}`;
}