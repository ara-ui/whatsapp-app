const SibApiV3Sdk = require("sib-api-v3-sdk");
const { getAppUrl } = require("../utils/config");

// Initialize Brevo client
const client = SibApiV3Sdk.ApiClient.instance;

// Set API Key
const apiKey = client.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

// Initialize Transactional Email API
const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const sendMail = async (receiverEmail, id) => {
    try {
        const appUrl = getAppUrl();

        const response = await tranEmailApi.sendTransacEmail({

            sender: {
                email: "zurikara9@gmail.com",
                name: "Connectly"
            },

            to: [
                {
                    email: receiverEmail
                }
            ],

            subject: "Reset Your Password",

            htmlContent: `
                <h2>Connectly</h2>
                <p>Click the button below to reset your password.</p>

                <a href="${appUrl}/password/resetpassword/${id}">
                    Reset Password
                </a>
            `
        });

        console.log("Mail sent successfully");

        return response;

    } catch (err) {

        console.error("Brevo email sending failed:", err.message);

        throw err;   // Let the controller know the mail failed
    }
};
module.exports = {
    sendMail
};