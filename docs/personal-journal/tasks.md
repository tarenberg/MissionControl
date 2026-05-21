# tasks.md - Mission Control Personal Journal Implementation Checklist

- [x] **Task 1: Database Setup**
  - [x] Add `JournalEntry` and `JournalMedia` models to `prisma/schema.prisma`.
  - [x] Run `npx prisma db push` to synchronize local SQLite database schema.
  - [x] Run `npx prisma generate` to rebuild Prisma client types.

- [ ] **Task 2: File Upload Endpoint**
  - [ ] Create Next.js API handler at `app/api/journal/upload/route.ts`.
  - [ ] Implement multi-part form parser writing files directly to `public/uploads/journal/`.
  - [ ] Secure file extension mapping and directory verification.

- [ ] **Task 3: Core CRUD REST API Route**
  - [ ] Create API route at `app/api/journal/route.ts` for GET (read/filter) and POST (create).
  - [ ] Create dynamic route at `app/api/journal/[id]/route.ts` for PUT (edit) and DELETE (delete).

- [ ] **Task 4: Main Journal Timeline & Editor UI**
  - [ ] Develop neomorphic editor component with integrated Mood Picker.
  - [ ] Integrate native `SpeechRecognition` voice dictation toggle for the entry box.
  - [ ] Build a file dropzone linked to the upload route.
  - [ ] Develop the timeline stream component displaying entries with high-contrast text and responsive media cards.

- [ ] **Task 5: Navigation Integration**
  - [ ] Add a "Journal" link to the sidebar in `components/Sidebar.tsx` and mobile layout in `components/ClientLayout.tsx`.
  - [ ] Verify full build compilation (`npx tsc --noEmit`).
