import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── Config ──────────────────────────────────────────────────
const ROWS = 6;
const COLS = 22;
const CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:!?-+/'()&@#%$";
const SCENE_INTERVAL = 10000;

// ─── Themes ──────────────────────────────────────────────────
const THEMES = {
  classic: {
    name: "Classic",
    bg: "#0b0b0a",
    housing: ["#161614", "#111110", "#0d0d0c"],
    gridBg: "#0a0a09",
    flapTop: ["#2a2a28", "#222220"],
    flapBot: ["#1d1d1b", "#191917"],
    hinge: "#0a0a0a",
    text: "#f0e8d0",
    accent: "#d4a853",
    highlight: "rgba(255,255,255,0.035)",
  },
  purple: {
    name: "Neon",
    bg: "#0a0a12",
    housing: ["#141420", "#0f0f1a", "#0a0a14"],
    gridBg: "#080810",
    flapTop: ["#24243a", "#1e1e32"],
    flapBot: ["#1a1a2e", "#161628"],
    hinge: "#06060e",
    text: "#e8e0ff",
    accent: "#a855f7",
    highlight: "rgba(168,85,247,0.04)",
  },
  green: {
    name: "Terminal",
    bg: "#050a05",
    housing: ["#0c140c", "#091009", "#060c06"],
    gridBg: "#040804",
    flapTop: ["#1a2e1a", "#162816"],
    flapBot: ["#122212", "#0e1e0e"],
    hinge: "#030603",
    text: "#33ff66",
    accent: "#33ff66",
    highlight: "rgba(51,255,102,0.03)",
  },
  retro: {
    name: "Retro",
    bg: "#1a1710",
    housing: ["#2a2518", "#221e14", "#1a1710"],
    gridBg: "#181410",
    flapTop: ["#3a3428", "#322e22"],
    flapBot: ["#2a2620", "#24201a"],
    hinge: "#120e08",
    text: "#ffe8b0",
    accent: "#e8a030",
    highlight: "rgba(255,232,176,0.04)",
  },
};

// ─── Audio ───────────────────────────────────────────────────
let soundEnabled = true;
const createClickSound = (() => {
  let ctx = null;
  return () => {
    if (!soundEnabled) return;
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
function Flap({ targetChar, delay = 0, theme }) {
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

  const t = theme;
  const halfSt = (isTop) => ({
    position: "absolute", width: "100%", height: "50%",
    top: isTop ? 0 : "50%", overflow: "hidden",
    background: `linear-gradient(180deg, ${isTop ? t.flapTop[0] : t.flapBot[0]} 0%, ${isTop ? t.flapTop[1] : t.flapBot[1]} 100%)`,
    borderRadius: isTop ? "3px 3px 0 0" : "0 0 3px 3px",
    borderTop: isTop ? "none" : `1px solid ${t.hinge}`,
    zIndex: 1,
  });
  const charSt = (isTop) => ({
    fontFamily: "'Courier New', 'SF Mono', monospace", fontWeight: 700,
    fontSize: "clamp(18px, 3.2vw, 32px)", color: t.text,
    lineHeight: "var(--cell-h)", position: "absolute",
    top: isTop ? 0 : "calc(var(--cell-h) / -2)",
    width: "100%", textAlign: "center", userSelect: "none",
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
      <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "1.5px", background: t.hinge, zIndex: 20, transform: "translateY(-0.75px)" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "30%", background: `linear-gradient(180deg, ${t.highlight} 0%, transparent 100%)`, borderRadius: "3px 3px 0 0", zIndex: 21, pointerEvents: "none" }} />
    </div>
  );
}

function Board({ grid, theme }) {
  return (
    <div className="board-grid" style={{ background: theme.gridBg }}>
      {grid.map((row, r) => (
        <div key={r} className="board-row">
          {row.split("").map((c, col) => (
            <Flap key={col} targetChar={c} delay={r * 80 + col * 20} theme={theme} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────
function emptyGrid() { return Array(ROWS).fill("".padEnd(COLS, " ")); }
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

// ─── URL Params ──────────────────────────────────────────────
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    msg: params.get("msg"),
    theme: params.get("theme"),
    countdown: params.get("countdown"),
    scene: params.get("scene"),
  };
}

function updateUrl(params) {
  const url = new URL(window.location.href);
  Object.entries(params).forEach(([k, v]) => {
    if (v) url.searchParams.set(k, v);
    else url.searchParams.delete(k);
  });
  window.history.replaceState({}, "", url);
}

function getShareUrl(msg) {
  const url = new URL(window.location.origin);
  url.searchParams.set("msg", msg);
  return url.toString();
}

// ─── Quote Hook ──────────────────────────────────────────────
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
  const fbIdx = useRef(0);
  const fetchQuote = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("https://dummyjson.com/quotes/random");
      if (!res.ok) throw new Error();
      const d = await res.json();
      setQuote({ quote: (d.quote || "").toUpperCase(), author: (d.author || "UNKNOWN").toUpperCase() });
    } catch {
      const fb = FALLBACK_QUOTES[fbIdx.current % FALLBACK_QUOTES.length];
      fbIdx.current++;
      setQuote(fb);
    }
    setLoading(false);
  }, []);
  useEffect(() => { fetchQuote(); }, []);
  return { quote, loading, fetchQuote };
}

// ─── Weather Hook ────────────────────────────────────────────
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
  const cityIdx = useRef(-1); // -1 = try geolocation first
  const geoTried = useRef(false);

  const fetchForCoords = useCallback(async (name, lat, lon) => {
    setLoading(true);
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      const c = d.current;
      setWeather({ city: name, temp: Math.round(c.temperature_2m), humidity: c.relative_humidity_2m, wind: Math.round(c.wind_speed_10m), condition: WMO[c.weather_code] || "UNKNOWN" });
    } catch {
      setWeather({ city: name, temp: "--", humidity: "--", wind: "--", condition: "UNAVAILABLE" });
    }
    setLoading(false);
  }, []);

  const fetchWeather = useCallback(async (idx) => {
    // First call: try geolocation
    if (!geoTried.current && idx === undefined) {
      geoTried.current = true;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
          const { latitude, longitude } = pos.coords;
          // Reverse geocode city name via Open-Meteo geocoding
          try {
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&count=1`);
            const geoData = await geoRes.json();
            const cityName = geoData?.results?.[0]?.name?.toUpperCase() || "YOUR LOCATION";
            await fetchForCoords(cityName, latitude, longitude);
          } catch {
            await fetchForCoords("YOUR LOCATION", latitude, longitude);
          }
          return;
        } catch { /* geolocation denied, fall through */ }
      }
    }
    const i = idx !== undefined ? idx : Math.max(0, cityIdx.current);
    cityIdx.current = i;
    const city = CITIES[i % CITIES.length];
    await fetchForCoords(city.name, city.lat, city.lon);
  }, [fetchForCoords]);

  const nextCity = useCallback(() => {
    cityIdx.current = (cityIdx.current + 1) % CITIES.length;
    fetchWeather(cityIdx.current);
  }, [fetchWeather]);

  useEffect(() => { fetchWeather(); }, []);
  return { weather, loading, fetchWeather, nextCity };
}

// ─── Grid Builders ───────────────────────────────────────────
function quoteGrid(q) {
  if (!q) return emptyGrid();
  const lines = wrapText(q.quote, COLS).slice(0, ROWS - 2);
  const authorLine = "- " + q.author;
  const totalContent = lines.length + 2;
  const topPad = Math.max(0, Math.floor((ROWS - totalContent) / 2));
  const grid = emptyGrid();
  for (let i = 0; i < lines.length; i++) {
    if (topPad + i < ROWS) grid[topPad + i] = centerText(lines[i]);
  }
  const authorRow = topPad + lines.length + 1;
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

function countdownGrid(targetDate, label) {
  const now = new Date();
  const target = new Date(targetDate);
  const diff = target - now;
  const grid = emptyGrid();
  if (diff <= 0) {
    grid[2] = centerText(label || "EVENT");
    grid[3] = centerText("HAS ARRIVED!");
    return grid;
  }
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  grid[1] = centerText(label || "COUNTDOWN");
  grid[3] = centerText(`${days}D ${hours.toString().padStart(2, "0")}H ${mins.toString().padStart(2, "0")}M ${secs.toString().padStart(2, "0")}S`);
  grid[5] = centerText(target.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase());
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

// ─── Icon Buttons ────────────────────────────────────────────
function IconBtn({ onClick, title, active, children, accent }) {
  return (
    <button onClick={onClick} title={title} style={{
      background: "none", border: "none", cursor: "pointer", padding: 6,
      color: active ? (accent || "#d4a853") : "rgba(255,255,255,0.2)",
      fontSize: 16, lineHeight: 1, transition: "color 0.3s",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>{children}</button>
  );
}

// ─── Main App ────────────────────────────────────────────────
export default function SolariBoard() {
  const now = useTime();
  const { quote, loading: qLoading, fetchQuote } = useQuote();
  const { weather, loading: wLoading, nextCity } = useWeather();

  const urlParams = useMemo(() => getUrlParams(), []);

  const [themeId, setThemeId] = useState(urlParams.theme && THEMES[urlParams.theme] ? urlParams.theme : "classic");
  const theme = THEMES[themeId];

  const [scene, setScene] = useState(urlParams.msg ? "custom" : urlParams.countdown ? "countdown" : urlParams.scene || "quote");
  const [grid, setGrid] = useState(emptyGrid());
  const [customText, setCustomText] = useState("");
  const [customLines, setCustomLines] = useState(
    urlParams.msg ? urlParams.msg.split("|") : ["HELLO FROM", "FLIPFLAP"]
  );
  const [showCustom, setShowCustom] = useState(false);
  const [autoRotate, setAutoRotate] = useState(!urlParams.msg && !urlParams.countdown);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [countdownDate, setCountdownDate] = useState(urlParams.countdown || "");
  const [countdownLabel, setCountdownLabel] = useState("COUNTDOWN");
  const [showCountdownInput, setShowCountdownInput] = useState(false);
  const [copied, setCopied] = useState(false);

  const autoRef = useRef(null);
  const counterRef = useRef(0);
  const appRef = useRef(null);

  // Sound sync
  useEffect(() => { soundEnabled = !muted; }, [muted]);

  // ─── Grid updates ──────────────────────────────────────────
  useEffect(() => { if (scene === "quote" && quote) setGrid(quoteGrid(quote)); }, [scene, quote]);
  useEffect(() => { if (scene === "clock") setGrid(clockGrid(now)); }, [scene, now]);
  useEffect(() => { if (scene === "weather" && weather) setGrid(weatherGrid(weather)); }, [scene, weather]);
  useEffect(() => { if (scene === "custom") setGrid(customGrid(customLines)); }, [scene, customLines]);
  useEffect(() => {
    if (scene === "countdown" && countdownDate) {
      setGrid(countdownGrid(countdownDate, countdownLabel));
      const id = setInterval(() => setGrid(countdownGrid(countdownDate, countdownLabel)), 1000);
      return () => clearInterval(id);
    }
  }, [scene, countdownDate, countdownLabel]);

  // ─── Auto-rotate ───────────────────────────────────────────
  useEffect(() => {
    if (!autoRotate) { if (autoRef.current) clearInterval(autoRef.current); return; }
    autoRef.current = setInterval(() => {
      counterRef.current += 1;
      const pattern = ["quote", "clock", "weather", "quote", "clock", "weather"];
      const scn = pattern[counterRef.current % pattern.length];
      setScene(scn);
      if (scn === "quote") fetchQuote();
      if (scn === "weather") nextCity();
    }, SCENE_INTERVAL);
    return () => clearInterval(autoRef.current);
  }, [autoRotate, fetchQuote, nextCity]);

  // ─── Keyboard shortcuts ────────────────────────────────────
  const scenes = ["quote", "clock", "weather", "countdown", "custom"];
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
      if (e.key === "ArrowRight") {
        const idx = scenes.indexOf(scene);
        const next = scenes[(idx + 1) % scenes.length];
        selectScene(next);
      } else if (e.key === "ArrowLeft") {
        const idx = scenes.indexOf(scene);
        const next = scenes[(idx - 1 + scenes.length) % scenes.length];
        selectScene(next);
      } else if (e.key === " ") {
        e.preventDefault();
        setAutoRotate(a => !a);
      } else if (e.key === "m") {
        setMuted(m => !m);
      } else if (e.key === "f") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [scene]);

  // ─── Fullscreen ────────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      appRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ─── Scene selection ───────────────────────────────────────
  const selectScene = (s) => {
    setAutoRotate(false); setScene(s);
    setShowCustom(s === "custom");
    setShowCountdownInput(s === "countdown");
    setShowThemes(false);
    if (s === "quote") fetchQuote();
    if (s === "weather") nextCity();
  };

  const handleCustomSubmit = () => {
    const lines = customText.split("\n").filter(l => l.trim());
    if (lines.length) { setCustomLines(lines); setScene("custom"); setAutoRotate(false); }
  };

  const handleShare = async () => {
    const msg = customLines.join("|");
    const url = getShareUrl(msg);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = url; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCountdownSubmit = () => {
    if (countdownDate) { setScene("countdown"); setAutoRotate(false); }
  };

  const handleThemeChange = (id) => {
    setThemeId(id);
    updateUrl({ theme: id === "classic" ? null : id });
    setShowThemes(false);
  };

  const sceneBtns = [
    { id: "quote", label: "Quotes" },
    { id: "clock", label: "Clock" },
    { id: "weather", label: "Weather" },
    { id: "countdown", label: "Countdown" },
    { id: "custom", label: "Custom" },
  ];

  const accent = theme.accent;

  return (
    <div className="solari-app" ref={appRef} style={{ background: theme.bg }}>
      <style>{`
        @keyframes flapDown { 0% { transform: rotateX(0deg); } 100% { transform: rotateX(-90deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pop { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } }

        :root {
          --cell-w: clamp(22px, 3.8vw, 38px);
          --cell-h: clamp(32px, 5.4vw, 54px);
          --cell-gap: clamp(2px, 0.4vw, 4px);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        .solari-app {
          min-height: 100vh;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          font-family: 'Helvetica Neue', -apple-system, sans-serif;
          padding: 20px 8px; overflow: hidden; position: relative;
        }

        .board-housing {
          background: linear-gradient(180deg, ${theme.housing[0]} 0%, ${theme.housing[1]} 30%, ${theme.housing[2]} 100%);
          border-radius: 14px; padding: 20px 16px 16px; max-width: 920px; width: 100%; position: relative;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.04), 0 30px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.03);
        }

        .board-grid {
          display: flex; flex-direction: column; gap: var(--cell-gap); align-items: center;
          padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.03);
        }

        .board-row { display: flex; gap: var(--cell-gap); }

        .flap-cell {
          width: var(--cell-w); height: var(--cell-h); position: relative; perspective: 300px;
          border-radius: 3px; box-shadow: 0 1px 3px rgba(0,0,0,0.4);
        }

        .toolbar {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 12px; padding: 0 4px;
        }
        .toolbar-left, .toolbar-right { display: flex; align-items: center; gap: 4px; }
        .toolbar-center { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }

        .scene-btn {
          background: transparent; border: 1px solid rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.3); padding: 5px 12px; border-radius: 16px;
          font-size: 10px; letter-spacing: 1px; cursor: pointer; transition: all 0.3s;
          font-family: 'Helvetica Neue', sans-serif; white-space: nowrap;
        }
        .scene-btn.active { background: ${accent}18; border-color: ${accent}60; color: ${accent}; }
        .scene-btn:active { transform: scale(0.97); }

        .meta-row {
          display: flex; justify-content: center; margin-top: 10px; gap: 10px;
          align-items: center; flex-wrap: wrap;
        }

        .toggle-btn {
          background: none; border: none; display: flex; align-items: center; gap: 6px;
          font-size: 10px; letter-spacing: 2px; text-transform: uppercase; cursor: pointer;
          font-family: 'Helvetica Neue', sans-serif;
        }

        .pill-btn {
          background: none; border: 1px solid ${accent}30; border-radius: 12px;
          color: ${accent}80; font-size: 10px; padding: 3px 10px; letter-spacing: 1px;
          cursor: pointer; font-family: 'Helvetica Neue', sans-serif; transition: all 0.2s;
        }
        .pill-btn:hover { border-color: ${accent}60; color: ${accent}; }

        .input-area {
          display: flex; flex-direction: column; align-items: center;
          margin-top: 12px; gap: 8px; animation: fadeUp 0.3s ease-out;
        }
        .input-area textarea, .input-area input {
          background: ${theme.housing[1]}; border: 1px solid ${accent}30; color: ${theme.text};
          border-radius: 10px; padding: 8px 14px; font-size: 13px;
          font-family: 'Courier New', monospace; letter-spacing: 1px; text-transform: uppercase;
        }
        .input-area textarea { width: 300px; max-width: 90%; resize: none; }
        .input-area textarea:focus, .input-area input:focus { outline: none; border-color: ${accent}; }

        .input-area .submit-btn {
          background: ${accent}20; border: 1px solid ${accent}40; color: ${accent};
          padding: 7px 24px; border-radius: 8px; font-size: 11px; letter-spacing: 3px;
          cursor: pointer; text-transform: uppercase; font-weight: 600;
        }

        .theme-picker {
          display: flex; gap: 6px; margin-top: 8px; animation: fadeUp 0.2s ease-out;
          justify-content: center; flex-wrap: wrap;
        }
        .theme-dot {
          width: 24px; height: 24px; border-radius: 6px; cursor: pointer;
          border: 2px solid transparent; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; font-size: 8px; color: #fff;
        }
        .theme-dot.active { border-color: #fff; }

        .corner-screw {
          position: absolute; width: 10px; height: 10px; border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #333, #1a1a1a);
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.6);
        }
        .corner-screw::after {
          content: ''; position: absolute; top: 50%; left: 20%; right: 20%; height: 1px;
          background: #111; transform: translateY(-0.5px) rotate(45deg);
        }

        .footer {
          margin-top: 16px; text-align: center; color: rgba(255,255,255,0.06);
          font-size: 8px; letter-spacing: 2px;
        }

        .copied-toast {
          position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
          background: ${accent}; color: #000; padding: 8px 20px; border-radius: 20px;
          font-size: 12px; font-weight: 600; letter-spacing: 1px; animation: fadeUp 0.3s ease-out;
          z-index: 999;
        }

        .kbd { font-size: 9px; color: rgba(255,255,255,0.12); margin-top: 6px; text-align: center; letter-spacing: 1px; }

        @media (max-width: 600px) {
          :root { --cell-w: clamp(13px, 4vw, 22px); --cell-h: clamp(20px, 5.6vw, 32px); --cell-gap: 1.5px; }
          .board-housing { padding: 14px 8px 12px; border-radius: 10px; }
          .board-grid { padding: 8px; }
          .toolbar { flex-direction: column; gap: 8px; }
          .kbd { display: none; }
        }
      `}</style>

      {/* Board */}
      <div className="board-housing">
        {/* Accent strip */}
        <div style={{ position: "absolute", top: 0, left: 40, right: 40, height: 2, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.4, borderRadius: "0 0 2px 2px" }} />

        {/* Toolbar */}
        <div className="toolbar">
          <div className="toolbar-left">
            <IconBtn onClick={() => setMuted(!muted)} title={muted ? "Unmute (M)" : "Mute (M)"} active={!muted} accent={accent}>
              {muted ? "🔇" : "🔊"}
            </IconBtn>
            <IconBtn onClick={() => setShowThemes(!showThemes)} title="Themes" active={showThemes} accent={accent}>
              🎨
            </IconBtn>
          </div>
          <div className="toolbar-center">
            {sceneBtns.map(b => (
              <button key={b.id} className={`scene-btn ${scene === b.id ? "active" : ""}`}
                onClick={() => selectScene(b.id)}>{b.label}</button>
            ))}
          </div>
          <div className="toolbar-right">
            <IconBtn onClick={handleShare} title="Share Link" accent={accent}>🔗</IconBtn>
            <IconBtn onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen / TV Mode (F)"} active={isFullscreen} accent={accent}>
              {isFullscreen ? "⊗" : "⛶"}
            </IconBtn>
          </div>
        </div>

        {/* Theme picker */}
        {showThemes && (
          <div className="theme-picker">
            {Object.entries(THEMES).map(([id, t]) => (
              <div key={id} className={`theme-dot ${themeId === id ? "active" : ""}`}
                style={{ background: t.flapTop[0] }}
                onClick={() => handleThemeChange(id)}>
                <span style={{ color: t.text }}>{t.name[0]}</span>
              </div>
            ))}
          </div>
        )}

        {/* The Grid */}
        <Board grid={grid} theme={theme} />

        {/* Meta controls */}
        <div className="meta-row">
          <button className="toggle-btn" onClick={() => setAutoRotate(!autoRotate)}
            style={{ color: autoRotate ? accent : "rgba(255,255,255,0.2)" }}>
            <span style={{ width: 28, height: 14, borderRadius: 7, background: autoRotate ? accent + "40" : "rgba(255,255,255,0.06)", display: "inline-flex", alignItems: "center", padding: "0 2px", transition: "all 0.3s" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: autoRotate ? accent : "rgba(255,255,255,0.2)", transform: autoRotate ? "translateX(14px)" : "translateX(0)", transition: "all 0.3s" }} />
            </span>
            Auto
          </button>
          {scene === "quote" && <button className="pill-btn" onClick={fetchQuote}>{qLoading ? "..." : "New Quote →"}</button>}
          {scene === "weather" && <button className="pill-btn" onClick={nextCity}>{wLoading ? "..." : "Next City →"}</button>}
          {scene === "custom" && <button className="pill-btn" onClick={handleShare}>{copied ? "Copied!" : "Share Link 🔗"}</button>}
        </div>

        {/* Custom input */}
        {showCustom && (
          <div className="input-area">
            <textarea value={customText} onChange={e => setCustomText(e.target.value)}
              placeholder={"Type your message...\nEach line = one row"} rows={3} />
            <button className="submit-btn" onClick={handleCustomSubmit}>Flip It</button>
          </div>
        )}

        {/* Countdown input */}
        {showCountdownInput && (
          <div className="input-area">
            <input type="text" placeholder="Label (e.g. LAUNCH DAY)" value={countdownLabel}
              onChange={e => setCountdownLabel(e.target.value.toUpperCase())} style={{ width: 260, textAlign: "center" }} />
            <input type="date" value={countdownDate} onChange={e => setCountdownDate(e.target.value)}
              style={{ width: 200, textAlign: "center" }} />
            <button className="submit-btn" onClick={handleCountdownSubmit}>Start Countdown</button>
          </div>
        )}

        {/* Keyboard hints */}
        {!isFullscreen && (
          <div className="kbd">← → scenes &nbsp; SPACE auto &nbsp; M mute &nbsp; F fullscreen</div>
        )}

        {/* Screws */}
        <div className="corner-screw" style={{ top: 8, left: 8 }} />
        <div className="corner-screw" style={{ top: 8, right: 8 }} />
        <div className="corner-screw" style={{ bottom: 8, left: 8 }} />
        <div className="corner-screw" style={{ bottom: 8, right: 8 }} />
      </div>

      {/* Footer */}
      {!isFullscreen && (
        <div className="footer">
          Quotes: DummyJSON &middot; Weather: Open-Meteo.com (CC BY 4.0)
        </div>
      )}

      {/* Toast */}
      {copied && <div className="copied-toast">Link copied!</div>}
    </div>
  );
}
