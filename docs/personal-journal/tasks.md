# tasks.md - Mission Control Personal Journal Implementation Checklist

- [x] **Task 1: Database Setup**
  - [x] Add `JournalEntry` and `JournalMedia` models to `prisma/schema.prisma`.
  - [x] Run `npx prisma db push` to synchronize local SQLite database schema.
  - [x] Run `npx prisma generate` to rebuild Prisma client types.

- [x] **Task 2: File Upload Endpoint**
  - [x] Create Next.js API handler at `app/api/journal/upload/route.ts`.
  - [x] Implement multi-part form parser writing files directly to `public/uploads/journal/`.
  - [x] Secure file extension mapping and directory verification.

- [x] **Task 3: Core CRUD REST API Route**
  - [x] Create API route at `app/api/journal/route.ts` for GET (read/filter) and POST (create).
  - [x] Create dynamic route at `app/api/journal/[id]/route.ts` for PUT (edit) and DELETE (delete).

- [x] **Task 4: Main Journal Timeline & Editor UI**
  - [x] Develop neomorphic editor component with integrated Mood Picker.
  - [x] Integrate native `SpeechRecognition` voice dictation toggle for the entry box.
  - [x] Build a file dropzone linked to the upload route.
  - [x] Develop the timeline stream component displaying entries with high-contrast text and responsive media cards.

- [x] **Task 5: Navigation Integration**
  - [x] Add a "Journal" link to the sidebar in `components/Sidebar.tsx` and mobile layout in `components/ClientLayout.tsx`.
  - [x] Verify full build compilation (`npx tsc --noEmit`).
  - [ ] Verify full build compilation (`npx tsc --noEmit`).
