<?php
$conn = new mysqli('localhost', 'root', '', 'looselyt_artwork');
if ($conn->connect_error) die($conn->connect_error);
$res = $conn->query("SELECT * FROM deadlines WHERE id = 16");
print_r($res->fetch_assoc());
?>
