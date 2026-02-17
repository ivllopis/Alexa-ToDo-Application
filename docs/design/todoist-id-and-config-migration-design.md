# Design Document — Todoist entity ID and project config migration

**Related PRD:** [todoist-id-and-config-migration-prd.md](../prd/todoist-id-and-config-migration-prd.md)  
**Version:** 1.2  
**Last updated:** February 2026

---

## 1. Existing codebase analysis

### 1.1 Where entity ID (Todoist item id) is used

| Location | Current behavior | Integration point |
|----------|------------------|-------------------|
| `routes/update_database.js` | `parseInt(item.id)` for all entity keys and for `getEntityDatabaseById(kind, parseInt(item.id))` | Single place where Todoist item id becomes Datastore key; must switch to string id. |
| `getEntityDatabaseById(kind, id)` (same file) | `datastore.key([kind, id])` — id is currently integer | Must accept string id; Datastore supports string key path segments. |
| Entity keys built in same file | `datastore.key(['Serie', parseInt(item.id)])`, same for Movie, Videogame, Book, Not_found | All must use `String(item.id)` or equivalent (no parseInt). |
| `routes/queries.js` | No direct use of entity id; queries filter by Completed, Platform, Slide_number, Name, Tags | No change required. |
| `routes/series.js`, `movies.js`, `books.js`, `videogames.js` | Route param `:id` is used as **slide index** (Slide_number), not entity id; `parseInt(req.params.id)` is for slide number | No change for entity key type; param remains slide index. |

**Conclusion:** Only `routes/update_database.js` needs changes for entity id type. No route or query used by the frontend resolves entities by Todoist item id.

### 1.2 Where project/folder IDs are used

| Location | Current behavior | Integration point |
|----------|------------------|-------------------|
| `routes/update_database.js` (top) | `seriesfolderid`, `moviesfolderid`, `PS4folderid`, `PCfolderid`, `booksfolderid` hardcoded as string constants | Replace with values read from `process.env` (e.g. `TODOIST_PROJECT_SERIES`, etc.). |
| Same file, loop over items | `item.project_id === seriesfolderid`, etc. | Compare using env-derived values; coerce `item.project_id` to string for comparison so it works whether API returns number or string. |

**Conclusion:** Remove hardcoded folder id constants; read from env at startup or at use (prefer at use so that env can be changed without code change). Use `String(projectId)` when comparing with `item.project_id`.

### 1.3 Todoist Sync API and migration

| Concern | Current | For migration |
|---------|---------|----------------|
| `routes/apiCalls.js` — `getDataTodoist(sync_token)` | When token is `undefined`/empty, sends `sync_token: '*'` for full sync. Returns `data.items` (and `data.sync_token`). | Migration script will call `getDataTodoist()` with no arg (or explicit `'*'`) to get full item list with **new string ids** and `project_id`. No change to API call contract. |
| Item shape | `item.id`, `item.project_id`, `item.content`, `item.checked`, `item.completed_at`, `item.labels`, `item.is_deleted` | Todoist may return `id` and `project_id` as strings; app must not parseInt. |

### 1.4 Datastore key type

- Google Cloud Datastore supports both **integer** and **string** key path segments.
- Existing entities are keyed by integer (e.g. `Serie`, 12345678). After migration, new entities will be keyed by string (e.g. `Serie`, `"6X7rM8997g3RQmvh"`).
- No change to `index.yaml` is required for key type (indexes are on properties, not key path type).

### 1.5 Implementation path mapping

```
Existing path (sync):
  getDataTodoist(token) → items[]
  for each item: parseInt(item.id) → entity key → getEntityDatabaseById(kind, intId) / datastore.key([kind, intId])
  project_id compared to hardcoded seriesfolderid, etc.

New path (sync):
  getDataTodoist(token) → items[]
  for each item: id = ensureString(item.id) → entity key → getEntityDatabaseById(kind, id) / datastore.key([kind, id])
  project_id compared to env TODOIST_PROJECT_* (with String(item.project_id) for comparison).

New path (migration script, one-time):
  getDataTodoist() [full sync] → items[] with new string ids
  For each kind: load existing Datastore entities (with old int keys). For each Todoist item in that kind’s project, find best-matching entity by Name/content; then save entity under new key (kind, stringId), set IsClone=true on original (do not delete). Exclude completed Todoist items and Datastore entities (Completed/Date_completion). No match → add as new entry. User validation before proceeding.
  Optionally reset or leave Sync_token so next app sync does full or incremental as appropriate.
```

---

## 2. Technical implementation approach

### 2.1 Entity ID as string

- **Normalize id once per item:** e.g. `const id = item.id == null ? '' : String(item.id);` (reject or skip empty if needed).
- **Use `id` (string) everywhere** that currently uses `parseInt(item.id)`:
  - `getEntityDatabaseById(kind, id)` — id is string.
  - `datastore.key([kind, id])` for Serie, Movie, Videogame, Book, Not_found.
- **project_id comparison:** use `String(item.project_id)` when comparing to env-derived project IDs so that both sides are strings (Todoist may return number or string).

### 2.2 Configurable project IDs via environment variables

- **Env vars (suggested names):**
  - `TODOIST_PROJECT_SERIES`
  - `TODOIST_PROJECT_MOVIES`
  - `TODOIST_PROJECT_VIDEOGAMES_PC`
  - `TODOIST_PROJECT_VIDEOGAMES_PS4`
  - `TODOIST_PROJECT_BOOKS`
- **Where to read:** In `update_database.js`, at module load or at start of `updateDatabase()`, read from `process.env`. Use a small helper or inline, e.g.:
  - `const seriesfolderid = process.env.TODOIST_PROJECT_SERIES || '';` (empty string or throw if required).
- **.env and .env_sample:** Add the five variables to `.env_sample` with placeholder values; document in PRD §8 that these are required for sync. Do not store real project IDs in repo.
- **Comparison:** When routing by project, compare `String(item.project_id)` to these env values (all strings). If an env var is missing and no fallback is desired, sync can throw a clear error at start of `updateDatabase()`.

### 2.3 Migration script: purpose and strategy

- **Purpose:** One-time update of Datastore so that every entity currently keyed by an **integer** Todoist item id is re-keyed to the **string** Todoist item id returned by the current API.
- **Challenge:** Old keys are integers; new ids from Todoist are strings. There is no direct mapping (e.g. old 12345 might now be `"6X7rM8997g3RQmvh"`). So we need to **match** each Todoist item (with new string id) to the correct existing entity.
- **Strategy (match by name):**
  1. Call Todoist Sync with `sync_token: '*'` to get all current items with new string ids and `project_id`, `content`, `checked`, `completed_at`.
  2. For each **kind** (Serie, Movie, Videogame PC, Videogame PS4, Book, and Not_found if needed):
     - Get all Todoist items for that kind’s project(s) (using env-based project IDs).
     - Load all existing entities of that kind from Datastore (keys will be integer ids).
  3. **Matching:** **Exclude completed Todoist items** from the matching process: do not attempt to match items where `item.checked === true` or `item.completed_at` is set (M5). For each remaining Todoist item, find the Datastore entity that best matches. When building the candidate set for lookup, **exclude** entities with `Completed === true` or `Date_completion` not null or not empty (M4). Matching order (S1): **first** try matching using the **Name** field: for the Todoist item, obtain the API-derived Name by calling the same enrichment as sync (getShowData / getVideogameData / getBookData) and use the returned **Name** (from OMDb, IGDB, Open Library) to compare with the Datastore entity’s **Name**; **if no match**, try with the **name of the Todoist entity** (`item.content`). Log unmatched or ambiguous cases. Options:
     - **Option A:** Normalize both (trim, lower case) and match exactly where possible; then by “content is substring of Name” or “Name is substring of content” to handle "(Year)" / "(Author)" differences.
     - **Option B:** For each Todoist item, score all entities of that kind by string similarity (e.g. normalize content and Name, then pick best match). Prefer 1:1: each entity used at most once for one Todoist item.
  4. For each matched pair (oldEntity, todoistItem):
     - **User validation (M8):** Print the Todoist element's name and the matched entity; ask for user validation (e.g. via terminal prompt) before continuing. If user declines, skip this pair.
     - Create new entity with key `[kind, todoistItem.id]` (string) and same property data as oldEntity (optionally omit `datastore.KEY` from data).
     - **Do not delete** the original entity (M6). Set on the **original** entity a new property **IsClone** = `true` (for safe deletion in a future task).
  5. For each Todoist item with **no match (M7):** Add the entity as a **new entry** (same behaviour as normal sync for new items: create with key `[kind, todoistItem.id]`, enrich via API, save).
  6. **Not_found:** You can ignore migrating these for now.
  7. **Sync_token:** After migration, either leave existing Sync_token (so next sync is incremental) or clear it so next sync is full with new ids. Design choice: set the sync_token 'ZnsxD6ybiBoqVJ82LkB1CENMO2yCunRRS79EXrTQk-vAco7fUVPBj8nAVAv0ttznz9FuME_hcHJvYlzN-FWKTJHzCHk1J2Do83eFuV-gfTpU0H4S' to make an incremental sync from then onwards.
  8. **Transaction / batching:** Run migrations in batches (e.g. 20 entities per batch) to avoid timeouts; use Datastore transactions where appropriate (e.g. save new entity + update old entity with IsClone in one transaction if possible).
- **Script location:** Standalone script (e.g. `scripts/migrate-datastore-ids-to-string.js` or under `scripts/`) that:
  - Loads `.env` (`require('dotenv').config()`).
  - Uses same `apiCalls.getDataTodoist()` and same Datastore client as the app.
  - Reads project IDs from env (same vars as app).
  - Implements the matching and re-key logic above.
  - Supports optional **dry-run** (log matches and planned deletes/saves, no writes).
- **Idempotency:** If run twice, second run would find no (or few) integer-keyed entities; script should skip or no-op when no old keys remain. Do not delete entities; only set IsClone on originals when a match is confirmed.

### 2.4 Data contract clarification

- **Todoist Sync API (v1):** `item.id` and `item.project_id` may be string or number; app must treat id as string and compare project_id as string.
- **Datastore entity key:** After migration, key path segment for all media kinds and Not_found is a **string** (Todoist item id). Sync and migration must not use integer keys for new writes.
- **Sync_token:** Stored as before (string). After migration, either keep or clear as per design choice above.
- **IsClone:** New optional boolean property on entities. When set to `true` on an entity, it indicates that entity is the "original" that was superseded by a new entity keyed by string id; it is reserved for safe deletion in a future task. Normal sync and frontend should ignore or filter IsClone entities as needed (e.g. do not show in carousels if applicable).

### 2.5 Why this approach

- **String id everywhere:** Aligns with Todoist API v1; avoids NaN and invalid keys; Datastore supports string keys natively.
- **Env for project IDs:** Matches desired-changes PRD; one codebase, many deployments; no secrets in code.
- **Migration by name matching:** No stable mapping between old int id and new string id from API; name (and kind/project) is the only stable link. Matching by Name/content is a reasonable heuristic; logs for unmatched/ambiguous allow manual fix or follow-up.

---

## 3. Technical dependencies and implementation order

1. **Env vars and project IDs** — Add env vars to `.env_sample` and read them in `update_database.js`; replace hardcoded folder id constants. Compare `String(item.project_id)` to env values. (Can be done before or in parallel with entity id change, but must be in place before migration so migration uses same project mapping.)
2. **Entity id as string in sync** — Replace all `parseInt(item.id)` with string coercion; use string id in `getEntityDatabaseById` and in every `datastore.key([kind, id])`. Deploy only after migration has run (otherwise new sync would create string-keyed entities while old data remain int-keyed).
3. **Migration script** — Implement script that does full sync, matches by name, re-keys entities to string ids, optionally clears Sync_token. Run once per environment (e.g. dev then prod) before or when switching to the new code.
4. **Documentation** — Update docs/README.md (and desired-changes if needed): entity keys as string; project IDs from env; migration procedure.

**Recommended order:** (1) Env + project IDs in code; (2) Migration script; (3) Run migration in target env; (4) Entity id as string in sync; (5) Deploy app; (6) Doc updates. Alternatively: (1), (2), (4) in codebase, then (3) run migration, (5) deploy, (6) docs.

---

## 4. E2E verification at integration points

| Integration point | Verification |
|-------------------|--------------|
| **Todoist Sync → update_database** | After deployment with string ids and env project IDs: start app, ensure sync runs without error; check logs for no NaN or key errors; confirm entities in Datastore have string key path segments. |
| **Datastore keys** | Query a few entities by kind; confirm key path segment is string (e.g. `key.path[0].id` or name is string). |
| **Project routing** | Set env to a test project id; add item in that project in Todoist; run sync; confirm item appears in expected kind (Serie/Movie/Videogame/Book). |
| **Migration script** | In a copy of Datastore or dev: run migration (dry-run first); then run for real; confirm original (integer-keyed) entities have IsClone=true where a match was applied, and new string-keyed entities exist with same Name/Tags/Completed; run sync and confirm no duplicate or missing items. |
| **Frontend** | After migration and deploy: open series/movies/books/videogames; carousels and “Recommend me” and Info modal should work (they use slide index and queries, not entity id). |

---

## 5. Document history

| Version | Date     | Changes   |
|---------|----------|-----------|
| 1.0     | Feb 2026 | Initial design for Todoist ID and config migration. |
| 1.1     | Feb 2026 | Exclude completed from Todoist and Datastore lookup; match by API Name first then Todoist name; IsClone on original (no delete); add as new when no match; user validation prompt before proceeding; IsClone data contract. |
| 1.2     | Feb 2026 | Align with PRD v1.1: explicit M4/M5/M6/M7/M8 and S1 references; exclude completed Todoist items and Datastore entities; matching order and E2E verification wording (IsClone, no deletion). |
