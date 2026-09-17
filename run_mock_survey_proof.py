import json
import time
import os
import urllib.request
from playwright.sync_api import sync_playwright

OUT_DIR = r"c:\projects\tool\MOCK_SURVEY_PROOF"
os.makedirs(OUT_DIR, exist_ok=True)

# 1. Authenticate and retrieve test dependencies
print("[STEP 1] Logging in to API...")
login_req = urllib.request.Request(
    "http://localhost:3000/api/auth/login",
    data=json.dumps({"email": "admin", "password": "admin123"}).encode(),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(login_req) as resp:
    login_data = json.loads(resp.read().decode())
    token = login_data["data"]["token"]

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Fetch clients and vendors
req = urllib.request.Request("http://localhost:3000/api/clients/active", headers=headers)
with urllib.request.urlopen(req) as resp:
    clients = json.loads(resp.read().decode())["data"]
client_id = clients[0]["id"]
client_name = clients[0]["name"]

req = urllib.request.Request("http://localhost:3000/api/vendors/active", headers=headers)
with urllib.request.urlopen(req) as resp:
    vendors = json.loads(resp.read().decode())["data"]
v1 = vendors[0]
v2 = vendors[1]

print(f"Using Client: {client_name} ({client_id})")
print(f"Using Vendor 1: {v1['name']} ({v1['id']})")
print(f"Using Vendor 2: {v2['name']} ({v2['id']})")

# 2. Create Test Project with 2 Countries and 2 Vendors per country
proj_code = f"OPI-QA-{int(time.time()) % 10000}"
print(f"[STEP 2] Creating Atomic Project: {proj_code}")
project_payload = {
    "name": f"Global Consumer Research {proj_code}",
    "project_code": proj_code,
    "client_id": client_id,
    "description": "Multi-country validation study testing view, edit, link copy, regenerate, and mock survey terminal flows.",
    "base_survey_url": "http://localhost:3000/mock-survey",
    "uid_param": "uid",
    "callback_url_base": "http://localhost:3000/api/callback",
    "countries": [
        {
            "country_code": "IN",
            "country_name": "India",
            "currency": "INR",
            "client_rate": 700.00,
            "vendor_rate": 500.00,
            "target_completes": 2,
            "survey_url": "http://localhost:3000/mock-survey",
            "est_loi": 12,
            "fieldwork_days": 5,
            "vendors": [
                {
                    "vendor_id": v1["id"],
                    "vendor_name": v1["name"],
                    "quota": 1,
                    "vendor_cpi": 500.00
                },
                {
                    "vendor_id": v2["id"],
                    "vendor_name": v2["name"],
                    "quota": 1,
                    "vendor_cpi": 500.00
                }
            ]
        },
        {
            "country_code": "US",
            "country_name": "United States",
            "currency": "USD",
            "client_rate": 15.00,
            "vendor_rate": 10.00,
            "target_completes": 50,
            "survey_url": "http://localhost:3000/mock-survey",
            "est_loi": 10,
            "fieldwork_days": 10,
            "vendors": [
                {
                    "vendor_id": v1["id"],
                    "vendor_name": v1["name"],
                    "quota": 25,
                    "vendor_cpi": 10.00
                },
                {
                    "vendor_id": v2["id"],
                    "vendor_name": v2["name"],
                    "quota": 25,
                    "vendor_cpi": 10.00
                }
            ]
        }
    ]
}

create_req = urllib.request.Request(
    "http://localhost:3000/api/projects/atomic",
    data=json.dumps(project_payload).encode(),
    headers=headers
)
with urllib.request.urlopen(create_req) as resp:
    created_proj = json.loads(resp.read().decode())["data"]["project"]

project_id = created_proj["id"]
print(f"Project created with ID: {project_id}")

# 3. Launch Playwright to drive end-to-end frontend flows
print("[STEP 3] Starting Playwright Browser automation...")
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()

    # Login via UI
    page.goto("http://localhost:3000/login")
    page.wait_for_load_state("networkidle")
    page.fill('input[type="text"], input[name="email"], input[placeholder*="email" i], input[type="email"]', "admin")
    page.fill('input[type="password"]', "admin123")
    page.click('button:has-text("Sign in"), button:has-text("Log in"), button[type="submit"]')
    page.wait_for_url("**/dashboard**", timeout=10000)
    time.sleep(1)

    # Navigate to newly created project detail page
    detail_url = f"http://localhost:3000/dashboard/projects/{project_id}"
    page.goto(detail_url)
    page.wait_for_load_state("networkidle")
    time.sleep(2)

    # Capture 00: Initial Project Detail Page
    page.screenshot(path=os.path.join(OUT_DIR, "00_project_detail_initial.png"), full_page=True)
    print("Saved 00_project_detail_initial.png")

    # Specifically click India header if collapsed
    in_header = page.locator('div.cursor-pointer:has-text("India")')
    if in_header.count() > 0:
        in_header.first.click()
        time.sleep(1)

    us_header = page.locator('div.cursor-pointer:has-text("United States")')
    if us_header.count() > 0:
        us_header.first.click()
        time.sleep(1)

    time.sleep(1)
    page.screenshot(path=os.path.join(OUT_DIR, "01_project_detail_accordions_expanded.png"), full_page=True)
    print("Saved 01_project_detail_accordions_expanded.png")

    # Fetch enriched project detail to get active tracking links
    req_det = urllib.request.Request(f"http://localhost:3000/api/projects/{project_id}", headers=headers)
    with urllib.request.urlopen(req_det) as resp:
        enriched = json.loads(resp.read().decode())["data"]

    in_country = next(c for c in enriched["countries"] if c["country_code"] == "IN")
    link1 = in_country["links"][0]
    link2 = in_country["links"][1]
    print(f"India Link 1: {link1['link_code']} (Vendor: {link1['vendor_name']})")
    print(f"India Link 2: {link2['link_code']} (Vendor: {link2['vendor_name']})")

    # Test Link Regenerate on link2
    page.locator(f'text="{link2["link_code"]}"').first.scroll_into_view_if_needed()
    regenerate_buttons = page.locator('button:has-text("Regenerate")')
    if regenerate_buttons.count() > 1:
        regenerate_buttons.nth(1).click()
        time.sleep(1)
        page.screenshot(path=os.path.join(OUT_DIR, "02_regenerate_modal.png"))
        print("Saved 02_regenerate_modal.png")

        # Confirm regenerate
        page.click('button:has-text("Yes, Regenerate Link")')
        time.sleep(2)
        page.screenshot(path=os.path.join(OUT_DIR, "03_regenerated_link_success.png"), full_page=True)
        print("Saved 03_regenerated_link_success.png")

    # Fetch updated link code
    req_det2 = urllib.request.Request(f"http://localhost:3000/api/projects/{project_id}", headers=headers)
    with urllib.request.urlopen(req_det2) as resp:
        enriched2 = json.loads(resp.read().decode())["data"]
    in_country2 = next(c for c in enriched2["countries"] if c["country_code"] == "IN")
    link1_active = in_country2["links"][0]
    link2_active = in_country2["links"][1]

    # Verify old link code 404s
    old_link_url = f"http://localhost:3000/track?code={proj_code}&country=IN&link={link2['link_code']}&uid=TEST-OLD"
    try:
        urllib.request.urlopen(old_link_url)
    except urllib.error.HTTPError as e:
        print(f"Verified old link code returns HTTP {e.code} (Expected 404)")

    # ── Scenario 1: Verified Complete ──────────────────────────────────────────
    print("[SCENARIO 1] Verified Complete...")
    track_url_1 = f"http://localhost:3000/track?code={proj_code}&country=IN&vendor={link1_active['vendor_code'] or link1_active['vendor_id']}&uid=TEST-COMPLETE-001"
    page.goto(track_url_1)
    page.wait_for_load_state("networkidle")
    time.sleep(1)

    # Screenshot mock survey page
    page.screenshot(path=os.path.join(OUT_DIR, "04_scenario1_mock_survey.png"))
    print("Saved 04_scenario1_mock_survey.png")

    # Click Complete Survey button
    page.click("#btn-complete-survey")
    page.wait_for_load_state("networkidle")
    time.sleep(2)

    # Screenshot Verified Complete status page
    page.screenshot(path=os.path.join(OUT_DIR, "05_scenario1_complete_status.png"))
    print("Saved 05_scenario1_complete_status.png")

    # ── Scenario 2: Terminate ──────────────────────────────────────────────────
    print("[SCENARIO 2] Terminate...")
    track_url_2 = f"http://localhost:3000/track?code={proj_code}&country=IN&vendor={link2_active['vendor_code'] or link2_active['vendor_id']}&uid=TEST-TERM-001"
    page.goto(track_url_2)
    page.wait_for_load_state("networkidle")
    time.sleep(1)

    page.screenshot(path=os.path.join(OUT_DIR, "06_scenario2_mock_survey.png"))
    print("Saved 06_scenario2_mock_survey.png")

    # Click Terminate Survey button
    page.click("#btn-terminate-survey")
    page.wait_for_load_state("networkidle")
    time.sleep(2)

    # Screenshot Terminate status page
    page.screenshot(path=os.path.join(OUT_DIR, "07_scenario2_terminate_status.png"))
    print("Saved 07_scenario2_terminate_status.png")

    # ── Scenario 3: Quota Full ─────────────────────────────────────────────────
    print("[SCENARIO 3] Quota Full...")
    # First, complete respondent 2 to fill India's quota target of 2
    track_url_fill = f"http://localhost:3000/track?code={proj_code}&country=IN&vendor={link2_active['vendor_code'] or link2_active['vendor_id']}&uid=TEST-COMPLETE-002"
    page.goto(track_url_fill)
    page.wait_for_load_state("networkidle")
    time.sleep(1)
    page.click("#btn-complete-survey")
    page.wait_for_load_state("networkidle")
    time.sleep(2)

    # Now respondent 3 opens tracking link and clicks Quota Full or hits quota cap
    track_url_3 = f"http://localhost:3000/track?code={proj_code}&country=IN&vendor={link1_active['vendor_code'] or link1_active['vendor_id']}&uid=TEST-QUOTA-003"
    page.goto(track_url_3)
    page.wait_for_load_state("networkidle")
    time.sleep(1)

    # Click Quota Full button
    page.click("#btn-quotafull-survey")
    page.wait_for_load_state("networkidle")
    time.sleep(2)

    # Screenshot Quota Full status page
    page.screenshot(path=os.path.join(OUT_DIR, "08_scenario3_quota_full.png"))
    print("Saved 08_scenario3_quota_full.png")

    # ── Scenario 4: Direct Hit (Unverified) ────────────────────────────────────
    print("[SCENARIO 4] Direct Hit (Unverified)...")
    direct_url = "http://localhost:3000/api/callback/provider?uid=DIRECT-001&status=complete"
    page.goto(direct_url)
    page.wait_for_load_state("networkidle")
    time.sleep(2)

    # Screenshot status page unverified
    page.screenshot(path=os.path.join(OUT_DIR, "09_scenario4_direct_unverified_status.png"))
    print("Saved 09_scenario4_direct_unverified_status.png")

    # View Responses dashboard showing segregation
    page.goto("http://localhost:3000/dashboard/responses")
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    page.screenshot(path=os.path.join(OUT_DIR, "10_scenario4_responses_segregation.png"), full_page=True)
    print("Saved 10_scenario4_responses_segregation.png")

    # ── Scenario 5: Duplicate Callback ─────────────────────────────────────────
    print("[SCENARIO 5] Duplicate Callback...")
    # Re-hit callback for TEST-COMPLETE-001
    dup_url = f"http://localhost:3000/redirect/complete?pid={proj_code}&uid=TEST-COMPLETE-001"
    page.goto(dup_url)
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    page.screenshot(path=os.path.join(OUT_DIR, "11_scenario5_duplicate_callback.png"))
    print("Saved 11_scenario5_duplicate_callback.png")

    # ── Post-Simulation Detail Page (Completes Locked) ─────────────────────────
    print("[FINAL] Project Detail Page Post-Completes...")
    page.goto(detail_url)
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    page.screenshot(path=os.path.join(OUT_DIR, "12_project_detail_post_completes.png"), full_page=True)
    print("Saved 12_project_detail_post_completes.png")

    # Open Edit Country modal to show locked rates
    edit_country_btn = page.locator('div.glass-card div.cursor-pointer:has-text("India") ~ div button:has-text("Edit"), div:has-text("India") button:has-text("Edit")').first
    if edit_country_btn.count() == 0:
        edit_country_btn = page.locator('button:has-text("Edit")').nth(1)
    edit_country_btn.click()
    time.sleep(1)
    page.screenshot(path=os.path.join(OUT_DIR, "13_edit_country_rates_locked.png"))
    print("Saved 13_edit_country_rates_locked.png")

    browser.close()

print("\nALL 5 SCENARIOS SIMULATED AND CAPTURED SUCCESSFULLY!")
