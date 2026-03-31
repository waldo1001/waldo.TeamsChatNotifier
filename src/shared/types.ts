export interface Tenant {
  id: string;               // tenantId GUID
  displayName: string;
  userPrincipalName: string;
  userId: string;           // AAD object ID of signed-in user
  addedAt: string;          // ISO 8601
  lastSyncedAt: string | null;
}

export type ChatType = 'oneOnOne' | 'group' | 'meeting' | 'unknownFutureValue';

export interface Chat {
  id: string;               // Graph chat ID (e.g. "19:...@thread.v2")
  tenantId: string;
  chatType: ChatType;
  topic: string | null;     // null for 1:1 chats
  memberNames: string[];    // Display names of all members
  lastMessagePreviewText: string | null;
  lastMessagePreviewSender: string | null;
  lastMessageAt: string | null;   // ISO: lastMessagePreview.createdDateTime
  lastReadAt: string | null;      // ISO: viewpoint.lastMessageReadDateTime
  isHidden: boolean;
  webUrl: string | null;          // Tenant-scoped deep link from Graph API
  lastPolledAt: string | null;
  updatedAt: string;
}

export interface Message {
  id: string;               // Graph message ID (epoch ms string)
  chatId: string;
  tenantId: string;
  senderId: string | null;
  senderDisplayName: string | null;
  bodyContent: string;      // HTML stripped to plain text
  createdAt: string;        // ISO 8601
  isSystemMessage: boolean;
  notified: boolean;
}

export interface AppSettings {
  pollIntervalSeconds: number;              // default: 30
  notificationsEnabled: boolean;            // default: true
  launchAtLogin: boolean;                   // default: true
  showMessagePreviewInNotification: boolean; // default: true
  showHiddenChats: boolean;                 // default: false
}

export const DEFAULT_SETTINGS: AppSettings = {
  pollIntervalSeconds: 30,
  notificationsEnabled: true,
  launchAtLogin: true,
  showMessagePreviewInNotification: true,
  showHiddenChats: false,
};

export type AuthStatus = 'signed-in' | 'signing-in' | 'error' | 'signing-out';

export interface TenantAuthState {
  tenantId: string;
  status: AuthStatus;
  errorMessage?: string;
}

export interface DeviceCodeInfo {
  userCode: string;
  verificationUri: string;
  expiresIn: number;  // seconds
  message: string;
}

export interface SyncStatus {
  tenantId: string;
  status: 'syncing' | 'idle' | 'error';
  errorMessage?: string;
}
