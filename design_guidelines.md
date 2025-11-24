# Design Guidelines: End-to-End Encrypted Chat Application

## Design Approach

**Selected Approach:** Design System + Messaging App Reference  
**Primary References:** Signal, Telegram Web, WhatsApp Web  
**Rationale:** Security-focused messaging requires trusted, familiar patterns with emphasis on clarity, efficiency, and trustworthiness over visual novelty.

---

## Core Design Elements

### Typography
**Font Family:** Inter or System UI Stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`)  
**Hierarchy:**
- **App Header/Brand:** 600 weight, text-xl
- **Chat Contact Names:** 600 weight, text-base
- **Message Sender Names:** 500 weight, text-sm
- **Message Content:** 400 weight, text-base
- **Timestamps/Metadata:** 400 weight, text-xs
- **Key Fingerprints:** Mono font (JetBrains Mono or monospace), text-sm
- **Form Labels:** 500 weight, text-sm
- **Buttons:** 500 weight, text-sm

### Layout System
**Spacing Primitives:** Use Tailwind units of **2, 3, 4, 6, 8, 12, 16** (e.g., p-4, gap-3, mb-6)  
**Container Strategy:**
- App Shell: Fixed full viewport (h-screen, w-screen)
- Two/three-column layout: Sidebar (w-80) + Main chat area (flex-1) + (optional) Info panel (w-72)
- Mobile: Stack vertically, full-width panels with slide-in navigation

**Grid System:**
- Chat list: Single column, full-width items
- Message bubbles: Max-width constraints (max-w-md for sent, max-w-lg for received)
- Settings panels: Single column forms with consistent field widths

---

## Component Library

### Authentication Views
**Login/Signup Cards:**
- Centered card layout (max-w-md mx-auto)
- Vertical form fields with gap-4
- Input fields: Full-width with p-3, rounded-lg borders
- Submit buttons: Full-width, p-3, rounded-lg
- Secondary actions (switch to login/signup): text-sm links below form

### Main Chat Interface Layout
**Three-Panel Structure:**

**Left Sidebar (Conversation List):**
- Header: User profile avatar (h-10 w-10 rounded-full) + username + settings icon button
- Search bar: p-2, rounded-full, sticky at top
- Conversation items: p-3 each, with gap-3 between avatar and content
  - Avatar: h-12 w-12 rounded-full
  - Name + last message preview (text-sm truncate)
  - Timestamp (text-xs, absolute top-right)
  - Unread badge: h-5 w-5 rounded-full with count

**Center Panel (Active Chat):**
- Header: Contact name + status + action buttons (h-16 fixed)
  - Avatar: h-10 w-10 rounded-full
  - Contact name: text-lg font-semibold
  - Status indicator: text-xs (online/offline/typing)
  - Action icons: Info, call, search (icon buttons)
- Message area: flex-1 overflow-y-auto with p-4
- Message input: Fixed bottom, p-4 with rounded-full input + send button

**Right Panel (Optional Info Panel):**
- Contact details: Avatar (h-24 w-24), name, status
- Encryption info section with key fingerprint display
- Shared media grid (if applicable)
- Action buttons: Block, clear chat, etc.

### Message Bubbles
**Sent Messages (Right-aligned):**
- max-w-md, ml-auto, rounded-2xl, rounded-tr-sm
- Padding: px-4 py-2
- Timestamp: text-xs, mt-1, text-right

**Received Messages (Left-aligned):**
- max-w-md, mr-auto, rounded-2xl, rounded-tl-sm
- Padding: px-4 py-2
- Sender name above (in group contexts): text-xs font-medium mb-1
- Timestamp: text-xs, mt-1

**Message Grouping:**
- Gap-1 for consecutive messages from same sender
- Gap-4 between different senders

### Security Features
**Key Fingerprint Display:**
- Monospace font display in dedicated card
- Grid layout: 4x4 or 5x4 blocks of fingerprint segments
- "Verified" badge with icon when confirmed
- QR code option for scanning (h-48 w-48)

**Encryption Status Indicator:**
- Small lock icon + "End-to-end encrypted" text in chat header
- text-xs with icon size w-3 h-3

### Forms & Inputs
**Text Inputs:**
- Border width: 1px, rounded-lg
- Padding: p-3
- Focus state: ring-2 offset-2
- Error state: Border change + text-xs error message below (mt-1)

**Buttons:**
- Primary: px-6 py-3, rounded-lg, font-medium
- Secondary: px-4 py-2, rounded-lg, border-2
- Icon buttons: p-2, rounded-full, w-10 h-10 flex items-center justify-center

### Modals & Overlays
**Modal Structure:**
- Fixed overlay with backdrop blur
- Content card: max-w-lg, rounded-xl, p-6
- Header: text-xl font-semibold mb-4
- Action buttons at bottom: flex gap-3 justify-end

**Toast Notifications:**
- Fixed bottom-right positioning
- Rounded-lg, px-4 py-3
- Icon + message + close button
- Auto-dismiss after 5s with slide-in/out animation (minimal)

---

## Responsive Behavior

**Mobile (<768px):**
- Single panel view with navigation transitions
- Sidebar slides in from left
- Message input: Simplified with attachment button
- Bottom navigation for main actions

**Tablet (768px-1024px):**
- Two-panel: Sidebar + chat
- Info panel accessible via overlay/modal

**Desktop (>1024px):**
- Full three-panel layout
- Fixed sidebar widths with flexible center panel

---

## Animations
**Minimal & Purposeful Only:**
- Message send: Quick scale (scale-95 to scale-100, 150ms)
- Typing indicator: Subtle pulse on dots
- Modal/panel transitions: 200ms ease-in-out
- **No scroll animations, no parallax, no decorative motion**

---

## Accessibility
- All interactive elements: min-h-11 (44px touch target)
- Form labels explicitly associated with inputs
- ARIA labels for icon-only buttons
- Keyboard navigation support for chat list and messages
- Focus visible indicators on all interactive elements
- Screen reader announcements for new messages

---

## Images
No hero images needed. Avatar placeholders use initials in centered circles when no profile photo exists. Use Font Awesome or Heroicons for all UI icons.