# PRD — Secrets Manager migration & multi-user

**Status:** Future work (not yet implemented)  
**Related:** [PRD (current configuration)](README.md), [Desired changes](PRD-desired-changes.md)

This document describes two planned areas: migrating production secrets to Google Cloud Secret Manager, and optionally supporting more than one user.

---

## 1. Migration to Secret Manager

### 1.1 Current state

- **Local development:** Secrets (API keys, client ID/secret, session secret, login credentials) are read from a **`.env`** file, loaded by `dotenv` at app startup. `.env` is in `.gitignore` and in **`.gcloudignore`**, so it is never committed and never deployed.
- **Production (App Engine):** Because `.env` is excluded from deployment, the app on App Engine does not receive these variables unless they are provided by another mechanism. Today that would require putting values in **`app.yaml` under `env_variables`**, which would store secrets in the deployment descriptor and in version control if `app.yaml` is committed.

### 1.2 Desired state

- **Local:** Unchanged. Continue using `.env` for local development; keep `.env` in `.gcloudignore` so it is never uploaded on deploy.
- **Production:** Do **not** put secrets in `app.yaml`. Instead, at runtime on App Engine, the app loads secrets from **Google Cloud Secret Manager** and sets `process.env` (or equivalent) before starting the server and running sync. Secret names in Secret Manager should match the env var names used by the app (e.g. `IGDB_API_CLIENT_ID`, `IGDB_API_SECRET`, `TODOIST_API_KEY`, `OMDb_API_KEY`, `SESSION_SECRET`, `APPLICATION_LOGIN_USER`, `APPLICATION_LOGIN_SECRET`).

### 1.3 Benefits

- Secrets are not stored in `app.yaml` or in the deployment artifact.
- Secret Manager provides access control (IAM), audit logging, and versioning; only the App Engine service account (or roles you grant) can read the secrets.
- Rotation: update the secret in Secret Manager and redeploy or restart the app; no need to edit `app.yaml` or redeploy with new env vars.

### 1.4 Implementation notes (for when coding)

- Add a **config loader** (e.g. in `lib/loadSecrets.js`) that runs after `dotenv.config()`:
  - If not running on GCP (e.g. `GOOGLE_CLOUD_PROJECT` unset), do nothing (use `.env` only).
  - If running on GCP and any of the known secret names are missing from `process.env`, call the Secret Manager API to fetch those secrets and set `process.env` for each.
- Use **`@google-cloud/secret-manager`** and the **Secret Manager Secret Accessor** role for the App Engine default service account (`PROJECT_ID@appspot.gserviceaccount.com`).
- App startup must **await** the loader before creating the Express app and calling `updateDatabase()` so that env vars are set before any route or sync code runs.
- **Document** in this PRD or a short `docs/SECRETS.md`: how to create each secret in Secret Manager (name = env var name, value = current value from `.env`), and how to grant the App Engine service account the role `roles/secretmanager.secretAccessor` on the project or on each secret.

---

## 2. Potentially adding more than one user

### 2.1 Current state

- The app has **single-user auth**: one username and one password hash in environment variables (`APPLICATION_LOGIN_USER`, `APPLICATION_LOGIN_SECRET`). Login is implemented in `routes/auth.js` using `bcrypt.compare()` against that single hash. Session is in-memory (see main PRD and PRD-desired-changes §4).

### 2.2 Desired state (optional future work)

- Support **more than one user**: multiple named users, each with their own credentials, able to log in and use the app (view backlogs, use “Recommend me”, trigger sync if that feature is added, etc.). No requirement yet for per-user data isolation (e.g. separate backlogs per user); the backlog can remain global. The goal is only to allow multiple distinct logins.

### 2.3 Implementation notes (for when coding)

- **User store:** Replace the single `APPLICATION_LOGIN_USER` / `APPLICATION_LOGIN_SECRET` pair with a stored set of users. Options:
  - **Datastore:** New kind (e.g. `User` or `App_user`) with properties such as `username`, `password_hash` (bcrypt), and optionally `created_at`. On login, look up the user by username and compare password to the stored hash.
  - **Environment / config:** If the number of users is small and static, a list of `USERNAME:bcrypt_hash` entries in a single env var or in a config file (or in Secret Manager as one secret containing the list) could be parsed at startup; this is simpler but less flexible than Datastore.
- **Auth flow:** Keep session-based auth; after a successful login, store the username (or user id) in the session. Middleware that currently checks “is there a session user?” can remain; only the source of valid credentials changes (lookup in Datastore or parsed list instead of a single env var).
- **Secrets:** If credentials are in Datastore, the only “auth” secret might be a global secret used to sign or encrypt session data (if needed). User passwords would be stored as bcrypt hashes in Datastore, not in env vars. Alternatively, if the multi-user list is stored in Secret Manager, the app would fetch that secret at startup and parse it to build the in-memory user map.
- **Backward compatibility:** If desired, support a transition period where both the single env-based user and the new user store are checked (e.g. if no user found in Datastore, fall back to `APPLICATION_LOGIN_USER` / `APPLICATION_LOGIN_SECRET`). Once migrated, remove the env-based single user.

### 2.4 Out of scope (for this PRD)

- Per-user backlogs or per-user Todoist linkage (every user seeing only their own items).
- OAuth or third-party identity (e.g. “Login with Google”).
- User self-registration or password reset flows (unless explicitly added later).

---

## 3. Document history

| Version | Date     | Changes                                      |
|---------|----------|----------------------------------------------|
| 1.0     | Feb 2026 | Initial PRD: Secret Manager migration (§1), multi-user (§2). |
