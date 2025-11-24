# SecureChat - End-to-End Encrypted Messaging

## Overview
SecureChat is a web-based end-to-end encrypted messaging application built with React, Firebase, and the Signal protocol. All messages are encrypted using libsignal-protocol-typescript, ensuring that only the intended recipients can read them.

## Architecture

### Frontend
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Shadcn UI components
- **State Management**: React Query for server state, React Context for auth and theme

### Backend
- **Authentication**: Firebase Authentication (email/password)
- **Database**: Firebase Firestore for encrypted messages and public key bundles
- **Encryption**: Signal Protocol via @signalapp/libsignal-client
- **Local Storage**: IndexedDB for private keys and session state

### Security
- **End-to-End Encryption**: All messages encrypted using Signal's Double Ratchet algorithm
- **Key Management**: Private keys stored locally in IndexedDB, never sent to server
- **Public Key Distribution**: Public prekey bundles stored in Firestore
- **Message Storage**: Only encrypted ciphertext stored in Firestore

## Project Structure

```
client/src/
├── components/
│   ├── chat/              # Chat UI components
│   │   ├── chat-sidebar.tsx
│   │   ├── chat-header.tsx
│   │   ├── chat-window.tsx
│   │   ├── message-bubble.tsx
│   │   ├── message-input.tsx
│   │   └── new-chat-dialog.tsx
│   ├── ui/                # Shadcn UI primitives
│   └── theme-toggle.tsx
├── contexts/
│   ├── auth-context.tsx   # Firebase auth management
│   └── theme-provider.tsx # Dark/light mode
├── lib/
│   ├── firebase.ts        # Firebase initialization
│   ├── queryClient.ts     # React Query setup
│   └── utils.ts
├── pages/
│   ├── auth.tsx          # Login/Signup page
│   ├── chat.tsx          # Main chat interface
│   └── not-found.tsx
├── App.tsx               # Root component with routing
├── main.tsx             # App entry point
└── index.css            # Global styles

shared/
└── schema.ts            # TypeScript types and Zod schemas

server/
├── app.ts              # Express server setup
├── routes.ts           # API routes (minimal, mostly Firebase)
└── storage.ts          # Storage interface (unused for Firebase)
```

## Data Models

### User
- `uid`: Firebase auth user ID
- `email`: User email address
- `createdAt`: Account creation timestamp

### Chat
- `id`: Unique chat ID
- `participants`: Array of user IDs
- `lastMessage`: Last message preview
- `createdAt/updatedAt`: Timestamps

### Message (Encrypted)
- `id`: Message ID
- `chatId`: Parent chat ID
- `senderId`: Sender UID
- `recipientId`: Recipient UID
- `type`: Signal message type
- `body`: Base64 encoded encrypted ciphertext
- `timestamp`: Send time

### Prekey Bundle (Public)
- `identityKey`: Public identity key
- `signedPreKey`: Signed prekey with signature
- `oneTimePreKeys`: Array of one-time prekeys
- `registrationId`: Device registration ID

## Features

### Implemented (Task 1 - Frontend)
✅ Beautiful, responsive UI with dark mode support
✅ Firebase email/password authentication
✅ Real-time conversation list
✅ Message sending and receiving (unencrypted in Task 1)
✅ Proper message bubbles with timestamps
✅ New chat creation flow
✅ User profile display
✅ Empty states and loading skeletons
✅ Encryption status indicators

### To Implement
- [ ] Signal protocol key generation (Task 2)
- [ ] Session establishment and key exchange (Task 2)
- [ ] Message encryption/decryption with SessionCipher (Task 2)
- [ ] IndexedDB storage for private keys (Task 2)
- [ ] Prekey bundle upload to Firestore (Task 2)
- [ ] Full E2EE message flow (Task 3)
- [ ] Key fingerprint verification UI (Task 3)
- [ ] Firestore security rules (Task 3)

## Environment Variables

```
VITE_FIREBASE_PROJECT_ID=messaging-app-1bd04
VITE_FIREBASE_APP_ID=1:443693550918:web:62cb22ffd4056014822947
VITE_FIREBASE_API_KEY=AIzaSyBCix7_qzRM8dSopBef0ORyFjvssjV32Lc
```

## Running the Application

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. The app will be available at the Replit webview URL

## Design Guidelines

The app follows professional messaging app design patterns:
- Clean, minimal interface inspired by Signal and WhatsApp
- Proper spacing and typography hierarchy
- Beautiful dark mode with proper contrast
- Smooth transitions and interactions
- Responsive design for all screen sizes

## User Preferences

- Typography: Inter for UI, JetBrains Mono for code/fingerprints
- Color scheme: Professional blue primary with neutral grays
- Layout: Sidebar + main chat area (desktop), stacked (mobile)
- Message bubbles: Rounded with proper alignment
- Encryption: Visible indicators throughout the UI

## Recent Changes

**2024-11-24**: Initial project setup
- Created complete frontend UI with all chat components
- Set up Firebase Authentication and Firestore
- Implemented theme provider for dark/light mode
- Added routing with protected routes
- Configured design system in Tailwind
