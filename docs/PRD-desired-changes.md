# PRD — Desired changes

**Status:** Agreed product/configuration changes (not yet implemented)  
**Related:** [PRD (current configuration)](README.md)

This document captures the **desired changes** agreed for the Media Backlog & Recommender application. It supplements the main PRD, which describes the current state.

---

## 1. Sync trigger

**Current:** Sync with Todoist and Datastore runs **only on application startup**.

**Desired:**

- Keep sync **on app startup** as today.
- Add a **“Refresh” button in the frontend** that triggers a sync on demand.
  - When the user clicks it, the app should run the same sync flow (Todoist → enrich → Datastore transaction → update sync token).
  - The UI should reflect the result (e.g. loading state during sync, then reload or success message).

**Implementation notes (for when coding):**

- Expose an endpoint (e.g. `POST /api/sync`) that runs the sync logic and is protected by the existing auth.
- Add a “Refresh” control in the navbar (or similar) visible when the user is logged in, which calls this endpoint and then updates the view (e.g. reload page or show “Sync complete”).

---

## 2. Todoist project IDs

**Current:** Todoist project/folder IDs for each category (Series, Movies, Videogames PC/PS4, Books) are **hardcoded** in `routes/update_database.js`.

**Desired:**

- Make these IDs **configurable via environment variables** so different deployments can point to different Todoist projects without code changes.

**Suggested env vars (for when coding):**

- `TODOIST_PROJECT_SERIES`
- `TODOIST_PROJECT_MOVIES`
- `TODOIST_PROJECT_VIDEOGAMES_PC`
- `TODOIST_PROJECT_VIDEOGAMES_PS4`
- `TODOIST_PROJECT_BOOKS`

Current hardcoded values can remain as defaults in documentation or as fallbacks only if desired.

---

## 3. Tags in the UI

**Current:** Tag filter buttons above the carousel (e.g. “Animes”, “Souls-like”, “Documentaries”) are **hardcoded** in the Handlebars carousel partial, with different blocks per category/view.

**Desired:**

- Tag buttons should be **driven by data from Datastore (and thus from Todoist)**.
  - The list of tags shown for a given category/view should be the set of tags that actually exist on the entities in that view (e.g. all distinct `Tags` values for Series backlog, or for Videogames PC completed, etc.).
  - New or renamed labels in Todoist will then appear in the UI after sync without changing templates.

**Implementation notes (for when coding):**

- Add a way to get distinct tags for a kind (and, for Videogames, platform) and completion state—e.g. a query that returns entities’ `Tags` and derive unique values, or an endpoint that returns `{ tags: [...] }`.
- For each category page (series, movies, books, videogames by platform), pass the relevant tag list into the template and render the tag buttons via a loop (e.g. `{{#each tags}}`) instead of hardcoded markup.
- Keep “Clear filters” as a fixed button.

---

## 4. Auth in production

**Current:** Session store is **in-memory** (default `express-session`). Comments in code note this is not suitable for production.

**Desired:**

- **Use whatever is cheaper** for the current setup.
- There is **only one user**; no multi-user requirement.
- So: **in-memory session is acceptable for production** in this context. If the app is later extended to multiple users or higher availability, session persistence (e.g. Datastore or Redis) can be reconsidered.

**Documentation:** The main PRD and deployment docs should state that in-memory session is an accepted choice for the single-user, cost-conscious setup.

---

## 5. APPLICATION_LOGIN_SECRET

**Current:** `.env_sample` and docs do not clearly state that `APPLICATION_LOGIN_SECRET` must be a **bcrypt hash** of the password, nor how to generate it.

**Desired:**

- **Document** that `APPLICATION_LOGIN_SECRET` must be the **bcrypt hash** of the login password (as used by `bcrypt.compare()` in the auth route).
- Provide a **simple way to generate** it, e.g.:
  - In `.env_sample`: a short comment or second line showing the generator command.
  - In the PRD (Configuration / Environment): one sentence that the value must be a bcrypt hash and a one-liner to generate it, using a **placeholder** only (e.g. `node -e "console.log(require('bcrypt').hashSync('YOUR_PASSWORD_PLACEHOLDER', 10))"`). **Never put real passwords or secrets in documentation.**

---

## 6. Todoist item IDs (API v1 compatibility)

**Current:** Entity keys in Datastore and all sync logic in `routes/update_database.js` use **`parseInt(item.id)`** for Todoist item IDs. The [Todoist API v1 migration](https://developer.todoist.com/api/v1/) states that IDs are now **opaque strings** (e.g. `"6X7rM8997g3RQmvh"`). If the Sync API returns string IDs, `parseInt()` yields `NaN` and entity keys become invalid, which can cause sync or lookup failures.

**Desired (optional follow-up, for later):**

- Use **Todoist item id as-is** (string or number) for Datastore entity keys so the app is compatible with API v1 string IDs. Google Cloud Datastore supports both integer and string key path segments.
- In `routes/update_database.js`: replace `parseInt(item.id)` with the raw `item.id` (or a consistent string coercion) when building entity keys, and ensure any route or query that uses the id (e.g. `:id` in URLs, `getEntityDatabaseById`) accepts string keys.
- Update `docs/README.md` §4.1 and §4.2 to describe keys as "Todoist item id (string or number)" once implemented.

**Implementation notes (for when coding):**

- Audit all uses of `item.id` in `update_database.js` (entity keys, batch delete/store, Not_found keys) and in routes that resolve entities by id (e.g. `routes/series.js`, `routes/movies.js`, etc.). Use the same type (string) for keys and for URL params so lookups match.
- If existing data was stored with numeric keys, consider whether a one-time migration or backward compatibility (support both numeric and string lookups) is needed.

---

## 7. Summary table

| Area                  | Current behavior                         | Desired behavior                                                                 |
|-----------------------|------------------------------------------|-----------------------------------------------------------------------------------|
| **Sync trigger**      | Sync only on app startup                 | Sync on startup **and** via a “Refresh” button in the frontend                    |
| **Todoist project IDs** | Hardcoded in `update_database.js`     | Configurable via env vars (e.g. `TODOIST_PROJECT_*`)                              |
| **Tags in UI**        | Hardcoded tag buttons in carousel partial| Tag list driven by Datastore/Todoist (distinct tags per category/view)            |
| **Auth (production)** | In-memory session; “not for production”  | In-memory session accepted for single-user; document as intentional              |
| **APPLICATION_LOGIN_SECRET** | Undocumented format                 | Document: must be bcrypt hash; add generator command in `.env_sample` and PRD     |
| **Todoist item IDs**        | `parseInt(item.id)` for entity keys | Use item id as-is (string) for API v1 compatibility; audit keys and routes      |

---

## 8. Document history

| Version | Date     | Changes                    |
|---------|----------|----------------------------|
| 1.0     | Feb 2025 | Initial desired-changes PRD. |
| 1.1     | Feb 2026 | Added §6 Todoist item IDs (API v1 compatibility) as optional follow-up. |
