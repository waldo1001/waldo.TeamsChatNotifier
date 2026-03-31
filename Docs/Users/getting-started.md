# Getting Started

Teams Chat Notifier is a lightweight desktop app that monitors your Microsoft Teams chats across one or more Microsoft 365 accounts and delivers native notifications when new messages arrive.

## Installation

### macOS

1. Download the `.dmg` file for your architecture (Intel or Apple Silicon).
2. Open the DMG and drag **Teams Chat Notifier** into your Applications folder.
3. Launch the app — it will appear as an icon in your **menu bar** (system tray).

### Windows

1. Download and run the `.exe` installer.
2. Follow the on-screen prompts.
3. The app launches automatically and appears in your **system tray** (notification area).

> The app runs in the system tray. There is no Dock icon on macOS — this is by design.

## Adding an Account

1. Open the app window by clicking the tray icon.
2. Click **Add Account** (shown on the Chats page if no accounts are connected, or in **Settings → Accounts**).
3. A **Sign in to Microsoft** dialog appears with a code (e.g. `ABCD1234`) and a browser window opens to `https://microsoft.com/devicelogin`.
4. Enter the code in the browser and sign in with your Microsoft 365 credentials.
5. Once authenticated, the dialog closes and your chats begin loading.

You can add **multiple accounts** from different Microsoft 365 tenants.

## Viewing Chats

The **Chats** tab displays all your conversations grouped by account:

- **Unread indicator**: A blue dot appears next to chats with unread messages.
- **Unread badge**: The account header shows the total unread count.
- **Message preview**: The last message sender and preview text are shown below the chat name.
- **Relative timestamps**: Times are shown as "2m ago", "3h ago", etc.
- **Search**: Use the search bar at the top to filter chats by name or message content.

Unread chats are sorted to the top automatically.

### Opening a Chat in Teams

Click the **↗** button on any chat to open it directly in the Microsoft Teams desktop app.

### Collapsing Accounts

Click the account header to collapse or expand its chat list.

## Notifications

When a new message arrives in any of your monitored chats:

- A **native desktop notification** appears with the sender name, chat name, and message preview.
- On macOS, the tenant name appears as the notification subtitle.
- Clicking the notification opens the chat in Teams.

Notifications are **not** shown for your own messages.

## Settings

Navigate to the **Settings** tab to configure:

### Accounts
- View all connected accounts with their display name and email address.
- **Sign out** individual accounts.
- **Add Account** to connect additional Microsoft 365 tenants.

### Notifications
- **Enable notifications** — Turn notifications on or off globally.
- **Show message preview** — When off, notifications show "New message" instead of the actual message content.

### Sync
- **Poll interval** — How often the app checks for new messages. Options: 15 seconds, 30 seconds, 1 minute, 5 minutes. Default: 30 seconds.
- **Show hidden chats** — Toggle visibility of chats you've hidden in Teams.

### System
- **Launch at login** — Automatically start the app when you log in to your computer.

## Tray Icon

- **Click** the tray icon to show/hide the app window.
- **Right-click** (or long-press on macOS) to see the context menu:
  - **Open** — Show the app window.
  - **Quit** — Exit the app completely.
- On macOS, the unread count appears next to the tray icon.

## Signing Out

1. Go to **Settings → Accounts**.
2. Click **Sign out** next to the account you want to remove.
3. All data for that account (chats, messages, tokens) is removed.

## Quitting the App

Closing the window does **not** quit the app — it hides it to the tray so you continue receiving notifications. To fully quit, right-click the tray icon and select **Quit**.
