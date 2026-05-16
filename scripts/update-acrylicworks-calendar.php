<?php
$conn = new mysqli('localhost', 'root', '', 'looselyt_artwork');
if ($conn->connect_error) die($conn->connect_error);

// Publication is September 2026. Setting to Sept 1st as a placeholder for the month.
$show_start = "2026-09-01"; 
$id = 16;

$stmt = $conn->prepare("UPDATE deadlines SET show_start = ? WHERE id = ?");
$stmt->bind_param("si", $show_start, $id);

if ($stmt->execute()) {
    echo "Deadline updated with Publication Date.\n";
} else {
    echo "Error: " . $stmt->error;
}
?>
