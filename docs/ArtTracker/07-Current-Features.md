# ArtTracker Current Features

ArtTracker provides the following functionalities to manage art-related activities:

## Core Features:
*   **Artwork Management:**
    *   Create, view, edit, and delete artworks.
    *   Track artwork details: title, medium, dimensions, status (In Studio, Exhibited, Sold, Archived), price, image URL, and description.
    *   Filter artworks by status and search by title or medium.
    *   Sort artworks by ID (Newest/Oldest) and Price (High/Low).
    *   Link artworks to specific deadlines for submission tracking.

*   **Cost Tracking:**
    *   Record, view, edit, and delete expenses.
    *   Categorize costs (Materials, Framing, Shipping, Show Entry, AI Usage, Other).
    *   Summarize total costs by category.
    *   Optionally link expenses to specific artworks.

*   **Deadline Management:**
    *   Create, view, edit, and delete upcoming deadlines.
    *   Track deadline title, date, description, and external link.
    *   Visual representation of artworks submitted to each deadline.
    *   Toggle (add/remove) artworks from a deadline submission list.

*   **Show & Call Management:**
    *   View a curated list of art shows and calls for entry.
    *   Filter shows by user status (Pending, Interested, Not Interested, Entered) and due date.
    *   Mark shows as "Interested", "Not Interested" (Hide), or "Entered".
    *   A dedicated "Enter Show" workflow (modal) to:
        *   Confirm entry.
        *   Record entry fees as costs.
        *   Automatically create a deadline for the show.
        *   Select artworks for submission.

*   **Financial ROI Tracking:**
    *   Calculates and displays total revenue from sold artworks.
    *   Calculates and displays total expenses.
    *   Displays net profit (Revenue - Expenses).
    *   Provides artwork-specific profitability calculations by linking sales price with associated costs.

## User Interface & Experience:
*   Dashboard-style layout for quick access to information.
*   Interactive and responsive frontend built with React and Vite.
*   Modals for streamlined data entry and editing.
*   Collapsible sections for better content organization (e.g., Artworks Overview).
*   Visual cues for status (e.g., artwork status badges, ROI positive/negative indicators).
