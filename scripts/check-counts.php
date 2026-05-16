<?php
$conn = new mysqli('localhost', 'root', '', 'looselyt_artwork');
if ($conn->connect_error) die("Connection failed: " . $conn->connect_error);

$res = $conn->query("SELECT COUNT(*) as count FROM paintings");
$row = $res->fetch_assoc();
echo "Paintings: " . $row['count'] . "\n";

$res = $conn->query("SELECT COUNT(*) as count FROM deadlines");
$row = $res->fetch_assoc();
echo "Deadlines: " . $row['count'] . "\n";

$res = $conn->query("SELECT COUNT(*) as count FROM deadline_submissions");
$row = $res->fetch_assoc();
echo "Submissions: " . $row['count'] . "\n";
?>
