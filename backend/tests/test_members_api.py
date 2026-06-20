"""Backend API tests for the Family Tree 3D app.

Covers:
- /api/ root
- CRUD on /api/members
- Validation (parent count, missing references)
- Photo upload via multipart and serving via /api/files/{path}
"""
import io
import os
import struct
import zlib
import uuid

import pytest
import requests

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/') if os.environ.get('REACT_APP_BACKEND_URL') else None

# Read from frontend/.env if not set in environment
if not BASE_URL:
    try:
        with open('/app/frontend/.env') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL'):
                    BASE_URL = line.strip().split('=', 1)[1].strip().strip('"').rstrip('/')
                    break
    except Exception:
        BASE_URL = None

assert BASE_URL, "REACT_APP_BACKEND_URL must be set"

API = f"{BASE_URL}/api"


def _png_bytes():
    """Generate a tiny valid 1x1 PNG."""
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
    raw = b"\x00\xff\xff\xff"
    idat = chunk(b"IDAT", zlib.compress(raw))
    iend = chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    yield s
    # Cleanup all TEST_ prefixed members at end of module
    try:
        r = s.get(f"{API}/members", timeout=30)
        if r.ok:
            for m in r.json():
                if m.get("name", "").startswith("TEST_"):
                    s.delete(f"{API}/members/{m['id']}", timeout=30)
    except Exception:
        pass


@pytest.fixture
def created_member(session):
    """Create a fresh member for tests that need one."""
    r = session.post(f"{API}/members", json={"name": f"TEST_Base_{uuid.uuid4().hex[:6]}", "gender": "female"})
    assert r.status_code == 200, r.text
    m = r.json()
    yield m
    session.delete(f"{API}/members/{m['id']}")


# ============ Root ============
class TestRoot:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("message")


# ============ GET members ============
class TestListMembers:
    def test_list_returns_array(self, session):
        r = session.get(f"{API}/members")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ============ CREATE ============
class TestCreateMember:
    def test_create_minimal(self, session):
        payload = {"name": "TEST_Eleanor", "gender": "female", "birth_date": "1950-04-12"}
        r = session.post(f"{API}/members", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["name"] == "TEST_Eleanor"
        assert d["gender"] == "female"
        assert d["birth_date"] == "1950-04-12"
        assert "id" in d and isinstance(d["id"], str)
        assert d["parent_ids"] == []
        assert d["partner_ids"] == []

        # Verify persistence via GET
        r2 = session.get(f"{API}/members")
        ids = [m["id"] for m in r2.json()]
        assert d["id"] in ids

        # cleanup
        session.delete(f"{API}/members/{d['id']}")

    def test_create_with_parent(self, session, created_member):
        r = session.post(f"{API}/members", json={
            "name": "TEST_Child", "gender": "male", "parent_ids": [created_member["id"]]
        })
        assert r.status_code == 200, r.text
        child = r.json()
        assert child["parent_ids"] == [created_member["id"]]
        session.delete(f"{API}/members/{child['id']}")

    def test_create_with_partner_mirrors(self, session, created_member):
        r = session.post(f"{API}/members", json={
            "name": "TEST_Partner", "gender": "male", "partner_ids": [created_member["id"]]
        })
        assert r.status_code == 200, r.text
        partner = r.json()
        assert created_member["id"] in partner["partner_ids"]

        # Verify mirror on original member
        r2 = session.get(f"{API}/members")
        original = next(m for m in r2.json() if m["id"] == created_member["id"])
        assert partner["id"] in original["partner_ids"], "partner mirror not applied"

        session.delete(f"{API}/members/{partner['id']}")

    def test_create_rejects_three_parents(self, session, created_member):
        # create 2 more valid parents
        p1 = session.post(f"{API}/members", json={"name": "TEST_P1"}).json()
        p2 = session.post(f"{API}/members", json={"name": "TEST_P2"}).json()
        try:
            r = session.post(f"{API}/members", json={
                "name": "TEST_TripleParent",
                "parent_ids": [created_member["id"], p1["id"], p2["id"]]
            })
            assert r.status_code == 400
            assert "2 parents" in r.text or "at most" in r.text.lower()
        finally:
            session.delete(f"{API}/members/{p1['id']}")
            session.delete(f"{API}/members/{p2['id']}")

    def test_create_rejects_missing_parent(self, session):
        r = session.post(f"{API}/members", json={
            "name": "TEST_OrphanRef", "parent_ids": ["non-existent-id-xyz"]
        })
        assert r.status_code == 400

    def test_create_rejects_missing_partner(self, session):
        r = session.post(f"{API}/members", json={
            "name": "TEST_BadPartner", "partner_ids": ["does-not-exist-123"]
        })
        assert r.status_code == 400


# ============ UPDATE ============
class TestUpdateMember:
    def test_patch_name_and_bio(self, session, created_member):
        r = session.patch(f"{API}/members/{created_member['id']}", json={
            "name": "TEST_Updated", "bio": "A test biography"
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["name"] == "TEST_Updated"
        assert d["bio"] == "A test biography"

        # Verify persistence
        r2 = session.get(f"{API}/members")
        m = next(x for x in r2.json() if x["id"] == created_member["id"])
        assert m["name"] == "TEST_Updated"
        assert m["bio"] == "A test biography"

    def test_patch_relationships(self, session, created_member):
        parent = session.post(f"{API}/members", json={"name": "TEST_NewParent"}).json()
        try:
            r = session.patch(f"{API}/members/{created_member['id']}", json={
                "parent_ids": [parent["id"]]
            })
            assert r.status_code == 200
            assert parent["id"] in r.json()["parent_ids"]
        finally:
            session.delete(f"{API}/members/{parent['id']}")

    def test_patch_missing_member_404(self, session):
        r = session.patch(f"{API}/members/nope-{uuid.uuid4().hex}", json={"name": "x"})
        assert r.status_code == 404


# ============ DELETE ============
class TestDeleteMember:
    def test_delete_cleans_references(self, session):
        # Create parent + child
        parent = session.post(f"{API}/members", json={"name": "TEST_DelParent"}).json()
        child = session.post(f"{API}/members", json={
            "name": "TEST_DelChild", "parent_ids": [parent["id"]]
        }).json()

        # Delete parent
        r = session.delete(f"{API}/members/{parent['id']}")
        assert r.status_code == 200

        # Confirm parent removed from child's parent_ids
        r2 = session.get(f"{API}/members")
        updated_child = next((m for m in r2.json() if m["id"] == child["id"]), None)
        assert updated_child is not None
        assert parent["id"] not in updated_child.get("parent_ids", []), \
            "parent reference not cleaned up on delete"

        session.delete(f"{API}/members/{child['id']}")

    def test_delete_cleans_partner_references(self, session):
        a = session.post(f"{API}/members", json={"name": "TEST_PartA"}).json()
        b = session.post(f"{API}/members", json={
            "name": "TEST_PartB", "partner_ids": [a["id"]]
        }).json()

        session.delete(f"{API}/members/{b['id']}")
        r = session.get(f"{API}/members")
        a_updated = next(m for m in r.json() if m["id"] == a["id"])
        assert b["id"] not in a_updated.get("partner_ids", [])

        session.delete(f"{API}/members/{a['id']}")

    def test_delete_missing_404(self, session):
        r = session.delete(f"{API}/members/nope-{uuid.uuid4().hex}")
        assert r.status_code == 404


# ============ PHOTO ============
class TestPhoto:
    def test_upload_and_serve(self, session, created_member):
        png = _png_bytes()
        # Don't use json content-type for multipart
        s = requests.Session()
        files = {"file": ("avatar.png", io.BytesIO(png), "image/png")}
        r = s.post(f"{API}/members/{created_member['id']}/photo", files=files, timeout=60)
        assert r.status_code == 200, r.text
        path = r.json().get("photo_path")
        assert path and isinstance(path, str)

        # Verify member doc now has photo_path
        members = session.get(f"{API}/members").json()
        m = next(x for x in members if x["id"] == created_member["id"])
        assert m.get("photo_path") == path

        # Serve the file
        r2 = s.get(f"{API}/files/{path}", timeout=60)
        assert r2.status_code == 200
        assert r2.headers.get("Content-Type", "").startswith("image/")
        assert len(r2.content) > 0

    def test_upload_missing_member_404(self):
        s = requests.Session()
        files = {"file": ("avatar.png", io.BytesIO(_png_bytes()), "image/png")}
        r = s.post(f"{API}/members/nope-{uuid.uuid4().hex}/photo", files=files, timeout=60)
        assert r.status_code == 404
