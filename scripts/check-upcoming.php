<?php
try {
    $pdo = new PDO('mysql:host=localhost;dbname=looselyt_artwork', 'root', '');
    $stmt = $pdo->query("SHOW TABLES LIKE 'upcoming_shows'");
    $result = $stmt->fetch();
    if ($result) {
        echo "Table upcoming_shows exists.\n";
        $stmt = $pdo->query("SELECT COUNT(*) FROM upcoming_shows");
        echo "Count: " . $stmt->fetchColumn() . "\n";
    } else {
        echo "Table upcoming_shows does NOT exist.\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
