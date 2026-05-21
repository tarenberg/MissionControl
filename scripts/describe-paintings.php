<?php
try {
    $pdo = new PDO('mysql:host=localhost;dbname=looselyt_artwork', 'root', '');
    $stmt = $pdo->query("DESCRIBE paintings");
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
