# ArtTracker Backend API Documentation

The ArtTracker backend is a PHP-based API responsible for handling all data interactions with the MySQL database. It exposes several endpoints for managing artworks, costs, deadlines, and shows, primarily communicating via JSON.

## 1. Core API Structure

*   **Technology:** PHP (running on XAMPP/Apache).
*   **Database Connection:** All API endpoints connect to a MySQL database named `looselyt_artwork` using PDO.
    ```php
    $host = "localhost";
    $db_name = "looselyt_artwork";
    $username = "root";
    $password = ""; // Assuming XAMPP default

    try {
        $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name . ";charset=utf8mb4", $username, $password);
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    } catch(PDOException $exception) {
        http_response_code(500);
        echo json_encode(["message" => "Database connection error: " . $exception->getMessage()]);
        exit();
    }
    ```
*   **CORS & Headers:** All endpoints include headers to allow Cross-Origin Resource Sharing (CORS) from any origin (`Access-Control-Allow-Origin: *`) and to prevent caching. They also handle `OPTIONS` requests for CORS pre-flight.

## 2. API Endpoints

Each major resource in the ArtTracker application has a dedicated PHP API file handling its CRUD (Create, Read, Update, Delete) operations.

### 2.1. `artworks.php`

*   **Resource:** Artworks/Paintings
*   **Database Table:** `paintings`

#### `GET /api/artworks.php`
*   **Description:** Retrieves all artworks from the database, ordered by ID in descending order. Transforms raw database fields into a more frontend-friendly format.
*   **Query Parameters:** None.
*   **Response (Success - 200 OK):** An array of `Artwork` objects (JSON).
    ```json
    [
      {
        "id": 1,
        "title": "Sunset Over Mountains",
        "artistName": "Tarenberg",
        "year": 2026,
        "medium": "Oil on Canvas",
        "dimensions": "24\"h x 36\"w",
        "status": "In Studio",
        "location": "A beautiful landscape piece.",
        "price": 1200.00,
        "imageUrl": "/Artwork/Paintings/sunset.jpg",
        "_originalPriceString": "$1200",
        "_available": 1
      }
    ]
    ```
*   **Response (Error - 500):** Database connection error.

#### `POST /api/artworks.php`
*   **Description:** Creates a new artwork entry.
*   **Request Body (JSON):**
    ```json
    {
      "title": "New Painting Title",
      "medium": "Acrylic",
      "dimensions": "10\"h x 10\"w",
      "status": "In Studio",
      "price": 500,
      "location": "A vibrant abstract piece.",
      "imageUrl": "/Artwork/Paintings/new_abstract.jpg"
    }
    ```
    *   `title` (string, required)
    *   `medium` (string, required)
    *   `dimensions` (string, optional, maps to `size` in DB)
    *   `status` (string, required, e.g., "In Studio", "Sold", "Archived". Affects `available` in DB and `price` string.)
    *   `price` (number, optional, maps to `price` in DB as string. If status is "Sold", price becomes "Sold" string in DB.)
    *   `location` (string, optional, maps to `description` in DB)
    *   `imageUrl` (string, optional, relative path)
*   **Response (Success - 201 Created):** `{"message": "Created", "id": <new_artwork_id>}`
*   **Response (Error - 503):** Unable to create artwork.
*   **Response (Error - 400):** Incomplete data.

#### `PUT /api/artworks.php`
*   **Description:** Updates an existing artwork. Requires `id` and `title`.
*   **Request Body (JSON):**
    ```json
    {
      "id": 1,
      "title": "Updated Painting Title",
      "medium": "Oil and Cold Wax",
      "dimensions": "24\"h x 36\"w",
      "status": "Sold",
      "price": 1500,
      "priceString": "Sold $1500", // Can override price field directly
      "location": "Sold to a collector.",
      "imageUrl": "/Artwork/Paintings/sunset_sold.jpg"
    }
    ```
    *   `id` (number, required)
    *   `title` (string, required)
    *   Other fields are optional for update.
*   **Response (Success - 200 OK):** `{"message": "Updated"}`
*   **Response (Error - 503):** Unable to update artwork.
*   **Response (Error - 400):** Incomplete data (missing `id` or `title`).

#### `DELETE /api/artworks.php?id=<id>`
*   **Description:** Deletes an artwork by its ID.
*   **Query Parameters:**
    *   `id` (number, required): The ID of the artwork to delete.
*   **Response (Success - 200 OK):** `{"message": "Deleted"}`
*   **Response (Error - 503):** Unable to delete artwork.

### 2.2. `costs.php`

*   **Resource:** Expenses
*   **Database Table:** `costs`

#### `GET /api/costs.php`
*   **Description:** Retrieves all recorded expenses, ordered by date and then ID descending. Numeric fields are cast to appropriate types.
*   **Query Parameters:** None.
*   **Response (Success - 200 OK):** An array of `Cost` objects (JSON).
    ```json
    [
      {
        "id": 1,
        "date": "2026-03-15",
        "category": "Materials",
        "description": "Canvas and Oil Paints",
        "amount": 150.75,
        "currency": "USD",
        "artworkId": null
      }
    ]
    ```

#### `POST /api/costs.php`
*   **Description:** Records a new expense.
*   **Request Body (JSON):**
    ```json
    {
      "date": "2026-03-20",
      "category": "Framing",
      "description": "Custom frame for Sunset Over Mountains",
      "amount": 85.00,
      "currency": "USD",
      "artworkId": 1
    }
    ```
    *   `date` (string, required, YYYY-MM-DD)
    *   `category` (string, required)
    *   `description` (string, required)
    *   `amount` (number, required)
    *   `currency` (string, optional, default: "USD")
    *   `artworkId` (number, optional, links to `paintings.id`)
*   **Response (Success - 201 Created):** `{"message": "Cost was recorded.", "id": <new_cost_id>}`
*   **Response (Error - 503):** Unable to record cost.
*   **Response (Error - 400):** Incomplete data.

#### `PUT /api/costs.php`
*   **Description:** Updates an existing expense. Requires `id`, `date`, and `category`.
*   **Request Body (JSON):**
    ```json
    {
      "id": 1,
      "date": "2026-03-16",
      "category": "Materials",
      "description": "Canvas, Oil Paints, Brushes",
      "amount": 165.25,
      "artworkId": 1
    }
    ```
    *   `id` (number, required)
    *   `date` (string, required, YYYY-MM-DD)
    *   `category` (string, required)
    *   Other fields are optional for update.
*   **Response (Success - 200 OK):** `{"message": "Cost updated."}`
*   **Response (Error - 503):** Unable to update cost.
*   **Response (Error - 400):** Incomplete data for update.

#### `DELETE /api/costs.php?id=<id>`
*   **Description:** Deletes an expense by its ID.
*   **Query Parameters:**
    *   `id` (number, required): The ID of the cost to delete.
*   **Response (Success - 200 OK):** `{"message": "Cost deleted."}`
*   **Response (Error - 503):** Unable to delete cost.

### 2.3. `deadlines.php`

*   **Resource:** Deadlines and Artwork Submissions
*   **Database Tables:** `deadlines`, `deadline_submissions` (junction table)

#### `GET /api/deadlines.php`
*   **Description:** Retrieves all deadlines, ordered by date ascending. Includes a nested array of `submittedArtworks` for each deadline, linking to basic artwork info (id, imageUrl).
*   **Query Parameters:** None.
*   **Response (Success - 200 OK):** An array of `Deadline` objects (JSON).
    ```json
    [
      {
        "id": 1,
        "title": "Gallery Submission",
        "date": "2026-04-10",
        "description": "Submission for Spring Exhibition",
        "link": "http://example.com/gallery",
        "submittedArtworks": [
          {
            "id": 1,
            "imageUrl": "http://192.168.1.53:8080/Artwork/Paintings/sunset.jpg"
          }
        ]
      }
    ]
    ```

#### `POST /api/deadlines.php`
*   **Description:** Can either create a new deadline OR toggle (add/remove) an artwork submission for an existing deadline.
*   **Request Body (JSON) - Create Deadline:**
    ```json
    {
      "title": "New Art Call",
      "date": "2026-05-01",
      "description": "Open call for abstracts",
      "link": "http://example.com/artcall"
    }
    ```
    *   `title` (string, required)
    *   `date` (string, required, YYYY-MM-DD)
    *   `description` (string, optional)
    *   `link` (string, optional)
*   **Response (Success - 201 Created):** `{"message": "Deadline created.", "id": <new_deadline_id>}`
*   **Request Body (JSON) - Toggle Submission:**
    ```json
    {
      "action": "toggle_submission",
      "deadline_id": 1,
      "artwork_id": 2
    }
    ```
    *   `action` (string, required): Must be "toggle_submission".
    *   `deadline_id` (number, required): The ID of the deadline.
    *   `artwork_id` (number, required): The ID of the artwork.
*   **Response (Success - 200 OK):** `{"message": "Added submission", "status": "added"}` or `{"message": "Removed submission", "status": "removed"}`
*   **Response (Error - 503):** Unable to create/update.
*   **Response (Error - 400):** Incomplete data.

#### `PUT /api/deadlines.php`
*   **Description:** Updates an existing deadline. Requires `id`, `title`, and `date`.
*   **Request Body (JSON):**
    ```json
    {
      "id": 1,
      "title": "Updated Gallery Submission",
      "date": "2026-04-15",
      "description": "Revised date for Spring Exhibition",
      "link": "http://example.com/gallery/updated"
    }
    ```
    *   `id` (number, required)
    *   `title` (string, required)
    *   `date` (string, required, YYYY-MM-DD)
    *   Other fields are optional for update.
*   **Response (Success - 200 OK):** `{"message": "Deadline updated."}`
*   **Response (Error - 503):** Unable to update deadline.
*   **Response (Error - 400):** Incomplete data for update.

#### `DELETE /api/deadlines.php?id=<id>`
*   **Description:** Deletes a deadline by its ID.
*   **Query Parameters:**
    *   `id` (number, required): The ID of the deadline to delete.
*   **Response (Success - 200 OK):** `{"message": "Deadline deleted."}`
*   **Response (Error - 503):** Unable to delete deadline.

### 2.4. `shows.php`

*   **Resource:** Upcoming Art Shows and Calls for Entry
*   **Database Table:** `upcoming_shows`

#### `GET /api/shows.php`
*   **Description:** Retrieves upcoming shows filtered to exclude those marked "Not Interested", "Entered", and those with past `due_date`. Ordered by `due_date` ascending.
*   **Query Parameters:** None.
*   **Response (Success - 200 OK):** An array of `Show` objects (JSON).
    ```json
    [
      {
        "id": 1,
        "title": "Summer Art Fair",
        "location": "City Convention Center",
        "due_date": "2026-07-01",
        "fee": "$35",
        "description": "Annual summer art fair, open to all mediums.",
        "link": "http://example.com/artfair",
        "scope": "L",
        "user_status": "Interested"
      }
    ]
    ```

#### `POST /api/shows.php`
*   **Description:** Creates a new show entry.
*   **Request Body (JSON):**
    ```json
    {
      "title": "Autumn Exhibition",
      "location": "Local Gallery",
      "due_date": "2026-09-15",
      "fee": "TBD",
      "description": "Autumn themed group exhibition.",
      "link": "http://example.com/autumnshow",
      "scope": "L",
      "user_status": "Pending"
    }
    ```
    *   `title` (string, required)
    *   `due_date` (string, required, YYYY-MM-DD)
    *   `location` (string, optional, default: empty string)
    *   `fee` (string, optional, default: empty string)
    *   `description` (string, optional, default: empty string)
    *   `link` (string, optional, default: empty string)
    *   `scope` (string, optional, default: "L", values: "L" (Local), "R" (Regional), "N" (National), "I" (International))
    *   `user_status` (string, optional, default: "Pending", values: "Pending", "Interested", "Not Interested", "Entered")
*   **Response (Success - 201 Created):** `{"message": "Show created.", "id": <new_show_id>}`
*   **Response (Error - 503):** Unable to create show.
*   **Response (Error - 400):** Incomplete data (missing `title` or `due_date`).

#### `PUT /api/shows.php`
*   **Description:** Updates the `user_status` of an existing show. Requires `id` and `user_status`.
*   **Request Body (JSON):**
    ```json
    {
      "id": 1,
      "user_status": "Entered"
    }
    ```
    *   `id` (number, required)
    *   `user_status` (string, required, values: "Pending", "Interested", "Not Interested", "Entered")
*   **Response (Success - 200 OK):** `{"message": "Show status updated."}`
*   **Response (Error - 503):** Unable to update show status.
*   **Response (Error - 400):** Incomplete data for update.

#### `DELETE /api/shows.php?id=<id>`
*   **Description:** Deletes a show by its ID.
*   **Query Parameters:**
    *   `id` (number, required): The ID of the show to delete.
*   **Response (Success - 200 OK):** `{"message": "Show deleted."}`
*   **Response (Error - 503):** Unable to delete show.
*   **Response (Error - 400):** Missing `id`.
