<?php
$conn = new mysqli('localhost', 'root', '', 'looselyt_artwork');
if ($conn->connect_error) die($conn->connect_error);
$res = $conn->query("
    SELECT ds.artwork_id, p.title, p.imageURL, d.title as show_title
    FROM deadline_submissions ds
    JOIN paintings p ON ds.artwork_id = p.id
    JOIN deadlines d ON ds.deadline_id = d.id
    WHERE ds.status = 'Accepted'
");
echo json_encode($res->fetch_all(MYSQLI_ASSOC), JSON_PRETTY_PRINT);
?>
