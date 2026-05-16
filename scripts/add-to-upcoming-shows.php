<?php
$conn = new mysqli('localhost', 'root', '', 'looselyt_artwork');
if ($conn->connect_error) die($conn->connect_error);

$title = "AcrylicWorks 13: The Best of Acrylic";
$due_date = "2026-05-22";
$link = "slaichas@goldenpeakmedia.com";
$desc = "Winner Instructions for AcrylicWorks 13. DEADLINE: May 22, 2026. Publication Sept 2026.";

// Add to upcoming_shows (the "Shows & Calls" list)
$stmt = $conn->prepare("INSERT INTO upcoming_shows (title, location, due_date, fee, description, link, scope, user_status) VALUES (?, 'Artists Magazine', ?, '', ?, ?, 'N', 'Entered')");
$stmt->bind_param("ssss", $title, $due_date, $desc, $link);

if ($stmt->execute()) {
    echo "Show added to upcoming_shows with ID: " . $conn->insert_id . "\n";
} else {
    echo "Error in upcoming_shows: " . $stmt->error . "\n";
}
?>
