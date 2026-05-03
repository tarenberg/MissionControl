# ArtTracker Database Schema (MySQL)

The ArtTracker application utilizes a MySQL database named `looselyt_artwork`. The schema consists of three primary tables: `paintings`, `costs`, `deadlines`, and a junction table `deadline_submissions` to manage many-to-many relationships between deadlines and artworks.

## 1. `paintings` Table

Stores information about individual artworks.

| Column Name    | Data Type     | Constraints          | Description                                                    |
| :------------- | :------------ | :------------------- | :------------------------------------------------------------- |
| `id`           | INT           | PRIMARY KEY, AUTO_INCREMENT | Unique identifier for the painting.                            |
| `title`        | VARCHAR(255)  | NOT NULL             | Title of the artwork.                                          |
| `description`  | TEXT          | NULLABLE             | Detailed description or story of the painting (maps to frontend `location`). |
| `size`         | VARCHAR(255)  | NULLABLE             | Dimensions of the artwork (e.g., "24"h x 36"w") (maps to frontend `dimensions`). |
| `medium`       | VARCHAR(255)  | NULLABLE             | Medium used (e.g., "Oil on Canvas", "Acrylic").              |
| `price`        | VARCHAR(255)  | NULLABLE             | Stores the raw price string (e.g., "$1200", "Sold", "N/A"). |
| `imageURL`     | VARCHAR(255)  | NULLABLE             | Relative path to the artwork image file.                       |
| `available`    | TINYINT(1)    | NOT NULL, DEFAULT 1  | 1 if available, 0 if sold or archived (derived from frontend `status`). |

**Example `paintings` table entry:**
```
+----+-----------------------+----------------------------------+------------------+---------------+----------+---------------------------------+-----------+
| id | title                 | description                      | size             | medium        | price    | imageURL                        | available |
+----+-----------------------+----------------------------------+------------------+---------------+----------+---------------------------------+-----------+
| 1  | Sunset Over Mountains | A vibrant landscape piece.       | 24"h x 36"w      | Oil on Canvas | $1200    | ../Artwork/Paintings/sunset.jpg | 1         |
| 2  | Abstract Cityscape    | Urban reflections.               | 18"h x 24"w      | Acrylic       | Sold     | ../Artwork/Abstract/city.jpg    | 0         |
+----+-----------------------+----------------------------------+------------------+---------------+----------+---------------------------------+-----------+
```

## 2. `costs` Table

Tracks various expenses related to artworks or general studio operations.

| Column Name    | Data Type     | Constraints                     | Description                                            |
| :------------- | :------------ | :------------------------------ | :----------------------------------------------------- |
| `id`           | INT           | PRIMARY KEY, AUTO_INCREMENT     | Unique identifier for the cost entry.                  |
| `date`         | DATE          | NOT NULL                        | Date the expense occurred (YYYY-MM-DD).                |
| `category`     | VARCHAR(255)  | NOT NULL                        | Category of the expense (e.g., "Materials", "Framing"). |
| `description`  | TEXT          | NOT NULL                        | Detailed description of the expense.                   |
| `amount`       | DECIMAL(10,2) | NOT NULL                        | Monetary amount of the expense.                        |
| `currency`     | VARCHAR(10)   | NOT NULL, DEFAULT 'USD'         | Currency of the expense.                               |
| `artworkId`    | INT           | NULLABLE, FOREIGN KEY REFERENCES `paintings(id)` ON DELETE SET NULL | Optional link to a specific artwork.   |

**Example `costs` table entry:**
```
+----+------------+-----------+-----------------------------------+--------+----------+-----------+
| id | date       | category  | description                       | amount | currency | artworkId |
+----+------------+-----------+-----------------------------------+--------+----------+-----------+
| 1  | 2026-03-15 | Materials | Canvas and Oil Paints             | 150.75 | USD      | NULL      |
| 2  | 2026-03-20 | Framing   | Custom frame for Sunset Over Mountains | 85.00  | USD      | 1         |
+----+------------+-----------+-----------------------------------+--------+----------+-----------+
```

## 3. `deadlines` Table

Manages important deadlines for art shows, submissions, and other events.

| Column Name   | Data Type     | Constraints          | Description                                                    |
| :------------ | :------------ | :------------------- | :------------------------------------------------------------- |
| `id`          | INT           | PRIMARY KEY, AUTO_INCREMENT | Unique identifier for the deadline.                          |
| `title`       | VARCHAR(255)  | NOT NULL             | Title of the deadline (e.g., "Gallery Submission").          |
| `date`        | DATE          | NOT NULL             | Due date of the deadline (YYYY-MM-DD).                       |
| `description` | TEXT          | NULLABLE             | Additional details or description for the deadline.          |
| `link`        | VARCHAR(255)  | NULLABLE             | URL link related to the deadline (e.g., prospectus).         |

**Example `deadlines` table entry:**
```
+----+--------------------+------------+----------------------------------+-------------------------------+
| id | title              | date       | description                      | link                          |
+----+--------------------+------------+----------------------------------+-------------------------------+
| 1  | Gallery Submission | 2026-04-10 | Submission for Spring Exhibition | http://example.com/gallery    |
+----+--------------------+------------+----------------------------------+-------------------------------+
```

## 4. `upcoming_shows` Table

Stores information about art shows and calls for entry.

| Column Name   | Data Type     | Constraints          | Description                                                    |
| :------------ | :------------ | :------------------- | :------------------------------------------------------------- |
| `id`          | INT           | PRIMARY KEY, AUTO_INCREMENT | Unique identifier for the show.                              |
| `title`       | VARCHAR(255)  | NOT NULL             | Title of the show or call.                                     |
| `location`    | VARCHAR(255)  | NULLABLE             | Physical or virtual location of the show.                      |
| `due_date`    | DATE          | NOT NULL             | Submission or event due date (YYYY-MM-DD).                   |
| `fee`         | VARCHAR(50)   | NULLABLE             | Entry fee information (can be text like "$35" or "TBD").     |
| `description` | TEXT          | NULLABLE             | Detailed description of the show/call.                       |
| `link`        | VARCHAR(255)  | NULLABLE             | URL link to the show prospectus or website.                  |
| `scope`       | ENUM('L','R','N','I') | NOT NULL, DEFAULT 'L' | Scope of the show: Local, Regional, National, International. |
| `user_status` | ENUM('Pending','Interested','Not Interested','Entered') | NOT NULL, DEFAULT 'Pending' | User's interaction status with the show. |

**Example `upcoming_shows` table entry:**
```
+----+-------------------+-------------------------+------------+-----+---------------------------------------------+---------------------------+-------+-------------+
| id | title             | location                | due_date   | fee | description                                 | link                      | scope | user_status |
+----+-------------------+-------------------------+------------+-----+---------------------------------------------+---------------------------+-------+-------------+
| 1  | Summer Art Fair   | City Convention Center  | 2026-07-01 | $35 | Annual summer art fair, open to all mediums. | http://example.com/artfair | L     | Interested  |
| 2  | Abstract Showcase | Online Gallery          | 2026-08-01 | TBD | Digital exhibition.                         | http://example.com/abstract | I     | Pending     |
+----+-------------------+-------------------------+------------+-----+---------------------------------------------+---------------------------+-------+-------------+
```

## 5. `deadline_submissions` Table

A junction table to manage the many-to-many relationship between `deadlines` and `paintings` (which artworks are submitted to which deadline).

| Column Name    | Data Type     | Constraints                     | Description                                            |
| :------------- | :------------ | :------------------------------ | :----------------------------------------------------- |
| `id`           | INT           | PRIMARY KEY, AUTO_INCREMENT     | Unique identifier for the submission entry.            |
| `deadline_id`  | INT           | NOT NULL, FOREIGN KEY REFERENCES `deadlines(id)` ON DELETE CASCADE | ID of the associated deadline.   |
| `artwork_id`   | INT           | NOT NULL, FOREIGN KEY REFERENCES `paintings(id)` ON DELETE CASCADE | ID of the submitted artwork.     |

**Example `deadline_submissions` table entry:**
```
+----+-------------+------------+
| id | deadline_id | artwork_id |
+----+-------------+------------+
| 1  | 1           | 1          |
| 2  | 1           | 3          |
+----+-------------+------------+
```

## Database Relationship Diagram (Conceptual)

```mermaid
ERD
    paintings {
        id PK
        title VARCHAR
        description TEXT
        size VARCHAR
        medium VARCHAR
        price VARCHAR
        imageURL VARCHAR
        available TINYINT
    }

    costs {
        id PK
        date DATE
        category VARCHAR
        description TEXT
        amount DECIMAL(10,2)
        currency VARCHAR
        artworkId FK paintings.id
    }

    deadlines {
        id PK
        title VARCHAR
        date DATE
        description TEXT
        link VARCHAR
    }

    upcoming_shows {
        id PK
        title VARCHAR
        location VARCHAR
        due_date DATE
        fee VARCHAR
        description TEXT
        link VARCHAR
        scope ENUM
        user_status ENUM
    }

    deadline_submissions {
        id PK
        deadline_id FK deadlines.id
        artwork_id FK paintings.id
    }

    costs ||--o{ paintings : "links to"
    deadline_submissions ||--|{ deadlines : "submitted to"
    deadline_submissions ||--|{ paintings : "submits"
```
