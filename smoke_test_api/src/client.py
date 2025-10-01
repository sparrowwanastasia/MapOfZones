from __future__ import annotations
from typing import Any, Dict, Optional, Tuple
import requests

DEFAULT_TIMEOUT: Tuple[float, float] = (3.05, 10.0)

class ApiClient:
    def __init__(
        self,
        base_url: str,
        headers: Optional[Dict[str, str]] = None,
        cookies: Optional[Dict[str, str]] = None,
        timeout: Tuple[float, float] = DEFAULT_TIMEOUT,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update(headers or {"User-Agent": "QA-Smoke/1.0"})
        if cookies:
            for k, v in cookies.items():
                self.session.cookies.set(k, v)

    def _url(self, path: str) -> str:
        path = path if path.startswith("/") else f"/{path}"
        return f"{self.base_url}{path}"

    def get(self, path: str, *, params: Optional[Dict[str, Any]] = None, **kwargs) -> requests.Response:
        return self.session.get(self._url(path), params=params, timeout=self.timeout, **kwargs)

    def post(self, path: str, *, json: Any = None, **kwargs) -> requests.Response:
        return self.session.post(self._url(path), json=json, timeout=self.timeout, **kwargs)

    def put(self, path: str, *, json: Any = None, **kwargs) -> requests.Response:
        return self.session.put(self._url(path), json=json, timeout=self.timeout, **kwargs)

    def delete(self, path: str, **kwargs) -> requests.Response:
        return self.session.delete(self._url(path), timeout=self.timeout, **kwargs)
