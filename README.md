# Krankenfahrdienst Köln

This German-language site is pre-rendered as static HTML. Node.js runs the build and local preview. The hosting environment needs no Node.js runtime.

```powershell
node build.mjs --preview
node serve.mjs --preview
```

Open http://127.0.0.1:4173/ to review all 19 pages, including 12 service pages and the Köln coverage page. Use `node build.mjs` to generate the release candidate in `dist/`. Serve it locally with `node serve.mjs`. The specialist service pages are excluded from the release candidate until their slugs are added to `confirmedServices` in `site.config.mjs`. Both builds currently use `noindex,nofollow`.

The header language chooser uses same-origin dictionaries in `src/assets/translations/`. German is the source language. When changing German copy, update the corresponding dictionary keys, since missing translations fall back to the original German. Review the machine-translated copy before public launch.

## Static hosting package

For Hostinger's Web App Git import, choose branch `main`, framework preset **Other**, Node.js 22 or newer, and package manager **npm**. Use the repository root, build command `npm run build`, and output directory `dist`. Leave the entry file empty because Hostinger serves the generated static files.

The ZIP contains the contents of `dist/`, with `index.html` and `assets/` at its root. Extract it into the document root of the selected site, commonly `public_html` on shared hosting. The directory routes use their own `index.html` files. The site expects to be served at the domain root over HTTPS.

To refresh the package after changing settings, run:

```powershell
node build.mjs
Compress-Archive -Path dist/* -DestinationPath Krankenfahrdienst-Koeln-upload.zip -Force
```

## Launch decisions

- **Domain does not match Köln/Krankenfahrdienst branding and should be confirmed.** Set the final origin in `siteUrl` in `site.config.mjs`. This controls canonical URLs, social metadata, the sitemap, and structured data.
- Confirm `info@luxline-drive.de`. It uses the related Luxline Drive brand and is the enquiry recipient.
- Confirm that the site phone number accepts WhatsApp messages, then set `whatsappConfirmed` to `true` for the release build. The local review build shows the WhatsApp contact button for inspection.
- Confirm specialist service availability, recurring rides, and discharge journeys before enabling relevant pages. The supplied brief ends mid-sentence in the therapy section, so the therapy draft uses general appointment language.
- Confirm the legal operator and complete the Impressum and Datenschutz pages for the actual hosting and email setup. The current pages are review drafts.
- Replace the generated images with client-approved photography if the site should show the actual fleet. The Impressum identifies the current images as AI-generated examples.
- Confirm that the footer credit points to the intended Techosoft company. The currently configured link is Techosoft Australia.
- Confirm that the enquiry flow is suitable. It assembles a message locally and opens the visitor's default email app. Telephone and direct email links cover browsers with no configured email app.
- After approval, set `indexRelease` to `true`, rebuild, publish the contents of `dist/` at the confirmed host's document root, then verify HTTPS, routes, canonical URLs, and real-device enquiry behaviour.
