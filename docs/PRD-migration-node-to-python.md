# PRD — Migration from Node.js/Express to Python

**Status:** Strategy document (not yet implemented)  
**Related:** [PRD (current configuration)](README.md) · [PRD — Desired changes](PRD-desired-changes.md)

This document describes a **strategy to migrate the Media Backlog & Recommender application** from **Node.js with Express** to **Python** (Flask or an alternative framework as recommended below), with a **pure migration** objective: **no intentional changes to application logic or frontend behavior**. The frontend should remain as similar as possible in look, URLs, and interaction. Any question or doubt is **asked or flagged** in this PRD and must not be inferred during implementation.

**Future scope (out of migration):** New recommendation methods that use features from Datastore entities will be added later; the migration does not include those features.

---

## 1. Migration scope and constraints

| Principle | Description |
|-----------|-------------|
| **Pure migration** | Port existing behavior only. No refactors, no new features, no logic changes beyond what is strictly required to run on Python. |
| **Same frontend** | Same URLs, same pages, same templates (after conversion if needed), same static assets (Bootstrap, Slick, CSS, JS). The user-facing experience must be equivalent. |
| **No inference** | Where behavior, configuration, or intent is ambiguous, the implementation team must **ask or flag** the question rather than assume an answer. This PRD lists known open points in §7. |

---

## 2. Recommended platform: Flask

**Recommendation:** Use **Flask** as the Python web framework.

| Criterion | Flask |
|-----------|--------|
| **Fit** | Minimal, route-based style similar to Express; easy 1:1 mapping of routes and middleware-like patterns. |
| **Templates** | Built-in Jinja2; syntax is close to Handlebars for conditionals, loops, and partials. Conversion from Handlebars is well-documented. |
| **Session / auth** | Session and cookie support out of the box; flash messages available. |
| **GAE** | Supported on Google App Engine standard (Python 3.12). |
| **Ecosystem** | Mature; Google Cloud Datastore, HTTP clients, bcrypt, and env loading have standard Python libraries. |

**Alternatives (for decision, not assumed):**

- **FastAPI:** Better if the app were to become API-first or heavily async; adds complexity and a different template story. Not recommended for a like-for-like migration unless explicitly chosen.
- **Django:** Full-stack framework; would require a larger restructure (projects, apps, ORM). Not recommended for a minimal, logic-preserving migration.

**Open point:** Confirm that **Flask** is the chosen framework**;** if another (e.g. FastAPI, Django) is preferred, the mapping below must be adjusted and re-agreed.

---

## 3. Current stack (summary)

For reference during migration; no inference of changes beyond what is stated.

| Layer | Current (Node.js) |
|-------|--------------------|
| **Runtime** | Node.js 22 (GAE standard) |
| **Framework** | Express 5.x |
| **Templates** | Handlebars (express-handlebars), `.hbs`, layout + partials |
| **Static** | `public/` (Bootstrap, Slick, custom CSS/JS) |
| **Session** | express-session (in-memory), 15 min cookie maxAge |
| **Flash** | connect-flash |
| **Auth** | Custom: APPLICATION_LOGIN_USER + bcrypt compare against APPLICATION_LOGIN_SECRET (stored as bcrypt hash in env) |
| **Storage** | Google Cloud Datastore (@google-cloud/datastore) |
| **HTTP client** | axios |
| **Sync** | update_database() runs once at process startup (no HTTP endpoint) |
| **External APIs** | Todoist Sync API, OMDb, IGDB (+ Twitch OAuth for token), Open Library |
| **Deployment** | app.yaml, runtime: nodejs22, env: standard |

**Environment variables (from code and .env):**  
TODOIST_API_KEY, OMDb_API_KEY, IGDB_API_KEY, IGDB_API_CLIENT_ID, IGDB_API_SECRET, SESSION_SECRET, APPLICATION_LOGIN_USER, APPLICATION_LOGIN_SECRET, (SYNC_TOKEN — see §7).

---

## 4. Target stack (Python / Flask mapping)

| Layer | Target (Python) | Notes |
|-------|-----------------|--------|
| **Runtime** | Python 3.12 (GAE standard) | app.yaml must be updated; confirm exact supported version for GAE. |
| **Framework** | Flask | See §2. |
| **Templates** | Jinja2 (Flask default) | Handlebars templates must be converted; see §5 and §7. |
| **Static** | Same `public/` (or Flask `static/`) | Can keep structure; only path configuration may change. |
| **Session** | Flask session (client-side signed cookie or server-side; see §7) | Match 15 min lifetime and in-memory behavior if that is confirmed. |
| **Flash** | Flask flash() | Direct equivalent. |
| **Auth** | Same logic: env user + bcrypt.checkpw(password, stored_hash) | Use `bcrypt` (PyPI). Stored hash format must remain compatible; see §7. |
| **Storage** | google-cloud-datastore | Same entities, kinds, and query logic. |
| **HTTP client** | requests or httpx | Port axios calls 1:1 (URL, headers, body). |
| **Sync** | Run same sync logic once at process startup | When exactly (before first request, in app factory, etc.) to be confirmed; see §7. |
| **External APIs** | Same endpoints and payloads | No change to API contracts. |
| **Deployment** | app.yaml with runtime: python312 (or as per GAE docs) | env_variables / .env handling to be confirmed. |

---

## 5. Migration phases (high level)

1. **Environment and project setup**  
   New Python project (or subfolder), virtualenv, requirements.txt. Same env vars as today unless a decision is made to rename (see §7). GAE app.yaml duplicated/adapted for Python; **do not** remove Node app until Python version is validated.

2. **Core app and static**  
   Flask app entry point, mount static files, CORS middleware if kept (see §7). Serve existing static assets unchanged so that any existing frontend that points at the same paths still works.

3. **Datastore and external APIs**  
   Port `queries.js` and `apiCalls.js` to Python (same queries, same API calls). No schema or logic changes. Use a single module or package for “data” and “api” layers.

4. **Sync (update_database)**  
   Port `update_database.js` to Python. Same flow: read Sync_token from Datastore, call Todoist, Twitch OAuth for IGDB, OMDb, Open Library; same entity kinds and field names; same transaction and slide-number update. **When** it runs (startup vs. first request) is a decision; see §7.

5. **Auth and session**  
   Port auth routes: login (POST), logout, requireAuth-style guard. Preserve session keys (e.g. user, loggedin) and flash keys (success_msg, error_msg) so templates and redirects behave the same.

6. **Routes and responses**  
   Port all routes from series, movies, videogames, books, auth: same URL paths, same redirects, same render(data) and res.json(data) behavior. Return same status codes and response shapes for JSON endpoints so the existing frontend JS keeps working.

7. **Templates**  
   Convert Handlebars templates to Jinja2 (or resolve Handlebars-on-Python; see §7). Preserve layout structure, partials, and variable names passed from routes so the frontend looks and behaves the same.

8. **Validation and cutover**  
   Test locally and on a staging GAE service (or second app) that Python version matches Node version in behavior. Only after sign-off, switch production (or traffic) to the Python app; keep Node app deployable for rollback.

---

## 6. Per-area mapping and porting notes

- **Routes (series, movies, videogames, books):**  
  Same paths (e.g. `/series`, `/series/completed`, `/series/infoSeries`, `/series/any`, `/series/:id`, etc.). Same query usage (getCovers, getNumberEntities, getInfoEntity, getInfoEntitiesTag). Same template names and same JSON structure for API-like endpoints used by the carousel JS.

- **Auth:**  
  Same env vars for user and hashed secret; same bcrypt comparison; same session keys (`user`, `loggedin`); same redirect to `/auth/login` when not authenticated; same flash keys. **Question:** Keep same env var names (APPLICATION_LOGIN_USER, APPLICATION_LOGIN_SECRET) for compatibility with existing deployment and docs? See §7.

- **Session and flash:**  
  Match 15-minute expiry and in-memory semantics if that is the agreed production choice (see PRD-desired-changes). **Question:** Use Flask’s default client-side session or a server-side store? See §7.

- **CORS:**  
  Current code allows only `http://localhost:5000`. **Question:** Keep as-is, make configurable, or remove for production? See §7.

- **Sync on startup:**  
  Node calls `updateDatabase()` at top level after defining routes; it does not block `app.listen()`. **Question:** In Flask, run sync once at process start (e.g. before first request or in app factory), or trigger on first request? Same error handling and logging expectations to be confirmed.

- **Global state:**  
  Node uses `global.twitchcredentials` for Twitch token. In Python, use a module-level variable or a small cache with the same lifetime (e.g. per process, refreshed when needed) so IGDB calls keep working the same way.

- **Error handling:**  
  Port the global error handler: log and return 500 with a generic message when response not yet sent; avoid process crash. Same behavior as current Express handler.

- **Static and views configuration:**  
  Flask `static_folder` and `template_folder` (or equivalent) must point to the same physical layout so that existing references in templates (e.g. `/css/...`, `/js/...`) and template paths still resolve.

---

## 7. Questions and decisions to confirm (do not infer)

The following must be **answered or explicitly accepted** before or during implementation. No assumption should be made.

1. **Framework:** Is **Flask** the chosen Python web framework, or should another (e.g. FastAPI, Django) be used?

2. **Template engine:** Convert Handlebars to **Jinja2** (syntax differs slightly, e.g. `{{#if}}` → `{% if %}`, `{{{body}}}` → `{% block body %}`), or use a Python Handlebars-compatible engine to minimize template changes? Decision will affect effort and maintenance.

3. **Environment variable names:** Keep **APPLICATION_LOGIN_USER**, **APPLICATION_LOGIN_SECRET**, **SESSION_SECRET**, and all other current names for compatibility with existing deployment and documentation, or is renaming to a Python/convention-based set acceptable (with migration of env config)?

4. **APPLICATION_LOGIN_SECRET format:** Current value is a bcrypt hash (e.g. `$2b$10$...`). Should the Python app use the **exact same** env value and `bcrypt.checkpw(plain_password, stored_hash)` so that no re-hashing or re-deployment of secrets is required?

5. **Session store:** Keep **in-memory** session (Flask default or a simple in-memory store) to match current behavior and PRD-desired-changes, or is a different store (e.g. Datastore, Redis) required for the migration? If in-memory, confirm that client-side signed cookie vs. server-side session is acceptable.

6. **SYNC_TOKEN in .env:** Current code reads the Todoist sync token from **Datastore** (kind `Sync_token`), not from `.env`. Is **SYNC_TOKEN** in `.env` used elsewhere (e.g. manual override, docs, or legacy)? Should the Python app read it as fallback or ignore it?

7. **CORS headers:** Keep the current CORS middleware (allowing only `http://localhost:5000`) as-is, make origin configurable via env, or remove for production? Same behavior for preflight and credentials?

8. **Sync timing:** Should the Todoist/Datastore sync run **exactly once at process startup** (before the app serves requests), or is “on first request” acceptable? Any requirement for not blocking the first HTTP response?

9. **app.yaml and GAE:** Confirm the exact **runtime** value (e.g. `python312`) and that env_variables / secrets for Python runtime are documented; confirm whether the same GAE application ID and service name are used or a separate service for the Python version.

10. **Static folder location:** Keep files under **`public/`** and configure Flask to serve from that path, or move to Flask’s default **`static/`** and update any references (if any) in templates or docs?

11. **Future recommendation methods:** This migration does **not** include new recommendation logic that uses Datastore entity features. Confirm that such features will be added in a **later** phase and that the Python codebase should be structured so that new recommendation methods can be added without changing the migration scope.

---

## 8. Out of scope for this migration

- New recommendation methods or features that use Datastore entity fields (planned for a future phase).
- Changes to business logic, entity schema, or external API contracts.
- Frontend redesign or new UI features.
- Performance or responsiveness improvements that are not strictly necessary to achieve parity with the Node app (those are covered in PRD-responsiveness-improvements.md and PRD-image-normalization.md).

---

## 9. Success criteria

Migration is considered complete when:

- The Python application runs on Google App Engine (or agreed target) with the same runtime configuration (env, secrets).
- All current URLs respond with the same behavior (redirects, rendered pages, JSON payloads).
- Login, logout, session expiry, and flash messages behave as today.
- Carousels (Series, Movies, Videogames, Books) load the same data and display the same way.
- Sync runs as specified (e.g. once at startup) and updates Datastore and Sync_token as today.
- No intentional change to application logic or frontend behavior; any deviation is documented and agreed.

---

## 10. Document history

| Version | Date | Change |
|---------|------|--------|
| 1.0 | (current) | Initial strategy: pure Node→Python migration, Flask recommended, questions flagged. |
