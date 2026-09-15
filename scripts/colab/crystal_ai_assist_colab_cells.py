# Colab cells — HotCol Crystal AI Assist (Phase 2)
# Copy each cell into Google Colab in order.

# %% cell 1 — install
# !pip -q install fastapi uvicorn pyngrok

# %% cell 2 — write server file (or upload crystal_ai_assist_starter.py)
# from pathlib import Path
# Path("crystal_ai_assist_starter.py").write_text(open("/content/...").read())

# %% cell 3 — start server + ngrok
"""
import threading, time, uvicorn
from pyngrok import ngrok
from crystal_ai_assist_starter import app

def run():
    uvicorn.run(app, host="0.0.0.0", port=8089)

threading.Thread(target=run, daemon=True).start()
time.sleep(2)
# ngrok.set_auth_token("YOUR_NGROK_TOKEN")  # required on free ngrok
public = ngrok.connect(8089, bind_tls=True)
print("Set in hotcol-user .env.local:")
print(f"CRYSTAL_AI_ASSIST_URL={public.public_url}/assist")
"""

# %% cell 4 — smoke test
"""
import requests
r = requests.post(
    "http://127.0.0.1:8089/assist",
    json={
        "query": "shro",
        "candidates": [
            {
                "id": 1,
                "amharic": "ሽሮ",
                "romanized": "Shero",
                "english": "Chickpea flour",
                "crystalLabel": "ሽሮ|Shero|Chickpea flour",
            },
            {
                "id": 2,
                "amharic": "ሽቦ",
                "romanized": "Shbo",
                "english": "Cleaning detergent",
                "crystalLabel": "ሽቦ|Shbo|Cleaning detergent",
            },
        ],
        "source": "registration",
    },
    timeout=10,
)
print(r.status_code, r.json())
"""
