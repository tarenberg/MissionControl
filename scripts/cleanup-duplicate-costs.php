<?php
/**
 * Cleanup duplicate costs entries
 * Keeps the most recent ID for each unique (date, amount, normalized_description) combination
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

function normalizeDescription($desc) {
    // Remove provider prefixes like "Anthropic: ", "Art Expense: ", etc.
    $normalized = preg_replace('/^(Anthropic|OpenAI|OpenRouter|Midjourney|Krea|Art Expense|Art Supplies|Exhibition Entry|Art Purchase):\s*/i', '', $desc);
    return trim($normalized);
}

// Fetch all costs
$stmt = $conn->prepare("SELECT id, date, description, amount FROM costs ORDER BY date, amount, id");
$stmt->execute();
$costs = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Found " . count($costs) . " total cost entries.\n";

$seen = [];
$duplicates = [];

foreach ($costs as $cost) {
    $normalized = normalizeDescription($cost['description']);
    $key = $cost['date'] . '|' . $cost['amount'] . '|' . $normalized;
    
    if (isset($seen[$key])) {
        // This is a duplicate - mark the OLDER one (lower ID) for deletion
        $olderIds = $seen[$key];
        foreach ($olderIds as $olderId) {
            if ($olderId < $cost['id']) {
                $duplicates[] = $olderId;
            }
        }
        $seen[$key][] = $cost['id'];
    } else {
        $seen[$key] = [$cost['id']];
    }
}

$duplicates = array_unique($duplicates);

if (empty($duplicates)) {
    echo "No duplicates found!\n";
    exit(0);
}

echo "Found " . count($duplicates) . " duplicate entries to remove.\n";

// Show what will be deleted
echo "\nDuplicates to be deleted:\n";
$placeholders = implode(',', array_fill(0, count($duplicates), '?'));
$stmt = $conn->prepare("SELECT id, date, description, amount FROM costs WHERE id IN ($placeholders) ORDER BY id");
$stmt->execute($duplicates);
$toDelete = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($toDelete as $row) {
    echo "  ID {$row['id']}: {$row['date']} | {$row['description']} | \${$row['amount']}\n";
}

echo "\nProceed with deletion? (yes/no): ";
$handle = fopen("php://stdin", "r");
$line = trim(fgets($handle));
fclose($handle);

if (strtolower($line) !== 'yes') {
    echo "Aborted.\n";
    exit(0);
}

// Delete duplicates
$stmt = $conn->prepare("DELETE FROM costs WHERE id IN ($placeholders)");
if ($stmt->execute($duplicates)) {
    echo "Successfully deleted " . count($duplicates) . " duplicate entries.\n";
} else {
    echo "Error deleting duplicates.\n";
    exit(1);
}

echo "Cleanup complete!\n";
?>
