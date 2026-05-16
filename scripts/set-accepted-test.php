<?php
$conn = new mysqli('localhost', 'root', '', 'looselyt_artwork');
if ($conn->connect_error) die($conn->connect_error);
$conn->query("UPDATE deadline_submissions SET status = 'Accepted' WHERE artwork_id = 6 AND deadline_id = 12");
echo "Updated Artwork 6 to Accepted for Deadline 12\n";
?>
