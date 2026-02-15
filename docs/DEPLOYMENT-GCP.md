# Google Cloud / App Engine deployment checklist

This doc helps avoid 503s and auth failures on Google App Engine (e.g. `POST /auth/login`).

---

## 1. Environment variables are not loaded from `.env` in production

- **Locally:** `dotenv` loads variables from a `.env` file.
- **On App Engine:** The deployed app does **not** use your local `.env` (it is excluded via `.gcloudignore`). The only way the app gets variables is:
  - **`app.yaml` → `env_variables`**, or
  - **Google Cloud Console** (App Engine → Settings → Environment variables), or
  - **Secret Manager** (with code changes to read secrets at runtime).

If you never set `SESSION_SECRET`, `APPLICATION_LOGIN_USER`, or `APPLICATION_LOGIN_SECRET` for the App Engine service, they will be **undefined** in production. That leads to:

- `express-session` throwing (e.g. "secret required") when handling login.
- `bcrypt.compare` throwing if the hash is undefined, or the app returning "Login is not configured" (after the recent auth hardening).

**Fix:** Define all required environment variables for the App Engine service.

---

## 2. Where to set environment variables

### Option A – `app.yaml` (simple, but secrets in config)

Uncomment the `env_variables` block in `app.yaml` and set real values. **Do not commit real secrets to git.** Use a private branch, or use Option B for secrets.

```yaml
env_variables:
  SESSION_SECRET: "a-long-random-string"
  APPLICATION_LOGIN_USER: "your-username"
  APPLICATION_LOGIN_SECRET: "$2b$10$..."   # bcrypt hash only
  TODOIST_API_KEY: "..."
  OMDb_API_KEY: "..."
  IGDB_API_CLIENT_ID: "..."
  IGDB_API_SECRET: "..."
```

Then deploy: `gcloud app deploy`.

### Option B – Cloud Console (no secrets in repo)

1. Open [Google Cloud Console](https://console.cloud.google.com/) → your project.
2. **App Engine** → **Settings** (or **Configuration** for the service).
3. Add **Environment variables** for the same keys as above.
4. Redeploy the app so new instances pick them up.

### Option C – Secret Manager (recommended for secrets)

Store secrets in Secret Manager and either:

- Inject them at deploy time (e.g. Cloud Build reads secrets and writes `env_variables` or a generated config), or
- Have the Node app fetch them at startup (requires code changes).

---

## 3. Required variables for auth and stability

| Variable | Required for | Notes |
|----------|----------------|-------|
| `SESSION_SECRET` | Session cookie signing | Must be set or `express-session` can throw and cause 503. |
| `APPLICATION_LOGIN_USER` | Login | Username for the app. |
| `APPLICATION_LOGIN_SECRET` | Login | **Must be a bcrypt hash** of the password (e.g. `node -e "console.log(require('bcrypt').hashSync('your-password', 10))"`). Not the plain password. |

Other variables (Todoist, OMDb, IGDB) are needed for sync and enrichment; missing ones can cause sync or API errors but not necessarily the login 503.

---

## 4. Credentials and permissions

- **Datastore:** App Engine’s default service account has access to the project’s Datastore. No extra config if the app runs in the same project.
- **No extra “auth” flags** are required for the app’s own login; the 503 is from missing env vars or uncaught errors, not from IAM or OAuth for your Express app.
- If you use **Secret Manager**, the App Engine default service account needs `roles/secretmanager.secretAccessor` (or equivalent) on the relevant secrets.

---

## 5. Quick checks after deploy

1. **Confirm env vars for the running version**  
   `gcloud app versions describe VERSION_ID --service=default` and check `env_variables` (if set in `app.yaml`).

2. **Logs**  
   In Cloud Console → Logging, filter by resource type “App Engine” and look for:
   - `"Auth config missing: APPLICATION_LOGIN_USER or APPLICATION_LOGIN_SECRET not set"` → set those env vars.
   - `"Login bcrypt error"` or `"secret required"` → fix `APPLICATION_LOGIN_SECRET` (must be bcrypt hash) or `SESSION_SECRET`.

3. **Retry login**  
   After setting variables, redeploy or wait for new instances; then try `POST /auth/login` again.

---

## 6. Summary

| Issue | Cause | Fix |
|-------|--------|-----|
| 503 on `/auth/login` | Missing `SESSION_SECRET` or auth env vars; uncaught errors | Set `SESSION_SECRET`, `APPLICATION_LOGIN_USER`, `APPLICATION_LOGIN_SECRET` in `env_variables` or Console. |
| “Login is not configured” | `APPLICATION_LOGIN_USER` or `APPLICATION_LOGIN_SECRET` not set in GCP | Add them for the App Engine service. |
| “Username and password not correct” | Wrong credentials or `APPLICATION_LOGIN_SECRET` is plain password | Use bcrypt hash for `APPLICATION_LOGIN_SECRET`. |
| .env not used in production | `.env` is not deployed (and should not be) | Use `app.yaml` `env_variables` or Cloud Console / Secret Manager. |
