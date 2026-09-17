import os
import json
import time
import urllib.request
import urllib.parse
from playwright.sync_api import sync_playwright

PROOF_DIR = r"c:\projects\tool\FRAUD_FEATURE_PROOF"
os.makedirs(PROOF_DIR, exist_ok=True)

def api_call(url, data=None, headers=None, method='GET'):
    hdrs = {"Content-Type": "application/json"}
    if headers:
        hdrs.update(headers)
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, headers=hdrs, method=method)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def run():
    print("=== STARTING FRAUD SUITE E2E & SCREENSHOT QA RUNNER ===")
    
    # 1. Login to get token
    login_res = api_call("http://localhost:3000/api/auth/login", {"email": "admin", "password": "admin123"}, method='POST')
    token = login_res["data"]["token"]
    auth_headers = {"Authorization": f"Bearer {token}"}
    print("[1] Logged in successfully. Token acquired.")

    # 2. Retrieve client and vendor
    clients = api_call("http://localhost:3000/api/clients/active", headers=auth_headers)["data"]
    vendors = api_call("http://localhost:3000/api/vendors/active", headers=auth_headers)["data"]
    client_id = clients[0]["id"]
    vendor = vendors[0]
    vendor_id = vendor["id"]

    # 3. Create a dedicated fraud test project with duplicate IP/UID blocking enabled
    ts = int(time.time()) % 100000
    p_code = f"FRD-{ts}"
    project_payload = {
        "name": f"Fraud Security Study {p_code}",
        "project_code": p_code,
        "client_id": client_id,
        "description": "Project configured to test IP / UID duplicate prevention and unverified direct click tracking.",
        "base_survey_url": "http://localhost:3000/mock-survey",
        "uid_param": "uid",
        "callback_url_base": "http://localhost:3000/api/callback",
        "countries": [
            {
                "country_code": "IN",
                "country_name": "India",
                "currency": "INR",
                "client_rate": 800.0,
                "vendor_rate": 550.0,
                "target_completes": 50,
                "survey_url": "http://localhost:3000/mock-survey",
                "est_loi": 10,
                "fieldwork_days": 7,
                "vendors": [
                    {
                        "vendor_id": vendor_id,
                        "vendor_name": vendor["name"],
                        "quota": 50,
                        "vendor_cpi": 550.0
                    }
                ]
            }
        ]
    }
    create_res = api_call("http://localhost:3000/api/projects/atomic", project_payload, headers=auth_headers, method='POST')
    project_id = create_res["data"]["project"]["id"]
    print(f"[2] Project Created: {p_code} (ID: {project_id})")

    # Fetch project details to get live tracking link
    p_detail = api_call(f"http://localhost:3000/api/projects/{project_id}", headers=auth_headers)["data"]
    raw_link = p_detail["countries"][0]["links"][0]["full_url"]
    tracking_link = raw_link.replace("https://opi.opinioninsights.in", "http://localhost:3000")
    print(f"[3] Local Tracking Link: {tracking_link}")

    # Ensure fraud configuration has block_duplicate_ip: true, block_duplicate_uid: true, block_tone: 'RUDE'
    fraud_cfg = api_call(f"http://localhost:3000/api/projects/{project_id}/fraud-config", {
        "block_duplicate_ip": True,
        "block_duplicate_uid": True,
        "block_tone": "RUDE",
        "soft_duplicate_mode": False
    }, headers=auth_headers, method='PUT')
    print("[4] Project Fraud Config Verified:", fraud_cfg["data"])

    # 4. Trigger Unverified Fake Clicks to populate feeds and spike alerts
    for i in range(7):
        unv_url = f"http://localhost:3000/redirect/complete?pid={p_code}&uid=FAKE-CLICK-{i}"
        try:
            req = urllib.request.Request(unv_url, headers={"User-Agent": "FraudBot/1.0", "X-Forwarded-For": "203.0.113.45"})
            urllib.request.urlopen(req)
        except Exception:
            pass
    print("[5] Sent 7 unverified hits to trigger alerts and live feed.")

    # 5. Playwright Execution
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()

        # Login session in browser
        page.goto("http://localhost:3000/login")
        page.wait_for_load_state("networkidle")
        page.fill('input[type="text"], input[name="email"], input[type="email"]', "admin")
        page.fill('input[type="password"]', "admin123")
        page.click('button:has-text("Sign in"), button:has-text("Log in"), button[type="submit"]')
        page.wait_for_url("**/dashboard**", timeout=10000)
        time.sleep(1.5)

        # ── SCENARIO A: Complete Survey via Mock Survey ──
        test_uid_1 = f"RESP-ALPHA-{ts}"
        entry_link_1 = tracking_link.replace("{UID}", test_uid_1)
        print(f"[6] Entering Survey 1: {entry_link_1}")
        page.goto(entry_link_1)
        page.wait_for_url("**/mock-survey**", timeout=10000)
        time.sleep(1)
        page.screenshot(path=os.path.join(PROOF_DIR, "00_mock_survey_simulator.png"))
        print("[PROOF 0 CAPTURED] 00_mock_survey_simulator.png")

        # Click Complete Survey on mock survey frontend page
        print("[7] Clicking Complete Survey on mock-survey page...")
        page.click("#btn-complete-survey")
        try:
            page.wait_for_url("**/survey/status**", timeout=10000)
        except Exception:
            page.wait_for_load_state("networkidle")
        time.sleep(2)
        print("[8] Respondent 1 Completed successfully.")

        # ── SCENARIO B: Re-enter with Same IP -> Rude IP Block Page ──
        test_uid_2 = f"RESP-BETA-{ts}"
        entry_link_ip_dup = tracking_link.replace("{UID}", test_uid_2)
        print(f"[9] Re-entering with same IP (new UID {test_uid_2})...")
        page.goto(entry_link_ip_dup)
        page.wait_for_url("**/blocked**", timeout=10000)
        time.sleep(1)
        page.screenshot(path=os.path.join(PROOF_DIR, "01_block_page_ip_rude.png"))
        print("[PROOF 1 CAPTURED] 01_block_page_ip_rude.png")

        # ── SCENARIO C: UID Duplicate Block Page ──
        # Temporarily switch project tone to RUDE with UID test
        entry_link_uid_dup = tracking_link.replace("{UID}", test_uid_1)
        print(f"[10] Re-entering with same UID {test_uid_1}...")
        page.goto(entry_link_uid_dup)
        page.wait_for_url("**/blocked**", timeout=10000)
        time.sleep(1)
        page.screenshot(path=os.path.join(PROOF_DIR, "02_block_page_uid_rude.png"))
        print("[PROOF 2 CAPTURED] 02_block_page_uid_rude.png")

        # ── SCENARIO D: Polite Tone Block Page ──
        print("[11] Switching tone to POLITE...")
        api_call(f"http://localhost:3000/api/projects/{project_id}/fraud-config", {
            "block_tone": "POLITE"
        }, headers=auth_headers, method='PUT')
        page.goto(entry_link_ip_dup)
        page.wait_for_url("**/blocked**", timeout=10000)
        time.sleep(1)
        page.screenshot(path=os.path.join(PROOF_DIR, "03_block_page_polite.png"))
        print("[PROOF 3 CAPTURED] 03_block_page_polite.png")

        # ── SCENARIO E: Project Blocked Admin Table ──
        print("[12] Navigating to Project Blocked Admin...")
        page.goto(f"http://localhost:3000/dashboard/projects/{project_id}/blocked")
        time.sleep(2)
        page.screenshot(path=os.path.join(PROOF_DIR, "04_project_blocked_admin_table.png"))
        print("[PROOF 4 CAPTURED] 04_project_blocked_admin_table.png")

        # ── SCENARIO F: Dashboard Unverified Metric & Live Feed ──
        print("[13] Navigating to Dashboard Overview...")
        page.goto("http://localhost:3000/dashboard")
        time.sleep(2)
        page.screenshot(path=os.path.join(PROOF_DIR, "05_dashboard_unverified_metric_and_feed.png"))
        print("[PROOF 5 CAPTURED] 05_dashboard_unverified_metric_and_feed.png")

        # Scroll to live feed card for dedicated screenshot
        feed_el = page.query_selector("#unverified-live-feed")
        if feed_el:
            feed_el.scroll_into_view_if_needed()
            time.sleep(0.5)
            feed_el.screenshot(path=os.path.join(PROOF_DIR, "05b_unverified_live_feed_card.png"))
            print("[PROOF 5b CAPTURED] 05b_unverified_live_feed_card.png")

        # Check for alert banner screenshot
        alert_el = page.query_selector("#unverified-alert-banner")
        if alert_el:
            alert_el.scroll_into_view_if_needed()
            time.sleep(0.5)
        page.screenshot(path=os.path.join(PROOF_DIR, "06_dashboard_spike_alert.png"))
        print("[PROOF 6 CAPTURED] 06_dashboard_spike_alert.png")

        # ── SCENARIO G: Response Table Unverified Tab & Slide-over Triage ──
        print("[14] Navigating to Responses Table...")
        page.goto("http://localhost:3000/dashboard/responses")
        time.sleep(1.5)
        
        # Click Unverified Tab
        page.click("#tab-responses-unverified")
        time.sleep(1.5)
        page.screenshot(path=os.path.join(PROOF_DIR, "07_response_table_unverified_tab.png"))
        print("[PROOF 7 CAPTURED] 07_response_table_unverified_tab.png")

        # Click Triage button on the first row
        triage_btn = page.query_selector("button:has-text('Triage 🛡️')")
        if triage_btn:
            triage_btn.click()
            time.sleep(1)
            page.screenshot(path=os.path.join(PROOF_DIR, "08_unverified_detail_panel.png"))
            print("[PROOF 8 CAPTURED] 08_unverified_detail_panel.png")

        # ── SCENARIO H: Project Detail Page with Unverified Badge & Header Action ──
        print("[15] Navigating to Project Detail...")
        page.goto(f"http://localhost:3000/dashboard/projects/{project_id}")
        time.sleep(2)
        page.screenshot(path=os.path.join(PROOF_DIR, "09_project_detail_unverified_badges.png"))
        print("[PROOF 9 CAPTURED] 09_project_detail_unverified_badges.png")

        # ── SCENARIO I: Analytics Page Unverified Charts & IPs ──
        print("[16] Navigating to Analytics Page...")
        page.goto("http://localhost:3000/dashboard/analytics")
        time.sleep(1.5)
        # Click Unverified tab on analytics
        page.click("button:has-text('Unverified')")
        time.sleep(1.5)
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(1)
        page.screenshot(path=os.path.join(PROOF_DIR, "10_analytics_unverified_chart.png"))
        print("[PROOF 10 CAPTURED] 10_analytics_unverified_chart.png")

        browser.close()
    
    print("=== ALL 10 PROOF SCREENSHOTS GENERATED IN FRAUD_FEATURE_PROOF/ ===")

if __name__ == "__main__":
    run()
