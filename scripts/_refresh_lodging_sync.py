"""Refresh sync_lodging_schema.py NEW block from current schema.prisma lodging section."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
schema = (root / "BackEnd" / "prisma" / "schema.prisma").read_text(encoding="utf-8")
start = schema.index("// =============================================================================\n// LODGING")
end = schema.index("// =============================================================================\n// HR MODULE")
block = schema[start:end].rstrip() + "\n"

script = root / "scripts" / "sync_lodging_schema.py"
text = script.read_text(encoding="utf-8")
m = re.search(r'NEW = r"""(.*?)"""', text, re.S)
if not m:
    raise SystemExit("NEW block not found")
new_text = text[: m.start()] + 'NEW = r"""' + block + '"""' + text[m.end() :]
script.write_text(new_text, encoding="utf-8")
print("ok", len(block))
