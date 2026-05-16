<?php
$conn = new mysqli('localhost', 'root', '', 'looselyt_artwork');
if ($conn->connect_error) die("Connection failed: " . $conn->connect_error);
$stmt = $conn->prepare("UPDATE deadlines SET fee = ? WHERE id = ?");
$fee = '$35';
$id = 13;
$stmt->bind_param("si", $fee, $id);
if ($stmt->execute()) {
    echo "Successfully updated Providence Art Club fee to $35.\n";
} else {
    echo "Error updating record: " . $conn->error;
}
?>