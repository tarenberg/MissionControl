<?php
$conn = new mysqli('localhost', 'root', '', 'looselyt_artwork');
if ($conn->connect_error) die("Connection failed: " . $conn->connect_error);
$res = $conn->query("SELECT id, title, fee FROM deadlines WHERE id = 13");
print_r($res->fetch_assoc());
?>