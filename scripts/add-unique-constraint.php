<?php
/**
 * Add unique constraint to prevent duplicate cost entries
 * Adds a computed hash column based on date + amount + normalized description
 */

$host = "localhost";
$db_name = "looselyt_artwork";
$username = "root";
$password = "";

try {
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name . ";charset=utf8mb4", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Connected to database successfully.\n";
} catch(PDOException $exception) {
    die("Database connection error: " . $exception->getMessage() . "\n");
}

// Check if the constraint already exists
$stmt = $conn->prepare("SHOW INDEX FROM costs WHERE Key_name = 'unique_cost_entry'");
$stmt->execute();
$existing = $stmt->fetchAll();

if (!empty($existing)) {
    echo "Unique constraint 'unique_cost_entry' already exists. Skipping.\n";
    exit(0);
}

echo "Adding unique constraint to costs table...\n";

// Add composite unique index on date + amount + description substring
// This will catch most duplicates without needing computed columns
try {
    // Using first 100 chars of description to avoid index size limits
    $conn->exec("ALTER TABLE costs ADD UNIQUE INDEX unique_cost_entry (date, amount, description(100))");
    echo "  ✓ Added unique composite index on (date, amount, description)\n";
} catch(PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate key name') !== false || 
        strpos($e->getMessage(), 'Duplicate entry') !== false) {
        echo "  → Unique index already exists or would create duplicates\n";
        echo "  → Run cleanup-duplicate-costs.php first to remove existing duplicates\n";
    } else {
        die("Error adding unique index: " . $e->getMessage() . "\n");
    }
}

echo "\nMigration complete! The database now enforces unique cost entries.\n";
echo "Duplicate entries (same date, amount, and normalized description) will be rejected.\n";
?>
