<?php
$conn = new mysqli('localhost', 'root', '', 'looselyt_artwork');
if ($conn->connect_error) die($conn->connect_error);
$res = $conn->query("SELECT id, title, imageUrl FROM artworks WHERE imageUrl IS NOT NULL LIMIT 5");
echo json_encode($res->fetch_all(MYSQLI_ASSOC), JSON_PRETTY_PRINT);
?>
