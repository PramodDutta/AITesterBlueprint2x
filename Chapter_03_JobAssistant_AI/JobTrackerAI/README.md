# Job Tracker Kanban Board

A local-first Job Tracker Kanban board built with React, Vite, Tailwind CSS (v4), and IndexedDB. Manage your job hunting workflow, applications, interviews, and offers securely inside your browser. No backend or cloud databases are required.

## Features

- **Local Data Persistence**: All data is stored in the browser using IndexedDB via the `idb` library.
- **Kanban Flow**: Move jobs seamlessly across `Wishlist`, `Applied`, `Follow-up`, `Interview`, `Offer`, and `Rejected` columns.
- **Drag & Drop**: Powered by `@dnd-kit/core` for seamless interactions and sortable lists.
- **Comprehensive Fields**: Store Job Title, Company, URLs, custom Notes, Date Applied, and Resumes Used.
- **Search & Filter**: Real-time filtering by company names and job titles.
- **Data Export & Import**: Backup your entire job search workflow into JSON formats and easily import it back across devices.
- **Theme Support**: Includes deep integration for dark mode matching the OS preferences.
- **Elegant & Minimal UI**: Utilizes modern UI tokens and micro-interactions optimized for both mobile web constraints and wider laptop screens.

## Technology Stack

- **Framework**: React 18 & Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS (Latest Version)
- **Database**: IndexedDB (`idb` wrapper)
- **DnD Utility**: `@dnd-kit/core`, `@dnd-kit/sortable`
- **Icons**: `lucide-react`
- **Date Handling**: `date-fns`

## Local Setup Instructions

1. **Clone the Repo and Navigate**
   ```bash
   cd JobTrackerAI
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run the Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

Navigate to `http://localhost:5174/` to launch the client. All actions are handled in realtime directly in the browser. 

## Structure 

- `src/db.ts`: Handles the initialization, queries, and schema implementations for `indexedDB`.
- `src/components/KanbanBoard.tsx`: Orchestrates the draggable Context environment.
- `src/components/JobModal.tsx`: Slide-over UI layer for Add/Edit inputs.
- `src/types.ts`: TS Interfaces shaping the core data formats globally natively supported across app states.
