<?php
$host = "localhost";
$db_name = "looselyt_artwork";
$username = "root";
$password = "";

try {
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name . ";charset=utf8mb4", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Update the existing Hamden record to be active and today
    $stmt = $conn->prepare("UPDATE upcoming_shows SET user_status='Interested', due_date='2026-05-15' WHERE id=132");
    $stmt->execute();
    echo "Updated upcoming_shows ID 132.\n";

    // Ensure it exists in deadlines too (it does, ID 14, but let's make sure status is Pending)
    $stmt = $conn->prepare("UPDATE deadlines SET status='Pending', date='2026-05-15' WHERE id=14");
    $stmt->execute();
    echo "Updated deadlines ID 14.\n";

} catch(PDOException $e) {
    echo "Error: " . $e->getMessage();
}
