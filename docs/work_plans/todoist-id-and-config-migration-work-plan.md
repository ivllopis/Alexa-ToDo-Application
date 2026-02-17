# Work Plan — Todoist entity ID and project config migration

**Related PRD:** [todoist-id-and-config-migration-prd.md](../prd/todoist-id-and-config-migration-prd.md)  
**Related Design:** [todoist-id-and-config-migration-design.md](../design/todoist-id-and-config-migration-design.md)  
**Version:** 1.1  
**Last updated:** February 2026

---

## Task breakdown and dependencies

```
[1] Add env vars for Todoist project IDs
        │
        ▼
[2] Use env-based project IDs in update_database.js (replace hardcoded)
        │
        ├──────────────────────────────────┐
        ▼                                  ▼
[3] Implement migration script            [4] Switch entity id to string in update_database.js
        │                                  │   (depends on migration being run before deploy,
        │                                  │    but implementation can be parallel)
        ▼                                  ▼
[5] Run migration (per environment)   ────►[6] Deploy app with string ids + env config
        │
        ▼
[7] Update documentation (README, .env_sample, desired-changes)
```

---

### Task 1 — Add env vars for Todoist project IDs

- **Scope:** Add five environment variable names to `.env_sample` and document in PRD §8 (or README).
- **Deliverable:** `.env_sample` includes placeholders for `TODOIST_PROJECT_SERIES`, `TODOIST_PROJECT_MOVIES`, `TODOIST_PROJECT_VIDEOGAMES_PC`, `TODOIST_PROJECT_VIDEOGAMES_PS4`, `TODOIST_PROJECT_BOOKS`.
- **Dependencies:** None.

---

### Task 2 — Use env-based project IDs in update_database.js

- **Scope:** Replace hardcoded `seriesfolderid`, `moviesfolderid`, `PS4folderid`, `PCfolderid`, `booksfolderid` with values read from `process.env` (same five vars). Use `String(item.project_id)` when comparing to env values.
- **Deliverable:** Sync routes items by project using env-configured IDs; no hardcoded project ids in code.
- **Dependencies:** Task 1 (env names defined and documented).

---

### Task 3 — Implement migration script

- **Scope:** New script (e.g. `scripts/migrate-datastore-ids-to-string.js`) that: loads `.env`; calls Todoist full sync (`sync_token: '*'`); **excludes completed Todoist items** from matching (M5); for each kind, loads existing Datastore entities (int keys) **excluding entities with Completed true or Date_completion not null/empty** (M4), and Todoist items for that project; for each Todoist item, obtains the **API-derived Name** (by calling getShowData/getVideogameData/getBookData as in sync); matches in order: **Name** (entity Name vs API-derived Name from that call) first, then **item.content** (S1); for each match: **print** Todoist element name and matched entity and **ask for user validation** (e.g. terminal prompt) before proceeding (M8); then save entity with new key (kind, string id) and **set IsClone=true on original** (do not delete) (M6); for **no match**, add as **new entry** (same as normal sync) (M7); optional dry-run (C1). Handle Not_found; batch/transaction as needed; optionally clear Sync_token after migration.
- **Deliverable:** Script runnable with `node scripts/migrate-datastore-ids-to-string.js` (and optional `--dry-run`).
- **Dependencies:** Task 2 (script uses same env vars for project IDs).

---

### Task 4 — Switch entity id to string in update_database.js

- **Scope:** Replace every `parseInt(item.id)` with string coercion (e.g. `String(item.id)`); pass string id to `getEntityDatabaseById` and to all `datastore.key([kind, id])` (Serie, Movie, Videogame, Book, Not_found). Ensure no code path uses integer for entity key.
- **Deliverable:** Sync creates and looks up entities by string id only.
- **Dependencies:** None for implementation. Deployment of this change should follow Task 5 (migration run) so that Datastore already has string-keyed entities.

---

### Task 5 — Run migration (per environment)

- **Scope:** Execute migration script in each target environment (e.g. dev first, then prod) with real `.env` (or env vars) set. Verify: original (int-keyed) entities have IsClone=true where a match was applied; new string-keyed entities present with same data; no match cases added as new entries. Optionally run dry-run first.
- **Deliverable:** Datastore in each env has new string-keyed entities for migrated items and originals marked with IsClone; sync can continue with new ids.
- **Dependencies:** Task 3 (script ready); Task 2 (env vars set for that env).

---

### Task 6 — Deploy app with string ids and env config

- **Scope:** Deploy the application including changes from Tasks 2 and 4. Ensure env vars for Todoist project IDs are set in deployment config (e.g. App Engine env_variables or .env).
- **Deliverable:** Live app uses string entity keys and env-based project IDs; sync runs without key or project errors.
- **Dependencies:** Task 4 (code merged); Task 5 (migration already run for that env).

---

### Task 7 — Update documentation

- **Scope:** Update `docs/README.md` (and if needed `docs/prd/desired-changes-prd.md`): entity keys described as Todoist item id (string); project IDs described as configurable via env; add brief migration procedure (run script once, then deploy). Ensure no real project IDs or secrets in docs.
- **Deliverable:** PRD and README reflect current behavior (string keys, env-based project IDs) and migration steps.
- **Dependencies:** Tasks 4 and 5 (so docs describe final state).

---

## Summary

| Task | Description | Depends on |
|------|-------------|------------|
| 1 | Add env vars (names + .env_sample) | — |
| 2 | Use env project IDs in update_database.js | 1 |
| 3 | Implement migration script | 2 |
| 4 | Entity id as string in update_database.js | — |
| 5 | Run migration per environment | 2, 3 |
| 6 | Deploy app (string ids + env config) | 4, 5 |
| 7 | Update documentation | 4, 5 |

---

## Document history

| Version | Date     | Changes   |
|---------|----------|-----------|
| 1.0     | Feb 2026 | Initial work plan. |
| 1.1     | Feb 2026 | Align with PRD v1.1: Task 3 — exclude completed (M4, M5), matching order (S1), IsClone not delete (M6), new entry when no match (M7), user validation (M8), dry-run (C1). Task 5 — verification wording (IsClone, no deletion). |
