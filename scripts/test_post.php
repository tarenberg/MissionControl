<?php
$data = [
    "title" => "Hamden Art League Spring Barn Exhibition TEST",
    "location" => "Eli Whitney Barn, CT",
    "due_date" => "2026-05-15",
    "fee" => "",
    "description" => "TEST",
    "link" => "https://test.com/hamden",
    "scope" => "N",
    "user_status" => "Interested"
];

$ch = curl_init('http://localhost:8080/tools/ArtTrackerDashboard/api/shows.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Response: $response\n";
