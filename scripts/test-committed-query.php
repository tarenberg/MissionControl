<?php
$conn = new mysqli('localhost', 'root', '', 'looselyt_artwork');
if ($conn->connect_error) die("Connection failed: " . $conn->connect_error);

$query = "
    SELECT p.id, p.title, d.title as show_title
    FROM paintings p
    LEFT JOIN (
        SELECT artwork_id, deadline_id 
        FROM deadline_submissions 
        WHERE status = 'Accepted'
    ) ds ON p.id = ds.artwork_id
    LEFT JOIN deadlines d ON ds.deadline_id = d.id
    LIMIT 5
";

$res = $conn->query($query);
while($row = $res->fetch_assoc()) {
    print_r($row);
}
?>
