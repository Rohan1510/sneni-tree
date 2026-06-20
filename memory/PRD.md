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
- Add member dialog with relation selector (standalone | child of | parent of | partner of | sibling of) + photo upload + dark theme date pickers (birth, death, marriage).
- 3D interactive scene with OrbitControls, sparkles, fog, vignette, grain overlay; mobile touch gestures enabled.
- Member nodes as circular HTML cards with gold selected ring; deceased members get a cross indicator and grayscale avatar.
- Edges: solid parent-child, dashed gold partner, dashed cool-blue **full sibling**, lighter lavender dashed **half sibling**; selected member highlights all its edges in gold.
- Right-side glass Sheet with member details: in-place name/bio/birth/death edit, photo replace, parents/partners/siblings (full + half badges) / children chips with click-to-focus, marriage year badges, and removal flow.
- Top-center SearchBar with live results + camera focus animation.
- "Keep open to add another" checkbox for batch-adding multiple children/siblings/partners.
- "Fit to screen" camera reset button.
- **NEW — Timeline mode**: Mode toggle (Tree ↔ Timeline). In timeline mode members are re-positioned along the Z-axis by birth year, a gold themed scrubber with Play/Rewind/Forward controls lets the user scrub or auto-play through the years. Members born after the current year fade out, deceased members go grayscale, the just-born member gets a gold halo ring.
- Tested end-to-end: 100% backend (21/21), 100% frontend acceptance (timeline 7/7 acceptance criteria).

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
