<?php
$conn = new mysqli('localhost', 'root', '', 'looselyt_artwork');
if ($conn->connect_error) die($conn->connect_error);
$res = $conn->query("SELECT id, title FROM deadlines ORDER BY id DESC LIMIT 50");
while($row = $res->fetch_assoc()) {
    echo $row['id'] . ": " . $row['title'] . "\n";
}
?>
