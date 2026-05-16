<?php
$conn = new mysqli('localhost', 'root', '', 'looselyt_artwork');
if ($conn->connect_error) die($conn->connect_error);
$res = $conn->query("SELECT id, title, imageURL FROM paintings WHERE imageURL IS NOT NULL AND imageURL != '' LIMIT 5");
echo json_encode($res->fetch_all(MYSQLI_ASSOC), JSON_PRETTY_PRINT);
?>
