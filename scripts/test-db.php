<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
$conn = new mysqli('localhost', 'root', '', 'looselyt_artwork');
if ($conn->connect_error) die("Connection failed: " . $conn->connect_error);
$res = $conn->query("SELECT id FROM artworks LIMIT 1");
if (!$res) die("Query failed: " . $conn->error);
print_r($res->fetch_assoc());
?>
