// Shared UI primitives, tokens, and persistent chrome (TabBar + MiniPlayer).

const T = {
  // surfaces
  bg:      '#0b0913',
  bgRaise: '#15121f',
  bgCard:  '#1c1828',
  bgChip:  'rgba(243,236,217,0.06)',
  // ink
  ink:     '#f3ecd9',
  ink2:    '#b6a890',
  ink3:    '#6b5f4b',
  // accent
  gold:    '#e3b66a',
  goldSoft:'rgba(227,182,106,0.14)',
  goldEdge:'rgba(227,182,106,0.35)',
  // divider
  rule:    'rgba(243,236,217,0.07)',
};

const FONT_DISPLAY = '"Cormorant Garamond", "Cormorant", "Iowan Old Style", Georgia, serif';
const FONT_UI      = '"Geist", "Inter", -apple-system, system-ui, sans-serif';

// inject fonts + base resets once
if (!document.getElementById('mc-fonts')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,500;1,600&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap';
  link.id = 'mc-fonts';
  document.head.appendChild(link);

  const css = document.createElement('style');
  css.textContent = `
    .mc-app * { box-sizing: border-box; }
    .mc-app { font-family: ${FONT_UI}; color: ${T.ink}; background: ${T.bg}; }
    .mc-app button { font-family: inherit; color: inherit; border: 0; background: transparent; cursor: pointer; }
    .mc-app input { font: inherit; color: inherit; }
    .mc-display { font-family: ${FONT_DISPLAY}; letter-spacing: -0.01em; font-weight: 500; }
    .mc-eyebrow { font-family: ${FONT_UI}; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 500; color: ${T.ink3}; }
    .mc-mono { font-family: "Geist Mono", ui-monospace, monospace; font-variant-numeric: tabular-nums; }
    .mc-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.5; mix-blend-mode: overlay;
                background-image: radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px);
                background-size: 3px 3px; }
    .mc-scroll { overflow-y: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
    .mc-scroll::-webkit-scrollbar { display: none; }
    .mc-row-tap { transition: background 0.12s; }
    .mc-row-tap:active { background: ${T.bgChip}; }
    @keyframes mc-bar {
      0%,100%{ transform: scaleY(0.25); }
      50%    { transform: scaleY(1); }
    }
    @keyframes mc-pulse-ring {
      0% { transform: scale(0.92); opacity: 0.6; }
      100% { transform: scale(1.6); opacity: 0; }
    }
  `;
  document.head.appendChild(css);
}

window.T = T;
window.FONT_DISPLAY = FONT_DISPLAY;
window.FONT_UI = FONT_UI;

// ─────────────────────────────────────────────────────────────
// CategoryGradient — soft top-of-screen wash tinted to category
// ─────────────────────────────────────────────────────────────
function CategoryGradient({ cat, height = 360, intensity = 0.55 }) {
  const c = (CATEGORIES.find(x => x.id === cat) || {}).color || T.gold;
  return (
    <div style={{
      position: 'absolute', inset: `0 0 auto 0`, height, pointerEvents: 'none',
      background: `radial-gradient(120% 100% at 50% 0%, ${c}${Math.round(intensity*255).toString(16).padStart(2,'0')} 0%, transparent 70%)`,
    }}>
      <div className="mc-grain"/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Visualizer — 16 bars, ambient pulse
// ─────────────────────────────────────────────────────────────
function Visualizer({ color = T.gold, bars = 16, height = 28, playing = true }) {
  // Pseudo-random heights, animated via CSS keyframes
  const hs = React.useMemo(() => Array.from({ length: bars }, (_, i) => {
    const v = (Math.sin(i * 1.7) + 1) / 2;
    return 0.3 + v * 0.7;
  }), [bars]);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height }}>
      {hs.map((h, i) => (
        <div key={i} style={{
          width: 3, height: '100%', borderRadius: 1.5, background: color, opacity: 0.85,
          transformOrigin: 'bottom',
          transform: `scaleY(${h})`,
          animation: playing ? `mc-bar ${0.5 + (i % 4) * 0.17}s ease-in-out ${i * 0.04}s infinite` : 'none',
        }}/>
      ))}
    </div>
  );
}

// Big circular pulse — used in NowPlaying hero
function OrbVisualizer({ color, size = 220, playing = true }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* outer rings */}
      {playing && [0, 0.8, 1.6].map((d, i) => (
        <div key={i} style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: `1px solid ${color}`, opacity: 0.4,
          animation: `mc-pulse-ring 2.4s ease-out ${d}s infinite`,
        }}/>
      ))}
      {/* core gradient */}
      <div style={{
        width: size * 0.78, height: size * 0.78, borderRadius: '50%',
        background: `radial-gradient(circle at 30% 30%, ${color}, ${color}40 60%, transparent 75%)`,
        filter: 'blur(0.5px)',
        boxShadow: `0 0 60px ${color}66, inset 0 0 60px ${color}33`,
      }}/>
      {/* inner solid disc */}
      <div style={{
        position: 'absolute', width: size * 0.5, height: size * 0.5, borderRadius: '50%',
        background: `linear-gradient(135deg, ${color}, ${color}99)`,
        boxShadow: `inset 0 -10px 30px rgba(0,0,0,0.4), 0 8px 30px ${color}44`,
      }}/>
    </div>
  );
}

window.CategoryGradient = CategoryGradient;
window.Visualizer = Visualizer;
window.OrbVisualizer = OrbVisualizer;

// ─────────────────────────────────────────────────────────────
// GradeChip — S/A/B/C/D/F pill
// ─────────────────────────────────────────────────────────────
const GRADE_COLOR = {
  S: '#e3b66a', A: '#6fbf7a', B: '#5ca0d9', C: '#d9c25c', D: '#d99860', F: '#d96666',
};
function GradeChip({ grade, size = 22 }) {
  if (!grade) return (
    <div style={{
      width: size, height: size, borderRadius: 4, border: `1px dashed ${T.ink3}`, opacity: 0.5,
    }}/>
  );
  return (
    <div className="mc-mono" style={{
      width: size, height: size, borderRadius: 4, background: GRADE_COLOR[grade] + '22',
      color: GRADE_COLOR[grade], display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.55, fontWeight: 600, border: `1px solid ${GRADE_COLOR[grade]}55`,
    }}>{grade}</div>
  );
}

// ─────────────────────────────────────────────────────────────
// CatChip — small pill with category color + glyph
// ─────────────────────────────────────────────────────────────
function CatChip({ catId, size = 'sm' }) {
  const c = CATEGORIES.find(x => x.id === catId);
  if (!c) return null;
  const small = size === 'sm';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: small ? 5 : 7,
      padding: small ? '3px 8px 3px 6px' : '5px 10px 5px 8px',
      borderRadius: 999, background: c.color + '1f', border: `1px solid ${c.color}33`,
      color: c.color, fontSize: small ? 10 : 12, fontWeight: 500, letterSpacing: 0.04, lineHeight: 1,
    }}>
      <Glyph name={c.glyph} size={small ? 11 : 13} stroke={1.6}/>
      <span style={{ textTransform: 'uppercase' }}>{c.name}</span>
    </div>
  );
}

window.GradeChip = GradeChip;
window.CatChip = CatChip;
window.GRADE_COLOR = GRADE_COLOR;

// ─────────────────────────────────────────────────────────────
// MiniPlayer — sticky bar above tabbar, expands to full NowPlaying
// ─────────────────────────────────────────────────────────────
function MiniPlayer({ track, playing, onToggle, onExpand }) {
  if (!track) return null;
  const cat = CATEGORIES.find(c => c.id === track.cat);
  const color = cat ? cat.color : T.gold;
  const pct = (track.cur / track.dur) * 100;
  return (
    <div onClick={onExpand} style={{
      position: 'relative', margin: '0 10px',
      background: `linear-gradient(180deg, ${cat.dark}cc, ${T.bgRaise}f8)`,
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      border: `1px solid ${color}33`, borderRadius: 18,
      padding: '10px 12px 11px', display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}>
      {/* category art tile */}
      <div style={{
        width: 44, height: 44, borderRadius: 11, flexShrink: 0,
        background: `linear-gradient(135deg, ${color}, ${cat.dark})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: T.ink, boxShadow: `inset 0 -8px 16px rgba(0,0,0,0.3), 0 0 0 1px ${color}33`,
      }}>
        <Glyph name={cat.glyph} size={20} stroke={1.6}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="mc-display" style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.1, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {track.title}
        </div>
        <div style={{ fontSize: 11, color: T.ink2, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {cat.name} · {track.pack}
        </div>
        {/* progress sliver */}
        <div style={{ marginTop: 6, height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 1, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, boxShadow: `0 0 6px ${color}` }}/>
        </div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onToggle(); }} style={{
        width: 40, height: 40, borderRadius: 999, flexShrink: 0,
        background: T.ink, color: cat.dark,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 12px rgba(0,0,0,0.4)`,
      }}>
        <Glyph name={playing ? 'pause' : 'play'} size={18}/>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TabBar — bottom navigation
// ─────────────────────────────────────────────────────────────
function TabBar({ active, onChange }) {
  const tabs = [
    { id: 'library',    label: 'Library',    icon: 'library' },
    { id: 'scenes',     label: 'Scenes',     icon: 'scenes' },
    { id: 'soundboard', label: 'Soundboard', icon: 'soundboard' },
    { id: 'search',     label: 'Search',     icon: 'search' },
  ];
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '8px 4px 6px',
      background: 'rgba(11,9,19,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderTop: `1px solid ${T.rule}`,
    }}>
      {tabs.map(t => {
        const isActive = active === t.id;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '6px 10px', borderRadius: 12,
            color: isActive ? T.gold : T.ink3,
          }}>
            <Glyph name={t.icon} size={22} stroke={isActive ? 1.9 : 1.5}/>
            <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: 0.02 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

window.MiniPlayer = MiniPlayer;
window.TabBar = TabBar;

// ─────────────────────────────────────────────────────────────
// TrackRow — used in category, recent, search
// ─────────────────────────────────────────────────────────────
function TrackRow({ track, index, isPlaying, showCat = false, onTap }) {
  const cat = CATEGORIES.find(c => c.id === track.cat);
  const color = cat ? cat.color : T.gold;
  return (
    <button className="mc-row-tap" onClick={onTap} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 16px', width: '100%', textAlign: 'left',
      borderBottom: `1px solid ${T.rule}`,
      background: isPlaying ? `linear-gradient(90deg, ${color}1a, transparent)` : 'transparent',
    }}>
      <div style={{
        width: 24, textAlign: 'center', flexShrink: 0,
        color: isPlaying ? color : T.ink3, fontSize: 12, fontWeight: 500,
      }}>
        {isPlaying ? <Visualizer color={color} bars={4} height={14}/> : (index != null ? index : '')}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: isPlaying ? color : T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {track.title}
        </div>
        <div style={{ fontSize: 11, color: T.ink2, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {showCat && cat ? (<><span style={{ color: cat.color }}>{cat.name.toUpperCase()}</span><span style={{ color: T.ink3 }}>·</span></>) : null}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.pack}</span>
        </div>
      </div>
      <div className="mc-mono" style={{ fontSize: 11, color: T.ink3, flexShrink: 0 }}>{track.dur}</div>
      <GradeChip grade={track.grade} size={20}/>
    </button>
  );
}

window.TrackRow = TrackRow;
