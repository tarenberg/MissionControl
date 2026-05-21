<?php
try {
    $conn = new PDO("mysql:host=localhost;dbname=looselyt_artwork;charset=utf8mb4", "root", "");
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $query = "
        SELECT p.*, 
               MAX(CASE WHEN ds.status = 'Accepted' THEN 2 WHEN ds.id IS NOT NULL THEN 1 ELSE 0 END) as status_rank,
               GROUP_CONCAT(DISTINCT CASE WHEN ds.status = 'Accepted' THEN d.title END SEPARATOR ', ') as accepted_shows,
               GROUP_CONCAT(DISTINCT d.title SEPARATOR ', ') as all_shows
        FROM paintings p
        LEFT JOIN deadline_submissions ds ON p.id = ds.artwork_id
        LEFT JOIN deadlines d ON ds.deadline_id = d.id
        GROUP BY p.id
        ORDER BY p.id DESC
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->execute();
    $paintings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Query successful. Found " . count($paintings) . " paintings.\n";
    
} catch(Exception $e) {
    echo "Query failed: " . $e->getMessage() . "\n";
}
?>
