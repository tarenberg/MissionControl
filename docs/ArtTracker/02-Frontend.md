# ArtTracker Frontend Documentation

The ArtTracker frontend is built using **React** and **Vite**, providing a modern, fast, and interactive user experience. It consumes data from the PHP backend API and presents it through various components.

## 1. Project Setup and Entry Point

*   **Technologies:** React, Vite (build tool), TypeScript.
*   **Entry File (`main.tsx`):** This is the application's entry point. It sets up the React application by creating a root and rendering the `App` component within `React.StrictMode`.
    ```typescript
    import { StrictMode } from 'react'
    import { createRoot } from 'react-dom/client'
    import './index.css' // Global CSS
    import App from './App.tsx'

    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    ```

## 2. Main Application Component (`App.tsx`)

*   **Purpose:** The `App.tsx` component serves as a wrapper and the primary container for the `Dashboard`. It imports global CSS and renders the `Dashboard` component, passing initial application-wide props.
*   **Key Functionality:**
    *   Imports `Dashboard.tsx`.
    *   Passes `appName` and `artistName` props to the `Dashboard` component.
    ```typescript
    import React from 'react';
    import Dashboard from './Dashboard';
    import './index.css';

    function App() {
      return (
        <div className="App">
          <Dashboard appName="ArtTracker" artistName="Tarenberg" />
        </div>
      );
    }

    export default App;
    ```

## 3. Dashboard Component (`Dashboard.tsx`) - Core Functionality

The `Dashboard.tsx` file is the heart of the ArtTracker frontend. It's a large functional React component responsible for managing all application data, UI state, API interactions, and rendering the various sections of the dashboard.

### 3.1. Data Structures (Interfaces)

The component defines several TypeScript interfaces to ensure type safety and clearly define the shape of data used throughout the application:

*   **`Artwork`**: Represents an individual artwork.
    ```typescript
    interface Artwork {
      id: number;
      title: string;
      artistName: string;
      year: number;
      medium: string;
      dimensions: string;
      status: 'In Studio' | 'Exhibited' | 'Sold' | 'Archived';
      location: string; // Maps to 'description' in DB
      price?: number;
      imageUrl?: string;
      _available?: number; // Internal frontend use
      _originalPriceString?: string; // Internal frontend use
    }
    ```
*   **`Cost`**: Represents an expense.
    ```typescript
    interface Cost {
      id: number;
      date: string;
      category: string;
      description: string;
      amount: number;
      currency: string;
      artworkId?: number; // Optional, links to an artwork
    }
    ```
*   **`Deadline`**: Represents an upcoming deadline for shows, submissions, etc.
    ```typescript
    interface Deadline {
      id: number;
      title: string;
      date: string;
      description?: string;
      link?: string;
      location?: string;
      fee?: string;
      submittedArtworks?: {id: number, imageUrl: string}[]; // Artworks linked to this deadline
    }
    ```
*   **`Show`**: Represents an art show or call for entry.
    ```typescript
    interface Show {
      id: number;
      title: string;
      location: string;
      due_date: string;
      fee: string;
      description: string;
      link: string;
      scope: 'L' | 'R' | 'N' | 'I'; // Local, Regional, National, International
      user_status: 'Pending' | 'Interested' | 'Not Interested' | 'Entered';
    }
    ```

### 3.2. State Management (`useState`)

The `Dashboard` component heavily relies on `useState` hooks to manage:
*   **Core Data:** `artworks`, `costs`, `deadlines`, `shows`.
*   **Loading States:** `isLoadingArt`, `isLoadingCosts`, `isLoadingDeadlines`, `isLoadingShows`.
*   **UI States:** `isArtworksCollapsed`, `selectedDeadlineId`.
*   **Filtering/Sorting:** `searchTerm`, `filterStatus`, `sortBy`.
*   **Modal Visibility & Form Data:**
    *   `isAddArtworkOpen`, `editingArtworkId`, `newArtwork`
    *   `isAddCostOpen`, `editingCostId`, `newCost`
    *   `isAddDeadlineOpen`, `editingDeadlineId`, `newDeadline`
    *   `isAddShowOpen`, `newShow`
    *   `enteringShow` (for the "Enter Show" modal), `enterChecklist`, `enterFeeAmount`, `enterSelectedArtworks`, `enterConfirmationNum`.

### 3.3. Data Fetching (`useEffect` and `fetch` functions)

*   **Initial Data Load:** A primary `useEffect` hook runs once on component mount to initiate fetching all four main data types:
    ```typescript
    useEffect(() => { fetchArtworks(); fetchCosts(); fetchDeadlines(); fetchShows(); }, []);
    ```
*   **Dedicated Fetch Functions:** Separate functions (`fetchArtworks`, `fetchCosts`, `fetchDeadlines`, `fetchShows`) are defined to encapsulate the logic for fetching data from specific backend endpoints. They use the `fetch` API, parse JSON responses, update state, and manage loading indicators.
    *   Example: `fetchArtworks`
        ```typescript
        const fetchArtworks = () => {
          setIsLoadingArt(true);
          fetch(`http://192.168.1.53:8080/tools/ArtTrackerDashboard/api/artworks.php?t=${Date.now()}`)
            .then(res => res.json())
            .then(data => { if (Array.isArray(data)) setArtworks(data); setIsLoadingArt(false); })
            .catch(err => { console.error(err); setIsLoadingArt(false); });
        };
        ```
    *   Note the use of `http://192.168.1.53:8080/tools/ArtTrackerDashboard/api/` as the base URL for API calls.

### 3.4. API Interaction (CRUD Operations)

The `Dashboard` component includes handlers for creating, reading, updating, and deleting data via the PHP API:

*   **Artworks:**
    *   `handleSaveArtwork`: Sends `POST` (for new) or `PUT` (for edit) requests to `artworks.php`.
    *   `handleDeleteArtwork`: Sends `DELETE` request to `artworks.php`.
    *   `openEditArtwork`: Populates the artwork modal for editing.
*   **Costs:**
    *   `handleSaveCost`: Sends `POST`/`PUT` requests to `costs.php`.
    *   `handleDeleteCost`: Sends `DELETE` request to `costs.php`.
    *   `openEditCost`: Populates the cost modal for editing.
*   **Deadlines:**
    *   `handleSaveDeadline`: Sends `POST`/`PUT` requests to `deadlines.php`.
    *   `handleDeleteDeadline`: Sends `DELETE` request to `deadlines.php`.
    *   `openEditDeadline`: Populates the deadline modal for editing.
    *   `handleToggleSubmission`: Sends a `POST` request to `deadlines.php` with `action: 'toggle_submission'` to link/unlink artworks.
*   **Shows:**
    *   `handleShowStatusChange`: Sends a `PUT` request to `shows.php` to update a show's `user_status`. If status becomes 'Entered', it also creates a new deadline via `deadlines.php`.
    *   `openEnterModal`: Prepares data for the "Enter Show" modal.
    *   `handleConfirmEntry`: Orchestrates multiple API calls: updates show status (`shows.php`), logs fee as a cost (`costs.php` if applicable), and creates a deadline (`deadlines.php` if applicable).
    *   `handleSaveShow`: Sends a `POST` request to `shows.php` to add a new show.

### 3.5. UI Sections and Components

The `Dashboard` renders several distinct sections:

*   **Header:** Displays application title (`appName`), a "MySQL: CONNECTED" status, navigation links (Artworks, Costs, ROI, Deadlines, Shows), and the `artistName`.
*   **Artworks Overview (`#artworks`):**
    *   Collapsible section.
    *   Search input (`searchTerm`).
    *   Filter by status (`filterStatus`: All, In Studio, Exhibited, Sold, Archived).
    *   Sort by options (`sortBy`: Newest, Oldest, Price High-Low, Price Low-High).
    *   Displays a list of `Artwork` items, showing title, medium, status, and price. Images are loaded from `http://192.168.1.53:8080` or a placeholder.
    *   "Add New Artwork" button opens a modal.
    *   Artworks can be selected for submission to a `selectedDeadlineId`.
*   **Dynamic Deadlines (`#deadlines`):**
    *   Displays a list of `Deadline` items with title, date, description, and link.
    *   Shows thumbnails of `submittedArtworks` linked to each deadline.
    *   "Add Deadline" button opens a modal.
    *   Clicking a deadline item sets `selectedDeadlineId` for linking artworks.
*   **Shows & Calls (`#shows`):**
    *   Displays a list of `Show` items, including title, location, due date, description, link, scope (L, R, N, I), and user status (Hide, Keep, Enter).
    *   "→ Enter" button opens the "Enter Show" modal.
*   **Cost Tracking (`#costs`):**
    *   Summarizes total costs by category.
    *   Displays recent expenses grouped by category, showing date, description, and amount.
    *   "Add New Expense" button opens a modal.
*   **Financial ROI Tracker (`#roi`):**
    *   Calculates and displays total revenue from sold artworks, total expenses, and net profit.
    *   Shows a table of sold artworks with their selling price, linked expenses, and net profit.

### 3.6. Modals

Several modal components are conditionally rendered based on state, allowing users to add or edit data:

*   **Add/Edit Artwork Modal:** For `Artwork` details (title, medium, dimensions, status, price string, image URL, description). Includes a "DELETE PERMANENTLY" option.
*   **Add/Edit Expense Modal:** For `Cost` details (date, category, description, amount, currency). Allows linking to an existing `Artwork`.
*   **Add/Edit Deadline Modal:** For `Deadline` details (title, date, description, link).
*   **Enter Show Modal:** A complex modal for when a user decides to "Enter" a show. It allows:
    *   Checking off "Entry fee paid" (with amount input).
    *   Checking off "Confirmation received" (with confirmation number input).
    *   Checking off "Add to deadlines tracker".
    *   Selecting artworks to be submitted from the existing `artworks` list.
    *   A "Confirm Entry" button triggers the multi-step `handleConfirmEntry` logic.

### 3.7. Styling

*   The component uses CSS Modules (`Dashboard.module.css`) for localized styling, preventing style conflicts.
*   Global styles are imported from `index.css`.

### 3.8. Utility Functions

*   `formatShortDate`: A helper function to format dates concisely.

The frontend is a feature-rich single-page application that provides a comprehensive interface for managing art-related activities, with robust data interaction capabilities.
