<?php
$host = "localhost";
$db_name = "looselyt_artwork"; 
$username = "root";
$password = "";

try {
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name . ";charset=utf8mb4", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $stmt = $conn->prepare("SELECT * FROM upcoming_shows ORDER BY id DESC LIMIT 5");
    $stmt->execute();
    $shows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($shows, JSON_PRETTY_PRINT);
} catch(PDOException $exception) {
    echo "Error: " . $exception->getMessage();
}
?>