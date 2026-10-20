# Tiffin Break (টিফিন ব্রেক)

A browser game that recreates the pen-and-paper games Bangladeshi students played on the school bench in the early 2010s. Rearrange the bench, open the notebook with your name on it, play a match against the computer, and share the result as a PNG. Bengali text throughout. Vite, React 19, TypeScript and SVG.

- **খাতায় ক্রিকেট** (Spin Cricket): spin the pen on a wheel, bat and bowl a short match.
- **খাতায় ফুটবল** (Pass Football): place players, then sling passes and shots across the pitch.
- **ডট বক্স** (Dot Box): take turns drawing lines between dots and close boxes.

## Run

```
npm i
npm run dev      # dev server
npm test         # unit tests
npm run build    # type-check and production build into dist/tiffin-break/
```

## Deploy

Served at https://arifhosan.me/tiffin-break/ as a Cloudflare Worker with static assets (`wrangler.jsonc`):

```
npx wrangler deploy
```

This builds, uploads `dist/`, and attaches the route `arifhosan.me/tiffin-break*` in the `arifhosan.me` zone. The rest of the domain stays with the portfolio Worker.

## Notes

No backend and no accounts: the bench layout, your name and best scores live in the browser's localStorage.

Fonts: Atma, Galada and Patrick Hand, licensed under the SIL Open Font License 1.1 (see `public/fonts/OFL.txt`).
