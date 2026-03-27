# FlipFlap — Solari Split-Flap Display

A beautiful, interactive split-flap (Solari board) display built with React + Vite. Features realistic mechanical flip animations with click sounds, live data feeds, and multiple scenes.

## Scenes

- **✦ Quotes** — Random inspirational quotes from [DummyJSON API](https://dummyjson.com/docs/quotes) (free, no key)
- **◷ Clock** — Live updating time with seconds, day, and date
- **◈ Weather** — Real weather data from [Open-Meteo](https://open-meteo.com/) (free, no key, CC BY 4.0) for 8 cities worldwide
- **▷ Flights** — Classic airport departure board
- **✎ Custom** — Type your own multi-line messages

## Features

- Realistic split-flap animation with sequential character cycling
- Mechanical click sounds via Web Audio API
- Auto-rotating scenes with 10-second intervals
- Responsive design
- No API keys required — all data sources are free and open

## Tech Stack

- React 19 + Vite
- CSS-in-JS (inline styles, zero dependencies)
- DummyJSON for quotes
- Open-Meteo for live weather
- Deployed on Vercel

## Development

```bash
npm install
npm run dev
```

## Deploy

Push to GitHub and connect to [Vercel](https://vercel.com) — it auto-detects Vite and deploys with zero config.

## Credits

- Inspired by [Solari di Udine](https://en.wikipedia.org/wiki/Solari_di_Udine) split-flap displays
- Weather data: [Open-Meteo](https://open-meteo.com/) (CC BY 4.0)
- Quotes: [DummyJSON](https://dummyjson.com/)

## License

MIT
