<?php
$conn = new mysqli('localhost', 'root', '', 'looselyt_artwork');
if ($conn->connect_error) die($conn->connect_error);

// 1. Delete the redundant old ID 42 (the initial competition entry)
$conn->query("DELETE FROM upcoming_shows WHERE id = 42");

// 2. Update the new ID 138 with the submission link and correct fee status
$conn->query("UPDATE upcoming_shows SET 
    link = 'mailto:slaichas@goldenpeakmedia.com',
    fee = 'None (Winner Submission)',
    user_status = 'Interested'
    WHERE id = 138");

echo "Cleaned up upcoming_shows (Removed ID 42, Updated ID 138)\n";

// 3. Update the Deadlines table (ID 16) to ensure the link is a mailto: for the assistant
$conn->query("UPDATE deadlines SET 
    link = 'mailto:slaichas@goldenpeakmedia.com'
    WHERE id = 16");

echo "Updated Deadlines ID 16 with mailto: link.\n";
?>
