# Salah Rings — landing page

A static site: no build step, no framework, no tracking.

- `index.html`, `style.css`, `main.js` — the page. `main.js` drives the 3D scenes with three.js (vendored in `vendor/`).
- `assets/` — app screenshots, the widget reel, the cover art, the typeface.

## Run it locally
It uses ES modules, so open it through a web server rather than double-clicking the file:

    cd site && python3 -m http.server 5180     # then visit http://localhost:5180

## Put it on your domain
Upload the whole `site/` folder to any static host (Cloudflare Pages, Netlify, Vercel, GitHub Pages, Firebase Hosting) and point your domain at it.
`com.salahrings.app` is not a registered domain yet — buy or connect the one you want first, then add it in the host's dashboard.

## Notes
- The Google Play button links to `https://play.google.com/store/apps/details?id=com.salahrings.app`.
- Photos on the page are real captures of the app. Replace them in `assets/` to refresh (keep the file names, 720 px wide).
- Google Play requires a privacy-policy URL for the listing: host that page here too (e.g. `privacy.html`) and link it in the footer.
- The three.js scenes pause when you scroll past them, and the page respects "reduce motion".
