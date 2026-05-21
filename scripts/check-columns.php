<?php
try {
    $pdo = new PDO('mysql:host=localhost;dbname=looselyt_artwork', 'root', '');
    $tables = ['deadline_submissions', 'deadlines'];
    foreach ($tables as $table) {
        echo "\nColumns for $table:\n";
        $stmt = $pdo->query("DESCRIBE $table");
        print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
