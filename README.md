# FlipFlap — Solari Split-Flap Display

A beautiful, interactive split-flap display inspired by classic Vestaboard / Solari boards. Built with React + Vite. Live data, multiple themes, shareable links, and TV mode.

## Features

### Scenes
- **Quotes** — Random quotes from [DummyJSON](https://dummyjson.com/) (free, no key)
- **Clock** — Live time with seconds, day, and date
- **Weather** — Real weather via [Open-Meteo](https://open-meteo.com/) (free, no key). Auto-detects your location via browser geolocation, then cycles through 8 world cities
- **Countdown** — Set any future date with a custom label. Shows days, hours, minutes, seconds
- **Custom** — Type your own multi-line message

### Interactions
- **4 Color Themes** — Classic (gold), Neon (purple), Terminal (green), Retro (warm amber)
- **URL Sharing** — Share custom messages via URL: `?msg=HELLO|WORLD`
- **Sound Toggle** — Mechanical click sounds on/off
- **Fullscreen TV Mode** — Perfect for a monitor, TV, or tablet display
- **Keyboard Shortcuts** — `←/→` scenes, `Space` toggle auto, `M` mute, `F` fullscreen
- **Auto-Rotate** — Cycles through scenes every 10 seconds
- **Geolocation Weather** — Shows your city first, then cycles world cities
- **PWA Ready** — Installable as a home screen app

### URL Parameters
- `?msg=LINE+ONE|LINE+TWO` — Open with a custom message
- `?theme=purple` — Set theme (`classic`, `purple`, `green`, `retro`)
- `?countdown=2026-12-31` — Open with countdown to a date
- `?scene=clock` — Open to a specific scene

## Tech Stack

- React 19 + Vite (zero UI dependencies)
- DummyJSON for quotes
- Open-Meteo for weather + geocoding
- Web Audio API for click sounds
- CSS custom properties for themes
- Fullscreen API for TV mode

## Development

```bash
npm install
npm run dev
```

## Deploy

Push to GitHub → connect to [Vercel](https://vercel.com) → auto-deploys.

## License

MIT
