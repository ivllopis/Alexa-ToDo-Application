# Product Requirements Document (PRD)
## Media Backlog & Recommender Application

**Version:** 1.0  
**Last updated:** February 2025  
**Scope:** This PRD describes the **current configuration and behavior** of the application as implemented in the repository. For agreed future changes (Refresh button, configurable Todoist IDs, dynamic tags, etc.), see **[PRD — Desired changes](PRD-desired-changes.md)**.

---

## 1. Overview

### 1.1 Purpose

This document describes the product requirements for a **media backlog and recommender application** that:

- Syncs backlog items from a **Todoist** account (movies, series, videogames, books) written in natural language.
- Enriches each item with metadata (cover, description, genre, etc.) via external APIs.
- Stores enriched data in **Google Cloud Datastore** by category.
- Presents media in a **web frontend** as carousels, with filtering by tags and a "recommend me something" feature.

### 1.2 Summary

| Aspect | Description |
|--------|-------------|
| **Deployment** | Google App Engine (Node.js 22, standard environment) |
| **Data source** | Todoist (API v1 Sync endpoint), via project folders per category |
| **Storage** | Google Cloud Datastore |
| **Enrichment** | OMDb (movies/series), IGDB + Twitch OAuth (videogames), Open Library (books) |
| **Frontend** | Express + Handlebars, Bootstrap, Slick carousels, session-based auth |

---

## 2. Goals & Non-Goals

### 2.1 Goals

- **Single source of truth:** Todoist is the canonical backlog; the app reflects it.
- **Rich metadata:** Each media item has cover, synopsis/description, and category-specific fields (e.g. pages for books, playtime for videogames).
- **Consistent state:** Sync token is updated only after a successful Datastore transaction so no data or sync progress is lost.
- **Usability:** Browse by category (Series, Movies, Videogames, Books), filter by Todoist tags, and get random recommendations (optionally by tag).
- **Completion tracking:** Consumed items are marked complete and completion date is stored; some types (e.g. videogames) support extra fields like first playthrough time.

### 2.2 Non-Goals (current scope)

- Editing media metadata from the app (e.g. custom cover, playtime) is stored but not yet exposed via UI (future: "triggered by the user").
- Search in the frontend is present in the nav but not implemented.
- Sync is triggered **on application startup only**; no scheduled/cron or user-triggered sync is implemented yet.
- Alexa integration is mentioned in package description but is out of scope for this PRD.

---

## 3. User Personas & Use Cases

### 3.1 Primary user

- Maintains a Todoist account with projects/folders for **Series**, **Movies**, **Videogames** (e.g. PC, PS4), and **Books**.
- Writes task names in natural language (e.g. "Show Name (2020)", "Book Title (Author)").
- Uses Todoist labels/tags to classify items (e.g. "anime", "souls-like", "documentary").
- Wants to see covers and details in one place and get random recommendations from the backlog.

### 3.2 Use cases

1. **View backlog:** Open the app, log in, and see carousels of series, movies, videogames (by platform), and books (backlog vs completed).
2. **Filter by tag:** Use tag buttons above the carousel to show only items with a given Todoist tag.
3. **Get a recommendation:** Click "Recommend me" to get a random item (optionally respecting the active tag filter) and jump the carousel to it.
4. **View details:** Click "Info" to see full metadata (synopsis, year, actors, tags, completion date, etc.) in a modal.
5. **Track completion:** Complete items in Todoist; on next app sync, items are marked completed and completion date is stored.

---

## 4. Data Model

### 4.1 Todoist mapping

Category-to-project mapping is configured per deployment (e.g. via environment variables). The app maps:

- **Series** → one Todoist project id
- **Movies** → one Todoist project id
- **Videogames (PC)** → one Todoist project id
- **Videogames (PS4)** → one Todoist project id
- **Books** → one Todoist project id

**Do not store real project IDs in documentation or version control.** Use `.env` or deployment config; see §8.1 and `docs/PRD-desired-changes.md` for configurable IDs.

Entity keys in Datastore use the **Todoist item id** (`parseInt(item.id)`) so that one-to-one mapping is preserved across syncs.

### 4.2 Datastore kinds and properties

#### Sync_token

| Property | Type   | Description                    |
|----------|--------|--------------------------------|
| Token    | string | Todoist sync token for incremental sync |

- Key: `Sync_token` / `Sync_token` (single entity).

#### Serie / Movie (shared shape)

| Property      | Type     | Description |
|---------------|----------|-------------|
| Name          | string   | Title |
| Synopsis      | string   | Plot/description (excluded from indexes) |
| Cover         | string   | URL to poster/cover |
| Cover_selected| string   | Optional user-selected cover URL (preserved on re-sync) |
| Writers       | string   | (excluded from indexes) |
| Actors        | string   | (excluded from indexes) |
| Year          | string   | Release year |
| Completed     | boolean  | Consumed or not |
| Date_completion | string | When completed (from Todoist) |
| Slide_number  | int      | Order in carousel |
| Tags          | string[] | Todoist labels |
| Linked_video  | string   | Optional embed URL (preserved on re-sync) |

#### Videogame

- Same as above where applicable, plus:
- **Platform:** `PC` or `PS4` (determined by Todoist project).
- **Storyline / Summary:** long text (excluded from indexes).
- **Genres:** array of genre names (from IGDB).
- **Expected_time_to_beat_h:** optional (preserved on re-sync).
- **First_playthrough_h:** optional; time spent by the user to complete (preserved on re-sync).

#### Book

| Property        | Type     | Description |
|-----------------|----------|-------------|
| Name            | string   | Title |
| Authors         | string/array | Author(s) |
| Synopsis        | string   | Description (excluded from indexes) |
| Publishing_year | number   | First publish year |
| Rating          | number   | Open Library rating |
| Number_of_pages | number   | Median page count |
| Cover           | string   | URL |
| Author_image    | string   | Optional author image URL |
| Completed, Date_completion, Slide_number, Tags, Cover_selected, Linked_video | As above |

#### Not_found

- Items that could not be matched to any external API (OMDb, IGDB, Open Library) are stored with kind `Not_found` and keyed by Todoist item id. When a later sync finds metadata (e.g. after title fix), the entity is deleted from `Not_found` and stored in the correct kind.

### 4.3 Indexes

- Defined in `index.yaml` for queries that filter by `Completed`, `Platform` (Videogames), `Tags`, `Name`, `Slide_number`, and `Cover` where needed.
- Long text fields (e.g. Storyline, Summary, Synopsis, Writers, Actors) are in `excludefromindexes` to avoid index size limits.

---

## 5. External Integrations

### 5.1 Todoist

- **API:** Todoist API v1 — Sync endpoint (`https://api.todoist.com/api/v1/sync`). Reference: [developer.todoist.com/api/v1](https://developer.todoist.com/api/v1/).
- **Request format:** Sync requests must be sent as **`application/x-www-form-urlencoded`** (not JSON). Implemented in `routes/apiCalls.js` via `URLSearchParams` and `Content-Type: application/x-www-form-urlencoded`.
- **Auth:** Bearer token (`TODOIST_API_KEY`).
- **Behavior:**  
  - First run: `sync_token: '*'` for full sync.  
  - Subsequent runs: stored `Sync_token` for incremental sync.  
- **Resource:** `resource_types: '["items"]'` (JSON-encoded array in the form body).
- **Data used:** `item.id`, `item.project_id`, `item.content`, `item.checked`, `item.completed_at`, `item.labels` (tags), `item.is_deleted`.

### 5.2 OMDb (Movies & Series)

- **Purpose:** Title, year, plot, poster, writers, actors.
- **Input:** Task content; optional `(YYYY)` in name for year.
- **Auth:** `OMDb_API_KEY` query param.

### 5.3 IGDB + Twitch (Videogames)

- **Purpose:** Game name, storyline/summary, cover, genres.
- **Auth:** Twitch OAuth2 client credentials (`IGDB_API_CLIENT_ID`, `IGDB_API_SECRET`); token stored in `global.twitchcredentials` for the sync run.
- **Search strategy:** "exact" → "general" (version_parent = null) → "permissive" to improve match quality.

### 5.4 Open Library (Books)

- **Purpose:** Title, author(s), description, cover, first publish year, ratings, number of pages, author image.
- **Input:** Task content; optional `(Author)` in name.
- **Endpoints:** Search API + work/author details for description.

---

## 6. Sync Flow (update_database)

### 6.1 Trigger

- **Current:** Runs once at application startup (`updateDatabase()` in `app.js`).
- **Planned (per code comment):** "In the future this will be optionally triggered by the user too."

### 6.2 Steps (high level)

1. **Read sync token:** Query Datastore for `Sync_token` entity. If none, use `'*'`; otherwise use stored token.
2. **Get Twitch token:** For IGDB calls during the run.
3. **Start Datastore transaction.**
4. **Call Todoist Sync API** with the chosen sync token.
5. **For each item in `data.items`:**
   - **If `is_deleted`:** Resolve kind by trying Videogame → Serie → Movie → Book → Not_found by id; add entity key to `batchDeleteEntities`.
   - **Else, by `project_id`:**
     - **Series/Movies:** Key = Serie or Movie with `item.id`. If `item.checked`, update entity to `Completed = true`, `Date_completion = item.completed_at` and add to `batchStoreEntities`; else fetch OMDb data, merge tags and preserved fields (Tags, Cover_selected, Date_completion, Expected_time_to_beat_h, First_playthrough_h, Linked_video), handle Not_found and re-store.
     - **Videogames (PC/PS4):** Same pattern; key = Videogame with `item.id`; fetch from IGDB + cover + genres; preserve same fields on update.
     - **Books:** Key = Book with `item.id`; fetch from Open Library; preserve same fields on update.
6. **Apply transaction:** `transaction.delete(batchDeleteEntities)`, `transaction.save(batchStoreEntities)`, save new sync token entity, then `transaction.commit()`.
7. **Post-commit:** Call `updateSlideNumbersDatabase()` to recalculate `Slide_number` for all kinds (and platforms for Videogames) so carousel order is consistent.
8. **On any error:** `transaction.rollback()`; sync token is not updated, so next run will retry the same delta.

### 6.3 Consistency guarantees

- Sync token is updated **only inside the same transaction** that saves all new/updated/deleted entities. If commit fails, token is not updated and Todoist will return the same changes again on the next sync.

---

## 7. Frontend & Application Behavior

### 7.1 Stack

- **Server:** Express (Node.js).
- **Templating:** Handlebars (`.hbs`), with partials for carousel, footer, and category-specific scripts.
- **UI:** Bootstrap 4, Slick carousel.
- **Auth:** Session-based; `express-session` (in-memory; 15 min cookie), `bcrypt` compare for password. Login uses `APPLICATION_LOGIN_USER` and `APPLICATION_LOGIN_SECRET` (stored value must be bcrypt hash).

### 7.2 Routes (summary)

- **Auth:** `/auth`, `/auth/login`, `/auth/logout` (GET/POST as needed).
- **Category pages (auth required):**  
  `/series`, `/series/completed`, `/movies`, `/movies/completed`, `/books`, `/books/completed`, `/videogames`, `/videogames/ps4`, `/videogames/pc`, `/videogames/ps4_completed`, `/videogames/pc_completed`.
- **Data APIs (used by frontend):**
  - **Covers / list for carousel:** e.g. `GET /series/infoSeries`, `GET /series/completed/infoSeries`, same pattern for movies, books, and videogames (with platform).
  - **Single item by slide index:** e.g. `GET /series/:id`, `GET /videogames/pc/:id`.
  - **Random recommendation:** e.g. `GET /series/any`, `GET /series/any/:filtertag`, same for completed and for other categories/platforms.

### 7.3 Carousel and tags

- Each category view loads cover list from the corresponding `info*` endpoint and renders slides with `data-slide-number` and tag names as CSS classes.
- Tag buttons (e.g. "Animes", "Souls-like") filter slides client-side by showing/hiding elements with matching class; "Clear filters" resets.
- "Recommend me" uses current filter: if a tag is selected, calls `.../any/:filtertag`; otherwise `.../any`. Response includes `index` and `data`; carousel jumps to `index` and modal shows `data`.
- "Info" uses the current center slide's `data-slide-number` to fetch full entity and display it in the modal (cover, synopsis, year, tags, completion date, videogame-specific fields, linked video, etc.).

### 7.4 Navigation and defaults

- `/` redirects to `/series`.
- Nav shows Series, Movies, Videogames, Books and Log out when logged in; otherwise Log in. Search is present but not wired.

---

## 8. Configuration & Environment

### 8.1 Environment variables

| Variable | Purpose |
|----------|---------|
| `TODOIST_API_KEY` | Todoist Sync API |
| `OMDb_API_KEY` | OMDb |
| `IGDB_API_CLIENT_ID` | IGDB / Twitch |
| `IGDB_API_SECRET` | Twitch OAuth for IGDB |
| `SESSION_SECRET` | Express session signing |
| `APPLICATION_LOGIN_USER` | Login username |
| `APPLICATION_LOGIN_SECRET` | Bcrypt hash of login password |
| `PORT` | Server port (default 5000) |

Sample provided in `.env_sample` (key placeholders only; no real secrets).

### 8.2 Deployment

- **App Engine:** `app.yaml` specifies `runtime: nodejs22`, `env: standard`. No cron or task queue is configured; sync runs only on process start.

---

## 9. Out of Scope / Future Work (from codebase)

- **User-triggered or scheduled sync** (comment in routes and update_database).
- **Refactor:** Map `item.project_id` to kind + fetch method instead of hardcoded ids (TODO in update_database).
- **Two-way tags:** "Update the tags in Todoist" when keeping existing Tags if stored entity has more than incoming (TODO).
- **Semaphore / user notification** when database has been updated (TODO).
- **Search** in the navbar (UI only).
- **Editing** Cover_selected, First_playthrough_h, Expected_time_to_beat_h, Linked_video from the app (data model supports it; no UI yet).

---

## 10. Open Questions for Product / Dev (current)

- **CORS:** Origin is set per environment (e.g. local dev vs production). Do not hardcode production URLs in docs or code.
- Other previously open items (sync trigger, Todoist IDs, tags, auth, APPLICATION_LOGIN_SECRET) are addressed in **[PRD — Desired changes](PRD-desired-changes.md)**.

---

## 11. Document history

| Version | Date       | Changes |
|---------|------------|---------|
| 1.0     | Feb 2025   | Initial PRD from repository review. |
| 1.1     | Feb 2026   | Todoist: document API v1 Sync endpoint, correct URL, and form-urlencoded request format (fix for 400 Bad Request). |
