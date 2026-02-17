# PRD — Todoist entity ID and project config migration

**Status:** Approved for implementation  
**Related:** [PRD (current)](../README.md), [Desired changes](desired-changes-prd.md) §2, §6  
**Version:** 1.1  
**Last updated:** February 2026

---

## 1. Purpose and business context

Todoist has updated its API so that **entity IDs** (item id, project id) are **opaque strings** rather than integers. The current app uses `parseInt(item.id)` for Datastore entity keys and hardcoded project/folder IDs. This causes:

- **Sync and storage failures** when the Sync API returns string IDs (e.g. `parseInt` yields `NaN`, invalid keys).
- **Inflexibility**: different deployments cannot point to different Todoist projects without code changes.
- **Existing Datastore data** keyed by old integer IDs that must be migrated to the new string IDs.

This PRD defines the **product requirements** to adapt the application to Todoist’s new ID format, make project IDs configurable, and migrate existing data.

---

## 2. Goals and user value

| Goal | User / business value |
|------|------------------------|
| **API compatibility** | Sync continues to work with Todoist’s current (string) IDs; no silent failures or broken keys. |
| **Configurable projects** | Operators can set Todoist project/folder IDs via environment variables per deployment (e.g. dev vs prod, different backlogs). |
| **Data continuity** | Existing Datastore entities keyed by integer IDs can be updated to the new string IDs via a one-time migration, preserving metadata (Name, Tags, Completed, etc.). |

---

## 3. Requirements (MoSCoW)

### Must have

- **M1** — Use Todoist **item id as string** (no `parseInt(item.id)`) for all Datastore entity keys (Serie, Movie, Videogame, Book, Not_found) and for any internal lookup by id.
- **M2** — **Configurable Todoist project/folder IDs** via environment variables, read at runtime from `.env` (or deployment config). Variables: Series, Movies, Videogames PC, Videogames PS4, Books.
- **M3** — A **one-time migration path**: script or procedure that, using Todoist full sync (`sync_token: '*'`) and existing Datastore data, updates entity keys from old (integer) IDs to new (string) IDs, matching items to entities (e.g. by name/metadata) so data is preserved and sync can continue with the new IDs.
- **M4** — When finding an entity to match in Datastore, **exclude from the lookup** entities with `Completed` set to true or with `Date_completion` not null or `Date_completion`not empty.
- **M5** — **Exclude completed Todoist elements** from the matching process (do not attempt to match items that are completed in Todoist).
- **M6** — When a match is found: **do not delete** the original Datastore entity; set a new field **IsClone** to true on it. This field will be used for safe deletion in a future task.
- **M7** — When no match is found: add the new entity as a new entry (same behaviour as normal sync for new items).
- **M8** — When a match is found, the script must **print** the Todoist element's name and the matched entity, and **ask for user validation** (e.g. via terminal prompt) before continuing with the process (setting IsClone, creating new keyed entity, etc.).

### Should have

- **S1** — Migration matches Todoist items to Datastore entities in a deterministic way: **first** try matching by comparing the Datastore entity’s **Name** to the **Name** obtained for the Todoist item by calling the same enrichment as sync (getShowData / getVideogameData / getBookData), i.e. the API-derived Name from OMDb, IGDB, or Open Library; **if no match**, try with the **name of the Todoist entity** (e.g. `item.content`). Log unmatched or ambiguous cases.
- **S2** — Documentation updated (main PRD/docs) so that entity keys and project configuration are described as string IDs and env-based config.

### Could have

- **C1** — Migration script supports a dry-run mode (report only, no writes).
- **C2** — Fallback or validation if an env var for a project ID is missing (e.g. clear error at startup or at first sync).

### Won’t have (this scope)

- No change to how the frontend identifies items (routes use slide index, not entity id).
- No new UI for editing project IDs (config remains env/deployment).
- No backward compatibility layer for mixed integer/string keys in normal sync (migration is one-time; after it, only string keys).

---

## 4. Scope boundary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        IN SCOPE                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Sync flow (update_database.js): entity keys and project_id handling        │
│ • Entity key type: integer → string (Todoist item id as-is)                   │
│ • Project/folder IDs: hardcoded → env vars (read from .env at runtime)        │
│ • One-time migration: script to remap Datastore keys (old int → new string)   │
│ • Docs: README/PRD §4.1, §4.2, §5, §8 – keys and config                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        OUT OF SCOPE                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Changing route URLs or frontend params (/:id remains slide index)           │
│ • User-triggered sync, Refresh button, tags in UI, auth changes               │
│ • Supporting both int and string keys in normal sync after migration         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. MVP vs future

- **MVP (this PRD):** String entity IDs, env-based project IDs, one-time migration script, and doc updates. No new features beyond compatibility and configurability.
- **Future:** Other desired changes (e.g. Refresh button, dynamic tags, refactor of project_id → kind mapping) remain in [desired-changes-prd.md](desired-changes-prd.md).

---

## 6. Document history

| Version | Date     | Changes                |
|---------|----------|------------------------|
| 1.0     | Feb 2026 | Initial PRD for Todoist ID and config migration. |
| 1.1     | Feb 2026 | M4–M8: exclude completed from lookup/match; match by API Name then Todoist name; IsClone instead of delete; add as new when no match; user validation before proceeding. S1: matching order (API Name first, then Todoist name). |
