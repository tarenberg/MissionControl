# Google Home Integration: Nest Studio Bridge

## Overview
Integrate Google Nest devices (Thermostat, Camera) into Mission Control via the Nest Device Access (SDM) API. This creates a "Studio Bridge" widget that displays live environment data and camera snapshots in the Mission Control dashboard.

## Architecture
```
┌─────────────────────┐
│  Mission Control    │
│  (React/Next.js)    │
└──────────┬──────────┘
           │
           └──> Studio Environment Widget
               ├─ Live Nest Cam Snapshot
               ├─ Thermostat (Temp/Humidity)
               └─ Security Event Log

┌──────────────────────────────┐
│ Google Nest Device Access    │
│ SDM API                      │
├──────────────────────────────┤
│ ✓ Nest Thermostat            │
│ ✓ Nest Cameras               │
│ ✓ Nest Doorbell              │
│ ✓ Nest Hub Max               │
└──────────────────────────────┘
```

## Setup Phase 1: Google Cloud Project

### Steps
1. **Register for Device Access**
   - URL: https://console.nest.google.com/device-access
   - Cost: $5 (one-time)
   - Accept Terms of Service

2. **Create Google Cloud Project**
   - Via Device Access Console → "Enable the API and get an OAuth 2.0 Client ID"
   - Enable: Smart Device Management API
   - OAuth Redirect URI: `https://www.google.com`
   - Download `credentials.json`

3. **Create Device Access Project**
   - Return to Device Access Console
   - Create Project → Enter name
   - Paste OAuth 2.0 Client ID from GCP
   - Enable Events (optional; start with disabled)
   - Note the **Project ID** (UUID format)

### Credentials to Store
- OAuth 2.0 Client ID
- OAuth 2.0 Client Secret
- Device Access Project ID
- Authorized Nest device list

## Setup Phase 2: Mission Control Backend

### New Route: `/api/studio/environment`
```typescript
// app/api/studio/environment/route.ts
// GET request returns:
{
  "thermostat": {
    "name": "Dining Room Thermostat",
    "temperature": 72,
    "humidity": 45,
    "mode": "HEAT_COOL",
    "lastUpdated": "2026-05-02T22:55:00Z"
  },
  "cameras": [
    {
      "id": "...",
      "name": "Umbrella Craftsman",
      "snapshotUrl": "...",
      "lastMotion": "2026-05-02T18:30:00Z"
    }
  ],
  "events": [
    {
      "type": "motion",
      "camera": "Umbrella Craftsman",
      "timestamp": "2026-05-02T18:30:00Z"
    }
  ]
}
```

### Authentication
- Use OAuth 2.0 with stored refresh token
- Cache snapshots for 30-60 seconds (rate limit)
- Refresh events on every dashboard load

## Setup Phase 3: Mission Control Frontend

### New Component: `StudioEnvironment.tsx`
- Display thermostat stats (large card)
- Live camera snapshot with motion badge
- Recent events timeline
- Status indicators (online/offline)

### Dashboard Integration
- Add to main dashboard (right sidebar or above projects)
- Toggle visibility in settings
- Optional: Add to mobile layout

## Timeline & Effort
- **Phase 1 (Setup)**: 10 minutes (manual, one-time)
- **Phase 2 (Backend)**: 2-3 hours (SDK integration, caching, error handling)
- **Phase 3 (Frontend)**: 2-3 hours (React component, styling, interactivity)
- **Testing & Polish**: 1-2 hours

**Total: 5-8 hours over 1-2 sessions**

## Future Enhancements
- Real-time event streaming via Pub/Sub
- Studio automation triggers (e.g., "Away Mode" for sprints)
- Historical temperature/humidity logging
- Environmental alerts (too dry/humid for painting)
- Integration with Nightly Sprint logs

## Blocked By
- Tom's $5 Device Access registration
- Google Cloud setup credentials

---
*Updated: 2026-05-02 by Muffin 🧁*
