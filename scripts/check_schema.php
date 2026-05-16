<?php
$host = "localhost";
$db_name = "looselyt_artwork";
$username = "root";
$password = "";

try {
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name . ";charset=utf8mb4", $username, $password);
    
    echo "--- Table: upcoming_shows ---\n";
    $stmt = $conn->query("SHOW CREATE TABLE upcoming_shows");
    print_r($stmt->fetch(PDO::FETCH_ASSOC));

    echo "\n--- Table: deadlines ---\n";
    $stmt = $conn->query("SHOW CREATE TABLE deadlines");
    print_r($stmt->fetch(PDO::FETCH_ASSOC));

} catch(PDOException $e) {
    echo "Error: " . $e->getMessage();
}
