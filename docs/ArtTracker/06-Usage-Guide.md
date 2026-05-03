# ArtTracker Usage Guide

This guide provides an overview of how to use the ArtTracker application to manage your artworks, expenses, deadlines, and shows.

## 1. Dashboard Overview

Upon launching the application, you'll see the main dashboard, which is divided into several sections:

*   **Header:** Displays the application name ("ArtTracker"), the artist's name, a MySQL connection status, and navigation links to different sections.
*   **Left Column:** Contains the "Artworks Overview" and "Cost Tracking" sections, followed by "Financial ROI Tracker."
*   **Right Column (Side Panel):** Contains "Dynamic Deadlines" and "Shows & Calls."

Navigation between sections can be done by scrolling or using the links in the header navigation bar.

## 2. Artworks Management

Access this section via the "Artworks" link in the header or by scrolling down the left column.

### 2.1. Viewing Artworks
*   A grid displays all your artworks with their title, medium, and status.
*   **Search:** Use the "Search by title or medium..." input to filter artworks.
*   **Filter by Status:** Use the dropdown to show artworks by status: "All", "In Studio", "Exhibited", "Sold", "Archived."
*   **Sort By:** Use the second dropdown to sort artworks by "Newest First", "Oldest First", "Price (High to Low)", or "Price (Low to High).".

### 2.2. Adding New Artworks
1.  Click the "+ Add New Artwork" button at the bottom of the section.
2.  A modal will appear. Fill in the following details:
    *   **Title:** Name of the artwork.
    *   **Medium:** What it's made of (e.g., Oil on Canvas, Acrylic).
    *   **Dimensions / Size:** Physical dimensions (e.g., 12"h x 18"w).
    *   **Status:** Select from "In Studio", "Exhibited", "Sold", "Archived."
    *   **Price or "Sold"/"Archived" String:** Enter a price or text like "Sold" or "Archived." The system will intelligently parse this for numeric value if possible.
    *   **Database Image Path:** Relative path to the image (e.g., `Artwork/Paintings/490.jpg`). This path is relative to the webserver's `htdocs` (e.g., `C:\xampp\htdocs`). So, `Artwork/Paintings/490.jpg` means `C:\xampp\htdocs\Artwork\Paintings\490.jpg`.
    *   **Painting Description / Story:** A longer text field for notes about the artwork.
3.  Click "Save New Painting."

### 2.3. Editing Existing Artworks
1.  Click on any artwork in the grid (excluding the checkbox area) to open its details in the modal.
2.  Modify any of the fields.
3.  Click "Save All Database Fields" to apply changes.
4.  To delete, click "DELETE PERMANENTLY" within the edit modal.

## 3. Cost Tracking

Access this section via the "Costs" link or by scrolling down the left column, below Artworks.

### 3.1. Viewing Costs
*   The "Cost Tracking" section provides a summary of total expenses grouped by category.
*   Below the summary, "Recent Expenses by Category" lists individual costs, grouped for better overview.

### 3.2. Adding New Expenses
1.  Click the "+ Add New Expense" button.
2.  A modal will appear. Enter the following:
    *   **Date:** Date of the expense.
    *   **Category:** Select a category (e.g., Materials, Framing, Shipping, Show Entry, AI Usage, Other).
    *   **Description:** A brief description of the expense.
    *   **Amount ($):** The monetary value.
    *   **Link to Artwork (Optional):** You can link this expense to a specific artwork from a dropdown.
3.  Click "Save Expense."

### 3.3. Editing/Deleting Expenses
1.  Click the ✏️ icon next to any cost item to edit it.
2.  Click the ❌ icon to delete an expense.

## 4. Financial ROI Tracker

This section provides financial insights:

*   **Total Revenue (Sold):** Sum of prices of all artworks marked "Sold."
*   **Total Expenses:** Sum of all recorded costs.
*   **Net Profit:** Revenue minus expenses.
*   **Artwork Profitability:** A table showing sold artworks with their selling price, linked expenses, and calculated net profit.

## 5. Dynamic Deadlines

Access this section via the "Deadlines" link or in the right column.

### 5.1. Viewing Deadlines
*   Lists upcoming deadlines by date.
*   Each deadline shows its title, short date, and description. If a link is present, the title will be clickable.
*   Thumbnails of submitted artworks (if any) are displayed below the deadline details.

### 5.2. Adding New Deadlines
1.  Click the "+ Add Deadline" button.
2.  A modal will appear. Fill in:
    *   **Title / Show Name:** Name of the deadline or show.
    *   **Date:** The due date.
    *   **Description / Details (Optional):** Any additional information.
    *   **Link (Optional):** A URL related to the deadline.
3.  Click "Save Deadline."

### 5.3. Editing/Deleting Deadlines
1.  Click the ✏️ icon next to a deadline to edit it.
2.  Click the ❌ icon to delete a deadline.

### 5.4. Linking Artworks to Deadlines
1.  Click on a deadline in the "Dynamic Deadlines" list. A blue banner will appear, indicating you are in "selection mode."
2.  Navigate to the "Artworks Overview" section.
3.  Check the box on the image of any artwork you wish to link to the selected deadline.
4.  When finished, click the "Done" button in the blue banner in the artworks section.

## 6. Shows & Calls

Access this section via the "Shows" link or in the right column.

### 6.1. Viewing Shows
*   Lists upcoming art shows and calls for entry.
*   Each show displays its title, location, due date, a brief description, and a link to view details.
*   A `scopeBadge` (L, R, N, I) indicates Local, Regional, National, or International reach.

### 6.2. Interacting with Shows
*   **Hide/Keep:** Use the radio buttons to mark a show as "Hide" (Not Interested) or "Keep" (Interested). Hiding removes it from the main list.
*   **Enter Show:** Click the "→ Enter" button to initiate the entry process.

### 6.3. Entering a Show (Modal)
When you click "→ Enter," a modal appears to guide you through the submission process:

1.  **Review Show Details:** The modal summarizes key information about the show.
2.  **Checklist:**
    *   **Entry fee paid:** Check if you've paid the fee. If checked, an input appears to record the amount.
    *   **Confirmation received:** Check if you've received confirmation. If checked, an input appears for a confirmation number.
    *   **Add to deadlines tracker:** Check this to automatically create a new entry in your "Dynamic Deadlines" list for this show's due date.
3.  **Works Being Submitted (Optional):** Select which of your artworks you are submitting for this show by clicking on their titles in the provided list. Selected artworks will be highlighted.
4.  Click "✅ Confirm Entry." This action will:
    *   Mark the show's status as "Entered."
    *   If the fee was paid, log it as a new expense in "Cost Tracking."
    *   If checked, create a new deadline in "Dynamic Deadlines."

## 7. Adding New Shows

There isn't an explicit "Add New Show" button visible in the main dashboard for `upcoming_shows`, indicating that these entries are likely populated through an external process (e.g., an email parsing script or manual backend entry). However, the `shows.php` API endpoint supports `POST` for creating new show entries, which could be used by an administrative interface or an automated system.

This guide covers the main functionalities of ArtTracker. Explore the dashboard to become familiar with all features!
