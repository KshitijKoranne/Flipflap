import { useState, useEffect, useRef, useCallback } from "react";

const CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:!?-+/,'()&@#%$";

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
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.015);
      filter.type = "bandpass"; filter.frequency.value = 1200; filter.Q.value = 2;
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.04);
    } catch (e) { /* silent */ }
  };
})();

// ─── Flap Component ─────────────────────────────────────────
function Flap({ targetChar, delay = 0, size = "md" }) {
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
    }, 55);
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

  const dims = { sm: [26, 38, 28, 3], md: [44, 66, 52, 5], lg: [56, 84, 64, 6] }[size] || [44, 66, 52, 5];
  const [w, h, fs, br] = dims;

  const halfSt = (isTop) => ({
    position: "absolute", width: "100%", height: "50%",
    top: isTop ? 0 : "50%", overflow: "hidden",
    background: isTop ? "linear-gradient(180deg, #2c2c2a 0%, #232321 100%)" : "linear-gradient(180deg, #1f1f1d 0%, #1a1a18 100%)",
    borderRadius: isTop ? `${br}px ${br}px 0 0` : `0 0 ${br}px ${br}px`,
    borderTop: isTop ? "none" : "1px solid #0a0a0a", zIndex: 1,
  });
  const charSt = (isTop) => ({
    fontFamily: "'Courier New', monospace", fontWeight: 700, fontSize: fs,
    color: "#f0e8d0", lineHeight: `${h}px`,
    position: "absolute", top: isTop ? 0 : `-${h / 2}px`,
    width: "100%", textAlign: "center", userSelect: "none",
  });

  return (
    <div style={{ width: w, height: h, position: "relative", perspective: 300, margin: "0 1px" }}>
      {flipping && <div style={{ ...halfSt(false), zIndex: 0 }}><span style={charSt(false)}>{nextC}</span></div>}
      <div style={{ ...halfSt(true), zIndex: 2 }}><span style={charSt(true)}>{flipping ? nextC : cur}</span></div>
      <div style={{ ...halfSt(false), zIndex: 1 }}><span style={charSt(false)}>{cur}</span></div>
      {flipping && (
        <div style={{ ...halfSt(true), zIndex: 10, transformOrigin: "bottom center", animation: "flapDown 55ms linear forwards", backfaceVisibility: "hidden" }}>
          <span style={charSt(true)}>{topC}</span>
        </div>
      )}
      <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, background: "#0a0a0a", zIndex: 20, transform: "translateY(-1px)" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "30%", background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)", borderRadius: `${br}px ${br}px 0 0`, zIndex: 21, pointerEvents: "none" }} />
    </div>
  );
}

function FlapRow({ text, length, delay = 0, size = "md" }) {
  const padded = (text || "").toUpperCase().padEnd(length, " ").slice(0, length);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      {padded.split("").map((c, i) => <Flap key={i} targetChar={c} delay={delay + i * 25} size={size} />)}
    </div>
  );
}

function LabelTag({ text, color = "#d4a853" }) {
  return (
    <div style={{ display: "inline-block", padding: "3px 14px", borderRadius: 4, background: color, color: "#0d0d0d", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Helvetica Neue', sans-serif" }}>{text}</div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────
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

// ─── Quote Hook (DummyJSON — free, no key, CORS enabled) ────
const FALLBACK_QUOTES = [
  { quote: "THE ONLY WAY TO DO GREAT WORK IS TO LOVE WHAT YOU DO", author: "STEVE JOBS" },
  { quote: "SIMPLICITY IS THE ULTIMATE SOPHISTICATION", author: "DA VINCI" },
  { quote: "TALK IS CHEAP SHOW ME THE CODE", author: "LINUS TORVALDS" },
  { quote: "DONE IS BETTER THAN PERFECT", author: "SHERYL SANDBERG" },
  { quote: "MAKE IT WORK MAKE IT RIGHT MAKE IT FAST", author: "KENT BECK" },
  { quote: "STAY HUNGRY STAY FOOLISH", author: "STEWART BRAND" },
  { quote: "FIRST DO IT THEN DO IT RIGHT THEN DO IT BETTER", author: "ADDY OSMANI" },
  { quote: "SHIP EARLY SHIP OFTEN", author: "REID HOFFMAN" },
  { quote: "THE BEST ERROR MESSAGE IS THE ONE THAT NEVER SHOWS UP", author: "THOMAS FUCHS" },
  { quote: "MEASURE WHAT MATTERS", author: "JOHN DOERR" },
  { quote: "ANY SUFFICIENTLY ADVANCED TECHNOLOGY IS INDISTINGUISHABLE FROM MAGIC", author: "ARTHUR C CLARKE" },
  { quote: "IF YOU WANT TO GO FAST GO ALONE IF FAR GO TOGETHER", author: "AFRICAN PROVERB" },
];

function useQuote() {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const fallbackIdx = useRef(0);

  const fetchQuote = useCallback(async () => {
    setLoading(true);
    try {
      // DummyJSON — free, no key, CORS enabled, reliable
      const res = await fetch("https://dummyjson.com/quotes/random");
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setQuote({
        quote: (data.quote || "").toUpperCase(),
        author: (data.author || "UNKNOWN").toUpperCase(),
      });
    } catch (e) {
      // Try QuoteSlate as backup
      try {
        const res2 = await fetch("https://quoteslate.vercel.app/api/quotes/random?maxLength=90");
        if (!res2.ok) throw new Error("Backup error");
        const data2 = await res2.json();
        setQuote({
          quote: (data2.quote || "").toUpperCase(),
          author: (data2.author || "UNKNOWN").toUpperCase(),
        });
      } catch (e2) {
        // Fallback to hardcoded
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

// ─── Weather Hook (Open-Meteo — free, no key, CORS enabled) ─
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

const WMO_CODES = {
  0: "CLEAR SKY", 1: "MAINLY CLEAR", 2: "PARTLY CLOUDY", 3: "OVERCAST",
  45: "FOGGY", 48: "RIME FOG", 51: "LIGHT DRIZZLE", 53: "DRIZZLE",
  55: "DENSE DRIZZLE", 61: "LIGHT RAIN", 63: "RAIN", 65: "HEAVY RAIN",
  71: "LIGHT SNOW", 73: "SNOW", 75: "HEAVY SNOW", 80: "RAIN SHOWERS",
  81: "MODERATE SHOWERS", 82: "VIOLENT SHOWERS", 95: "THUNDERSTORM",
  96: "THUNDERSTORM + HAIL", 99: "SEVERE THUNDERSTORM",
};

const WMO_ICONS = {
  0: "☀️", 1: "🌤", 2: "⛅", 3: "☁️", 45: "🌫", 48: "🌫",
  51: "🌦", 53: "🌦", 55: "🌧", 61: "🌧", 63: "🌧", 65: "🌧",
  71: "🌨", 73: "🌨", 75: "❄️", 80: "🌦", 81: "🌧", 82: "⛈",
  95: "⛈", 96: "⛈", 99: "⛈",
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
      if (!res.ok) throw new Error("Weather API error");
      const data = await res.json();
      const c = data.current;
      const code = c.weather_code;
      setWeather({
        city: city.name,
        temp: Math.round(c.temperature_2m),
        humidity: c.relative_humidity_2m,
        wind: Math.round(c.wind_speed_10m),
        condition: WMO_CODES[code] || "UNKNOWN",
        icon: WMO_ICONS[code] || "🌡",
      });
    } catch (e) {
      setWeather({
        city: city.name, temp: "--", humidity: "--", wind: "--",
        condition: "DATA UNAVAILABLE", icon: "❓",
      });
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

// ─── Scene Components ───────────────────────────────────────
function QuoteScene({ quote, loading }) {
  if (loading || !quote) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
        <div style={{ marginBottom: 8 }}><LabelTag text="Quote" color="#d4a853" /></div>
        <FlapRow text="LOADING..." length={22} delay={0} size="md" />
      </div>
    );
  }
  const lines = wrapText(quote.quote, 22).slice(0, 4);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
      <div style={{ marginBottom: 8 }}><LabelTag text="Quote" color="#d4a853" /></div>
      {lines.map((l, i) => <FlapRow key={i} text={l} length={22} delay={i * 180} size="md" />)}
      <div style={{ height: 10 }} />
      <FlapRow text={"- " + quote.author} length={22} delay={lines.length * 180 + 150} size="sm" />
    </div>
  );
}

function ClockScene({ now }) {
  const h = now.getHours().toString().padStart(2, "0");
  const m = now.getMinutes().toString().padStart(2, "0");
  const s = now.getSeconds().toString().padStart(2, "0");
  const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <div style={{ marginBottom: 8 }}><LabelTag text="Local Time" color="#6bba7b" /></div>
      <FlapRow text={`  ${h} : ${m} : ${s}  `} length={14} delay={0} size="lg" />
      <div style={{ height: 8 }} />
      <FlapRow text={days[now.getDay()]} length={12} delay={100} size="md" />
      <FlapRow text={`${months[now.getMonth()]} ${now.getDate()} ${now.getFullYear()}`} length={14} delay={200} size="sm" />
    </div>
  );
}

function WeatherScene({ weather, loading }) {
  if (loading || !weather) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
        <div style={{ marginBottom: 8 }}><LabelTag text="Weather" color="#5ba4d9" /></div>
        <FlapRow text="FETCHING..." length={14} delay={0} size="md" />
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
      <div style={{ marginBottom: 8 }}><LabelTag text="Live Weather" color="#5ba4d9" /></div>
      <FlapRow text={weather.city} length={14} delay={0} size="lg" />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", margin: "8px 0" }}>
        <span style={{ fontSize: 52 }}>{weather.icon}</span>
      </div>
      <FlapRow text={`${weather.temp}C`} length={5} delay={100} size="md" />
      <div style={{ height: 2 }} />
      <FlapRow text={weather.condition} length={22} delay={200} size="sm" />
      <div style={{ height: 2 }} />
      <FlapRow text={`WIND ${weather.wind} KM/H  HUM ${weather.humidity}%`} length={22} delay={350} size="sm" />
    </div>
  );
}

function DepartureScene() {
  const flights = [
    { dest: "MUMBAI BOM", time: "06:45", status: "ON TIME", gate: "A12" },
    { dest: "DELHI DEL", time: "08:30", status: "BOARDING", gate: "B07" },
    { dest: "TOKYO NRT", time: "11:15", status: "DELAYED", gate: "C22" },
    { dest: "NEW YORK JFK", time: "14:00", status: "ON TIME", gate: "D05" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "center" }}>
      <div style={{ marginBottom: 8 }}><LabelTag text="Departures" color="#e07850" /></div>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        {[["DESTINATION", 130], ["TIME", 55], ["STATUS", 88], ["GATE", 38]].map(([h, w]) => (
          <span key={h} style={{ color: "rgba(212,168,83,0.35)", fontSize: 9, letterSpacing: 1.5, fontFamily: "'Helvetica Neue', sans-serif", fontWeight: 600, width: w, textAlign: "center" }}>{h}</span>
        ))}
      </div>
      {flights.map((f, i) => (
        <div key={i} style={{ display: "flex", gap: 3, alignItems: "center" }}>
          <FlapRow text={f.dest} length={12} delay={i * 250} size="sm" />
          <FlapRow text={f.time} length={5} delay={i * 250 + 60} size="sm" />
          <FlapRow text={f.status} length={8} delay={i * 250 + 120} size="sm" />
          <FlapRow text={f.gate} length={3} delay={i * 250 + 180} size="sm" />
        </div>
      ))}
    </div>
  );
}

function CustomScene({ lines }) {
  const wrapped = []; for (const l of lines) wrapped.push(...wrapText(l, 22));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
      <div style={{ marginBottom: 8 }}><LabelTag text="Message" color="#b07cdb" /></div>
      {wrapped.slice(0, 5).map((l, i) => <FlapRow key={i} text={l} length={22} delay={i * 180} size="md" />)}
    </div>
  );
}

// ─── Main Board ─────────────────────────────────────────────
export default function SolariBoard() {
  const now = useTime();
  const { quote, loading: quoteLoading, fetchQuote } = useQuote();
  const { weather, loading: weatherLoading, nextCity } = useWeather();
  const [scene, setScene] = useState("quote");
  const [customText, setCustomText] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customLines, setCustomLines] = useState(["HELLO FROM", "FLIPFLAP", "BUILD. SHIP. REPEAT."]);
  const [autoRotate, setAutoRotate] = useState(true);
  const autoRef = useRef(null);
  const counterRef = useRef(0);
  const [sceneKey, setSceneKey] = useState(0);

  // Auto-rotate
  useEffect(() => {
    if (!autoRotate) { if (autoRef.current) clearInterval(autoRef.current); return; }
    autoRef.current = setInterval(() => {
      counterRef.current += 1;
      const pattern = ["quote", "clock", "weather", "quote", "departures", "clock", "weather"];
      const scn = pattern[counterRef.current % pattern.length];
      setScene(scn);
      setSceneKey(k => k + 1);
      if (scn === "quote") fetchQuote();
      if (scn === "weather") nextCity();
    }, 10000);
    return () => clearInterval(autoRef.current);
  }, [autoRotate, fetchQuote, nextCity]);

  const selectScene = (s) => {
    setAutoRotate(false);
    setScene(s);
    setSceneKey(k => k + 1);
    setShowCustomInput(s === "custom");
    if (s === "quote") fetchQuote();
    if (s === "weather") nextCity();
  };

  const handleCustomSubmit = () => {
    const lines = customText.split("\n").filter(l => l.trim());
    if (lines.length) {
      setCustomLines(lines.map(l => l.toUpperCase()));
      setScene("custom");
      setSceneKey(k => k + 1);
      setAutoRotate(false);
    }
  };

  const sceneBtns = [
    { id: "quote", label: "Quotes", icon: "✦", color: "#d4a853" },
    { id: "clock", label: "Clock", icon: "◷", color: "#6bba7b" },
    { id: "weather", label: "Weather", icon: "◈", color: "#5ba4d9" },
    { id: "departures", label: "Flights", icon: "▷", color: "#e07850" },
    { id: "custom", label: "Custom", icon: "✎", color: "#b07cdb" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Helvetica Neue', sans-serif", padding: "20px 8px", overflow: "hidden" }}>
      <style>{`
        @keyframes flapDown { 0% { transform: rotateX(0deg); } 100% { transform: rotateX(-90deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        textarea:focus { outline: none; border-color: #b07cdb !important; }
        button { cursor: pointer; font-family: 'Helvetica Neue', sans-serif; }
        button:active { transform: scale(0.97); }
      `}</style>

      {/* Ambient glow */}
      <div style={{ position: "fixed", top: "-30%", left: "20%", width: "60%", height: "50%", background: "radial-gradient(ellipse, rgba(212,168,83,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Board */}
      <div style={{ background: "linear-gradient(180deg, #191816 0%, #121110 50%, #0e0d0c 100%)", borderRadius: 16, padding: "28px 16px 20px", maxWidth: 780, width: "100%", boxShadow: "0 0 0 1px rgba(212,168,83,0.08), 0 30px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.03)", position: "relative" }}>

        {/* Gold accent strip */}
        <div style={{ position: "absolute", top: 0, left: 32, right: 32, height: 2, background: "linear-gradient(90deg, transparent, #d4a853, transparent)", opacity: 0.5, borderRadius: "0 0 2px 2px" }} />

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(212,168,83,0.2), transparent)" }} />
          <span style={{ color: "#d4a853", fontSize: 10, letterSpacing: 5, fontWeight: 500, opacity: 0.7 }}>SOLARI DI UDINE</span>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(212,168,83,0.2), transparent)" }} />
        </div>

        {/* Scene area */}
        <div style={{ minHeight: 310, display: "flex", alignItems: "center", justifyContent: "center" }} key={sceneKey}>
          <div style={{ animation: "fadeUp 0.3s ease-out" }}>
            {scene === "quote" && <QuoteScene quote={quote} loading={quoteLoading} />}
            {scene === "clock" && <ClockScene now={now} />}
            {scene === "weather" && <WeatherScene weather={weather} loading={weatherLoading} />}
            {scene === "departures" && <DepartureScene />}
            {scene === "custom" && <CustomScene lines={customLines} />}
          </div>
        </div>

        {/* Scene selector buttons */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16, flexWrap: "wrap" }}>
          {sceneBtns.map(b => (
            <button key={b.id} onClick={() => selectScene(b.id)} style={{
              background: scene === b.id ? `${b.color}18` : "transparent",
              border: `1px solid ${scene === b.id ? b.color + "60" : "rgba(255,255,255,0.06)"}`,
              color: scene === b.id ? b.color : "rgba(255,255,255,0.3)",
              padding: "6px 14px", borderRadius: 20, fontSize: 11, letterSpacing: 1,
              transition: "all 0.3s", display: "flex", alignItems: "center", gap: 5,
            }}>
              <span style={{ fontSize: 12 }}>{b.icon}</span>{b.label}
            </button>
          ))}
        </div>

        {/* Controls row */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 12, gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => setAutoRotate(!autoRotate)} style={{
            background: "none", border: "none", display: "flex", alignItems: "center", gap: 6,
            color: autoRotate ? "#d4a853" : "rgba(255,255,255,0.2)", fontSize: 10, letterSpacing: 2, textTransform: "uppercase",
          }}>
            <span style={{ width: 28, height: 14, borderRadius: 7, background: autoRotate ? "#d4a85340" : "rgba(255,255,255,0.06)", display: "inline-flex", alignItems: "center", padding: "0 2px", transition: "all 0.3s" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: autoRotate ? "#d4a853" : "rgba(255,255,255,0.2)", transform: autoRotate ? "translateX(14px)" : "translateX(0)", transition: "all 0.3s" }} />
            </span>
            Auto-rotate
          </button>
          {scene === "quote" && (
            <button onClick={fetchQuote} style={{ background: "none", border: "1px solid rgba(212,168,83,0.15)", borderRadius: 12, color: "rgba(212,168,83,0.5)", fontSize: 10, padding: "3px 10px", letterSpacing: 1 }}>
              {quoteLoading ? "Loading..." : "New Quote →"}
            </button>
          )}
          {scene === "weather" && (
            <button onClick={nextCity} style={{ background: "none", border: "1px solid rgba(91,164,217,0.15)", borderRadius: 12, color: "rgba(91,164,217,0.5)", fontSize: 10, padding: "3px 10px", letterSpacing: 1 }}>
              {weatherLoading ? "Loading..." : "Next City →"}
            </button>
          )}
        </div>

        {/* Custom input */}
        {showCustomInput && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 14, gap: 8, animation: "fadeUp 0.3s ease-out" }}>
            <textarea value={customText} onChange={e => setCustomText(e.target.value)}
              placeholder={"Type your message...\nUse new lines for rows"} rows={3}
              style={{ width: 280, background: "#111", border: "1px solid rgba(176,124,219,0.2)", color: "#f0e8d0", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontFamily: "'Courier New', monospace", letterSpacing: 1, resize: "none", textTransform: "uppercase" }} />
            <button onClick={handleCustomSubmit} style={{ background: "linear-gradient(180deg, rgba(176,124,219,0.2), rgba(176,124,219,0.1))", border: "1px solid rgba(176,124,219,0.3)", color: "#b07cdb", padding: "7px 24px", borderRadius: 8, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", fontWeight: 600 }}>Flip It</button>
          </div>
        )}

        {/* Corner screws */}
        {[{ top: 8, left: 8 }, { top: 8, right: 8 }, { bottom: 8, left: 8 }, { bottom: 8, right: 8 }].map((p, i) => (
          <div key={i} style={{ position: "absolute", ...p, width: 10, height: 10, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #333, #1a1a1a)", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.6)" }}>
            <div style={{ position: "absolute", top: "50%", left: "20%", right: "20%", height: 1, background: "#111", transform: "translateY(-0.5px) rotate(45deg)" }} />
          </div>
        ))}
      </div>

      {/* Attribution */}
      <div style={{ marginTop: 16, textAlign: "center" }}>
        <div style={{ color: "rgba(255,255,255,0.08)", fontSize: 9, letterSpacing: 4, textTransform: "uppercase" }}>Split-Flap Display</div>
        <div style={{ color: "rgba(255,255,255,0.06)", fontSize: 8, marginTop: 6, letterSpacing: 1 }}>
          Quotes: DummyJSON &middot; Weather: Open-Meteo.com (CC BY 4.0)
        </div>
      </div>
    </div>
  );
}
