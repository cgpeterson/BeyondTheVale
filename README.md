# beyondthevale.net

Cody Peterson's consulting site. Plain HTML/CSS/JS served by GitHub Pages from the repo root.

## Editing pages

The root `*.html` files are **generated**. Edit the source and rebuild:

- `src/pages/**` — one file per page: a JSON front-matter comment (`title`, `description`, `nav`, `priority`, optional `breadcrumbs`, `jsonld`, `ogImageAlt`, `noindex`) followed by the page's `<main>` only.
- `src/partials/` — shared nav, footer, and the `ProfessionalService` JSON-LD.
- `src/layout.html` — the `<html>` shell.
- `src/redirects.json` — old path → new URL; each becomes a noindex meta-refresh stub.
- Standalone apps (`projects/simulations/*`, `projects/games/hollow-duel`) are hand-written and listed in `scripts/site.mjs`.

```
npm run build      # stamp src/ into the root and regenerate sitemap.xml
npm test           # fails if the committed output is stale, then runs unit + e2e
npm run serve      # http://localhost:8080
```

Commit source and output together. After deploying, `npm run notify:indexnow` pings search engines.
