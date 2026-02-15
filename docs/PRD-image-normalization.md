# PRD — Image normalization and standardization

**Status:** Agreed product/technical changes (not yet implemented)  
**Related:** [PRD (current configuration)](README.md) · [PRD — Responsiveness improvements](PRD-responsiveness-improvements.md)

This document describes the **agreed approach to normalize and standardize cover images** that come from external APIs (OMDb, IGDB, Open Library). Images today vary in resolution, aspect ratio, and file size; the goal is to serve consistent, display-appropriate assets for better performance and layout stability.

---

## 1. Current state

**Sources and behavior:**

- **OMDb (Series, Movies):** Poster URL is stored as returned by the API; dimensions and file size vary.
- **IGDB (Videogames):** Cover URL is derived with a fixed size suffix (e.g. `t_cover_big`); other sizes exist on IGDB’s CDN but are not standardized across the app.
- **Open Library (Books):** Cover and author images use the `-M` (medium) size in the URL; again, not aligned with a single app-wide standard.

**Problems:**

- Inconsistent dimensions and aspect ratios cause layout shift and uneven carousel/modal appearance.
- Large originals are often downloaded even when only a small carousel thumbnail or modal image is needed, wasting bandwidth and slowing load, especially on smaller or slower devices.
- No single rule for “which size to show” based on display context or viewport.

---

## 2. Desired behavior

- **Normalized images:** All cover (and, where applicable, author) images should be available in a **small set of standard sizes** defined by the application. Each size is chosen to be **suitable for how and where the image is displayed** (carousel thumbnail, modal detail, and optionally full-size), and for **typical display sizes** (mobile, tablet, desktop).
- **Consistent layout:** Same logical size tier implies same maximum dimensions (and ideally aspect ratio), so the UI looks uniform across categories and providers.
- **Efficiency:** The app should avoid repeatedly downloading and resizing the same image; normalization should happen once (or on first use) and then be reused.

---

## 3. Recommended approach: normalize at processing time and cache

**Recommendation:** Normalize **at processing (download) time**, not at render time.

| Approach | Pros | Cons |
|----------|-----|------|
| **CSS-only (render time)** | No backend changes. | Still downloads full-size files; no real normalization of dimensions or file size; wasteful on mobile. |
| **Resize on every request** | Always up to date. | High CPU and latency; duplicates work. |
| **Resize at processing time and cache** | One-time work per image; small, consistent files; can serve by display context. | Requires storage and a clear “when to process” strategy. |

**Preferred:** **Process and cache at the time we first need the image** (e.g. during sync when we store the entity, or on first request for that image). Generate 2–3 standardized variants per image, store them (e.g. Cloud Storage or CDN), and serve the appropriate variant based on **display context** (carousel vs modal) and **viewport/display size**. The frontend (or a backend endpoint that chooses the URL) requests the size tier that fits the use case and device.

This keeps rendering simple, reduces bandwidth and layout shift, and avoids resizing on every page load.

---

## 4. Standard sizes (display-suitable)

The exact pixel dimensions can be tuned when implementing; the following are a starting point so that the **standardized size is suitable depending on the display’s size and context**.

- **Thumb (carousel):**  
  - Used for carousel tiles.  
  - Target: **max width 320px** (or equivalent short edge). Suitable for mobile and for multiple slides visible on desktop.  
  - Format: e.g. JPEG/WebP; constrained to this width (height scaled to preserve aspect ratio, or crop to a fixed aspect if desired).

- **Medium (modal / detail):**  
  - Used for the “Info” modal and larger single-image views.  
  - Target: **max width 640px**. Suitable for typical modal size on tablet and desktop.  
  - Same format and aspect rules as above.

- **Large (optional):**  
  - For “full size” or high-DPI displays if the product later supports it.  
  - Target: **max width 1024px** (or 1280px). Only generate if needed to avoid extra storage.

**Responsive choice:**  
- The **tier** (thumb / medium / large) should be chosen according to **where** the image is used (carousel vs modal) and, if desired, **viewport width** (e.g. use thumb for carousel on all devices; use medium for modal on viewport &lt; 768px, large for larger). Implementation can be a backend endpoint that returns the right URL for a given entity + size tier, or the backend can expose multiple URLs and the frontend picks via `srcset` / media queries.

**Aspect ratio:**  
- Define one standard aspect (e.g. 2:3 for posters/covers). Resize to fit within the max width (and max height if needed), then crop or letterbox to that aspect so all carousel and modal slots are consistent. If different categories need different ratios, document them per category.

---

## 5. When to generate normalized assets

- **Option A — At sync time:** When an entity is created or updated in `update_database.js`, after resolving the source cover URL, the app fetches the image, generates thumb (and optionally medium/large), uploads to Cloud Storage (or equivalent), and stores the **app’s own URLs** (or keys) in Datastore (e.g. `Cover_thumb`, `Cover_medium`, or a single `Cover` that points to a thumb by default with optional variants).  
  - Pros: Ready on first page load; no extra latency for users.  
  - Cons: Sync takes longer and must handle fetch/resize failures; need storage and cleanup for deleted/updated entities.

- **Option B — On first request (lazy):** Store only the original URL (or keep current behavior). When the frontend or an API first requests an image for a given size tier, a backend endpoint (e.g. `GET /api/cover?id=...&size=thumb`) fetches the original, resizes, uploads to cache (e.g. Cloud Storage), and returns the cached URL (or redirects, or streams). Subsequent requests for the same entity + size serve from cache.  
  - Pros: No change to sync; only process images that are actually viewed.  
  - Cons: First view of an image can be slower; need cache invalidation when cover is updated (e.g. new sync).

Choose one strategy and document it in the implementation; both satisfy “normalize at processing time and cache.”

---

## 6. Implementation notes (for when coding)

- **Storage:** Use a bucket (e.g. Google Cloud Storage) with a clear naming scheme, e.g. `covers/{kind}/{id}_{size}.jpg`. Set cache headers for long-lived reuse.
- **Resize pipeline:** Use a Node image library (e.g. Sharp, Jimp) to fetch the source URL (or read from a temp buffer), resize to the target max width (and apply aspect rule), then upload. Handle errors (missing image, timeout, invalid format) without failing the whole sync or request; fall back to original URL or placeholder if needed.
- **Datastore:** Extend the entity model with fields for normalized URLs (e.g. `Cover_thumb`, `Cover_medium`) or a single `Cover` that points to the thumb, plus an optional `Cover_medium` / `Cover_large` for modal and large display. Keep `Cover_selected` behavior if custom covers are supported.
- **Frontend:** Carousel uses the thumb URL; modal uses medium (or large for high-DPI). Prefer `srcset` with the app’s normalized URLs so the browser can pick by display size where applicable.
- **Author images (Open Library):** Apply the same size tiers and processing if they are displayed in the UI; otherwise leave as-is until needed.
- **Backward compatibility:** During rollout, if normalized URLs are missing, fall back to the existing `Cover` (original URL) so old entities still show an image.

---

## 7. Summary

| Item | Decision |
|------|----------|
| **When to normalize** | At processing time (sync or on first request), not on every render or every request. |
| **Where to store** | Cached normalized assets in Cloud Storage (or equivalent); entity stores app URLs for each size tier. |
| **Sizes** | Thumb (e.g. 320w) for carousel; medium (e.g. 640w) for modal; optional large (e.g. 1024w) for large/high-DPI. |
| **Display suitability** | Size tier is chosen by use case (carousel vs modal) and, if desired, by viewport/display size (e.g. responsive `srcset` or backend logic). |
| **Aspect** | One standard aspect ratio (e.g. 2:3) for consistent layout; resize and crop/letterbox as needed. |
