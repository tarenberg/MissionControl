# ArtTracker Application Architecture

The ArtTracker application follows a client-server architecture, typical for web applications, with a clear separation between the frontend user interface, the backend API, and the data storage layer.

## 1. Frontend (Client-side)
*   **Technology:** React with Vite.
*   **Responsibility:** Provides the interactive user interface, handles user input, displays data, and communicates with the backend API.
*   **Components:** Built with React components, managing their own state and rendering UI elements. State management is likely handled within components or using React's Context API/hooks.
*   **Interaction:** Makes asynchronous HTTP requests (e.g., using `fetch` or `axios` if installed) to the PHP Backend API to fetch, create, update, and delete data.

## 2. Backend API (Server-side)
*   **Technology:** PHP.
*   **Responsibility:** Serves as the application's business logic layer. It receives requests from the frontend, processes them, interacts with the MySQL database, and returns data in a structured format (likely JSON).
*   **Endpoints:** A set of PHP scripts (e.g., `artworks.php`, `shows.php`, `deadlines.php`, `costs.php`) each handling specific resource operations (CRUD).
*   **Data Handling:** Validates incoming data, performs database operations (insert, select, update, delete), and formats the response.

## 3. Database Layer
*   **Technology:** MySQL.
*   **Responsibility:** Persistent storage for all application data.
*   **Schema:** Stores information about artworks, shows, deadlines, costs, and their relationships.
*   **Interaction:** The PHP Backend API communicates with the MySQL database using PHP's database extensions (e.g., PDO or mysqli) to execute SQL queries.

## Data Flow Diagram:

```
+--------------------+         +------------------+         +-----------------+
|     Frontend       |         |   Backend API    |         |     Database    |
| (React/Vite)       |         |      (PHP)       |         |      (MySQL)    |
+---------+----------+         +--------+---------+         +--------+--------+
          |                             |                             |
          | 1. User Interaction         |                             |
          | (e.g., View Artworks)       |                             |
          |---------------------------->|                             |
          |                             | 2. Process Request          |
          |                             | (e.g., GET /api/artworks)   |
          |                             |---------------------------->|
          |                             |                             | 3. SQL Query
          |                             |                             | (e.g., SELECT * FROM artworks)
          |                             |<----------------------------|
          |                             | 4. Database Result          |
          |<----------------------------|                             |
          | 5. Display Data             |                             |
          +-----------------------------+
```

This architecture ensures modularity, scalability, and maintainability, allowing for independent development and deployment of the frontend and backend components.
