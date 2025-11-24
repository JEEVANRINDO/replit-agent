# Firestore Security Rules Deployment

This file contains instructions for deploying the Firestore security rules to your Firebase project.

## Prerequisites

1. Firebase CLI installed: `npm install -g firebase-tools`
2. Firebase project created (messaging-app-1bd04)
3. Firestore database enabled in your Firebase project

## Deployment Steps

### 1. Login to Firebase CLI

```bash
firebase login
```

### 2. Initialize Firebase in your project (if not already done)

```bash
firebase init firestore
```

Select your existing project: `messaging-app-1bd04`

When prompted for rules file, use: `firestore.rules`
When prompted for indexes file, use: `firestore.indexes.json`

### 3. Deploy the security rules

```bash
firebase deploy --only firestore:rules
```

This will deploy the rules defined in `firestore.rules` to your Firestore database.

## Security Rules Overview

The deployed rules ensure:

- **User Data**: Users can only read/write their own user documents
- **Prekey Bundles**: Anyone can read public prekey bundles, but only owners can write them
- **Chats**: Only participants can read and write to chat documents
- **Messages**: Only sender and recipient can read messages; messages are immutable after creation
- **Audit Trail**: Chats and messages cannot be deleted (security audit trail)

## Firestore Indexes

If you need composite indexes for queries, create `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "chats",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "participants", "arrayConfig": "CONTAINS" },
        { "fieldPath": "updatedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "messages",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "chatId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "ASCENDING" }
      ]
    }
  ]
}
```

Then deploy indexes:

```bash
firebase deploy --only firestore:indexes
```

## Verifying Deployment

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `messaging-app-1bd04`
3. Navigate to Firestore Database > Rules
4. Verify that the rules match those in `firestore.rules`

## Testing Rules

You can test the rules in the Firebase Console:
1. Go to Firestore Database > Rules
2. Click on "Rules Playground"
3. Test different scenarios (authenticated user, unauthenticated, etc.)

## Important Notes

- These rules enforce end-to-end encryption security by preventing unauthorized access
- Only encrypted ciphertext should be stored in messages
- Private keys never leave the user's device and are not stored in Firestore
- Public prekey bundles are readable by all authenticated users for session establishment
