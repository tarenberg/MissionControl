# ArtTracker Setup Guide

This guide provides instructions for setting up and running the ArtTracker application, which consists of a React/Vite frontend and a PHP/MySQL backend.

## 1. Prerequisites

Ensure you have the following software installed on your system:

*   **XAMPP:** A free and open-source cross-platform web server solution stack package, containing Apache HTTP Server, MariaDB (MySQL), and interpreters for PHP and Perl. Download from [Apache Friends](https://www.apachefriends.org/index.html).
*   **Node.js & npm (or Yarn/pnpm):** Node.js is a JavaScript runtime, and npm (Node Package Manager) is used to manage frontend dependencies. Download from [Node.js official website](https://nodejs.org/en/).

## 2. Backend Setup (XAMPP & MySQL)

1.  **Install XAMPP:** If you haven't already, install XAMPP following the instructions for your operating system.
2.  **Start Apache and MySQL:** Open the XAMPP Control Panel and start the Apache and MySQL services.
3.  **Place Backend Files:** Copy the entire `ArtTrackerDashboard` directory (located at `C:\xampp\htdocs\tools\ArtTrackerDashboard`) into your XAMPP's `htdocs` directory. The path should look like: `C:\xampp\htdocs\tools\ArtTrackerDashboard`.
    *   The PHP API files are located in `C:\xampp\htdocs\tools\ArtTrackerDashboard\api`.
4.  **Create MySQL Database:**
    *   Open your web browser and navigate to `http://localhost/phpmyadmin`.
    *   Click on "New" in the left sidebar to create a new database.
    *   Enter `looselyt_artwork` as the database name and click "Create".
5.  **Import Database Schema:**
    *   You will need a SQL dump file (`.sql`) to create the tables and populate any initial data. Assuming a `arttracker.sql` file exists (you might need to create one based on the database schema documentation).
    *   In phpMyAdmin, with the `looselyt_artwork` database selected, click on the "Import" tab.
    *   Click "Choose File" and select your `arttracker.sql` file.
    *   Click "Go" to import the schema and data.
    *   _If you don't have an `arttracker.sql` file, you can manually create the tables based on the `04-Database-Schema.md` document._

6.  **Verify Backend:**
    *   You can test the backend by navigating to one of the API endpoints in your browser, for example: `http://localhost/tools/ArtTrackerDashboard/api/artworks.php`.
    *   You should see a JSON array (possibly empty if no data was imported yet).

## 3. Frontend Setup (Node.js & Vite)

1.  **Navigate to Project Directory:** Open your terminal or command prompt and navigate to the ArtTracker frontend directory:
    ```bash
    cd C:\xampp\htdocs\tools\ArtTrackerDashboard
    ```
2.  **Install Dependencies:** Install the required Node.js packages using npm:
    ```bash
    npm install
    ```
    *   This will install React, Vite, and other necessary frontend libraries.
3.  **Start Development Server:** Start the Vite development server:
    ```bash
    npm run dev
    ```
    *   Vite will typically start a server on `http://localhost:5173` (or another available port). You will see the URL in your terminal output.
4.  **Access the Application:** Open your web browser and navigate to the URL provided by Vite (e.g., `http://localhost:5173`).

## 4. Configuration Notes

*   **API Base URL:** The frontend currently hardcodes the API base URL to `http://192.168.1.53:8080/tools/ArtTrackerDashboard/api/`. If your XAMPP setup uses a different IP address or port, you will need to update this in `src/Dashboard.tsx`.
    *   You might want to replace `192.168.1.53:8080` with `localhost` or `127.0.0.1` if you are running everything locally and not accessing from another machine.

With these steps, your ArtTracker application should be up and running, allowing you to manage your artworks, costs, deadlines, and shows.
