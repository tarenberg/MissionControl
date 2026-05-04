import json
from datetime import datetime, timedelta
import os

# Function to safely call default_api.read
def read_file_content(api_client, file_path):
    print(f"DEBUG: read_file_content called for {file_path}")
    try:
        response = api_client.read(path=file_path)
        if response and 'read_response' in response and 'output' in response['read_response']:
            print(f"DEBUG: Successfully read {file_path}. Length: {len(response['read_response']['output'])}")
            return response['read_response']['output']
        print(f"DEBUG: Read for {file_path} returned no output or error in response: {response}")
        return ""
    except Exception as e:
        print(f"DEBUG: Error reading {file_path}: {e}")
        return ""

# Function to parse tasks from todo.md
def parse_tasks(content):
    print("DEBUG: parse_tasks called.")
    tasks_by_status = {'In Progress': [], 'Backlog': [], 'Recurring': [], 'Done': []}
    blocks = content.split('\n## Task:')[1:] if '\n## Task:' in content else []
    print(f"DEBUG: Found {len(blocks)} task blocks.")

    for block in blocks:
        lines = block.strip().split('\n')
        header_line = lines.pop(0).strip()
        title_full = header_line.replace('## Task:', '').strip()
        title = title_full.split('(')[0].strip() # Get title before parentheses

        status_assigned = 'Backlog' # Default

        # Check for Recurring status first
        if '(recurring)' in title_full.lower():
            status_assigned = 'Recurring'
        else:
            # Check for checklist items to determine In Progress, Backlog, Done
            checkbox_lines = [line for line in lines if '- [' in line]
            total_items = len(checkbox_lines)
            completed_items = len([line for line in checkbox_lines if '- [x]' in line.lower()])

            if total_items == 0:
                status_assigned = 'Backlog'
            elif completed_items == 0 and total_items > 0:
                status_assigned = 'Backlog'
            elif completed_items > 0 and completed_items < total_items:
                status_assigned = 'In Progress'
            elif completed_items == total_items and total_items > 0:
                status_assigned = 'Done'
            else:
                status_assigned = 'Backlog' # Should already be default, but explicit

        tasks_by_status[status_assigned].append(title)
    print(f"DEBUG: Parsed tasks: {tasks_by_status}")
    return tasks_by_status

# Function to get today's date
def get_today_date_formatted():
    return datetime.now().strftime('%A, %B %d, %Y')

# Function to get weather forecast (using exec for external tool)
def get_weather_forecast(api_client, location="New York, NY"):
    print(f"DEBUG: get_weather_forecast called for {location}")
    try:
        response = api_client.exec(command=f'weather {location}')
        if response and 'exec_response' in response and 'output' in response['exec_response']:
            output_lines = response['exec_response']['output'].split('\n')
            summary = []
            for line in output_lines:
                if 'Location:' in line or 'Weather:' in line or 'Temperature:' in line or 'Wind:' in line:
                    summary.append(line.strip())
            print(f"DEBUG: Weather summary: {summary}")
            return ', '.join(summary) if summary else "Weather details unavailable."
        print(f"DEBUG: Weather exec returned no output or error in response: {response}")
        return "Weather forecast unavailable."
    except Exception as e:
        print(f"DEBUG: Error getting weather: {e}")
        return "Weather forecast unavailable."

# Function to get calendar events (using exec for external tool)
def get_calendar_events(api_client, days=1, is_today=False):
    print(f"DEBUG: get_calendar_events called for days={days}, is_today={is_today}")
    events_list = []
    try:
        now = datetime.now()
        start_date = now if is_today else now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = start_date + timedelta(days=days)

        start_iso = start_date.isoformat() + "Z"
        end_iso = end_date.isoformat() + "Z"
        command = f"gog calendar list --from \'{start_iso}\' --to \'{end_iso}\'"
        print(f"DEBUG: Calendar command: {command}")
        response = api_client.exec(command=command)

        if response and 'exec_response' in response and 'output' in response['exec_response']:
            events_raw = response['exec_response']['output'].split('\n')
            for line in events_raw:
                line = line.strip()
                if line and not line.lower().startswith(('error', 'no events')):
                    events_list.append(f"- {line}")
        
        return events_list if events_list else ["- No appointments."]
    except Exception as e:
        print(f"DEBUG: Error getting calendar events: {e}")
        return ["- Calendar events unavailable."]

# Function to summarize Muffin's activities from memory
def get_muffin_accomplishments(api_client, date_str):
    print(f"DEBUG: get_muffin_accomplishments called for {date_str}")
    memory_path = f"memory/{date_str}.md"
    content = read_file_content(api_client, memory_path)
    if not content:
        print(f"DEBUG: No content found for {memory_path}")
        return ["- No significant activity recorded overnight."]
    
    accomplishments = []
    lines = content.split('\n')
    capture = False
    for line in lines:
        if "**Key Activities & Outcomes:**" in line:
            capture = True
            continue
        if capture and line.strip() and not line.strip().startswith('**Lessons Learned'):
            accomplishments.append(f"- {line.strip().replace('*', '').replace('-', '').strip()}")
        if "**Lessons Learned:**" in line:
            break
            
    print(f"DEBUG: Muffin accomplishments: {accomplishments}")
    return accomplishments if accomplishments else ["- No significant activity recorded overnight."]


# Main script logic function
def generate_kickoff_report(api_client):
    print("DEBUG: generate_kickoff_report started.")
    today = datetime.now()
    today_date_str = today.strftime('%Y-%m-%d')
    yesterday_date_str = (today - timedelta(days=1)).strftime('%Y-%m-%d')
    report_dir = 'memory'
    report_file_name = f"{report_dir}/morning_kickoff_report_{today_date_str}.md"

    # Ensure the memory directory exists
    if not os.path.exists(report_dir):
        print(f"DEBUG: Creating directory {report_dir}")
        os.makedirs(report_dir, exist_ok=True)

    # Get information
    formatted_today_date = get_today_date_formatted()
    weather_forecast = get_weather_forecast(api_client)
    todo_content = read_file_content(api_client, "C:/Users/tberg/.openclaw/workspace/tasks/todo.md")
    tasks_status = parse_tasks(todo_content)
    today_calendar_events = get_calendar_events(api_client, days=1, is_today=True)
    upcoming_week_calendar_events = get_calendar_events(api_client, days=7, is_today=False)
    muffin_accomplishments = get_muffin_accomplishments(api_client, yesterday_date_str)

    # Construct the message
    report_message = f"""Muffin: Good morning, Tom! Here's your operational kickoff.

**Today's Date:**
- {formatted_today_date}

**Today's Weather:**
- {weather_forecast}

**Overnight Accomplishments:**
{'\n'.join(muffin_accomplishments)}

**Today's Calendar:**
{'\n'.join(today_calendar_events)}

**Upcoming Week's Calendar:**
{'\n'.join(upcoming_week_calendar_events)}

**Pending Tasks:**
- {len(tasks_status['In Progress'])} tasks In Progress
- {len(tasks_status['Backlog'])} tasks in Backlog
- {len(tasks_status['Recurring'])} Recurring tasks
Remember to check your Mission Control Task Board at http://192.168.1.53:3000/tasks for details and to delegate as needed. Have a productive day!"""

    # Write the report to a file
    print(f"DEBUG: Attempting to write report to {report_file_name}")
    print(f"DEBUG: Report message length: {len(report_message)}")
    write_response = api_client.write(content=report_message, path=report_file_name)
    print(f"DEBUG: default_api.write response: {write_response}")
    if write_response and 'write_response' in write_response and 'output' in write_response['write_response']:
      print(f"Morning kickoff report saved to {report_file_name}")
      print("DEBUG: Morning kickoff report generation and write attempt completed.")
    else:
      print(f"ERROR: Failed to write report to {report_file_name}. Response: {write_response}")
      print("DEBUG: Morning kickoff report generation and write attempt completed with ERROR.")

# The script no longer calls run_kickoff_report() directly
# It will be called by the agent, passing the default_api object.
