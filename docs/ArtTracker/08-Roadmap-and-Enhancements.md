# ArtTracker Roadmap and Enhancements

The ArtTracker application provides a solid foundation for managing art-related activities. This section outlines potential future enhancements, planned features, and known limitations.

## 1. Planned Features & Enhancements

*   **Automated Show Discovery & Parsing (Email Integration):**
    *   **Concept:** Implement a system to automatically parse incoming emails from galleries, art organizations, and competition platforms to extract show/call details (title, due date, description, link, fee, location).
    *   **Benefit:** Significantly reduces manual data entry for `upcoming_shows`, keeping the "Shows & Calls" section constantly updated with new opportunities.
    *   **Mechanism:** This would likely involve a separate script or service that reads emails (e.g., via IMAP), applies NLP/regex for data extraction, and then uses the `shows.php` API's `POST` endpoint to add new entries.
    *   **Known Limitation:** Email parsing can be complex due to varied formats; robust parsing logic with fallback mechanisms would be required.

*   **Advanced Image Management:**
    *   **Concept:** Integrate direct image upload functionality within the artwork creation/editing modal, instead of relying on manual path entry.
    *   **Benefit:** Improves user experience and reduces potential errors from incorrect paths. Could also include image resizing/optimization.
    *   **Mechanism:** Requires backend logic to handle file uploads (moving files to a designated `Artwork/Paintings` directory) and frontend components for file selection.

*   **User Authentication and Authorization:**
    *   **Concept:** Implement a login system to restrict access to the dashboard and manage different user roles/permissions.
    *   **Benefit:** Essential for multi-user environments or protecting sensitive financial/artwork data.
    *   **Mechanism:** Requires user tables in the database, backend authentication logic (e.g., session management, JWT), and frontend login/registration pages.

*   **Notifications and Reminders:**
    *   **Concept:** Add a notification system for upcoming deadlines (e.g., email reminders, in-app alerts).
    *   **Benefit:** Helps users stay on top of critical submission dates.
    *   **Mechanism:** Could involve cron jobs on the backend to check upcoming deadlines and trigger email sending, or real-time frontend notifications.

*   **Improved Reporting & Analytics:**
    *   **Concept:** Expand the "Financial ROI Tracker" with more detailed reports, charts, and filtering options (e.g., ROI per year, per medium, breakdown of costs over time).
    *   **Benefit:** Provides deeper insights into financial performance and artistic endeavors.
    *   **Mechanism:** Requires more complex SQL queries and potentially a dedicated reporting library on the frontend.

*   **Artwork Location/Inventory Tracking:**
    *   **Concept:** Enhance artwork status to include specific locations (e.g., "Gallery X Storage", "Client Y Home") for artworks that are not in the studio or sold.
    *   **Benefit:** Better inventory management and tracking of physical artwork locations.

## 2. Known Limitations & Areas for Improvement

*   **Hardcoded API URL:** The frontend currently uses a hardcoded IP address (`http://192.168.1.53:8080/`) for API calls. This should be made configurable (e.g., via environment variables) for easier deployment and flexibility across different environments.
*   **Limited Error Handling (Frontend):** While basic alerts are present, more robust and user-friendly error messages, as well as logging, could improve the frontend's resilience.
*   **No Paging/Lazy Loading for Large Datasets:** For a very large number of artworks, costs, or deadlines, the current approach of fetching all data at once might lead to performance issues. Implementing pagination or infinite scrolling would be beneficial.
*   **Email Parsing Complexity:** As noted in planned features, automated email parsing is a significant undertaking with inherent complexities in accurately extracting structured data from unstructured text.
*   **Security Considerations:** Without explicit user authentication, the API endpoints are open. For production use or sensitive data, this would need to be addressed.
*   **UI/UX Refinements:** Continuous improvements to the user interface and experience based on user feedback could always be made (e.g., drag-and-drop for artwork images, richer text editors for descriptions).

This roadmap provides a vision for evolving ArtTracker into an even more powerful and automated tool for artists.
