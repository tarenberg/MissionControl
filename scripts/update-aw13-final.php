<?php
$conn = new mysqli('localhost', 'root', '', 'looselyt_artwork');
if ($conn->connect_error) die($conn->connect_error);

$id = 16;
$description = "AcrylicWorks 13: The Best of Acrylic - Winner Instructions\n\n" .
               "DEADLINE: May 22, 2026\n" .
               "CONTACT: Sarah Laichas (slaichas@goldenpeakmedia.com)\n\n" .
               "REQUIREMENTS:\n" .
               "1. CAPTION: 100-150 words narrative. Technique, studio setup, or backstory. Include one-sentence quote/tip. Format: .doc or .RTF (single-spaced, size 12 font).\n" .
               "2. LEGEND: Title, Artist Name, Detailed Mediums (incl. surface), Dimensions (HxW in inches).\n" .
               "3. IMAGE: TIFF or high-quality JPG. Min 300 dpi. Dimensions: 8x10 inches preferred. Cover consideration requires min 8\" height (2400px).\n\n" .
               "FILE LABELING (Strict):\n" .
               "- Art: Lastname_Firstname_Title.JPG\n" .
               "- Caption: Lastname_Firstname_Caption.doc\n\n" .
               "BENEFITS: 2 comp copies, 50% discount code, digital winner's badge.\n" .
               "PUBLICATION: Sept 2026.";

$stmt = $conn->prepare("UPDATE deadlines SET description = ?, show_start = '2026-09-01' WHERE id = ?");
$stmt->bind_param("si", $description, $id);

if ($stmt->execute()) {
    echo "Deadline ID 16 updated with full document info.\n";
} else {
    echo "Error updating deadline: " . $stmt->error . "\n";
}
?>
