<?php
$host = 'localhost';
$db   = 'looselyt_artwork';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db", $user, $pass);
    
    $tables = ['art_listings', 'costs', 'paintings'];
    foreach ($tables as $table) {
        echo "\nStructure of $table:\n";
        $stmt = $pdo->query("DESCRIBE $table");
        print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
