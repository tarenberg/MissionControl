<?php
$conn = new mysqli('localhost', 'root', '', 'looselyt_artwork');
if ($conn->connect_error) die($conn->connect_error);

// Update status to 'Interested' so it passes the API filter in shows.php
$conn->query("UPDATE upcoming_shows SET user_status = 'Interested' WHERE id = 138");
echo "Updated upcoming_shows ID 138 to 'Interested'\n";

// Ensure deadlines ID 16 is also 'Interested' or similar if needed (though deadlines.php doesn't filter)
$conn->query("UPDATE deadlines SET status = 'Pending' WHERE id = 16");
echo "Updated deadlines ID 16 to 'Pending'\n";
?>
