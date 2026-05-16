<?php
$host = "localhost";
$db_name = "looselyt_artwork";
$username = "root";
$password = "";

try {
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name . ";charset=utf8mb4", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $ids = [1, 4, 57];
    foreach ($ids as $id) {
        $stmt = $conn->prepare("SELECT * FROM paintings WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "ID $id: " . json_encode($row) . "\n";
    }
} catch(PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
