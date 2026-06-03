# ABSA Backend — Săli de sport Iași

API REST pentru Aspect-Based Sentiment Analysis pe recenzii în română.

---

## Setup (5 minute)

### 1. Clonează / dezarhivează proiectul

```bash
cd absa_backend
```

### 2. Creează un virtual environment

```bash
python -m venv venv

# Windows:
venv\Scripts\activate

# Mac / Linux:
source venv/bin/activate
```

### 3. Instalează dependențele

```bash
pip install -r requirements.txt
```

### 4. Adaugă cheia API

```bash
cp .env.example .env
```

Deschide `.env` și înlocuiește valoarea cu cheia ta reală Anthropic:
```
ANTHROPIC_API_KEY=sk-ant-...cheia_ta_reala...
```

> Cheia o găsești pe https://console.anthropic.com/settings/keys

### 5. Pornește serverul

```bash
uvicorn main:app --reload
```

Serverul pornește pe **http://localhost:8000**

---

## Endpoints

| Method | URL | Descriere |
|--------|-----|-----------|
| GET | `/ping` | Health check |
| GET | `/aspects` | Lista celor 10 aspecte fixe |
| POST | `/analyze` | Analizează o recenzie |
| GET | `/docs` | Documentație interactivă (Swagger) |

---

## Exemplu request

```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Antrenorii sunt excelenti dar sala este aglomerata seara."}'
```

### Răspuns:
```json
{
  "aspects": [
    {
      "aspect": "antrenori",
      "label": "Antrenori",
      "sentiment": "pozitiv",
      "evidence": "Antrenorii sunt excelenți"
    },
    {
      "aspect": "aglomeratie",
      "label": "Aglomerație",
      "sentiment": "negativ",
      "evidence": "sala este aglomerată seara"
    }
  ],
  "overall_sentiment": "mixt",
  "dominant_aspect": "antrenori",
  "aspects_found": 2,
  "input_text": "Antrenorii sunt excelenti dar sala este aglomerata seara."
}
```

---

## Rulează testele

Cu serverul pornit într-un terminal, în altul rulează:

```bash
python tests/test_api.py
```

---

## Structura proiectului

```
absa_backend/
├── main.py                  # Aplicația FastAPI
├── requirements.txt         # Dependențe Python
├── .env.example             # Template variabile de mediu
├── .env                     # Cheia API (nu se pune pe git!)
├── data/
│   ├── aspects_final.json       # Cele 10 aspecte fixe
│   └── few_shot_examples.json   # Exemple pentru prompt
└── tests/
    └── test_api.py          # Suite de teste
```

---

## Integrare cu frontend-ul (P4)

URL-ul API pentru P4: `http://localhost:8000`

Exemplu fetch din JavaScript:
```javascript
const response = await fetch('http://localhost:8000/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: reviewText })
});
const data = await response.json();
// data.aspects, data.overall_sentiment, data.dominant_aspect
```

Documentație completă cu toate câmpurile: **http://localhost:8000/docs**
