#!/usr/bin/env python3
"""
Gmail Art Show Scanner for Mission Control
Scans Gmail for art show calls and updates art-deadlines.json
"""

import json
import subprocess
import re
from datetime import datetime
from pathlib import Path

# Paths
MC_ROOT = Path(__file__).parent.parent
DATA_DIR = MC_ROOT / "data"
DEADLINES_FILE = DATA_DIR / "art-deadlines.json"

# Gmail search query for art show calls
GMAIL_QUERY = 'subject:(call for artists OR art competition OR juried show OR exhibition opportunity) newer_than:30d'

def run_gog_command(args):
    """Execute gog CLI command and return output"""
    try:
        result = subprocess.run(
            ['gog', 'gmail'] + args,
            capture_output=True,
            text=True,
            timeout=60
        )
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        print("[!] Gmail command timed out")
        return ""
    except FileNotFoundError:
        print("[!] gog CLI not found. Install: npm install -g @openclaw/gog")
        return ""

def extract_deadline(text):
    """Extract deadline date from email text"""
    # Common patterns
    patterns = [
        r'deadline[:\s]+(\w+\s+\d{1,2},?\s+\d{4})',
        r'due[:\s]+(\w+\s+\d{1,2},?\s+\d{4})',
        r'entries\s+close[:\s]+(\w+\s+\d{1,2},?\s+\d{4})',
        r'submit\s+by[:\s]+(\w+\s+\d{1,2},?\s+\d{4})',
        r'(\d{1,2}/\d{1,2}/\d{4})',
        r'(\d{4}-\d{2}-\d{2})'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            date_str = match.group(1)
            # Try to parse various date formats
            for fmt in ['%B %d, %Y', '%B %d %Y', '%m/%d/%Y', '%Y-%m-%d']:
                try:
                    dt = datetime.strptime(date_str, fmt)
                    return dt.strftime('%Y-%m-%d')
                except ValueError:
                    continue
    return None

def extract_location(text):
    """Extract gallery/location from email text"""
    # Look for common location patterns
    patterns = [
        r'(?:at|@)\s+([A-Z][a-zA-Z\s&]+(?:Gallery|Museum|Art Center|Arts|Studio))',
        r'(?:venue|location)[:\s]+([A-Z][^.\n]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            location = match.group(1).strip()
            # Clean up
            location = re.sub(r'\s+', ' ', location)
            return location[:100]  # Limit length
    
    return "Location TBD"

def extract_link(text):
    """Extract website link from email text"""
    # Look for URLs
    url_pattern = r'https?://[^\s<>"]+(?:apply|submit|entry|call|exhibition|show)[^\s<>"]*'
    match = re.search(url_pattern, text, re.IGNORECASE)
    if match:
        url = match.group(0)
        # Clean trailing punctuation
        url = re.sub(r'[.,;!?]+$', '', url)
        return url
    
    # Fallback to any http link
    simple_url = r'https?://[^\s<>"]+'
    match = re.search(simple_url, text)
    if match:
        return re.sub(r'[.,;!?]+$', '', match.group(0))
    
    return None

def parse_email(email_json):
    """Parse email JSON and extract show details"""
    try:
        data = json.loads(email_json)
        
        subject = data.get('subject', '')
        body = data.get('body', '') or data.get('snippet', '')
        sender = data.get('from', '')
        
        # Skip if from known non-show sources
        skip_senders = ['noreply', 'newsletter', 'digest', 'notification']
        if any(s in sender.lower() for s in skip_senders):
            return None
        
        # Extract details
        title = subject.strip()
        deadline = extract_deadline(body) or extract_deadline(subject)
        location = extract_location(body)
        link = extract_link(body)
        
        if not deadline:
            print(f"[!] No deadline found in: {title[:50]}")
            return None
        
        return {
            "title": title,
            "location": location,
            "due_date": deadline,
            "link": link or "Email only",
            "source": "Gmail",
            "scanned_at": datetime.now().isoformat()
        }
        
    except json.JSONDecodeError:
        print(f"[!] Failed to parse email JSON")
        return None

def load_existing_deadlines():
    """Load existing deadlines from JSON file"""
    if not DEADLINES_FILE.exists():
        return []
    
    try:
        with open(DEADLINES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError:
        print("[!] Corrupted deadlines file, starting fresh")
        return []

def save_deadlines(deadlines):
    """Save deadlines to JSON file"""
    DATA_DIR.mkdir(exist_ok=True)
    
    with open(DEADLINES_FILE, 'w', encoding='utf-8') as f:
        json.dump(deadlines, f, indent=2, ensure_ascii=False)
    
    print(f"[+] Saved {len(deadlines)} deadlines to {DEADLINES_FILE}")

def is_duplicate(new_show, existing_deadlines):
    """Check if show already exists (fuzzy match)"""
    for existing in existing_deadlines:
        # Same title
        if new_show['title'].lower() == existing['title'].lower():
            return True
        
        # Similar title + same deadline
        title_similarity = len(set(new_show['title'].lower().split()) & 
                               set(existing['title'].lower().split()))
        if title_similarity >= 3 and new_show['due_date'] == existing.get('due_date'):
            return True
    
    return False

def main():
    print("[*] Scanning Gmail for art show calls...")
    
    # Search Gmail
    output = run_gog_command(['search', f'"{GMAIL_QUERY}"', '--format', 'json', '--limit', '50'])
    
    if not output:
        print("[!] No results from Gmail")
        return
    
    # Parse emails
    emails = []
    try:
        emails = json.loads(output)
        if not isinstance(emails, list):
            emails = [emails]
    except json.JSONDecodeError:
        # Assume newline-delimited JSON
        for line in output.split('\n'):
            if line.strip():
                try:
                    emails.append(json.loads(line))
                except:
                    pass
    
    print(f"[*] Found {len(emails)} potential show emails")
    
    # Load existing deadlines
    existing = load_existing_deadlines()
    print(f"[*] Loaded {len(existing)} existing deadlines")
    
    # Parse and dedupe
    new_shows = []
    for email in emails:
        show = parse_email(json.dumps(email))
        if show and not is_duplicate(show, existing + new_shows):
            new_shows.append(show)
            print(f"[+] New: {show['title'][:60]} (due: {show['due_date']})")
    
    if new_shows:
        # Merge with existing
        all_deadlines = existing + new_shows
        
        # Sort by deadline
        all_deadlines.sort(key=lambda x: x.get('due_date', '9999-12-31'))
        
        # Save
        save_deadlines(all_deadlines)
        print(f"\n[+] Added {len(new_shows)} new art shows")
    else:
        print("\n[*] No new shows found")

if __name__ == '__main__':
    main()
