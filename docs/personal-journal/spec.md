# spec.md - Mission Control Personal Journal

## 1. Executive Summary
The Personal Journal inside Mission Control is a local-first, private, and secure diary designed for Tom to log personal life events, milestones, thoughts, and memories directly from desktop or phone over Tailscale. It prioritizes complete data ownership, absolute offline-first storage, and a rich, tactile user experience matching the "Loosely Twisted" neomorphic design engine.

## 2. Core Requirements
- **Local Media Storage**: All uploaded photos and videos must be stored locally in `public/uploads/journal/` on the home server. No external cloud bucket dependencies (S3, Cloudinary) are permitted.
- **Prisma Database Integration**: Journal entries, moods, metadata, and media links are stored locally in the existing SQLite database via Prisma.
- **Tailscale Responsive Web App**: Fully touch-optimized and responsive layout that conforms to phone viewports (<768px), allowing Tom to upload photos directly from his phone's native camera or gallery while on-the-go.
- **Rich Interactive Features**:
  - **Neomorphic Mood Picker**: Tactile, pressed/flat neomorphic toggle buttons to capture daily vibes (e.g., Happy ☀️, Reflective 🌌, Tired 🔋, Focused 🎯, Inspired 🎨).
  - **Voice-to-Text Dictation**: Continuous local browser SpeechRecognition button inside the entry text area, allowing quick, spoken thoughts to be transcribed in real-time.
  - **Photos & Videos Upload**: Native drag-and-drop area for desktop and native file pickers for mobile supporting JPEG, PNG, MP4, and MOV files.
  - **Timeline View**: A flowing chronological list of entries with inline media carousels and smooth expandable panels.
  - **Search & Filter**: Keyword search, date range selectors, and mood-based filters.

## 3. Database Schema Design (Prisma)
We will define two new models inside `prisma/schema.prisma`:
```prisma
model JournalEntry {
  id        String         @id @default(cuid())
  title     String?
  content   String
  mood      String?        // e.g., "happy", "reflective", "inspired"
  location  String?        // optional geotag or description (e.g. "New Haven, CT")
  weather   String?        // e.g. "☀️ 72°F" or "🌧️ 58°F"
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  media     JournalMedia[]
}

model JournalMedia {
  id             String       @id @default(cuid())
  journalEntryId String
  journalEntry   JournalEntry @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)
  url            String       // e.g., "/uploads/journal/cmp8fq..."
  type           String       // "image" or "video"
  filename       String
  createdAt      DateTime     @default(now())
}
```

## 4. Design Guidelines & Neomorphism (Loosely Twisted)
The UI will feature:
- Primary Soft Gray background (`#e0e5ec`).
- Concave "pressed" input zones (`neo-pressed`) for text entry.
- Convex "flat" cards (`neo-flat`) with soft, organic drop-shadows for entry logs.
- Interactive toggle buttons with spring-feel `neo-button` and `active:neo-button-active` styles.
- Custom upload area acting as a neomorphic slot that highlights when files are dragged over it.

## 5. Security & Privacy Constraints
- **Self-Contained Auth**: Access relies strictly on local network proximity (Tailscale tailnet verification or local loopback). No external authentication tokens or third-party tracking APIs.
- **Unencrypted Media Safety**: Files are stored inside `/public/uploads/journal/` which is hosted by the local server. Directory index listing is disabled to prevent accidental exposure over wider subnets if port-forwarded.

## 6. Weather Information Auto-Capture
- **Automated Stamping**: When a new journal entry is posted, the server will check for an attached location (defaulting to the home base of "New Haven, CT" if none is specified).
- **wttr.in Query**: The backend API will make a non-blocking background fetch to `https://wttr.in/<location>?format=%c+%t` (or similar quick format code) to resolve the weather condition emoji and current temperature.
- **Visual Display**: The resolved weather string is saved under the `weather` field in the database and beautifully rendered in the entry header (e.g., alongside the date and time) with subtle neomorphic badges.
