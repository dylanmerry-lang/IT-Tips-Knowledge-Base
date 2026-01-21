## v0.1 - 2026-01-20

### Highlights
- Migrated storage from JSON to SQLite with schema for tips, attachments, comments, and audit logs.
- Added file attachments with thumbnail generation and static serving.
- Implemented Cloudflare Zero Trust user identification.
- Added audit logging with settings panel, filters, and stats.
- Added threaded comments tied to authenticated user identity.
- Added dark/light mode and major UI refresh with Milligram styling.
- Introduced carousel-based tip navigation with arrow and wheel scrolling.
- Added new tip fields (location, additional details) and updated categories.

### Notable UI/UX Updates
- Rebranded header and typography to Conquest Solutions.
- Modernized tip cards, modal layouts, and action buttons.
- Introduced settings modal cleanup and improved dark mode readability.

### Developer Notes
- Removed `public/js/carousel.js` in favor of native scroll-based carousel controls.
- Updated documentation and integration plan to reflect completed phases.
