# Connectly

Connectly is a WhatsApp-style real-time chat application built with Node.js, Express, Socket.IO, MySQL/Sequelize, and a plain HTML/CSS/JavaScript frontend.

The project focuses on real-time communication, private messaging, connections, Spaces, media sharing, message management, notifications, replies, and AI-assisted smart replies.

---

## Features

### Authentication & Account Security
- JWT-based authentication
- Login and registration
- Forgot-password flow
- Password reset flow
- Protected routes using authentication middleware
- Password-reset enumeration protection
- Configurable application URL and CORS settings

### Private Chat
- One-to-one messaging
- Real-time messages with Socket.IO
- Message pagination using cursor-based loading
- Message delivery tracking
- Message read tracking
- Unread message indicators
- Online/presence handling
- Typing indicators
- Message previews

### Message Management
- Delete message for yourself
- Delete message for everyone
- Sender authorization for delete-for-everyone
- Archived-message support
- Reply to messages
- Quoted reply preview
- Jump to the original replied message
- Reply support for media messages

### Connections
- Send connection requests
- Accept or reject requests
- Pending connection requests
- Connected-user list
- Connection notifications
- Disconnect functionality
- Existing conversation history remains after disconnect

### Spaces
Connectly includes a lightweight group/workspace-style feature called **Spaces**.

- Create a Space with a name and purpose
- Add connected users
- Invite users by email
- Invitation-first membership flow
- Accept Space invitations before joining
- Incoming and outgoing invitations
- Sent invitation status
- Space member list
- Space information and purpose
- Leave a Space
- Real-time Space access/membership handling

### Media Sharing
- Image/media messages
- AWS S3 storage
- Private media access through signed URLs
- Media deletion when applicable
- Media replies with preserved metadata

### AI Smart Replies
- Context-aware smart reply suggestions
- Uses the latest messages as context
- Generates up to four suggestions
- Timeout protection so the UI does not remain stuck indefinitely
- Smart suggestions are triggered intentionally rather than on every keystroke

### Notifications
- Connection notifications
- Space invitation notifications
- Notification badge
- Toast-style notifications

### UI/UX
- Connectly branding
- Responsive chat interface
- Light/dark styling support through the project's design system
- Context menu for message actions
- Long-press support for message actions
- Modular CSS organized by responsibility

---

## Tech Stack

### Backend
- Node.js
- Express.js
- Socket.IO
- Sequelize
- MySQL
- JWT
- bcrypt
- Nodemailer/Brevo email integration

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript
- Axios
- Socket.IO client

### Cloud / External Services
- AWS S3 for private media storage
- Brevo for password-reset email delivery
- Google Gemini for AI smart replies

---

## Project Structure

```text
Connectly/
│
├── controller/
├── middleware/
├── models/
├── routes/
├── services/
├── utils/
├── public/
│   ├── css/
│   ├── js/
│   └── *.html
│
├── test/
├── app.js
├── server.js
├── package.json
├── .env.example
└── README.md
```

### Frontend CSS Structure

```text
public/css/
├── ai-smart-replies.css
├── attachment-preview.css
├── chat-actions.css
├── chat-layout.css
├── chat-window-core.css
├── forgotPassword.css
├── home.css
├── media-messages.css
├── media-viewer.css
├── message-reply.css
├── message-status.css
├── resetPassword.css
├── space-info.css
└── style.css
```

The CSS is separated by feature/responsibility instead of keeping the entire chat interface in one large stylesheet.

---

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd whatsapp-chat-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file based on `.env.example`.

The project uses environment variables for configuration such as:

- Database connection
- JWT configuration
- Application URL
- CORS configuration
- AWS S3 configuration
- Email configuration
- Gemini configuration
- SQL debug logging

**Never commit `.env` or real credentials to Git.**

### 4. Start the application

Use the project's configured start command from `package.json`.

For development, the project can be run with the configured development script.

### 5. Open the application

The frontend is served by the Express application.

The application uses:

```js
window.location.origin
```

for the frontend API base URL, so runtime frontend code does not depend on a hardcoded localhost API URL.

---

## Testing

The project includes automated regression tests.

Run:

```bash
npm test
```

The current verified checkpoint passed:

```text
27 tests passed
0 tests failed
```

Additional verification performed during the final project audit:

- JavaScript syntax checks passed
- No runtime hardcoded `localhost` references were found outside expected example/configuration files
- No obvious secret values were found in the project scan
- Git diff whitespace check passed during verification

The automated tests are primarily regression/feature-level tests. They do not replace live integration testing against external services such as AWS S3, Brevo, Gemini, or a production database.

---

## Security Considerations

The project includes several security-oriented practices:

- JWT authentication
- Protected API routes
- Password hashing
- Sender authorization for delete-for-everyone
- Room validation for replies
- Connection-based private messaging authorization
- Private S3 media with signed URLs
- Password-reset enumeration protection
- Environment-based secrets
- Configurable CORS
- Debug SQL logging disabled by default
- Request/response sensitive-data logging avoided where applicable

Real credentials should always remain outside the repository.

---

## Message Reply Flow

A reply stores the ID of the message being replied to.

The application validates that the target message belongs to the same room before creating the reply.

The UI then displays:

```text
↩ Original message
   Your reply
```

Users can select the reply indicator to jump back to the original message.

---

## Connection Flow

```text
User A
  │
  ├── Send connection request
  │
  ▼
User B
  │
  ├── Accept
  │
  ▼
Connected
  │
  ├── Private messaging enabled
  │
  └── Disconnect
        │
        └── New private messaging disabled
            Existing history remains
```

---

## Space Flow

```text
Create Space
     │
     ├── Add connected users
     │
     └── Invite by email
              │
              ▼
       Invitation Pending
              │
          Accept
              │
              ▼
       Space Membership
              │
              ▼
         Space Chat
              │
            Leave
              │
              ▼
       Membership Removed
```

---

## AI Smart Replies

Connectly provides optional AI-assisted reply suggestions.

The feature:

1. Reads the latest conversation context.
2. Sends a limited context window for suggestion generation.
3. Returns up to four suggestions.
4. Displays the suggestions in the chat UI.
5. Uses a timeout so the interface does not remain indefinitely in a loading state.

Predictive typing was intentionally removed. Smart replies are a separate, controlled feature.

---

## Environment

A `.env.example` file is included to document the expected configuration.

Do not upload:

```text
.env
```

to GitHub.

If credentials have ever been exposed publicly, rotate them immediately.

---

## Current Project Status

Connectly currently contains the major chat, connection, Space, media, reply, notification, and AI smart-reply features required for its demo build.

The project has been verified through automated regression tests and static checks before the current Git checkpoint.

---

## Future Improvements

Possible future improvements include:

- More comprehensive integration/end-to-end tests
- Production deployment configuration
- Database migrations instead of relying on schema synchronization during development
- Additional observability and monitoring
- Further performance optimization for large conversations
- Additional notification preferences

These are separate from the current demo feature set.

---

## Author

Mehnaz Ara Islam

B.Tech in Computer Engineering

Connectly was developed as a portfolio project to demonstrate practical backend, real-time communication, authentication, database, cloud storage, and frontend development skills.
