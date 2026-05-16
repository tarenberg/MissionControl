<?php
$host = 'localhost';
$db   = 'looselyt_artwork';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db", $user, $pass);
    
    $ids = [1, 4, 57];
    foreach ($ids as $id) {
        $stmt = $pdo->prepare("SELECT * FROM costs WHERE artworkId = ?");
        $stmt->execute([$id]);
        echo "\nCosts for ID $id:\n";
        print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
