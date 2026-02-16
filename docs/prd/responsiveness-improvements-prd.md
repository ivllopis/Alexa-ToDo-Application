# PRD — Responsiveness improvements

**Status:** Agreed product/UX changes (not yet implemented)  
**Related:** [PRD (current configuration)](../README.md) · [PRD — Desired changes](desired-changes-prd.md)

This document describes the **agreed responsiveness improvements** for the Media Backlog & Recommender web frontend. The goal is to make the app feel faster and work correctly in both local and production environments.

---

## 1. Relative URLs for API calls

**Current:** Carousel and API logic in the frontend use a **hardcoded absolute base URL** (e.g. `https://recommender-279710.ey.r.appspot.com`). All requests from the browser are sent to that host.

**Problems:**

- When running locally, the browser still calls the production URL, so local development does not hit the local server and can introduce CORS or latency.
- Tied to a single deployment; other environments or custom domains would require template changes.

**Desired:**

- Use **relative URLs** for all in-app API calls (e.g. `series_dir = '/series'`, `series_dir = '/series/completed'` for completed series).
- The same templates and scripts then work on localhost, staging, and production without code changes.

**Implementation notes (for when coding):**

- In each carousel footer partial (`footer_carousel_series.hbs`, `footer_carousel_movies.hbs`, `footer_carousel_videogames.hbs`, `footer_carousel_books.hbs`), remove the `home_url` (or equivalent) and set the category base from the path only, e.g.:
  - Series: `const series_dir = '{{#if series_completed}}/series/completed{{else}}/series{{/if}}';`
  - Movies, videogames, and books: same pattern for their routes.
- All `httpGetAsync` (or equivalent) calls should use these relative paths (e.g. `${series_dir}/infoSeries`, `${series_dir}/any`). No full origin in the URL.

---

## 2. Pagination (12 slides) and lazy-loading of images

**Current:** Each category page (Series, Movies, Videogames, Books) loads the **full catalog** in one request (`getCovers()` with no limit). The response is rendered as one carousel with every item, and every cover image starts loading immediately.

**Problems:**

- Large Datastore payload and large JSON response slow the first paint.
- Many DOM nodes and many simultaneous image requests slow rendering and make the page feel heavy.

**Desired:**

- **Pagination:** Serve and display carousel data in **pages of 12 slides** per view. The user can move to the next (and optionally previous) page of results within the same category/view (e.g. "Series backlog", "Movies completed").
- **Lazy-loading of images:** Load cover images only when needed (e.g. when the slide is visible or near the viewport). Do not set `src` for every slide on initial load; set it when the slide is in view (or use a small buffer, e.g. current ±2 slides). Optionally use the `loading="lazy"` attribute where it fits.

**Implementation notes (for when coding):**

- **Backend:** Add support for paginated carousel data:
  - Extend or add an endpoint that accepts a page index (and optionally page size; default 12). Use `getCovers()` (or equivalent) with `.limit(12)` and `.offset((page - 1) * 12)` (or cursor-based pagination if preferred). Return also total count or "has next page" so the frontend can show next/previous controls.
  - Ensure ordering is consistent (e.g. by `Slide_number` or `Name` as today).
- **Frontend:** 
  - Request only the first page (12 items) on initial load. When the user clicks "Next page" (and optionally "Previous page"), request the corresponding page and replace or append slides and re-init Slick if needed.
  - For images: render slide placeholders without `src` (or with a data attribute holding the URL). When a slide becomes the current (or adjacent) slide, set `img.src` to the real cover URL. Consider `loading="lazy"` for off-screen images if the browser supports it and it doesn't conflict with Slick's DOM reuse.

---

## 3. Defer script tags in the footer

**Current:** Scripts in the layout/footer (jQuery, Popper, Bootstrap, Slick, and inline carousel logic) are loaded **without `defer` (or `async`)**. The browser blocks parsing until each script is downloaded and executed.

**Problem:** Slower perceived load and time-to-interactive; the page cannot render and become interactive until these scripts have run.

**Desired:**

- Add **`defer`** to all external script tags in the footer (and any other footer scripts that are not required to run before DOM ready). Inline scripts that depend on those libraries will run after the deferred scripts load, preserving execution order.

**Implementation notes (for when coding):**

- In `views/partials/footer.hbs` (and anywhere else that includes script tags), add the `defer` attribute to:
  - jQuery
  - Popper.js
  - Bootstrap JS
  - Slick (`slick.min.js`)
- Ensure inline scripts that use `$(document).ready` or call Slick still run after jQuery and Slick are loaded; `defer` preserves order, so this should hold. Test that the carousel, tag filters, "Recommend me", and "Info" modal all work after the change.

---

## 4. Cold start (confirmed for now)

**Current:** The app is deployed on **Google App Engine (standard environment)**. After a period of inactivity, the first request can take several seconds while a new instance starts (cold start). Subsequent requests on that instance are much faster.

**Desired (for now):**

- **No implementation change.** Cold start is accepted as the current behavior.
- The existing loading state (e.g. spinner in the carousel area) should remain so that users see feedback while the first response is pending.
- If desired in the future, options can be revisited (e.g. minimum instances set to 1 to keep one instance warm, at higher cost).

**Documentation:** This PRD records that cold start is a known cause of slow first load and is confirmed as acceptable for the current scope.
