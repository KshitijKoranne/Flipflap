import { useState, useEffect, useRef, useCallback } from "react";

// ─── Config ──────────────────────────────────────────────────
const ROWS = 6;
const COLS = 22;
const CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:!?-+/'()&@#%$";
const SCENE_INTERVAL = 10000;

// ─── Audio ───────────────────────────────────────────────────
const createClickSound = (() => {
  let ctx = null;
  return () => {
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = "square";
      osc.frequency.setValueAtTime(800 + Math.random() * 600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.012);
      filter.type = "bandpass"; filter.frequency.value = 1200; filter.Q.value = 2;
      gain.gain.setValueAtTime(0.015, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
      osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.03);
    } catch (e) { /* silent */ }
  };
})();

// ─── Single Flap Cell ────────────────────────────────────────
function Flap({ targetChar, delay = 0 }) {
  const [cur, setCur] = useState(" ");
  const [flipping, setFlipping] = useState(false);
  const [topC, setTopC] = useState(" ");
  const [nextC, setNextC] = useState(" ");
  const queue = useRef([]);
  const timer = useRef(null);

  const doFlip = useCallback((from, to) => {
    setTopC(from); setNextC(to); setFlipping(true);
    createClickSound();
    timer.current = setTimeout(() => {
      setCur(to); setFlipping(false);
      if (queue.current.length > 0) {
        const n = queue.current.shift();
        requestAnimationFrame(() => doFlip(to, n));
      }
    }, 50);
  }, []);

  useEffect(() => {
    const t = (targetChar || " ").toUpperCase();
    if (t === cur) return;
    const ci = CHARS.indexOf(cur), ti = CHARS.indexOf(t);
    if (ti === -1) return;
    const seq = [];
    if (ci <= ti) { for (let i = ci + 1; i <= ti; i++) seq.push(CHARS[i]); }
    else { for (let i = ci + 1; i < CHARS.length; i++) seq.push(CHARS[i]); for (let i = 0; i <= ti; i++) seq.push(CHARS[i]); }
    if (!seq.length) return;
    const d = setTimeout(() => { queue.current = seq.slice(1); doFlip(cur, seq[0]); }, delay);
    return () => { clearTimeout(d); if (timer.current) clearTimeout(timer.current); };
  }, [targetChar]);

  const halfSt = (isTop) => ({
    position: "absolute", width: "100%", height: "50%",
    top: isTop ? 0 : "50%", overflow: "hidden",
    background: isTop
      ? "linear-gradient(180deg, #2a2a28 0%, #222220 100%)"
      : "linear-gradient(180deg, #1d1d1b 0%, #191917 100%)",
    borderRadius: isTop ? "3px 3px 0 0" : "0 0 3px 3px",
    borderTop: isTop ? "none" : "1px solid #0a0a0a",
    zIndex: 1,
  });

  const charSt = (isTop) => ({
    fontFamily: "'Courier New', 'SF Mono', monospace",
    fontWeight: 700,
    fontSize: "clamp(18px, 3.2vw, 32px)",
    color: "#f0e8d0",
    lineHeight: "var(--cell-h)",
    position: "absolute",
    top: isTop ? 0 : "calc(var(--cell-h) / -2)",
    width: "100%",
    textAlign: "center",
    userSelect: "none",
  });

  return (
    <div className="flap-cell">
      {flipping && <div style={{ ...halfSt(false), zIndex: 0 }}><span style={charSt(false)}>{nextC}</span></div>}
      <div style={{ ...halfSt(true), zIndex: 2 }}><span style={charSt(true)}>{flipping ? nextC : cur}</span></div>
      <div style={{ ...halfSt(false), zIndex: 1 }}><span style={charSt(false)}>{cur}</span></div>
      {flipping && (
        <div style={{ ...halfSt(true), zIndex: 10, transformOrigin: "bottom center", animation: "flapDown 50ms linear forwards", backfaceVisibility: "hidden" }}>
          <span style={charSt(true)}>{topC}</span>
        </div>
      )}
      {/* Hinge line */}
      <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "1.5px", background: "#0a0a0a", zIndex: 20, transform: "translateY(-0.75px)" }} />
      {/* Top highlight */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "30%", background: "linear-gradient(180deg, rgba(255,255,255,0.035) 0%, transparent 100%)", borderRadius: "3px 3px 0 0", zIndex: 21, pointerEvents: "none" }} />
    </div>
  );
}

// ─── Full Grid Board ─────────────────────────────────────────
function Board({ grid }) {
  return (
    <div className="board-grid">
      {grid.map((row, r) => (
        <div key={r} className="board-row">
          {row.split("").map((c, col) => (
            <Flap key={col} targetChar={c} delay={r * 80 + col * 20} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────
function padRow(text) {
  return text.toUpperCase().padEnd(COLS, " ").slice(0, COLS);
}

function emptyGrid() {
  return Array(ROWS).fill("".padEnd(COLS, " "));
}

function centerText(text) {
  const t = text.toUpperCase().slice(0, COLS);
  const pad = Math.max(0, Math.floor((COLS - t.length) / 2));
  return (" ".repeat(pad) + t).padEnd(COLS, " ");
}

function wrapText(text, lineLen) {
  const words = text.split(" "); const lines = []; let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > lineLen) { lines.push(line.trim()); line = w; }
    else { line = (line + " " + w).trim(); }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function useTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  return now;
}

// ─── Quote Hook (DummyJSON) ──────────────────────────────────
const FALLBACK_QUOTES = [
  { quote: "THE ONLY WAY TO DO GREAT WORK IS TO LOVE WHAT YOU DO", author: "STEVE JOBS" },
  { quote: "SIMPLICITY IS THE ULTIMATE SOPHISTICATION", author: "DA VINCI" },
  { quote: "TALK IS CHEAP SHOW ME THE CODE", author: "LINUS TORVALDS" },
  { quote: "DONE IS BETTER THAN PERFECT", author: "SHERYL SANDBERG" },
  { quote: "MAKE IT WORK MAKE IT RIGHT MAKE IT FAST", author: "KENT BECK" },
  { quote: "STAY HUNGRY STAY FOOLISH", author: "STEWART BRAND" },
  { quote: "FIRST DO IT THEN DO IT RIGHT THEN DO IT BETTER", author: "ADDY OSMANI" },
  { quote: "SHIP EARLY SHIP OFTEN", author: "REID HOFFMAN" },
  { quote: "MEASURE WHAT MATTERS", author: "JOHN DOERR" },
  { quote: "ANY SUFFICIENTLY ADVANCED TECHNOLOGY IS INDISTINGUISHABLE FROM MAGIC", author: "ARTHUR C CLARKE" },
];

function useQuote() {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const fallbackIdx = useRef(0);

  const fetchQuote = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("https://dummyjson.com/quotes/random");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQuote({ quote: (data.quote || "").toUpperCase(), author: (data.author || "UNKNOWN").toUpperCase() });
    } catch {
      try {
        const res2 = await fetch("https://quoteslate.vercel.app/api/quotes/random?maxLength=90");
        if (!res2.ok) throw new Error();
        const data2 = await res2.json();
        setQuote({ quote: (data2.quote || "").toUpperCase(), author: (data2.author || "UNKNOWN").toUpperCase() });
      } catch {
        const fb = FALLBACK_QUOTES[fallbackIdx.current % FALLBACK_QUOTES.length];
        fallbackIdx.current++;
        setQuote(fb);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchQuote(); }, []);
  return { quote, loading, fetchQuote };
}

// ─── Weather Hook (Open-Meteo) ───────────────────────────────
const CITIES = [
  { name: "MUMBAI", lat: 19.076, lon: 72.8777 },
  { name: "NEW YORK", lat: 40.7128, lon: -74.006 },
  { name: "LONDON", lat: 51.5074, lon: -0.1278 },
  { name: "TOKYO", lat: 35.6762, lon: 139.6503 },
  { name: "PARIS", lat: 48.8566, lon: 2.3522 },
  { name: "SYDNEY", lat: -33.8688, lon: 151.2093 },
  { name: "DUBAI", lat: 25.2048, lon: 55.2708 },
  { name: "SAN FRANCISCO", lat: 37.7749, lon: -122.4194 },
];

const WMO = {
  0: "CLEAR SKY", 1: "MAINLY CLEAR", 2: "PARTLY CLOUDY", 3: "OVERCAST",
  45: "FOGGY", 48: "RIME FOG", 51: "LIGHT DRIZZLE", 53: "DRIZZLE",
  55: "DENSE DRIZZLE", 61: "LIGHT RAIN", 63: "RAIN", 65: "HEAVY RAIN",
  71: "LIGHT SNOW", 73: "SNOW", 75: "HEAVY SNOW", 80: "RAIN SHOWERS",
  81: "MOD. SHOWERS", 82: "HEAVY SHOWERS", 95: "THUNDERSTORM",
};

function useWeather() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const cityIdx = useRef(0);

  const fetchWeather = useCallback(async (idx) => {
    const i = idx !== undefined ? idx : cityIdx.current;
    cityIdx.current = i;
    const city = CITIES[i % CITIES.length];
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      const c = data.current;
      setWeather({
        city: city.name,
        temp: Math.round(c.temperature_2m),
        humidity: c.relative_humidity_2m,
        wind: Math.round(c.wind_speed_10m),
        condition: WMO[c.weather_code] || "UNKNOWN",
      });
    } catch {
      setWeather({ city: city.name, temp: "--", humidity: "--", wind: "--", condition: "UNAVAILABLE" });
    }
    setLoading(false);
  }, []);

  const nextCity = useCallback(() => {
    cityIdx.current = (cityIdx.current + 1) % CITIES.length;
    fetchWeather(cityIdx.current);
  }, [fetchWeather]);

  useEffect(() => { fetchWeather(0); }, []);
  return { weather, loading, fetchWeather, nextCity };
}

// ─── Grid Builders ───────────────────────────────────────────
function quoteGrid(q) {
  if (!q) return emptyGrid();
  const lines = wrapText(q.quote, COLS);
  const authorLine = "- " + q.author;
  const allLines = [...lines.slice(0, ROWS - 2), "", authorLine];
  // Center vertically
  const content = allLines.slice(0, ROWS);
  while (content.length < ROWS) content.push("");
  // If fewer lines, pad top
  const textLines = lines.slice(0, ROWS - 2);
  const totalContent = textLines.length + 2; // text + blank + author
  const topPad = Math.max(0, Math.floor((ROWS - totalContent) / 2));
  const grid = emptyGrid();
  for (let i = 0; i < textLines.length; i++) {
    if (topPad + i < ROWS) grid[topPad + i] = centerText(textLines[i]);
  }
  const authorRow = topPad + textLines.length + 1;
  if (authorRow < ROWS) grid[authorRow] = centerText(authorLine);
  return grid;
}

function clockGrid(now) {
  const h = now.getHours().toString().padStart(2, "0");
  const m = now.getMinutes().toString().padStart(2, "0");
  const s = now.getSeconds().toString().padStart(2, "0");
  const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  const grid = emptyGrid();
  grid[1] = centerText(`${h} : ${m} : ${s}`);
  grid[3] = centerText(days[now.getDay()]);
  grid[4] = centerText(`${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`);
  return grid;
}

function weatherGrid(w) {
  if (!w) return emptyGrid();
  const grid = emptyGrid();
  grid[0] = centerText(w.city);
  grid[2] = centerText(`${w.temp}C  ${w.condition}`);
  grid[4] = centerText(`WIND ${w.wind} KM/H`);
  grid[5] = centerText(`HUMIDITY ${w.humidity}%`);
  return grid;
}

function departureGrid() {
  const grid = emptyGrid();
  grid[0] = padRow("DEST       TIME  STATUS");
  grid[1] = padRow("MUMBAI BOM 0645  ON TIME ");
  grid[2] = padRow("DELHI DEL  0830  BOARDING");
  grid[3] = padRow("TOKYO NRT  1115  DELAYED ");
  grid[4] = padRow("NEW YRK JFK1400  ON TIME ");
  grid[5] = padRow("LONDON LHR 1730  ON TIME ");
  return grid;
}

function customGrid(lines) {
  const grid = emptyGrid();
  const wrapped = [];
  for (const l of lines) wrapped.push(...wrapText(l.toUpperCase(), COLS));
  const content = wrapped.slice(0, ROWS);
  const topPad = Math.max(0, Math.floor((ROWS - content.length) / 2));
  for (let i = 0; i < content.length; i++) {
    if (topPad + i < ROWS) grid[topPad + i] = centerText(content[i]);
  }
  return grid;
}

// ─── Main App ────────────────────────────────────────────────
export default function SolariBoard() {
  const now = useTime();
  const { quote, loading: qLoading, fetchQuote } = useQuote();
  const { weather, loading: wLoading, nextCity } = useWeather();
  const [scene, setScene] = useState("quote");
  const [grid, setGrid] = useState(emptyGrid());
  const [customText, setCustomText] = useState("");
  const [customLines, setCustomLines] = useState(["HELLO FROM", "FLIPFLAP", "BUILD. SHIP. REPEAT."]);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showCustom, setShowCustom] = useState(false);
  const autoRef = useRef(null);
  const counterRef = useRef(0);

  // Update grid when scene data changes
  useEffect(() => {
    if (scene === "quote" && quote) setGrid(quoteGrid(quote));
  }, [scene, quote]);

  useEffect(() => {
    if (scene === "clock") setGrid(clockGrid(now));
  }, [scene, now]);

  useEffect(() => {
    if (scene === "weather" && weather) setGrid(weatherGrid(weather));
  }, [scene, weather]);

  useEffect(() => {
    if (scene === "departures") setGrid(departureGrid());
  }, [scene]);

  useEffect(() => {
    if (scene === "custom") setGrid(customGrid(customLines));
  }, [scene, customLines]);

  // Auto-rotate
  useEffect(() => {
    if (!autoRotate) { if (autoRef.current) clearInterval(autoRef.current); return; }
    autoRef.current = setInterval(() => {
      counterRef.current += 1;
      const pattern = ["quote", "clock", "weather", "quote", "departures", "clock", "weather"];
      const scn = pattern[counterRef.current % pattern.length];
      setScene(scn);
      if (scn === "quote") fetchQuote();
      if (scn === "weather") nextCity();
    }, SCENE_INTERVAL);
    return () => clearInterval(autoRef.current);
  }, [autoRotate, fetchQuote, nextCity]);

  const selectScene = (s) => {
    setAutoRotate(false); setScene(s); setShowCustom(s === "custom");
    if (s === "quote") fetchQuote();
    if (s === "weather") nextCity();
  };

  const handleCustomSubmit = () => {
    const lines = customText.split("\n").filter(l => l.trim());
    if (lines.length) { setCustomLines(lines); setScene("custom"); setAutoRotate(false); }
  };

  const sceneBtns = [
    { id: "quote", label: "Quotes", color: "#d4a853" },
    { id: "clock", label: "Clock", color: "#6bba7b" },
    { id: "weather", label: "Weather", color: "#5ba4d9" },
    { id: "departures", label: "Flights", color: "#e07850" },
    { id: "custom", label: "Custom", color: "#b07cdb" },
  ];

  return (
    <div className="solari-app">
      <style>{`
        @keyframes flapDown {
          0% { transform: rotateX(0deg); }
          100% { transform: rotateX(-90deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        :root {
          --cell-w: clamp(22px, 3.8vw, 38px);
          --cell-h: clamp(32px, 5.4vw, 54px);
          --cell-gap: clamp(2px, 0.4vw, 4px);
          --board-bg: #111110;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        .solari-app {
          min-height: 100vh;
          background: #0b0b0a;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: 'Helvetica Neue', -apple-system, sans-serif;
          padding: 20px 8px;
          overflow: hidden;
        }

        .board-housing {
          background: linear-gradient(180deg, #161614 0%, var(--board-bg) 30%, #0d0d0c 100%);
          border-radius: 14px;
          padding: 20px 16px 16px;
          max-width: 920px;
          width: 100%;
          position: relative;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.04),
            0 30px 80px rgba(0,0,0,0.8),
            inset 0 1px 0 rgba(255,255,255,0.03);
        }

        .board-grid {
          display: flex;
          flex-direction: column;
          gap: var(--cell-gap);
          align-items: center;
          padding: 12px;
          background: #0a0a09;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.03);
        }

        .board-row {
          display: flex;
          gap: var(--cell-gap);
        }

        .flap-cell {
          width: var(--cell-w);
          height: var(--cell-h);
          position: relative;
          perspective: 300px;
          border-radius: 3px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.4);
        }

        .controls {
          display: flex;
          justify-content: center;
          gap: 6px;
          margin-top: 14px;
          flex-wrap: wrap;
        }

        .scene-btn {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.3);
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 11px;
          letter-spacing: 1px;
          cursor: pointer;
          transition: all 0.3s;
          font-family: 'Helvetica Neue', sans-serif;
        }

        .scene-btn.active {
          background: var(--btn-color-bg);
          border-color: var(--btn-color-border);
          color: var(--btn-color);
        }

        .scene-btn:active { transform: scale(0.97); }

        .meta-row {
          display: flex;
          justify-content: center;
          margin-top: 10px;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .toggle-btn {
          background: none;
          border: none;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          cursor: pointer;
          font-family: 'Helvetica Neue', sans-serif;
        }

        .pill-btn {
          background: none;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          color: rgba(255,255,255,0.35);
          font-size: 10px;
          padding: 3px 10px;
          letter-spacing: 1px;
          cursor: pointer;
          font-family: 'Helvetica Neue', sans-serif;
        }

        .custom-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 12px;
          gap: 8px;
          animation: fadeUp 0.3s ease-out;
        }

        .custom-area textarea {
          width: 300px;
          max-width: 90%;
          background: #111;
          border: 1px solid rgba(176,124,219,0.2);
          color: #f0e8d0;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          font-family: 'Courier New', monospace;
          letter-spacing: 1px;
          resize: none;
          text-transform: uppercase;
        }
        .custom-area textarea:focus { outline: none; border-color: #b07cdb; }

        .custom-area button {
          background: linear-gradient(180deg, rgba(176,124,219,0.2), rgba(176,124,219,0.1));
          border: 1px solid rgba(176,124,219,0.3);
          color: #b07cdb;
          padding: 7px 24px;
          border-radius: 8px;
          font-size: 11px;
          letter-spacing: 3px;
          cursor: pointer;
          text-transform: uppercase;
          font-weight: 600;
        }

        .corner-screw {
          position: absolute;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #333, #1a1a1a);
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.6);
        }
        .corner-screw::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 20%;
          right: 20%;
          height: 1px;
          background: #111;
          transform: translateY(-0.5px) rotate(45deg);
        }

        .footer {
          margin-top: 16px;
          text-align: center;
          color: rgba(255,255,255,0.06);
          font-size: 8px;
          letter-spacing: 2px;
        }

        @media (max-width: 520px) {
          :root {
            --cell-w: clamp(13px, 4vw, 22px);
            --cell-h: clamp(20px, 5.6vw, 32px);
            --cell-gap: 1.5px;
          }
          .board-housing { padding: 14px 8px 12px; border-radius: 10px; }
          .board-grid { padding: 8px; }
        }
      `}</style>

      {/* Ambient glow */}
      <div style={{ position: "fixed", top: "-30%", left: "20%", width: "60%", height: "50%", background: "radial-gradient(ellipse, rgba(212,168,83,0.03) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Board */}
      <div className="board-housing">
        {/* Gold accent strip */}
        <div style={{ position: "absolute", top: 0, left: 40, right: 40, height: 2, background: "linear-gradient(90deg, transparent, #d4a853, transparent)", opacity: 0.4, borderRadius: "0 0 2px 2px" }} />

        {/* The Grid */}
        <Board grid={grid} />

        {/* Scene buttons */}
        <div className="controls">
          {sceneBtns.map(b => (
            <button
              key={b.id}
              className={`scene-btn ${scene === b.id ? "active" : ""}`}
              style={{
                "--btn-color": b.color,
                "--btn-color-bg": b.color + "18",
                "--btn-color-border": b.color + "60",
              }}
              onClick={() => selectScene(b.id)}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Meta controls */}
        <div className="meta-row">
          <button className="toggle-btn" onClick={() => setAutoRotate(!autoRotate)}
            style={{ color: autoRotate ? "#d4a853" : "rgba(255,255,255,0.2)" }}>
            <span style={{ width: 28, height: 14, borderRadius: 7, background: autoRotate ? "#d4a85340" : "rgba(255,255,255,0.06)", display: "inline-flex", alignItems: "center", padding: "0 2px", transition: "all 0.3s" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: autoRotate ? "#d4a853" : "rgba(255,255,255,0.2)", transform: autoRotate ? "translateX(14px)" : "translateX(0)", transition: "all 0.3s" }} />
            </span>
            Auto
          </button>
          {scene === "quote" && <button className="pill-btn" onClick={fetchQuote}>{qLoading ? "..." : "New Quote →"}</button>}
          {scene === "weather" && <button className="pill-btn" onClick={nextCity}>{wLoading ? "..." : "Next City →"}</button>}
        </div>

        {/* Custom input */}
        {showCustom && (
          <div className="custom-area">
            <textarea value={customText} onChange={e => setCustomText(e.target.value)}
              placeholder={"Type your message...\nEach line = one row"} rows={3} />
            <button onClick={handleCustomSubmit}>Flip It</button>
          </div>
        )}

        {/* Corner screws */}
        <div className="corner-screw" style={{ top: 8, left: 8 }} />
        <div className="corner-screw" style={{ top: 8, right: 8 }} />
        <div className="corner-screw" style={{ bottom: 8, left: 8 }} />
        <div className="corner-screw" style={{ bottom: 8, right: 8 }} />
      </div>

      {/* Footer */}
      <div className="footer">
        Quotes: DummyJSON &middot; Weather: Open-Meteo.com (CC BY 4.0)
      </div>
    </div>
  );
}
