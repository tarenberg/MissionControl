#!/usr/bin/env python3
import mysql.connector
import json
import os
import re
import subprocess
import sys

# Paths
WEBSITE_DIR = "C:\\Users\\tberg\\Documents\\_PROJECTS\\TomArenbergWebsite"
CONSTANTS_PATH = os.path.join(WEBSITE_DIR, "constants.ts")

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="looselyt_artwork"
    )

def main():
    print("[*] Starting website artwork synchronization (MySQL -> constants.ts)...")
    
    # 1. Fetch artwork details from MySQL
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM paintings ORDER BY id DESC")
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        print(f"[+] Retrieved {len(rows)} paintings from MySQL database.")
    except Exception as e:
        print(f"[-] Database connection or query failed: {e}")
        sys.exit(1)
        
    # 2. Map MySQL rows to website's Painting interface
    paintings_data = []
    for row in rows:
        available = True if row.get('available') == 1 else False
        
        # Ensure description defaults to empty string rather than None
        description = row.get('description') or ""
        
        # Format price cleanly
        price = row.get('price') or ""
        if not price.startswith("$") and price.replace(",", "").replace(".", "").isdigit():
            try:
                price = f"${int(float(price)):,}"
            except:
                pass
                
        # Handle relative or absolute image URLs
        image_url = row.get('imageURL') or ""
        if image_url.startswith("../"):
            image_url = image_url.replace("../", "https://www.looselytwisted.com/")

        painting = {
            "id": int(row['id']),
            "title": row.get('title') or "Untitled",
            "description": description,
            "size": row.get('size') or "N/A",
            "medium": row.get('medium') or "N/A",
            "price": price if available else "Sold",
            "imageUrl": image_url,
            "available": available
        }
        paintings_data.append(painting)

    # 3. Read constants.ts and inject paintings
    if not os.path.exists(CONSTANTS_PATH):
        print(f"[-] Error: Website constants.ts not found at: {CONSTANTS_PATH}")
        sys.exit(1)
        
    with open(CONSTANTS_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    # Convert mapping to clean JSON
    json_str = json.dumps(paintings_data, indent=2)
    paintings_block = f"export const PAINTINGS: Painting[] = {json_str};"

    # Regex to match export const PAINTINGS array block
    pattern = r"export const PAINTINGS:\s*Painting\[\]\s*=\s*\[[\s\S]*?\];"
    
    if not re.search(pattern, content):
        print("[-] Error: Could not locate PAINTINGS array in constants.ts.")
        sys.exit(1)

    updated_content = re.sub(pattern, lambda m: paintings_block, content)
    
    with open(CONSTANTS_PATH, "w", encoding="utf-8") as f:
        f.write(updated_content)
    print("[+] Successfully updated website constants.ts with latest database entries.")

    # 4. Stage, commit, and push to GitHub
    try:
        print("[*] Staging and committing changes inside website repository...")
        # Check status
        status_res = subprocess.run(["git", "status", "--porcelain"], cwd=WEBSITE_DIR, capture_output=True, text=True, check=True)
        if "constants.ts" in status_res.stdout or "constants.ts" in subprocess.run(["git", "diff"], cwd=WEBSITE_DIR, capture_output=True, text=True).stdout:
            subprocess.run(["git", "add", "constants.ts"], cwd=WEBSITE_DIR, check=True)
            subprocess.run(["git", "commit", "-m", "sync: auto-sync artworks database from local tracker"], cwd=WEBSITE_DIR, check=True)
            print("[*] Pushing updates to GitHub (main)...")
            subprocess.run(["git", "push", "origin", "main"], cwd=WEBSITE_DIR, check=True)
            print("[+] Git synchronization complete! Website rebuild triggered.")
        else:
            print("[~] No changes detected in the artworks list since last sync. Skipping Git push.")
    except Exception as e:
        print(f"[-] Git synchronization failed: {e}")

if __name__ == "__main__":
    main()
