<?php
$conn = new mysqli('localhost', 'root', '', 'looselyt_artwork');
if ($conn->connect_error) die($conn->connect_error);

$title = "AcrylicWorks 13: The Best of Acrylic";
$date = "2026-05-22";
$link = "slaichas@goldenpeakmedia.com";
$desc = "Winner Instructions for AcrylicWorks 13. \n\nDEADLINE: May 22, 2026\n\nCONTACT: Sarah Laichas (slaichas@goldenpeakmedia.com)\n\nREQUIREMENTS:\n1. Caption (100-150 words, .doc/.rtf)\n2. Legend (Title, Dimensions, Surface, Materials)\n3. Digital Image (300dpi, min 8in height/2400px, TIFF or JPG)\n\nLABELING:\n- Art: Lastname_Firstname_Title.JPG\n- Caption: Lastname_Firstname_Caption.doc\n\nNOTE: Winners receive 2 copies + 50% discount code. Publication Sept 2026.";

$stmt = $conn->prepare("INSERT INTO deadlines (title, date, link, description, status) VALUES (?, ?, ?, ?, 'Entered')");
$stmt->bind_param("ssss", $title, $date, $link, $desc);

if ($stmt->execute()) {
    echo "Deadline added with ID: " . $conn->insert_id . "\n";
} else {
    echo "Error: " . $stmt->error;
}
?>
