<?php
$host = "localhost";
$db_name = "looselyt_artwork";
$username = "root";
$password = "";

try {
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name . ";charset=utf8mb4", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "--- Search upcoming_shows ---\n";
    $stmt = $conn->prepare("SELECT * FROM upcoming_shows WHERE title LIKE :query");
    $stmt->execute(['query' => '%Hamden%']);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        print_r($row);
    }

    echo "\n--- Search deadlines ---\n";
    $stmt = $conn->prepare("SELECT * FROM deadlines WHERE title LIKE :query");
    $stmt->execute(['query' => '%Hamden%']);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        print_r($row);
    }
} catch(PDOException $e) {
    echo "Error: " . $e->getMessage();
}
