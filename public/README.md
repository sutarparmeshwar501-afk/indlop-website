# INDlop

A multi-page static marketing site for INDlop, a social platform in development for people, communities, and creators.

## Run locally

Open `index.html` directly, or serve this directory with any static HTTP server:

```sh
python3 -m http.server 8080
```

The site uses HTML5, CSS3, and vanilla JavaScript. It has no build step or framework and is ready to deploy as a static site on Vercel.

## Project structure

- `index.html` — homepage
- `about/index.html`, `features/index.html`, `why-indlop/index.html`, `privacy/index.html`, `community/index.html`, `contact/index.html`, `join/index.html`, `faq/index.html` — existing inner-page routes
- `leadership/index.html`, `leadership/leadership.css` — separate founder and CEO profiles
- `style.css` — shared type, navigation, layout, responsive rules, and monochrome editorial system
- `pages.css` — shared inner-page layouts
- `script.js` — responsive navigation, reduced-motion-aware reveals, FAQ accordions, active navigation, and local-only form demo status
- `sitemap.xml`, `robots.txt` — existing search-indexing files
- `ads.txt` — existing AdSense publisher file
- `assets/icons/`, `favicon.ico` — site icon assets

All eight pre-existing inner routes remain unchanged. Leadership is a separate route, and relative asset and navigation paths support direct loading at each route.

## Forms and advertising

The contact and waitlist forms are demonstrations only. They do not send or store submitted details and do not add anyone to a waitlist. Connect a privacy-reviewed backend before collecting submissions and update the copy to match the actual behavior.

Google AdSense is included in the existing site markup; the About and Join pages contain the existing ad units. Review the privacy notice, consent obligations, and publisher configuration against the deployed implementation before launch. The privacy page is draft copy and should receive product and legal review.

## Design and accessibility

The redesign uses a white/black/grey palette, restrained typography, thin separators, open editorial layouts, subtle transitions, keyboard focus styles, a skip link, responsive navigation, and `prefers-reduced-motion` support. Existing route URLs, canonical metadata, sitemap, robots file, favicon assets, AdSense scripts, and ad slots are retained.
