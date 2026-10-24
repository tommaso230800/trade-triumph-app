# Architecture rules
- Use the canonical metrics engine for economic inclusion, order dates and saved revenue; audits must not alter commercial records.
- Share paginated read-only order loading between the data panel and order audit so comparisons cover the complete archive.
- Keep document comparison local and explicit: read PDF text with PDF.js and require the user to enter declared totals and matching period, preventing invented extracted values or accidental order imports.
- Keep global internal search in MainLayout and use authenticated database reads, so every CRM page has the same search access without bypassing permissions.
- Derive installable icons and favicon from the existing agency logo; keep home-screen support manifest-only without adding offline caching.
- Keep sidebar color pairs in global CSS, not theme-specific background overrides, to preserve readable contrast in every theme.