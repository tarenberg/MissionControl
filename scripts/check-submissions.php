<?php
$conn = new mysqli('localhost', 'root', '', 'looselyt_artwork');
if ($conn->connect_error) die($conn->connect_error);
$res = $conn->query("SELECT * FROM deadline_submissions");
echo json_encode($res->fetch_all(MYSQLI_ASSOC), JSON_PRETTY_PRINT);
?>
