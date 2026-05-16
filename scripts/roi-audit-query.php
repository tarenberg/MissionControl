<?php
$host = 'localhost';
$db   = 'looselyt_artwork';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db", $user, $pass);
    
    $targets = ['490', 'Witches Fingers', 'Winter Monument'];
    
    foreach ($targets as $target) {
        echo "\n--- Target: $target ---\n";
        
        // Search in paintings
        $stmt = $pdo->prepare("SELECT id, title, price FROM paintings WHERE title LIKE ?");
        $stmt->execute(['%' . $target . '%']);
        echo "Paintings:\n";
        print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
        
        // Search in costs (amount might be negative for expenses, positive for income?)
        $stmt = $pdo->prepare("SELECT * FROM costs WHERE description LIKE ?");
        $stmt->execute(['%' . $target . '%']);
        echo "Costs:\n";
        print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
