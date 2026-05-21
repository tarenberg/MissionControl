<?php
try {
    $pdo = new PDO('mysql:host=localhost;dbname=looselyt_artwork', 'root', '');
    $tables = ['paintings', 'deadline_submissions', 'deadlines'];
    foreach ($tables as $table) {
        $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
        if ($stmt->fetch()) {
            echo "Table $table exists.\n";
        } else {
            echo "Table $table does NOT exist.\n";
        }
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
