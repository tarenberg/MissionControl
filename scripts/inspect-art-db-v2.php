<?php
$conn = new mysqli('localhost', 'root', '', 'looselyt_artwork');
if ($conn->connect_error) die("Connection failed: " . $conn->connect_error);

echo "--- deadline_submissions ---\n";
$res = $conn->query("DESCRIBE deadline_submissions");
while($row = $res->fetch_assoc()) print_r($row);
?>
