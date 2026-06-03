"""
Teste pentru ABSA API — rulează cu: python tests/test_api.py
Nu necesită pytest, funcționează cu python standard.
"""
import requests
import json

BASE_URL = "http://localhost:8000"

# ── Culori terminal ──────────────────────────────────────────────────────────────
GREEN = "\033[92m"
RED   = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"
BOLD  = "\033[1m"

passed = 0
failed = 0

def test(name, condition, detail=""):
    global passed, failed
    if condition:
        print(f"  {GREEN}✓{RESET} {name}")
        passed += 1
    else:
        print(f"  {RED}✗{RESET} {name}")
        if detail:
            print(f"    → {detail}")
        failed += 1

def section(title):
    print(f"\n{BOLD}{title}{RESET}")

# ── Test 1: Health check ─────────────────────────────────────────────────────────
section("1. Health check")
try:
    r = requests.get(f"{BASE_URL}/ping", timeout=5)
    test("Status 200", r.status_code == 200)
    test("Răspuns JSON cu status ok", r.json().get("status") == "ok")
except Exception as e:
    test("Server accesibil", False, str(e))

# ── Test 2: Lista aspecte ────────────────────────────────────────────────────────
section("2. GET /aspects")
try:
    r = requests.get(f"{BASE_URL}/aspects", timeout=5)
    test("Status 200", r.status_code == 200)
    data = r.json()
    test("Conține 10 aspecte", len(data.get("aspects", [])) == 10)
    test("Fiecare aspect are id și label", all("id" in a and "label" in a for a in data.get("aspects", [])))
except Exception as e:
    test("Endpoint funcțional", False, str(e))

# ── Test 3: Recenzie pozitivă ────────────────────────────────────────────────────
section("3. POST /analyze — recenzie pozitivă")
try:
    payload = {"text": "Antrenorii sunt extraordinari și very dedicați. Sala este curată și echipamentele sunt noi."}
    r = requests.post(f"{BASE_URL}/analyze", json=payload, timeout=15)
    test("Status 200", r.status_code == 200)
    data = r.json()
    test("Câmpul aspects există", "aspects" in data)
    test("Câmpul overall_sentiment există", "overall_sentiment" in data)
    test("aspects_found > 0", data.get("aspects_found", 0) > 0)
    test("overall_sentiment este pozitiv", data.get("overall_sentiment") == "pozitiv", data.get("overall_sentiment"))
    sentiments = [a["sentiment"] for a in data.get("aspects", [])]
    test("Cel puțin un aspect pozitiv detectat", "pozitiv" in sentiments)
    print(f"    → Aspecte găsite: {[a['aspect'] for a in data.get('aspects', [])]}")
except Exception as e:
    test("Request reușit", False, str(e))

# ── Test 4: Recenzie negativă ────────────────────────────────────────────────────
section("4. POST /analyze — recenzie negativă")
try:
    payload = {"text": "Vestiarele sunt murdare și nemenținute. Prețul abonamentului este exagerat de mare față de ce oferă."}
    r = requests.post(f"{BASE_URL}/analyze", json=payload, timeout=15)
    test("Status 200", r.status_code == 200)
    data = r.json()
    test("aspects_found > 0", data.get("aspects_found", 0) > 0)
    test("overall_sentiment este negativ", data.get("overall_sentiment") == "negativ", data.get("overall_sentiment"))
    sentiments = [a["sentiment"] for a in data.get("aspects", [])]
    test("Cel puțin un aspect negativ detectat", "negativ" in sentiments)
    print(f"    → Aspecte găsite: {[a['aspect'] for a in data.get('aspects', [])]}")
except Exception as e:
    test("Request reușit", False, str(e))

# ── Test 5: Recenzie mixtă ───────────────────────────────────────────────────────
section("5. POST /analyze — recenzie mixtă")
try:
    payload = {"text": "Aparatele sunt bune și moderne dar sala este extrem de aglomerată seara, nu prinzi niciun aparat liber."}
    r = requests.post(f"{BASE_URL}/analyze", json=payload, timeout=15)
    test("Status 200", r.status_code == 200)
    data = r.json()
    sentiments = set(a["sentiment"] for a in data.get("aspects", []))
    test("Detectează atât pozitiv cât și negativ", len(sentiments) > 1, str(sentiments))
    print(f"    → Aspecte găsite: {[(a['aspect'], a['sentiment']) for a in data.get('aspects', [])]}")
except Exception as e:
    test("Request reușit", False, str(e))

# ── Test 6: Input invalid ────────────────────────────────────────────────────────
section("6. POST /analyze — input invalid")
try:
    r = requests.post(f"{BASE_URL}/analyze", json={"text": "ok"}, timeout=5)
    test("Status 400 pentru text prea scurt", r.status_code == 400)
except Exception as e:
    test("Request reușit", False, str(e))

try:
    r = requests.post(f"{BASE_URL}/analyze", json={"text": ""}, timeout=5)
    test("Status 400 pentru text gol", r.status_code == 400)
except Exception as e:
    test("Request reușit", False, str(e))

# ── Sumar ────────────────────────────────────────────────────────────────────────
total = passed + failed
print(f"\n{'─'*40}")
print(f"{BOLD}Rezultat: {GREEN}{passed}{RESET}{BOLD}/{total} teste trecute{RESET}")
if failed > 0:
    print(f"{RED}{failed} teste eșuate{RESET}")
else:
    print(f"{GREEN}Toate testele au trecut! API-ul e gata.{RESET}")
