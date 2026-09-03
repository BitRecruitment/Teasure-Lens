"""
TreasureLens AR Local Web Server + Live Hunt Cloud API + Admin-Only Private Leaderboard + Cloudflare HTTPS Tunnel
Enables teachers/admins to:
1. Update locations anytime from their phone.
2. Broadcast live updates to all students.
3. Track who completed all riddles first with exact timestamps & elapsed times in a STRICTLY PRIVATE Admin Leaderboard!
"""

import http.server
import socket
import socketserver
import os
import sys
import threading
import subprocess
import re
import time
import json
import urllib.parse

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

PORT = int(os.environ.get('PORT', 8000))
DATA_FILE = "hunt_data.json"
LEADERBOARD_FILE = "leaderboard.json"
ADMIN_PASSWORD_FILE = "admin_password.txt"
LOG_FILE = "tunnel.log"
URL_FILE = "tunnel_url.txt"


def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

def get_admin_password():
    if os.path.exists(ADMIN_PASSWORD_FILE):
        try:
            with open(ADMIN_PASSWORD_FILE, "r", encoding="utf-8") as f:
                return f.read().strip()
        except Exception:
            pass
    return "123"

def load_leaderboard():
    if os.path.exists(LEADERBOARD_FILE):
        try:
            with open(LEADERBOARD_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []

def save_leaderboard(data):
    with open(LEADERBOARD_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

class LiveHuntServerHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # 1. API: GET /api/hunt (Fetch current live hunt data)
        if self.path.startswith('/api/hunt'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()

            if os.path.exists(DATA_FILE):
                try:
                    with open(DATA_FILE, "r", encoding="utf-8") as f:
                        self.wfile.write(f.read().encode('utf-8'))
                        return
                except Exception:
                    pass

            self.wfile.write(json.dumps({"status": "no_custom_hunt"}).encode('utf-8'))
            return

        # 2. API: GET /api/leaderboard (STRICTLY ADMIN-ONLY - Password Protected)
        if self.path.startswith('/api/leaderboard'):
            # Check for admin password in header or query parameter
            parsed = urllib.parse.urlparse(self.path)
            query_params = urllib.parse.parse_qs(parsed.query)
            provided_query_pass = query_params.get('password', [''])[0]
            provided_header_pass = self.headers.get('X-Admin-Password', '')

            auth_pass = (provided_header_pass or provided_query_pass).strip()
            current_pass = get_admin_password()

            if auth_pass != current_pass:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": "Unauthorized: Leaderboard is strictly private and accessible only from the Admin Panel."
                }).encode('utf-8'))
                return

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()

            records = load_leaderboard()

            def sort_key(item):
                is_fin = 1 if item.get('finished') else 0
                f_time = item.get('finishTimestamp', 9999999999) if is_fin else 9999999999
                clues = item.get('cluesCompleted', 0)
                return (-is_fin, f_time, -clues)

            records.sort(key=sort_key)
            self.wfile.write(json.dumps({"leaderboard": records}).encode('utf-8'))
            return

        return super().do_GET()

    def do_POST(self):
        # 1. API: POST /api/hunt (Admin publishes new locations)
        if self.path.startswith('/api/hunt'):
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length).decode('utf-8')
                payload = json.loads(body)

                provided_pass = str(payload.get('password', '')).strip()
                current_pass = get_admin_password()

                if provided_pass != current_pass:
                    self.send_response(401)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Invalid admin password"}).encode('utf-8'))
                    return

                hunt_data = payload.get('hunt')
                if not hunt_data:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Missing hunt data"}).encode('utf-8'))
                    return

                with open(DATA_FILE, "w", encoding="utf-8") as f:
                    json.dump(hunt_data, f, indent=2)

                print(f"\n [OK] NEW HUNT PUBLISHED! ({len(hunt_data.get('clues', []))} landmarks)", flush=True)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True, 
                    "message": "Hunt published live to all students!",
                    "timestamp": time.time()
                }).encode('utf-8'))
                return

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
                return

        # 2. API: POST /api/progress (Student submits progress / completion)
        if self.path.startswith('/api/progress'):
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length).decode('utf-8')
                payload = json.loads(body)

                student_id = payload.get('studentId') or f"std_{int(time.time()*1000)}"
                student_name = payload.get('name', 'Anonymous Explorer').strip()
                clues_completed = int(payload.get('cluesCompleted', 0))
                total_clues = int(payload.get('totalClues', 0))
                finished = bool(payload.get('finished', False))
                elapsed_seconds = payload.get('elapsedSeconds', 0)

                records = load_leaderboard()

                existing = None
                for r in records:
                    if r.get('studentId') == student_id:
                        existing = r
                        break

                now_ts = time.time()
                now_str = time.strftime("%I:%M:%S %p")

                if existing:
                    existing['name'] = student_name
                    existing['cluesCompleted'] = clues_completed
                    existing['totalClues'] = total_clues
                    existing['lastActive'] = now_str
                    if finished and not existing.get('finished'):
                        existing['finished'] = True
                        existing['finishTime'] = now_str
                        existing['finishTimestamp'] = now_ts
                        existing['elapsedSeconds'] = elapsed_seconds
                        print(f"\n [WINNER] {student_name} COMPLETED ALL RIDDLES at {now_str}! Time: {elapsed_seconds}s", flush=True)
                else:
                    new_entry = {
                        "studentId": student_id,
                        "name": student_name,
                        "cluesCompleted": clues_completed,
                        "totalClues": total_clues,
                        "finished": finished,
                        "startTime": now_str,
                        "lastActive": now_str
                    }
                    if finished:
                        new_entry['finishTime'] = now_str
                        new_entry['finishTimestamp'] = now_ts
                        new_entry['elapsedSeconds'] = elapsed_seconds
                        print(f"\n [WINNER] {student_name} COMPLETED ALL RIDDLES at {now_str}!", flush=True)
                    records.append(new_entry)

                save_leaderboard(records)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
                return

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
                return

        # 3. API: POST /api/leaderboard/reset (Teacher clears leaderboard for new round)
        if self.path.startswith('/api/leaderboard/reset'):
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length).decode('utf-8')
                payload = json.loads(body)

                provided_pass = str(payload.get('password', '')).strip()
                if provided_pass != get_admin_password():
                    self.send_response(401)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Invalid admin password"}).encode('utf-8'))
                    return

                save_leaderboard([])
                print("\n [RESET] Leaderboard cleared for new round by admin.", flush=True)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "message": "Leaderboard reset"}).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
                return

        return super().do_POST()

def start_http_server(port):
    handler = LiveHuntServerHandler
    try:
        httpd = socketserver.TCPServer(("", port), handler)
        httpd.serve_forever()
    except Exception as e:
        print(f"Server error: {e}", flush=True)

if __name__ == '__main__':
    web_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(web_dir)

    for f in [LOG_FILE, URL_FILE]:
        if os.path.exists(f):
            try: os.remove(f)
            except: pass

    ip = get_local_ip()

    server_thread = threading.Thread(target=start_http_server, args=(PORT,), daemon=True)
    server_thread.start()

    print("=" * 65, flush=True)
    print(" [*] TREASURELENS AR - Live Cloud Sync & Private Leaderboard Active", flush=True)
    print("=" * 65, flush=True)
    print(f" >> Local Web:          http://localhost:{PORT}", flush=True)
    print(f" >> Wi-Fi Local:        http://{ip}:{PORT}", flush=True)

    cf_path = os.path.join(web_dir, "cloudflared.exe")
    tunnel_proc = None
    is_cloud = bool(os.environ.get('PORT')) or sys.platform != 'win32'

    if not is_cloud and os.path.exists(cf_path):
        print(" [*] Starting rock-solid HTTPS tunnel (HTTP/2 mode)...", flush=True)
        try:
            tunnel_proc = subprocess.Popen(
                [cf_path, "tunnel", "--protocol", "http2", "--url", f"http://localhost:{PORT}", "--logfile", LOG_FILE]
            )

            tunnel_url = None
            start_time = time.time()
            while time.time() - start_time < 30:
                time.sleep(1)
                if os.path.exists(LOG_FILE):
                    try:
                        with open(LOG_FILE, "r", encoding="utf-8", errors="ignore") as lf:
                            log_content = lf.read()
                            matches = re.findall(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com', log_content)
                            for m in matches:
                                if "api.trycloudflare.com" not in m:
                                    tunnel_url = m
                                    break
                    except:
                        pass
                if tunnel_url:
                    break

            if tunnel_url:
                with open(URL_FILE, "w", encoding="utf-8") as f:
                    f.write(tunnel_url)

                print("=" * 65, flush=True)
                print(" [***] SHARE THIS SINGLE APP URL WITH STUDENTS [***]", flush=True)
                print(f"\n   >>> {tunnel_url} <<<\n", flush=True)
                print("=" * 65, flush=True)
                print(" [OK] Leaderboard is strictly PRIVATE: Visible ONLY in Admin Panel.", flush=True)
                print(" [OK] Students see their personal completion time only.", flush=True)
                print("=" * 65, flush=True)
            else:
                print(" [!] Tunnel taking longer to assign URL. Check tunnel.log.", flush=True)
        except Exception as e:
            print(f" [!] Cloudflared error: {e}", flush=True)

    print("\n Server is active and listening for live updates. Press Ctrl+C to exit.\n", flush=True)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        if tunnel_proc:
            tunnel_proc.terminate()
        sys.exit(0)
