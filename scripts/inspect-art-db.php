<?php
$conn = new mysqli('localhost', 'root', '', 'looselyt_artwork');
if ($conn->connect_error) die("Connection failed: " . $conn->connect_error);

echo "--- paintings ---\n";
$res = $conn->query("DESCRIBE paintings");
while($row = $res->fetch_assoc()) print_r($row);

echo "\n--- deadlines ---\n";
$res = $conn->query("DESCRIBE deadlines");
while($row = $res->fetch_assoc()) print_r($row);
?>
