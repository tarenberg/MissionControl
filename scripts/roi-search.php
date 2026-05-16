<?php
$host = 'localhost';
$db   = 'looselyt_artwork';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
     $pdo = new PDO($dsn, $user, $pass, $options);
     
     echo "Searching for ROI Audit targets in art_listings and paintings...\n";
     
     $targets = ['490', 'Witches-Fingers', 'Winter-Monument', 'Witches Fingers'];
     
     foreach ($targets as $target) {
         echo "\n--- Target: $target ---\n";
         
         // Search in paintings
         $stmt = $pdo->prepare("SELECT id, title, price FROM paintings WHERE title LIKE ?");
         $stmt->execute(['%' . $target . '%']);
         $results = $stmt->fetchAll();
         echo "Paintings Table:\n";
         print_r($results);
         
         // Search in art_listings
         $stmt = $pdo->prepare("SELECT * FROM art_listings WHERE title LIKE ?");
         $stmt->execute(['%' . $target . '%']);
         $results = $stmt->fetchAll();
         echo "Art Listings Table:\n";
         print_r($results);
     }

} catch (\PDOException $e) {
     echo "Error: " . $e->getMessage();
}
?>
