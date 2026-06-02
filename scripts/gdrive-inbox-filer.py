#!/usr/bin/env python3
"""
Muffin's Google Drive Inbox Auto-Filer
Automatically monitors a Google Drive folder ("Muffin Inbox"), downloads new documents,
uses Gemini to analyze their contents, files them into the Mission Control docs library,
and archives the processed files on Google Drive.
"""

import os
import sys
import json
import base64
import subprocess
import urllib.request
import urllib.error
from pathlib import Path

# Paths
WORKSPACE_DIR = Path(r"C:\Users\tberg\.openclaw\workspace")
DOCS_DIR = WORKSPACE_DIR / "docs"
INBOX_DIR = DOCS_DIR / "Inbox"
LOG_FILE = DOCS_DIR / "log.md"
ENV_FILE = Path(r"C:\Users\tberg\Documents\_PROJECTS\MissionControl\.env")

# Ensure local inbox directory exists
INBOX_DIR.mkdir(parents=True, exist_ok=True)

# Helper: Log messages
def log(message, level="INFO"):
    print(f"[{level}] {message}")
    # Write to local docs log
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"- **{level}** [{Path(__file__).name}]: {message}\n")
    except Exception as e:
        print(f"Failed to write to log.md: {e}")

# Helper: Load Gemini API Key from .env
def get_gemini_api_key():
    if ENV_FILE.exists():
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("NEXT_PUBLIC_GEMINI_API_KEY="):
                    return line.strip().split("=", 1)[1]
    return os.environ.get("GEMINI_API_KEY")

# Helper: Run gog CLI command
def run_gog(args):
    cmd = ["gog"] + args
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        if res.stdout:
            try:
                return json.loads(res.stdout)
            except json.JSONDecodeError:
                return res.stdout.strip()
        return None
    except subprocess.CalledProcessError as e:
        print(f"gog command failed: {cmd}")
        print(f"stderr: {e.stderr}")
        raise e

# Find or create a folder on Google Drive
def get_or_create_drive_folder(folder_name, parent_id=None):
    query = f"name = '{folder_name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    if parent_id:
        query += f" and '{parent_id}' in parents"
    
    res = run_gog(["drive", "search", query, "--json"])
    # If the response is a list, parse it.
    if isinstance(res, list) and len(res) > 0:
        return res[0]["id"]
    elif isinstance(res, dict) and "files" in res and len(res["files"]) > 0:
        return res["files"][0]["id"]
    
    # Create it
    log(f"Folder '{folder_name}' not found on Google Drive. Creating it...", "INFO")
    args = ["drive", "mkdir", folder_name, "--json"]
    if parent_id:
        args += ["--parent", parent_id]
    
    new_folder = run_gog(args)
    if isinstance(new_folder, dict) and "id" in new_folder:
        folder_id = new_folder["id"]
    else:
        # Fallback search again
        res = run_gog(["drive", "search", query, "--json"])
        if isinstance(res, list) and len(res) > 0:
            folder_id = res[0]["id"]
        elif isinstance(res, dict) and "files" in res and len(res["files"]) > 0:
            folder_id = res["files"][0]["id"]
        else:
            raise Exception(f"Failed to create or find folder: {folder_name}")
            
    # Get the shareable URL
    try:
        url_info = run_gog(["drive", "url", folder_id])
        log(f"Created Google Drive folder '{folder_name}': {url_info}", "SUCCESS")
    except Exception:
        pass
        
    return folder_id

# Call Gemini to categorize and file the document
def analyze_and_file_doc(file_path, file_name, mime_type, api_key):
    # Determine active subdirectories in docs/Submissions
    submissions_path = DOCS_DIR / "Submissions"
    active_shows = []
    if submissions_path.exists():
        active_shows = [d.name for d in submissions_path.iterdir() if d.is_dir()]
    
    active_shows_str = "\n".join([f"- docs/Submissions/{show}/" for show in active_shows])

    prompt = f"""You are Muffin 🧁, Tom Arenberg's expert studio assistant.
Analyze the provided document (filename: '{file_name}', type: '{mime_type}') and determine where it belongs in our local documentation library.

Our active folder structure is:
- docs/Submissions/[Show-Name]/ (for documents related to a specific art show, prospectus, or submission)
- docs/concepts/ (for general artwork ideas, notes, or brainstorming)
- docs/guides/ (for best practices, how-tos, shipping guidelines)
- docs/lessons/ (for lessons learned, post-mortems)
- docs/projects/ (for software/coding project specs, designs, and architecture)
- docs/research/ (for deep tech exploration, competitive analysis)
- docs/trends/ (for art world/market trends)

Currently active show subdirectories in docs/Submissions/:
{active_shows_str if active_shows else "- (none currently configured)"}

Rules:
1. If the file is a prospectus, acceptance, guidelines, or instruction document for an art show, file it inside the matching `docs/Submissions/[Show-Name]/` folder. If a folder for that show doesn't exist, suggest creating a new one under `docs/Submissions/` with a clean Kebab-case title.
2. If it's general guide info, use `docs/guides/`.
3. If it's a technical coding/application spec, use `docs/projects/`.
4. Suggest a clean, standardized kebab-case filename ending with the original extension (unless it's a Google Doc format, which should export to markdown `.md`).
5. Respond strictly with a JSON object in this format (no markdown blocks, no formatting wrapper, just raw JSON):
{{
  "suggested_path": "docs/.../filename.ext",
  "suggested_filename": "clean-kebab-case-name.ext",
  "reasoning": "A concise sentence explaining your categorization decision."
}}
"""

    log(f"Analyzing file '{file_name}' using Gemini...", "INFO")
    
    # Read and encode file content
    try:
        with open(file_path, "rb") as f:
            file_data = f.read()
    except Exception as e:
        log(f"Failed to read local file {file_name}: {e}", "ERROR")
        return None

    # Handle inline data payload
    if mime_type.startswith("text/") or file_name.endswith(".md") or file_name.endswith(".txt"):
        try:
            text_content = file_data.decode("utf-8", errors="ignore")
            # Send text-based request
            payload = {
                "contents": [{
                    "parts": [
                        {"text": prompt},
                        {"text": f"Here is the text content of the document:\n\n{text_content}"}
                    ]
                }]
            }
        except Exception:
            # Fallback to base64
            payload = {
                "contents": [{
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": "text/plain",
                                "data": base64.b64encode(file_data).decode("utf-8")
                            }
                        }
                    ]
                }]
            }
    else:
        # Send binary base64 request (PDF, Images, etc.)
        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": mime_type if mime_type else "application/pdf",
                            "data": base64.b64encode(file_data).decode("utf-8")
                        }
                    }
                ]
            }]
        }

    # API call
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            text_response = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
            
            # Clean JSON wrapping if the LLM output it in markdown codeblocks
            if text_response.startswith("```"):
                lines = text_response.split("\n")
                if lines[0].startswith("```json") or lines[0].startswith("```"):
                    lines = lines[1:-1]
                text_response = "\n".join(lines).strip()
                
            analysis = json.loads(text_response)
            return analysis
    except Exception as e:
        log(f"Gemini API request failed or JSON parse error: {e}", "ERROR")
        return None

def main():
    api_key = get_gemini_api_key()
    if not api_key:
        log("No Gemini API key found in workspace environment.", "ERROR")
        sys.exit(1)

    log("Running Muffin's Google Drive Auto-Filer...", "INFO")
    
    try:
        # 1. Resolve primary "Muffin Inbox" folder ID on Google Drive
        inbox_id = get_or_create_drive_folder("Muffin Inbox")
        
        # 2. Resolve or create "Processed" subfolder inside "Muffin Inbox"
        processed_id = get_or_create_drive_folder("Processed", parent_id=inbox_id)
        
        # 3. List files inside "Muffin Inbox"
        files_res = run_gog(["drive", "ls", f"--parent={inbox_id}", "--json"])
        
        # Handle different output structures
        files = []
        if isinstance(files_res, list):
            files = files_res
        elif isinstance(files_res, dict) and "files" in files_res:
            files = files_res["files"]
            
        # Filter out folder structures (we only want to process files)
        files = [f for f in files if f.get("mimeType") != "application/vnd.google-apps.folder"]
        
        if not files:
            log("No new files found in 'Muffin Inbox' Google Drive folder. Nominal.", "INFO")
            return
            
        log(f"Found {len(files)} new files to process.", "INFO")
        
        for file in files:
            file_id = file["id"]
            file_name = file["name"]
            mime_type = file.get("mimeType", "")
            
            log(f"Processing '{file_name}' (ID: {file_id}, Type: {mime_type})...", "INFO")
            
            # Download temporarily to workspace Inbox
            temp_path = INBOX_DIR / file_name
            try:
                run_gog(["drive", "download", file_id, f"--out={temp_path}"])
                log(f"Downloaded '{file_name}' to local Inbox scratchpad.", "INFO")
            except Exception as e:
                log(f"Failed to download file '{file_name}': {e}", "ERROR")
                continue
                
            # Analyze using Gemini
            analysis = analyze_and_file_doc(temp_path, file_name, mime_type, api_key)
            
            if not analysis or "suggested_path" not in analysis:
                log(f"Could not classify '{file_name}'. Leaving in local Inbox scratchpad.", "WARNING")
                continue
                
            suggested_path_str = analysis["suggested_path"]
            reasoning = analysis.get("reasoning", "Categorized by Muffin.")
            
            # Resolve target path
            target_file_path = WORKSPACE_DIR / suggested_path_str.replace("/", os.sep)
            
            # Ensure parent directories exist
            target_file_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Move downloaded file to target path
            try:
                if target_file_path.exists():
                    # Backup existing file
                    backup_path = target_file_path.with_name(f"{target_file_path.stem}-old{target_file_path.suffix}")
                    target_file_path.rename(backup_path)
                    
                temp_path.rename(target_file_path)
                log(f"File successfully filed to '{suggested_path_str}'!", "SUCCESS")
                log(f"Reasoning: {reasoning}", "INFO")
            except Exception as e:
                log(f"Failed to write file to target path '{target_file_path}': {e}", "ERROR")
                continue
                
            # Move on Google Drive to 'Processed' folder
            try:
                run_gog(["drive", "move", file_id, f"--parent={processed_id}"])
                log(f"Archived file on Google Drive to 'Processed' folder.", "SUCCESS")
            except Exception as e:
                log(f"Failed to move file on Google Drive: {e}", "WARNING")
                
        log("Execution completed successfully.", "SUCCESS")
        
    except Exception as e:
        log(f"Filer execution failed: {e}", "ERROR")
        sys.exit(1)

if __name__ == "__main__":
    main()
