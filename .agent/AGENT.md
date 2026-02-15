# Agent instructions — Media Backlog & Recommender

This document configures how the agent should work on this codebase. Read it together with **docs/README.md** for full product context.

---

## 1. Purpose, context and reasoning

### What this app is

- **Media backlog and recommender**: syncs backlog items from **Todoist** (series, movies, videogames, books), enriches them via external APIs (OMDb, IGDB/Twitch, Open Library), stores in **Google Cloud Datastore**, and serves a **web frontend** with carousels, tag filters, and “recommend me something”.
- **Single source of truth**: Todoist is canonical; the app reflects it. Sync is incremental (sync token); token is updated **only after a successful Datastore transaction** so no data or progress is lost on failure.
- **Stack**: Node.js 22 on Google App Engine (standard), Express, Handlebars, Bootstrap 4, Slick carousel, session-based auth. See PRD §1.2 and §7.1 for details.

### Why it matters for the agent

- **Consistency**: Any change to sync or storage must preserve the “sync token only after commit” guarantee. Do not update the token outside the transaction or before all entity writes/deletes.
- **Data model**: Entity kinds (`Serie`, `Movie`, `Videogame`, `Book`, `Not_found`, `Sync_token`), keys (Todoist item id), and indexes are defined in PRD §4 and `index.yaml`. Long text fields are excluded from indexes.
- **Integrations**: Todoist API v1 (Sync endpoint; requests must be `application/x-www-form-urlencoded` — see `routes/apiCalls.js`), OMDb, IGDB (Twitch OAuth), Open Library. Env vars and behavior are in PRD §5 and §8.1.

The agent must **know and use** this context when suggesting or implementing changes.

---

## 2. Knowing the code

Before editing, the agent should locate and understand the relevant parts of the codebase:

| Concern | Where to look |
|--------|----------------|
| App bootstrap, sync on startup, session, CORS | `app.js` |
| Sync flow, Todoist → enrich → Datastore transaction, token update | `routes/update_database.js` |
| Category routes, info endpoints, “any” (recommend) endpoints | `routes/series.js`, `routes/movies.js`, `routes/videogames.js`, `routes/books.js` |
| Auth (login/logout, session) | `routes/auth.js` |
| External API calls (Todoist Sync, OMDb, IGDB, Open Library) | `routes/apiCalls.js` |
| Datastore queries and helpers | `routes/queries.js` |
| Views and layout | `views/` (`.hbs`), `views/partials/` (carousel, footer, category scripts) |
| Indexes | `index.yaml` |
| Config and env | `app.yaml`, `.env_sample`, PRD §8 |

When changing behavior (e.g. new route, new field, new API), trace impact across these areas and mention it in the reasoning.

---

## 3. Priorities: robustness, productive code, intent

- **Robustness**: Prefer defensive checks, clear error handling, and no silent failures. In sync code, preserve transaction semantics (rollback on error, token only on commit).
- **Productive code**: Prefer small, focused changes; avoid unnecessary refactors or style-only edits unless asked. Reuse existing patterns (e.g. how other categories implement `info*`, `any`, `:id`).
- **Intent**: Implement what the user asked for (or what the PRD/issue specifies). Do not add unrelated features or assumptions unless the user agrees.

---

## 4. Explain reasoning

- **Before coding**: State what you are going to do and why (e.g. “Adding a new route for X so that Y; reusing the same auth and response shape as Z”).
- **When proposing changes**: Point to the files/lines and explain how they achieve the goal and what could break.
- **When choosing alternatives**: Briefly say why one approach was chosen over another (e.g. consistency with existing routes, PRD constraints).

---

## 5. Think before coding

- **Clarify intent**: If the request is ambiguous (e.g. “improve the sync”, “fix the carousel”), ask what outcome the user wants before implementing.
- **Check constraints**: PRD goals, non-goals, and “Out of scope / future work” (§2, §9). Do not implement out-of-scope features (e.g. search, Alexa, user-triggered sync) unless the user explicitly asks and references the desired changes doc.
- **Impact**: Consider side effects on sync, indexes, frontend, and env vars. If a change touches `update_database.js` or `index.yaml`, double-check transaction and index definitions.

---

## 6. Issues, testing and warnings

- **Look for issues**: While editing, watch for inconsistent error handling, missing validation, CORS/session assumptions, and any deviation from the PRD data model or sync flow.
- **Test new features**: After implementing a feature, suggest or run concrete checks (e.g. “call GET /series/any and verify response shape”, “run sync and confirm token only updates on success”). Run existing tests if present (e.g. `test.js`).
- **Raise warnings**: If something is risky (e.g. changing transaction boundaries, adding new env vars, modifying indexes), say so clearly and suggest verification steps.

---

## 7. Frontend: minimalistic and stylish

When modifying the frontend (Handlebars, CSS, Bootstrap, Slick, `public/`):

- **Minimalistic**: Prefer fewer elements and clear hierarchy; avoid clutter and redundant controls.
- **Stylish**: Keep a consistent, clean look; align with existing layout and components. Do not introduce conflicting styles or heavy visual changes unless the user asks for a redesign.
- **Compatibility**: Preserve existing behavior (carousel, tag filters, “Recommend me”, Info modal, auth). Check that partials and category-specific scripts still work after UI changes.

---

## 8. When in doubt: ask first

- **No silent inference**: If the user’s intention is unclear (e.g. which category to change, whether to change backend vs frontend, or how to handle an edge case), **ask** before implementing. Do not assume and build the “most likely” solution without confirmation.
- **Unclear scope**: If a request could mean several things (e.g. “support more tags”), ask which interpretation is correct.
- **Conflicts with PRD**: If an idea conflicts with the PRD (e.g. changing sync trigger or data model), point it out and ask whether to update the PRD or adjust the idea.

---

## 9. Quick reference

- **No sensitive data in docs**: Do not store secrets, API keys, real project IDs, passwords, or deployment-specific URLs in any `.md` file or README. Use placeholders and refer to env/config.
- **Main documentation**: `docs/README.md` — product requirements (PRD), data model, sync flow, routes, env.
- **Future changes**: `docs/PRD-desired-changes.md` — agreed next steps (e.g. refresh button, configurable Todoist IDs).
- **Sync**: One run at startup in `app.js`; full flow in `routes/update_database.js`; token in same transaction as entity writes. Todoist Sync uses API v1 (`/api/v1/sync`) with **form-urlencoded** body (see `routes/apiCalls.js`).
- **Auth**: Session (express-session), 15 min cookie; `APPLICATION_LOGIN_USER` and bcrypt `APPLICATION_LOGIN_SECRET`.

Use this file as the default agent behavior for this project.
