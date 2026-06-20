# Lineage — 3D Family Tree

## Original problem statement
> I want to build an interactive 3d-family tree whare I should be able to add family members in relation.

## User choices
- 3D rendering: React Three Fiber + Drei
- Auth: none (single-user local tree)
- Member fields: name, gender, birth date, photo
- Photo uploads: yes (Emergent object storage)
- Visual style: surprise — Constellation of Memories (dark cinematic, gold accents)

## Architecture
- **Frontend**: React 19 + CRA, R3F v9, framer-motion, shadcn/ui, phosphor-icons.
  - Routes: `/`
  - Key components: FamilyTreeApp, Scene3D, MemberNode, AddMemberDialog, DetailsPanel, EmptyState.
  - 3D layout: generation-based BFS (parents up, children down, partners adjacent).
- **Backend**: FastAPI on :8001, all routes under `/api`.
  - `/api/members` CRUD, `/api/members/{id}/photo` upload, `/api/files/{path}` serve.
  - MongoDB collection `members`. UUID ids. Partner mirror + reference cleanup on delete.
- **Object storage**: Emergent integrations (`EMERGENT_LLM_KEY`), paths `family3d/photos/{member_id}/{uuid}.{ext}`.

## Implemented (2026-02)
- Empty-state onboarding flow ("Begin your lineage").
- Add member dialog with relation selector (standalone | child of | parent of | partner of | **sibling of**) + photo upload + birth date picker.
- 3D interactive scene with OrbitControls, sparkles, fog, vignette, grain overlay.
- Member nodes as circular HTML cards inside the 3D scene with gold selected ring.
- Connection lines: solid for parent-child, dashed gold for partner, dashed faint blue for siblings; highlighted when a node is selected.
- Right-side glass Sheet with member details, in-place name/bio/birth/death edit, photo replace, parents/partners/siblings/children chips, and removal flow.
- **NEW**: Dark-themed calendar (DarkCalendar.jsx) matching the cinematic aesthetic — gold-accented selected day on dark glass background.
- **NEW**: Death dates per member + deceased indicator (cross badge + grayscale avatar).
- **NEW**: Marriage dates per partner (mirrored both ways, cleaned up on delete) — shown as heart-badge year next to partner chips.
- **NEW**: Sibling relation in the Add dialog (inherits target's parent_ids).
- **NEW**: Sibling visualization — siblings sharing a parent are connected with faint blue dashed lines and clustered together in the generation row.
- **NEW**: Top-center SearchBar with live results + camera focus animation (CameraController lerps camera to the picked node).
- **NEW**: "Keep open to add another" checkbox for batch-adding multiple children/siblings/partners.
- Tested end-to-end: 100% backend (21/21), 100% frontend acceptance.

## P1 backlog
- Member search / pin / focus camera on member.
- Multi-tree export (JSON, image, PDF).
- Notes / family stories per member, marriage/death dates.
- Sibling auto-detection visualization (currently inferred via shared parent).

## P2 backlog
- Multi-user (auth), shared trees, invite links.
- Public read-only share view.
- Mobile-optimized touch controls.
- GEDCOM import/export.

## Next tasks
- Sticky delete button or move it to a kebab menu for very long detail panels.
- Optional pinch/touch gestures pass for mobile.
