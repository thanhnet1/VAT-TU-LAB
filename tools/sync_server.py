#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sync_server.py – Máy chủ đồng bộ nhỏ (tự lưu trữ) cho web app LAB XVT.

Dùng khi KHÔNG muốn dùng Firebase: chạy trên 1 máy trong công ty / VPS, web app đồng bộ phiếu & chỉnh sửa
giữa nhiều thiết bị. Dữ liệu lưu trong file JSON (mặc định sync_data.json).

    python tools/sync_server.py --port 8787 --token "MatKhauChung"

Trong assets/config.js:  sync: { provider: 'server', workspace: 'lab-xvt', server: { url: 'http://IP-may-chu:8787' } }
Lưu ý: nếu web chạy bằng https (GitHub Pages) thì máy chủ này cũng phải có https (đặt sau Nginx/Caddy/Cloudflare Tunnel).
Chỉ dùng thư viện chuẩn của Python 3 (không cần cài thêm).
"""
import argparse, json, os, secrets, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs


class Store:
    def __init__(self, path):
        self.path, self.lock, self.last = path, threading.Lock(), 0
        self.db = {}
        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                self.db = json.load(f)
            for ws in self.db.values():
                for col in ws.values():
                    for d in col.values():
                        self.last = max(self.last, int(d.get("upd", 0)))

    def _save(self):
        tmp = self.path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(self.db, f, ensure_ascii=False)
        os.replace(tmp, self.path)

    def batch(self, ops):
        with self.lock:
            now = max(int(time.time() * 1000), self.last + 1)     # mốc thời gian tăng dần, mỗi lần ghi 1 mốc (như commit time)
            for op in ops:
                d = dict(op["data"]); d["upd"] = now
                self.db.setdefault(op["ws"], {}).setdefault(op["col"], {})[op["id"]] = d
            self.last = now
            self._save()
            return now

    def docs(self, ws, col, since):
        with self.lock:
            c = self.db.get(ws, {}).get(col, {})
            return [{"id": k, "data": v, "upd": v.get("upd", 0)} for k, v in c.items() if v.get("upd", 0) > since]

    def doc(self, ws, col, id_):
        with self.lock:
            return self.db.get(ws, {}).get(col, {}).get(id_)


def make_handler(store, token):
    class H(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"
        def log_message(self, *a): pass
        def _send(self, code, obj):
            body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.end_headers(); self.wfile.write(body)
        def _auth(self):
            a = self.headers.get("Authorization", "")
            return a.startswith("Bearer ") and secrets.compare_digest(a[7:], token)
        def do_OPTIONS(self): self._send(204, {})
        def do_GET(self):
            u = urlparse(self.path); q = {k: v[0] for k, v in parse_qs(u.query).items()}
            if u.path == "/api/ping": return self._send(200, {"ok": True})
            if not self._auth(): return self._send(401, {"error": "unauthorized"})
            if u.path == "/api/docs": return self._send(200, {"docs": store.docs(q.get("ws", ""), q.get("col", ""), int(q.get("since", 0)))})
            if u.path == "/api/doc":
                d = store.doc(q.get("ws", ""), q.get("col", ""), q.get("id", "")); return self._send(200, {"exists": d is not None})
            self._send(404, {"error": "not found"})
        def do_POST(self):
            n = int(self.headers.get("Content-Length", 0)); body = json.loads(self.rfile.read(n) or b"{}")
            u = urlparse(self.path)
            if u.path == "/api/login":
                ok = secrets.compare_digest(str(body.get("token", "")), token)
                return self._send(200 if ok else 401, {"ok": ok})
            if not self._auth(): return self._send(401, {"error": "unauthorized"})
            if u.path == "/api/batch": return self._send(200, {"upd": store.batch(body.get("ops", []))})
            self._send(404, {"error": "not found"})
    return H


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8787)
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--token", default=os.environ.get("LAB_SYNC_TOKEN") or secrets.token_urlsafe(9))
    ap.add_argument("--data", default="sync_data.json")
    a = ap.parse_args()
    store = Store(a.data)
    srv = ThreadingHTTPServer((a.host, a.port), make_handler(store, a.token))
    print(f"Máy chủ đồng bộ đang chạy: http://{a.host}:{a.port}   |   Mã truy cập: {a.token}   |   Dữ liệu: {os.path.abspath(a.data)}")
    try: srv.serve_forever()
    except KeyboardInterrupt: pass


if __name__ == "__main__":
    main()
