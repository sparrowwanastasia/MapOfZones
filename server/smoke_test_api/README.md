**Stack:** `requests`, sessions (headers/cookies/timeouts), `jsonschema` for contract checks, `pytest`.

## Как запускать

```bash
python3 -m venv .venv
source .venv/bin/activate  # on Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

По умолчанию запускается с адресом `https://reqres.in/api`. Команду можно запустить и с указанием своего адреса

```bash
python3 -m pytest -q --base-url=https://reqres.in/api
```

## Что включено

- `src/client.py` — thin wrapper over `requests.Session` (base_url, headers, cookies, timeouts).
- `src/schemas.py` — JSON Schemas for responses.
- `tests/test_smoke_api.py` — 3–5 endpoints (positive & negative) with schema validation.
- `pytest.ini` — common options and markers.
