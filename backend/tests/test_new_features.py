"""Tests for new iteration features: death_date persistence, marriages dict
mirroring on create/update, and marriage cleanup on delete."""
import os
import uuid

import pytest
import requests


def _base_url():
    url = os.environ.get('REACT_APP_BACKEND_URL')
    if not url:
        with open('/app/frontend/.env') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL'):
                    url = line.strip().split('=', 1)[1].strip().strip('"')
                    break
    return url.rstrip('/')


BASE_URL = _base_url()
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    yield s
    # Cleanup
    try:
        r = s.get(f"{API}/members", timeout=30)
        if r.ok:
            for m in r.json():
                if m.get("name", "").startswith("TEST_"):
                    s.delete(f"{API}/members/{m['id']}", timeout=30)
    except Exception:
        pass


# ---- death_date ----
class TestDeathDate:
    def test_create_with_death_date(self, session):
        r = session.post(f"{API}/members", json={
            "name": f"TEST_Deceased_{uuid.uuid4().hex[:6]}",
            "birth_date": "1920-05-10",
            "death_date": "1995-11-02",
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["death_date"] == "1995-11-02"
        # Verify persistence
        members = session.get(f"{API}/members").json()
        m = next(x for x in members if x["id"] == d["id"])
        assert m["death_date"] == "1995-11-02"
        session.delete(f"{API}/members/{d['id']}")

    def test_patch_death_date(self, session):
        r = session.post(f"{API}/members", json={"name": f"TEST_PatchDeath_{uuid.uuid4().hex[:6]}"}).json()
        try:
            p = session.patch(f"{API}/members/{r['id']}", json={"death_date": "2001-01-15"})
            assert p.status_code == 200
            assert p.json()["death_date"] == "2001-01-15"
            # GET verify
            m = next(x for x in session.get(f"{API}/members").json() if x["id"] == r["id"])
            assert m["death_date"] == "2001-01-15"
        finally:
            session.delete(f"{API}/members/{r['id']}")


# ---- marriages dict mirror ----
class TestMarriages:
    def test_create_partner_with_marriage_mirrors(self, session):
        a = session.post(f"{API}/members", json={"name": f"TEST_MA_{uuid.uuid4().hex[:6]}"}).json()
        try:
            b_payload = {
                "name": f"TEST_MB_{uuid.uuid4().hex[:6]}",
                "partner_ids": [a["id"]],
                "marriages": {a["id"]: "1948-06-10"},
            }
            r = session.post(f"{API}/members", json=b_payload)
            assert r.status_code == 200, r.text
            b = r.json()
            # B has marriage set
            assert b.get("marriages", {}).get(a["id"]) == "1948-06-10"
            # A should be mirrored
            members = session.get(f"{API}/members").json()
            a_now = next(m for m in members if m["id"] == a["id"])
            assert a_now.get("marriages", {}).get(b["id"]) == "1948-06-10", \
                f"Mirror failed. A.marriages={a_now.get('marriages')}"
            assert b["id"] in a_now["partner_ids"]
            session.delete(f"{API}/members/{b['id']}")
        finally:
            session.delete(f"{API}/members/{a['id']}")

    def test_patch_marriage_mirrors(self, session):
        a = session.post(f"{API}/members", json={"name": f"TEST_PA_{uuid.uuid4().hex[:6]}"}).json()
        b = session.post(f"{API}/members", json={
            "name": f"TEST_PB_{uuid.uuid4().hex[:6]}",
            "partner_ids": [a["id"]],
        }).json()
        try:
            r = session.patch(f"{API}/members/{b['id']}", json={
                "marriages": {a["id"]: "1960-09-20"}
            })
            assert r.status_code == 200
            # Verify mirror on A
            a_now = next(m for m in session.get(f"{API}/members").json() if m["id"] == a["id"])
            assert a_now.get("marriages", {}).get(b["id"]) == "1960-09-20"
        finally:
            session.delete(f"{API}/members/{b['id']}")
            session.delete(f"{API}/members/{a['id']}")

    def test_delete_cleans_marriage_entries(self, session):
        a = session.post(f"{API}/members", json={"name": f"TEST_DA_{uuid.uuid4().hex[:6]}"}).json()
        b = session.post(f"{API}/members", json={
            "name": f"TEST_DB_{uuid.uuid4().hex[:6]}",
            "partner_ids": [a["id"]],
            "marriages": {a["id"]: "1955-03-05"},
        }).json()
        # Confirm mirror present
        a_now = next(m for m in session.get(f"{API}/members").json() if m["id"] == a["id"])
        assert a_now.get("marriages", {}).get(b["id"]) == "1955-03-05"
        # Delete B
        session.delete(f"{API}/members/{b['id']}")
        a_after = next(m for m in session.get(f"{API}/members").json() if m["id"] == a["id"])
        assert b["id"] not in (a_after.get("marriages") or {}), \
            f"Marriage entry not cleaned. a.marriages={a_after.get('marriages')}"
        assert b["id"] not in a_after.get("partner_ids", [])
        session.delete(f"{API}/members/{a['id']}")
