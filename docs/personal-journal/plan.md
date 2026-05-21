# plan.md - Mission Control Personal Journal

## 1. Directory Structure & File Mapping
To implement this cleanly inside Mission Control, we will create/edit the following:

```
MissionControl/
├── prisma/
│   └── schema.prisma                # Register JournalEntry & JournalMedia models
├── app/
│   ├── api/
│   │   └── journal/
│   │       ├── route.ts             # POST (create entry), GET (fetch timeline/search)
│   │       ├── [id]/
│   │       │   └── route.ts         # PUT (edit entry), DELETE (remove entry)
│   │       └── upload/
│   │           └── route.ts         # POST (local multipart file upload processing)
│   └── journal/
│       └── page.tsx                 # Main personal journal timeline and editor page
└── components/
    └── Journal/
        ├── JournalTimeline.tsx      # Chronological card list of past entries
        ├── JournalEditor.tsx        # Styled input textarea with dictation & mood
        └── JournalMediaViewer.tsx   # Custom image/video lightbox carousel
```

## 2. Technical Stack & Implementation Details

### A. Database Migrations
1. Append the `JournalEntry` and `JournalMedia` models to `prisma/schema.prisma`.
2. Run `npx prisma db push` or `npx prisma migrate dev --name init_journal` to sync the SQLite local database.
3. Run `npx prisma generate` to update the Prisma Client.

### B. Local Media Upload API
We will construct a Next.js App Router API route at `/api/journal/upload` that:
1. Parses standard multi-part form data.
2. Generates unique filenames (e.g., using `crypto.randomUUID()` or timestamp-hashes).
3. Writes the binary buffer to the local disk at `C:\Users\tberg\Documents\_PROJECTS\MissionControl\public\uploads\journal/`.
4. Returns the absolute relative URL path (e.g., `/uploads/journal/<uuid>.<ext>`) for client-side consumption.

### C. Journal CRUD API Route
A Next.js API route at `/api/journal` that:
- **GET**: Reads, searches, and filters entries including linked media relations from SQLite, sorted by custom date or `createdAt DESC`.
- **POST**: Creates entries, binds upload-resolved media URLs, persists mood tags, and queries `wttr.in` for real-time weather information based on the entry's location before saving.
- **PUT / DELETE** (under `/api/journal/[id]`): Allows seamless inline updates and permanent deletion of logs (cascading media entries on delete).

### D. Tactile Frontend Page (`/journal`)
A highly responsive client page using the **Loosely Twisted** design system:
1. **Responsive Viewport Design**: Multi-column list-and-detail on desktop; switches to a single-column dashboard on mobile devices.
2. **Audio Dictation Assistant**: Uses native browser `webkitSpeechRecognition` to let Tom record journals via voice on his phone or laptop, transforming voice to text live inside the editing textarea.
3. **Responsive Upload Dropzone**: A simple `<input type="file" accept="image/*,video/*" multiple />` styled as a gorgeous neomorphic panel. Tapping it on mobile automatically opens the phone's native camera, video recorder, or photo library.
4. **Interactive Carousels**: Inline photo/video galleries displaying responsive thumbnails.

## 3. Implementation Steps & Phasing
* **Phase 1 (Database)**: Update `schema.prisma`, run database sync commands.
* **Phase 2 (APIs)**: Develop `/api/journal`, `/api/journal/upload`, and `/api/journal/[id]` file endpoints.
* **Phase 3 (Components)**: Develop neomorphic components (`JournalEditor`, `JournalTimeline`, etc.).
* **Phase 4 (Assembly)**: Assemble the final `/journal` page and add navigation hooks inside `components/Sidebar.tsx` and `components/ClientLayout.tsx`.
