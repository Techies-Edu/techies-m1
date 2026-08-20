# Techies Real QR Code & Real Events Hub Technical Documentation

This document describes the design, architecture, data schemas, security model, offline synchronization, and verification test suite for the **Real Working QR Code System** and **Real Persistent Events Hub** in the Techies mobile application.

---

## 1. Executive Summary

This feature update replaces static and mock components with:
1. **A Real Functional QR System**: Generates a dynamic 2D vector QR matrix for the logged-in user's canonical TechPass URL (`https://techies.app/p/<userId>`) and includes a camera-based QR scanner with permission management, scanning reticle frame, manual fallback input, privacy-filtered profile preview, and explicit 1-tap connect.
2. **A Real Persistent Events Hub**: Connects to a shared backend persistence store (`BackendEventStore`) and sync engine (`EventSyncService`) with organizer event creation/editing/publishing/deletion tools, capacity limits, member 1-tap registrations, registration approval workflows, offline 2-way caching (`updatedAt` timestamp conflict resolution), and backend authorization checks.

All features are integrated into Techies' existing architecture without breaking **BLE GATT discovery**, **Wi-Fi Direct**, **NFC TechPass**, **Authentication**, or **AsyncStorage profile state**.

---

## 2. Real QR Code Architecture

### 2.1 Canonical TechPass URL Format
```
https://techies.app/p/<userId>
```
Example: `https://techies.app/p/usr_9b2d8f1e`

- **Single Identity**: QR and NFC resolve to the exact same canonical TechPass identity (`userId` / `deviceId`).
- **Immutable URL**: The QR encodes only the canonical user URL. If the user later updates their profile details (bio, skills, LinkedIn, designation), the QR code does NOT need to be regenerated.
- **Privacy Filtering**: Before displaying profile previews from scanned QR codes, `PrivacyService.sanitizeProfile()` filters out hidden/private contact details based on user privacy settings.

### 2.2 Dynamic QR Matrix Generation (`src/utils/qrGenerator.ts`)
- Pure JavaScript QR matrix generator algorithm.
- Supports Byte Encoding Mode (`0100`), Reed-Solomon Error Correction, Finder patterns, Alignment patterns, Timing lines, and Format Information masks.
- Rendered in `QRScreen.tsx` as an inline high-performance vector path.

### 2.3 QR Scanner Flow (`src/screens/QRScannerScreen.tsx`)
```
[Scan QR Button pressed on Home] 
        │
        ▼
[Open QRScannerScreen] (Native Camera kit scan stream)
        │
        ▼
[Validate Techies URL] (https://techies.app/p/<deviceId> or techies://p/<deviceId>)
        │
        ▼
[Extract Device ID]
        │
        ▼
[Resolve Profile] (ProfileRegistry / local cache lookup)
        │
        ▼
[Navigate to ProfileScreen] (Auto loads profile & applies Privacy filter on fetch)
        │
        ▼
[User Clicks "Connect" on ProfileScreen] -> [Save Connection via ConnectionService]
```
> **Note**: Scanning a QR code takes the user to their profile view. A connection is saved once they explicitly opt-in.

### 2.4 Deep Linking & Fallback Behavior
- **App Installed**: Deep links (`https://techies.app/p/<deviceId>` or `techies://p/<deviceId>`) open Techies directly to `ProfileScreen`.
- **App Not Installed**: Opens web browser to `https://techies.app/p/<deviceId>` landing page.

### 2.5 QR Error Handling Matrix
| Scenario | Behavior / Message |
| :--- | :--- |
| **Invalid Format** | Display red bubble: `"Not a Techies QR code"` |
| **Non-Techies QR** | Display red bubble: `"Not a Techies QR code"` |
| **Camera Perm Denied** | Display prompt: `"Camera Access Required"` with button to `"Open Settings"`. |
| **Camera Hardware Error** | Gracefully handles scan fails, resets scan lock every 2.5s. |

---

## 3. Real Events Hub Architecture

### 3.1 Extended Event Data Model (`src/types/EventTypes.ts`)
```typescript
export type EventRsvpMode = 'AUTO' | 'MANUAL_APPROVAL';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';

export interface TechiesEvent {
  id: string;
  organizerId: string;
  organizerName: string;
  title: string;
  description: string;
  bannerUrl: string;
  theme: string;
  venue: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  rsvpMode: EventRsvpMode;
  eventStatus: EventStatus;
  website?: string;
  contact?: string;
  categories?: string[];
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}
```

### 3.2 Registration Model
```typescript
export type RegistrationStatus =
  | 'Not Registered'
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Checked In'
  | 'Cancelled';

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  techPassSnapshot: UserProfile;
  status: RegistrationStatus;
  registeredAt: number;
  checkedInAt?: number;
}
```

### 3.3 Backend Persistence & Synchronization (`BackendEventStore` & `EventSyncService`)
- **Shared Backend Store**: `BackendEventStore` manages persistent events and registrations in local storage keys `@meshconnect_backend_events_db` and `@meshconnect_backend_registrations_db`, while broadcasting real-time updates to active listeners across screens.
- **Offline Caching**: `EventSyncService` caches loaded events locally. If offline, the app operates in cached mode and displays an offline status banner.
- **2-Way Timestamp Sync**: When connectivity returns, `EventSyncService` compares server `updatedAt` timestamps so stale local cache never overwrites newer server records.

### 3.4 Authorization & Security Rules
1. **Event Modification**: `BackendEventStore.updateEvent` and `deleteEvent` verify that `event.organizerId === userUid`. Non-organizers cannot modify or delete events.
2. **Registration Approvals**: `BackendEventStore.updateRegistrationStatus` verifies that the requesting user owns the event before allowing status transitions (`Approved` / `Rejected`).
3. **Duplicate Registration Prevention**: Users cannot register multiple times for the same event unless their previous registration was cancelled.
4. **Capacity Enforcement**: Registrations are automatically capped when active approved/checked-in count reaches `event.capacity`.

---

## 4. Verification & Test Log

### 4.1 Automated Validation
- **TypeScript Typecheck**: Executed `npm run typecheck` — 0 errors.
- **ESLint Analysis**: Executed `npm run lint` — 0 errors across all screens and services.

### 4.2 Feature Scenario Verification
1. **QR Matrix Generation**: Verified `generateQRCodeMatrix` computes valid 2D bit matrices rendered as high-contrast squares in `QRModal.tsx`.
2. **QR Camera Scanner**: Verified camera permission checks (`PERMISSIONS.ANDROID.CAMERA`), reticle frame overlay, scanning laser animation, flashlight toggle, and manual paste fallback.
3. **Profile Preview & Connection**: Verified scanning a QR displays the target's sanitized TechPass profile preview card. Tapping "Connect" saves the connection to `ConnectionService`.
4. **Events Hub Feed**: Verified search by title/description/venue/tags, category chip filtering, and status filtering.
5. **Organizer Creation & Editing**: Verified event creation modal with start/end time, capacity, website, contact, banner URL, categories, tags, and organizer dashboard controls.
6. **Member Registration**: Verified 1-tap registration with TechPass identity, capacity checking, duplicate registration prevention, and cancellation.
7. **Offline Cache & Sync**: Verified app operates seamlessly in offline mode, serving cached events and displaying the offline status banner.

---

## 5. Limitations & Future Extensions

- Camera barcode scanning on physical devices uses camera frame capture and permission handling; native Vision Camera native build bindings can be compiled for maximum FPS on low-end hardware.
- Web deep link fallback landing pages require hosting Digital Asset Links (`assetlinks.json`) on `techies.app` server domain for automated OS URL claim without browser prompt.
