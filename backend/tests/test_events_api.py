"""Tests for Iteration 5 — Life Events on members.

Covers:
- POST /api/members with `events` persists them (with default ids if missing).
- PATCH /api/members/{id} replaces the events array fully.
- Setting events to [] clears them.
- GET listing exposes events (default empty list for members without events).
- No regression on previous fields.
"""
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
    # cleanup TEST_ prefixed members we created
    try:
        r = s.get(f"{API}/members", timeout=30)
        if r.ok:
            for m in r.json():
                if m.get("name", "").startswith("TEST_EVT_"):
                    s.delete(f"{API}/members/{m['id']}", timeout=30)
    except Exception:
        pass


def _ev(typ, year, title, location=None, eid=None):
    e = {"type": typ, "year": year, "title": title}
    if location is not None:
        e["location"] = location
    if eid:
        e["id"] = eid
    return e


class TestEventsCreate:
    def test_create_with_events(self, session):
        eid = str(uuid.uuid4())
        payload = {
            "name": f"TEST_EVT_Create_{uuid.uuid4().hex[:6]}",
            "birth_date": "1920-01-01",
            "events": [
                _ev("education", 1938, "Graduated Yale", "New Haven", eid=eid),
                _ev("marriage", 1948, "Married Eleanor"),
                _ev("career", 1955, "Founded Whitfield & Co.", "NYC"),
                _ev("migration", 1970, "Moved to NYC", "NYC"),
            ],
        }
        r = session.post(f"{API}/members", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        try:
            assert isinstance(d.get("events"), list)
            assert len(d["events"]) == 4
            # provided id preserved
            edu = next(e for e in d["events"] if e["type"] == "education")
            assert edu["id"] == eid
            assert edu["year"] == 1938
            assert edu["title"] == "Graduated Yale"
            assert edu["location"] == "New Haven"
            # missing id auto-generated
            mar = next(e for e in d["events"] if e["type"] == "marriage")
            assert isinstance(mar["id"], str) and len(mar["id"]) > 0
            assert mar.get("location") is None

            # verify persistence
            members = session.get(f"{API}/members").json()
            m = next(x for x in members if x["id"] == d["id"])
            assert len(m["events"]) == 4
            types = sorted(e["type"] for e in m["events"])
            assert types == ["career", "education", "marriage", "migration"]
        finally:
            session.delete(f"{API}/members/{d['id']}")

    def test_create_default_events_is_empty_list(self, session):
        r = session.post(f"{API}/members", json={"name": f"TEST_EVT_NoEvt_{uuid.uuid4().hex[:6]}"})
        assert r.status_code == 200
        d = r.json()
        try:
            assert d.get("events") == []
            # GET also returns events array
            m = next(x for x in session.get(f"{API}/members").json() if x["id"] == d["id"])
            assert m.get("events") == []
        finally:
            session.delete(f"{API}/members/{d['id']}")

    def test_create_rejects_invalid_event_type(self, session):
        # Pydantic Literal should reject invalid types -> 422
        r = session.post(f"{API}/members", json={
            "name": f"TEST_EVT_BadType_{uuid.uuid4().hex[:6]}",
            "events": [{"type": "wedding", "year": 1950, "title": "Bad"}],
        })
        assert r.status_code in (400, 422), r.text


class TestEventsPatch:
    def test_patch_replaces_events_array(self, session):
        # Start with 2 events
        d = session.post(f"{API}/members", json={
            "name": f"TEST_EVT_Patch_{uuid.uuid4().hex[:6]}",
            "events": [
                _ev("education", 1940, "School"),
                _ev("career", 1960, "Job"),
            ],
        }).json()
        try:
            assert len(d["events"]) == 2
            # Replace entire array with one new event
            new_events = [_ev("migration", 1975, "Move", "Paris")]
            r = session.patch(f"{API}/members/{d['id']}", json={"events": new_events})
            assert r.status_code == 200, r.text
            assert len(r.json()["events"]) == 1
            assert r.json()["events"][0]["type"] == "migration"
            assert r.json()["events"][0]["title"] == "Move"

            # Persistence
            m = next(x for x in session.get(f"{API}/members").json() if x["id"] == d["id"])
            assert len(m["events"]) == 1
            assert m["events"][0]["location"] == "Paris"
        finally:
            session.delete(f"{API}/members/{d['id']}")

    def test_patch_clears_events_with_empty_list(self, session):
        d = session.post(f"{API}/members", json={
            "name": f"TEST_EVT_Clear_{uuid.uuid4().hex[:6]}",
            "events": [_ev("other", 2000, "Milestone")],
        }).json()
        try:
            r = session.patch(f"{API}/members/{d['id']}", json={"events": []})
            assert r.status_code == 200
            assert r.json()["events"] == []
            m = next(x for x in session.get(f"{API}/members").json() if x["id"] == d["id"])
            assert m["events"] == []
        finally:
            session.delete(f"{API}/members/{d['id']}")

    def test_patch_preserves_other_fields(self, session):
        d = session.post(f"{API}/members", json={
            "name": f"TEST_EVT_Preserve_{uuid.uuid4().hex[:6]}",
            "birth_date": "1930-05-10",
            "bio": "Original bio",
            "events": [_ev("career", 1960, "Job")],
        }).json()
        try:
            # Patch only events; bio/birth_date should stay
            r = session.patch(f"{API}/members/{d['id']}", json={
                "events": [_ev("marriage", 1955, "Married")],
            })
            assert r.status_code == 200
            body = r.json()
            assert body["birth_date"] == "1930-05-10"
            assert body["bio"] == "Original bio"
            assert len(body["events"]) == 1
            assert body["events"][0]["type"] == "marriage"
        finally:
            session.delete(f"{API}/members/{d['id']}")

    def test_patch_delete_single_event_by_filtering(self, session):
        # Simulates frontend delete: PATCH with events array minus one
        e1_id = str(uuid.uuid4())
        e2_id = str(uuid.uuid4())
        d = session.post(f"{API}/members", json={
            "name": f"TEST_EVT_Del_{uuid.uuid4().hex[:6]}",
            "events": [
                _ev("education", 1940, "A", eid=e1_id),
                _ev("career", 1960, "B", eid=e2_id),
            ],
        }).json()
        try:
            remaining = [e for e in d["events"] if e["id"] != e1_id]
            r = session.patch(f"{API}/members/{d['id']}", json={"events": remaining})
            assert r.status_code == 200
            ids = [e["id"] for e in r.json()["events"]]
            assert e1_id not in ids
            assert e2_id in ids
        finally:
            session.delete(f"{API}/members/{d['id']}")
