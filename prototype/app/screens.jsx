// All 6 screens for the Music Companion app.
// Each is a stateless presentational component driven by the App shell state.

// ─────────────────────────────────────────────────────────────
// LIBRARY (Home)
// ─────────────────────────────────────────────────────────────
function LibraryScreen({ onOpenCategory, onPlay, onOpenScene }) {
  const featured = CATEGORIES.slice(0, 6);
  return (
    <div className="mc-scroll" style={{ height: '100%', position: 'relative' }}>
      <CategoryGradient cat="combat" height={420} intensity={0.5}/>

      {/* Header */}
      <div style={{ position: 'relative', padding: '14px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="mc-eyebrow">Friday, Session 14</div>
          <h1 className="mc-display" style={{ margin: 0, fontSize: 32, lineHeight: 1.05, color: T.ink, fontWeight: 600 }}>
            Tonight's <span style={{ fontStyle: 'italic', color: T.gold }}>Score</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={iconBtn}><Glyph name="dice" size={20}/></button>
          <button style={iconBtn}><Glyph name="settings" size={20}/></button>
        </div>
      </div>

      {/* "Now Playing" hero card */}
      <div style={{ position: 'relative', padding: '18px 16px 0' }}>
        <button onClick={() => onPlay(NOW_PLAYING)} style={{
          width: '100%', textAlign: 'left',
          borderRadius: 22, padding: 18, position: 'relative', overflow: 'hidden',
          background: `linear-gradient(135deg, #4a1109 0%, #1a0807 100%)`,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.06)',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -30, opacity: 0.25, color: '#d96a4a' }}>
            <Glyph name="swords" size={200} stroke={1}/>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <CatChip catId="combat"/>
            <div className="mc-eyebrow" style={{ color: '#d96a4a' }}>Now Playing</div>
          </div>
          <div className="mc-display" style={{ fontSize: 30, lineHeight: 1.05, color: T.ink, fontWeight: 600 }}>
            The Apocalypse
          </div>
          <div style={{ fontSize: 12, color: T.ink2, marginTop: 4 }}>
            Haunted Harmonies · Boss
          </div>
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 999,
              background: T.ink, color: '#3b0f0a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
            }}>
              <Glyph name="pause" size={22}/>
            </div>
            <div style={{ flex: 1 }}>
              <Visualizer color="#d96a4a" bars={20} height={26}/>
              <div className="mc-mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.ink2, marginTop: 4 }}>
                <span>2:04</span><span>5:12</span>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Quick Scenes */}
      <Section title="Saved Scenes" trailing={<span style={{ color: T.gold, fontSize: 12 }}>See all</span>}>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 16px 4px', scrollbarWidth: 'none' }}>
          {SCENES.slice(0, 4).map(s => <SceneCardSmall key={s.id} scene={s} onTap={() => onOpenScene(s)}/>)}
        </div>
      </Section>

      {/* Library grid */}
      <Section title="Library">
        <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {featured.map(c => <CategoryTile key={c.id} cat={c} onTap={() => onOpenCategory(c)}/>)}
        </div>
        <div style={{ padding: '12px 16px 0', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {CATEGORIES.slice(6).map(c => (
            <button key={c.id} onClick={() => onOpenCategory(c)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', borderRadius: 999,
              background: T.bgCard, border: `1px solid ${T.rule}`, color: T.ink, fontSize: 13,
            }}>
              <span style={{ color: c.color }}><Glyph name={c.glyph} size={14}/></span>
              {c.name}
              <span style={{ color: T.ink3, fontSize: 11 }}>{c.count}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Recently played */}
      <Section title="Recently Played" icon="clock">
        <div style={{ marginTop: 2 }}>
          {RECENT_TRACKS.slice(0, 5).map((t, i) => (
            <TrackRow key={t.id} track={t} index={i+1} showCat onTap={() => onPlay(t)}/>
          ))}
        </div>
      </Section>

      <div style={{ height: 180 }}/>
    </div>
  );
}

// helper components
const iconBtn = {
  width: 38, height: 38, borderRadius: 12, background: T.bgChip,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: T.ink2,
};

function Section({ title, icon, trailing, children }) {
  return (
    <div style={{ position: 'relative', marginTop: 26 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon && <span style={{ color: T.gold }}><Glyph name={icon} size={16}/></span>}
          <h2 className="mc-display" style={{ margin: 0, fontSize: 22, fontWeight: 600, color: T.ink }}>{title}</h2>
        </div>
        {trailing}
      </div>
      {children}
    </div>
  );
}

function CategoryTile({ cat, onTap }) {
  return (
    <button onClick={onTap} style={{
      position: 'relative', overflow: 'hidden', textAlign: 'left',
      borderRadius: 18, padding: 14, height: 124,
      background: `linear-gradient(150deg, ${cat.color}1f 0%, ${T.bgCard} 60%)`,
      border: `1px solid ${cat.color}30`,
    }}>
      <div style={{ position: 'absolute', right: -18, bottom: -18, color: cat.color, opacity: 0.35 }}>
        <Glyph name={cat.glyph} size={110} stroke={1.2}/>
      </div>
      <div className="mc-eyebrow" style={{ color: cat.color, fontSize: 10 }}>{cat.count} tracks</div>
      <div className="mc-display" style={{ marginTop: 6, fontSize: 22, lineHeight: 1, color: T.ink, fontWeight: 600 }}>
        {cat.name}
      </div>
      <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14, fontSize: 11, color: T.ink2, opacity: 0.85, lineHeight: 1.3 }}>
        {cat.desc.split(',')[0]}
      </div>
    </button>
  );
}

function SceneCardSmall({ scene, onTap }) {
  const primary = CATEGORIES.find(c => c.id === scene.primary);
  return (
    <button onClick={onTap} style={{
      flexShrink: 0, width: 168, height: 138, padding: 14, borderRadius: 18, textAlign: 'left',
      position: 'relative', overflow: 'hidden',
      background: `linear-gradient(160deg, ${primary.color}26 0%, ${T.bgCard} 70%)`,
      border: `1px solid ${primary.color}30`,
    }}>
      <div style={{ position: 'absolute', top: 10, right: 10, color: primary.color, opacity: 0.5 }}>
        <Glyph name={scene.glyph || primary.glyph} size={26}/>
      </div>
      <div className="mc-eyebrow" style={{ color: primary.color, fontSize: 9 }}>Scene</div>
      <div className="mc-display" style={{ marginTop: 6, fontSize: 19, lineHeight: 1.05, color: T.ink, fontWeight: 600 }}>
        {scene.name}
      </div>
      <div style={{ position: 'absolute', left: 14, right: 14, bottom: 14 }}>
        <div style={{ fontSize: 10, color: T.ink2, marginBottom: 6, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{scene.sub}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[scene.primary, ...scene.accents].map(id => {
            const c = CATEGORIES.find(x => x.id === id);
            return <div key={id} style={{ width: 18, height: 4, borderRadius: 2, background: c.color }}/>;
          })}
        </div>
      </div>
    </button>
  );
}

window.LibraryScreen = LibraryScreen;

// ─────────────────────────────────────────────────────────────
// CATEGORY DETAIL
// ─────────────────────────────────────────────────────────────
function CategoryScreen({ cat, onBack, onPlay }) {
  const [grade, setGrade] = React.useState('All');
  const grades = ['All', 'S', 'A', 'B', 'C', 'D', 'F'];

  // Generate a few mock tracks per subcat
  const tracks = React.useMemo(() => {
    const samples = [
      'GreatStart Bed', 'MountainHigh Full', 'NocturnalStalkers Orch',
      'Aboriginal Rituals', 'Battle Lines Drawn', 'Mark of Davy Jones',
      'Sails Set', 'Stairs Will Creak', 'Closing In', 'Quiet Resilience',
    ];
    return samples.map((title, i) => ({
      id: cat.id + i, title, pack: ['Blockbusterbeasts','Hero\'s Journey','Haunted Harmonies'][i % 3],
      cat: cat.id, dur: `${Math.floor(Math.random()*4)+1}:${String(Math.floor(Math.random()*60)).padStart(2,'0')}`,
      grade: ['S','A','A','B','B','C',null,null,'A','S'][i],
    }));
  }, [cat.id]);

  return (
    <div className="mc-scroll" style={{ height: '100%', position: 'relative' }}>
      {/* Hero */}
      <div style={{
        position: 'relative', overflow: 'hidden', minHeight: 260,
        background: `linear-gradient(180deg, ${cat.dark}, ${T.bg} 100%)`,
      }}>
        <div style={{ position: 'absolute', inset: 0,
          background: `radial-gradient(120% 100% at 30% 0%, ${cat.color}44 0%, transparent 60%)` }}/>
        <div className="mc-grain"/>

        {/* Top bar */}
        <div style={{ position: 'relative', padding: '12px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={onBack} style={{ ...iconBtn, transform: 'rotate(180deg)' }}><Glyph name="caret" size={18}/></button>
          <button style={iconBtn}><Glyph name="search" size={18}/></button>
        </div>

        {/* Hero content */}
        <div style={{ position: 'relative', padding: '34px 24px 22px', display: 'flex', gap: 16, alignItems: 'flex-end' }}>
          <div style={{
            width: 100, height: 100, borderRadius: 22, flexShrink: 0,
            background: `linear-gradient(140deg, ${cat.color}, ${cat.dark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.ink,
            boxShadow: `inset 0 -16px 30px rgba(0,0,0,0.4), 0 12px 30px ${cat.color}55`,
          }}>
            <Glyph name={cat.glyph} size={48} stroke={1.4}/>
          </div>
          <div style={{ flex: 1, paddingBottom: 4 }}>
            <div className="mc-eyebrow" style={{ color: cat.color }}>Category</div>
            <h1 className="mc-display" style={{ margin: '4px 0 0', fontSize: 38, lineHeight: 1, color: T.ink, fontWeight: 600 }}>
              {cat.name}
            </h1>
            <div style={{ fontSize: 12, color: T.ink2, marginTop: 6 }}>
              {cat.count} tracks · {cat.subcats ? cat.subcats.length + ' subcategories' : '12 packs'}
            </div>
          </div>
        </div>

        {/* Description + CTAs */}
        <div style={{ position: 'relative', padding: '0 24px 22px' }}>
          <p style={{ margin: 0, fontSize: 14, color: T.ink2, lineHeight: 1.45 }}>{cat.desc}</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button style={{
              flex: 1, padding: '12px 18px', borderRadius: 999, background: cat.color, color: cat.dark,
              fontWeight: 600, fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: `0 6px 18px ${cat.color}66`,
            }}>
              <Glyph name="shuffle" size={16}/> Shuffle Weighted
            </button>
            <button style={{
              padding: '12px 16px', borderRadius: 999, background: T.bgChip, color: T.ink,
              fontWeight: 500, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <Glyph name="sliders" size={16}/>
            </button>
          </div>
        </div>
      </div>

      {/* Grade filter */}
      <div style={{ display: 'flex', gap: 6, padding: '14px 16px 8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {grades.map(g => (
          <button key={g} onClick={() => setGrade(g)} style={{
            padding: '7px 14px', borderRadius: 999, flexShrink: 0,
            background: grade === g ? cat.color + '26' : T.bgChip,
            color: grade === g ? cat.color : T.ink2, fontSize: 12, fontWeight: 500,
            border: grade === g ? `1px solid ${cat.color}66` : `1px solid transparent`,
          }}>{g}</button>
        ))}
      </div>

      {/* Subcategory section header */}
      {cat.subcats && (
        <div style={{ padding: '12px 20px 4px', display: 'flex', gap: 14 }}>
          {cat.subcats.map((s, i) => (
            <div key={s} style={{
              fontSize: 13, fontWeight: 500,
              color: i === 0 ? cat.color : T.ink3,
              borderBottom: i === 0 ? `2px solid ${cat.color}` : '2px solid transparent',
              paddingBottom: 6,
            }}>{s}</div>
          ))}
        </div>
      )}

      {/* Tracks */}
      <div style={{ padding: '4px 0 0' }}>
        {tracks.map((t, i) => (
          <TrackRow key={t.id} track={t} index={i+1} isPlaying={i === 2} onTap={() => onPlay(t)}/>
        ))}
      </div>

      <div style={{ height: 180 }}/>
    </div>
  );
}

window.CategoryScreen = CategoryScreen;

// ─────────────────────────────────────────────────────────────
// NOW PLAYING — full-screen experience
// ─────────────────────────────────────────────────────────────
function NowPlayingScreen({ track, playing, onTogglePlay, onClose }) {
  const cat = CATEGORIES.find(c => c.id === track.cat);
  const [fade, setFade] = React.useState(3);
  const [duck, setDuck] = React.useState(0.4);
  const pct = (track.cur / track.dur) * 100;
  const mins = (s) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: T.bg, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Hero gradient bg */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(120% 60% at 50% 0%, ${cat.color}55, transparent 65%),
                     linear-gradient(180deg, ${cat.dark} 0%, ${T.bg} 80%)`,
      }}/>
      <div className="mc-grain"/>

      <div className="mc-scroll" style={{ position: 'relative', flex: 1, paddingTop: 54 }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 4px' }}>
          <button onClick={onClose} style={iconBtn}><Glyph name="down" size={20}/></button>
          <div style={{ textAlign: 'center' }}>
            <div className="mc-eyebrow" style={{ fontSize: 10, color: T.ink3 }}>Playing from</div>
            <div style={{ fontSize: 12, color: T.ink2, marginTop: 2, fontWeight: 500 }}>
              <span style={{ color: cat.color }}>{cat.name.toUpperCase()}</span>
              {track.sub && <span style={{ color: T.ink3 }}> · {track.sub.toUpperCase()}</span>}
            </div>
          </div>
          <button style={iconBtn}><Glyph name="note" size={20}/></button>
        </div>

        {/* Orb visualizer */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '22px 0 14px' }}>
          <OrbVisualizer color={cat.color} size={240} playing={playing}/>
        </div>

        {/* Title block */}
        <div style={{ padding: '0 28px', textAlign: 'center' }}>
          <h1 className="mc-display" style={{ margin: 0, fontSize: 38, lineHeight: 1.05, color: T.ink, fontWeight: 600 }}>
            {track.title}
          </h1>
          <div style={{ fontSize: 14, color: T.ink2, marginTop: 8 }}>{track.pack}</div>
          {track.note && (
            <div style={{
              marginTop: 14, padding: '10px 14px', borderRadius: 12,
              background: T.gold + '14', border: `1px solid ${T.gold}33`,
              fontSize: 12, color: T.ink, fontStyle: 'italic',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ color: T.gold }}><Glyph name="note" size={14}/></span>
              {track.note}
            </div>
          )}
        </div>

        {/* Scrubber */}
        <div style={{ padding: '28px 28px 0' }}>
          <div style={{ position: 'relative', height: 4, background: 'rgba(255,255,255,0.12)', borderRadius: 2 }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`,
                          background: cat.color, borderRadius: 2, boxShadow: `0 0 12px ${cat.color}` }}/>
            <div style={{
              position: 'absolute', left: `${pct}%`, top: '50%', transform: 'translate(-50%, -50%)',
              width: 14, height: 14, borderRadius: 999, background: T.ink, boxShadow: `0 0 0 4px ${cat.color}40`,
            }}/>
          </div>
          <div className="mc-mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.ink2, marginTop: 8 }}>
            <span>{mins(track.cur)}</span>
            <span style={{ color: T.ink3 }}>−{mins(track.dur - track.cur)}</span>
          </div>
        </div>

        {/* Transport controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '22px 28px 0' }}>
          <button style={{ ...transportBtn, color: T.ink2 }}><Glyph name="shuffle" size={20}/></button>
          <button style={{ ...transportBtn, color: T.ink }}><Glyph name="prev" size={26}/></button>
          <button onClick={onTogglePlay} style={{
            width: 76, height: 76, borderRadius: 999,
            background: `radial-gradient(circle at 30% 30%, ${T.ink}, #d7c89e)`,
            color: cat.dark, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 10px 30px ${cat.color}66`,
          }}>
            <Glyph name={playing ? 'pause' : 'play'} size={28}/>
          </button>
          <button style={{ ...transportBtn, color: T.ink }}><Glyph name="next" size={26}/></button>
          <button style={{ ...transportBtn, color: T.gold }}><Glyph name="loop" size={20}/></button>
        </div>

        {/* Grade rail */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '28px 0 0' }}>
          <span className="mc-eyebrow" style={{ marginRight: 6 }}>Rate</span>
          {['S','A','B','C','D','F'].map(g => (
            <button key={g} style={{
              width: 32, height: 32, borderRadius: 8,
              background: g === track.grade ? GRADE_COLOR[g] + '26' : 'transparent',
              border: `1px solid ${g === track.grade ? GRADE_COLOR[g] + '88' : T.rule}`,
              color: g === track.grade ? GRADE_COLOR[g] : T.ink3,
              fontWeight: 600, fontSize: 12, fontFamily: 'Geist Mono, monospace',
            }}>{g}</button>
          ))}
        </div>

        {/* Mix controls */}
        <div style={{ padding: '26px 24px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <MixSlider icon="fade" label="Crossfade" value={fade} max={10} suffix="s" onChange={setFade} color={cat.color}/>
            <MixSlider icon="duck" label="Duck SFX" value={duck} max={1} suffix="" onChange={setDuck} color={cat.color} formatter={v => `${Math.round(v*100)}%`}/>
          </div>
        </div>

        {/* Up next */}
        <div style={{ padding: '28px 0 0' }}>
          <div style={{ padding: '0 20px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Glyph name="queue" size={16}/>
            <h3 className="mc-display" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Up Next</h3>
          </div>
          {UP_NEXT.map((t, i) => (
            <TrackRow key={i} track={{ ...t, grade: null }} index={i+1} showCat/>
          ))}
        </div>

        <div style={{ height: 120 }}/>
      </div>
    </div>
  );
}

const transportBtn = {
  width: 48, height: 48, borderRadius: 12,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};

function MixSlider({ icon, label, value, max, suffix, color, onChange, formatter }) {
  const pct = (value / max) * 100;
  return (
    <div style={{
      padding: 12, borderRadius: 14, background: T.bgCard, border: `1px solid ${T.rule}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.ink2 }}>
          <Glyph name={icon} size={14}/>
          <span style={{ fontSize: 11, color: T.ink2 }}>{label}</span>
        </div>
        <span className="mc-mono" style={{ fontSize: 12, color: T.ink, fontWeight: 500 }}>
          {formatter ? formatter(value) : `${value}${suffix}`}
        </span>
      </div>
      <div style={{ marginTop: 10, position: 'relative', height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: color, borderRadius: 2 }}/>
        <div style={{ position: 'absolute', left: `${pct}%`, top: '50%', transform: 'translate(-50%, -50%)',
                      width: 12, height: 12, borderRadius: 999, background: T.ink }}/>
      </div>
    </div>
  );
}

window.NowPlayingScreen = NowPlayingScreen;

// ─────────────────────────────────────────────────────────────
// SCENES
// ─────────────────────────────────────────────────────────────
function ScenesScreen({ onPlay }) {
  return (
    <div className="mc-scroll" style={{ height: '100%', position: 'relative' }}>
      <CategoryGradient cat="horror" height={280} intensity={0.4}/>

      {/* Header */}
      <div style={{ position: 'relative', padding: '14px 20px 0' }}>
        <div className="mc-eyebrow">Snapshots</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 }}>
          <h1 className="mc-display" style={{ margin: 0, fontSize: 32, lineHeight: 1, color: T.ink, fontWeight: 600 }}>
            <span style={{ fontStyle: 'italic', color: T.gold }}>Scenes</span>
          </h1>
          <button style={{
            padding: '8px 14px', borderRadius: 999, background: T.gold, color: '#1a1108',
            fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <Glyph name="plus" size={14}/> Save current
          </button>
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 13, color: T.ink2, lineHeight: 1.45 }}>
          Snapshot a category, soundboard layout, fade, and playback mode. Tap to restore in one tap.
        </p>
      </div>

      {/* Quick chip bar (active scene) */}
      <div style={{ padding: '18px 20px 0' }}>
        <div className="mc-eyebrow" style={{ marginBottom: 8 }}>Active</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {SCENES.slice(0, 3).map(s => {
            const c = CATEGORIES.find(x => x.id === s.primary);
            return (
              <div key={s.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 999,
                background: c.color + '1f', border: `1px solid ${c.color}55`, color: T.ink,
                fontSize: 12,
              }}>
                <Glyph name={s.glyph || c.glyph} size={14}/>
                {s.name}
                <button style={{ color: T.ink3, marginLeft: 4 }}><Glyph name="close" size={12}/></button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scene grid */}
      <div style={{ padding: '24px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {SCENES.map(s => <SceneCardLarge key={s.id} scene={s} onTap={() => onPlay(NOW_PLAYING)}/>)}
      </div>

      <div style={{ height: 200 }}/>
    </div>
  );
}

function SceneCardLarge({ scene, onTap }) {
  const primary = CATEGORIES.find(c => c.id === scene.primary);
  return (
    <button onClick={onTap} style={{
      position: 'relative', overflow: 'hidden', textAlign: 'left',
      borderRadius: 20, padding: 16, height: 200,
      background: `linear-gradient(155deg, ${primary.color}33 0%, ${primary.dark}80 60%, ${T.bgCard} 100%)`,
      border: `1px solid ${primary.color}33`,
    }}>
      <div style={{ position: 'absolute', right: -22, top: -16, color: primary.color, opacity: 0.25 }}>
        <Glyph name={scene.glyph || primary.glyph} size={140} stroke={1.1}/>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="mc-eyebrow" style={{ color: primary.color, fontSize: 9 }}>Scene</div>
        <div style={{
          width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, color: T.ink2, fontWeight: 600,
        }}>{scene.soundboardPage}</div>
      </div>
      <div className="mc-display" style={{ marginTop: 8, fontSize: 24, lineHeight: 1.05, color: T.ink, fontWeight: 600 }}>
        {scene.name}
      </div>
      <div style={{ fontSize: 11, color: T.ink2, marginTop: 6, lineHeight: 1.35 }}>{scene.sub}</div>
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14 }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {[scene.primary, ...scene.accents].map(id => {
            const c = CATEGORIES.find(x => x.id === id);
            return <div key={id} style={{ width: 22, height: 5, borderRadius: 2.5, background: c.color }}/>;
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 10, color: T.ink3 }}>{scene.tracks} tracks</div>
          <div style={{
            width: 26, height: 26, borderRadius: 999, background: primary.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: primary.dark,
          }}>
            <Glyph name="play" size={11}/>
          </div>
        </div>
      </div>
    </button>
  );
}

window.ScenesScreen = ScenesScreen;

// ─────────────────────────────────────────────────────────────
// SOUNDBOARD
// ─────────────────────────────────────────────────────────────
function SoundboardScreen() {
  const [page, setPage] = React.useState('A');
  return (
    <div className="mc-scroll" style={{ height: '100%', position: 'relative' }}>
      <CategoryGradient cat="sfx" height={260} intensity={0.35}/>

      {/* Header */}
      <div style={{ position: 'relative', padding: '14px 20px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="mc-eyebrow">Instant triggers</div>
          <h1 className="mc-display" style={{ margin: '4px 0 0', fontSize: 32, lineHeight: 1, color: T.ink, fontWeight: 600 }}>
            <span style={{ fontStyle: 'italic', color: '#5cc4d9' }}>Soundboard</span>
          </h1>
        </div>
        <button style={iconBtn}><Glyph name="sliders" size={18}/></button>
      </div>

      {/* Page tabs */}
      <div style={{ padding: '20px 20px 0', display: 'flex', gap: 8 }}>
        {['A', 'B', 'C'].map(p => (
          <button key={p} onClick={() => setPage(p)} style={{
            flex: 1, padding: '10px 0', borderRadius: 12,
            background: page === p ? '#5cc4d922' : T.bgChip,
            border: `1px solid ${page === p ? '#5cc4d966' : T.rule}`,
            color: page === p ? '#5cc4d9' : T.ink2,
            fontWeight: 600, fontSize: 14, letterSpacing: 0.04,
          }}>Page {p}</button>
        ))}
      </div>

      {/* 4×2 grid */}
      <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {SOUNDBOARD[page].map((slot) => <SoundPad key={slot.slot} slot={slot}/>)}
      </div>

      {/* Active SFX layer */}
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Glyph name="speaker" size={16}/>
            <h2 className="mc-display" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>SFX Layer</h2>
          </div>
          <div className="mc-eyebrow" style={{ color: ACTIVE_SFX.length ? '#5cc4d9' : T.ink3 }}>
            {ACTIVE_SFX.length} active · ducking 40%
          </div>
        </div>
        {ACTIVE_SFX.map((sfx, i) => <ActiveSfxRow key={i} sfx={sfx}/>)}
      </div>

      <div style={{ height: 200 }}/>
    </div>
  );
}

function SoundPad({ slot }) {
  if (!slot.title) {
    return (
      <button style={{
        height: 96, borderRadius: 16, background: 'transparent',
        border: `1.5px dashed ${T.rule}`, color: T.ink3,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <Glyph name="plus" size={20}/>
          <span style={{ fontSize: 10 }}>Slot {slot.slot}</span>
        </div>
      </button>
    );
  }
  const c = CATEGORIES.find(x => x.id === slot.cat) || CATEGORIES.find(x => x.id === 'sfx');
  return (
    <button style={{
      position: 'relative', height: 96, borderRadius: 16,
      background: slot.active
        ? `linear-gradient(150deg, ${c.color} 0%, ${c.dark} 90%)`
        : `linear-gradient(150deg, ${c.color}24 0%, ${T.bgCard} 80%)`,
      border: `1px solid ${slot.active ? c.color : c.color + '33'}`,
      textAlign: 'left', padding: 12, color: T.ink,
      boxShadow: slot.active ? `0 8px 24px ${c.color}66, inset 0 -10px 18px rgba(0,0,0,0.3)` : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div className="mc-mono" style={{ fontSize: 9, opacity: 0.6 }}>{slot.slot}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {slot.loop && <Glyph name="loop" size={12} stroke={1.8}/>}
        </div>
      </div>
      <div style={{
        position: 'absolute', left: 12, right: 12, bottom: 30,
        fontSize: 13, fontWeight: 600, lineHeight: 1.15,
        color: slot.active ? T.ink : T.ink,
      }}>{slot.title}</div>
      <div style={{
        position: 'absolute', left: 12, right: 12, bottom: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span className="mc-mono" style={{ fontSize: 9, opacity: 0.7 }}>{slot.dur}</span>
        {slot.active
          ? <Visualizer color={T.ink} bars={6} height={12}/>
          : <span style={{ color: c.color, opacity: 0.8 }}><Glyph name="play" size={12}/></span>}
      </div>
    </button>
  );
}

function ActiveSfxRow({ sfx }) {
  const c = CATEGORIES.find(x => x.id === sfx.cat);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 12px', borderRadius: 12, marginBottom: 6,
      background: T.bgCard, border: `1px solid ${T.rule}`,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
        background: `linear-gradient(140deg, ${c.color}, ${c.dark})`,
        color: T.ink, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><Glyph name={c.glyph} size={16}/></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>{sfx.title}</div>
        <div style={{ marginTop: 5, position: 'relative', height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${sfx.vol * 100}%`,
                        background: c.color, borderRadius: 2 }}/>
        </div>
      </div>
      {sfx.loop && <span style={{ color: c.color }}><Glyph name="loop" size={14}/></span>}
      <button style={{ color: T.ink3 }}><Glyph name="close" size={16}/></button>
    </div>
  );
}

window.SoundboardScreen = SoundboardScreen;

// ─────────────────────────────────────────────────────────────
// SEARCH
// ─────────────────────────────────────────────────────────────
function SearchScreen({ onPlay }) {
  const [q, setQ] = React.useState('dragon');
  const results = q ? SEARCH_RESULTS : [];
  return (
    <div className="mc-scroll" style={{ height: '100%', position: 'relative' }}>
      <CategoryGradient cat="voices" height={200} intensity={0.3}/>

      <div style={{ position: 'relative', padding: '14px 20px 0' }}>
        <div className="mc-eyebrow">All 4,796 tracks</div>
        <h1 className="mc-display" style={{ margin: '4px 0 16px', fontSize: 32, lineHeight: 1, color: T.ink, fontWeight: 600 }}>
          <span style={{ fontStyle: 'italic', color: T.gold }}>Find</span> anything
        </h1>

        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', borderRadius: 14, background: T.bgCard,
          border: `1px solid ${T.rule}`,
        }}>
          <span style={{ color: T.ink2 }}><Glyph name="search" size={18}/></span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Track, pack, or category…" style={{
            flex: 1, background: 'transparent', border: 0, outline: 0, fontSize: 15, color: T.ink,
          }}/>
          {q && <button onClick={() => setQ('')} style={{ color: T.ink3 }}><Glyph name="close" size={16}/></button>}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {['All', 'S grade', 'Loops only', '< 30s', 'No vocals'].map((f, i) => (
            <button key={f} style={{
              padding: '6px 12px', borderRadius: 999,
              background: i === 0 ? T.gold + '26' : T.bgChip,
              color: i === 0 ? T.gold : T.ink2, fontSize: 11, fontWeight: 500,
              border: i === 0 ? `1px solid ${T.gold}66` : `1px solid transparent`,
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* Results or Recents */}
      {q ? (
        <div style={{ padding: '24px 0 0' }}>
          <div style={{ padding: '0 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="mc-eyebrow">{results.length} results for "{q}"</div>
            <span className="mc-mono" style={{ fontSize: 10, color: T.ink3 }}>sorted: grade</span>
          </div>
          {results.map((t, i) => (
            <TrackRow key={i} track={t} index={i+1} showCat onTap={() => onPlay(t)}/>
          ))}
        </div>
      ) : (
        <div style={{ padding: '28px 20px 0' }}>
          <div className="mc-eyebrow" style={{ marginBottom: 10 }}>Recent searches</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SEARCH_RECENT.map(s => (
              <button key={s} onClick={() => setQ(s)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 999,
                background: T.bgCard, border: `1px solid ${T.rule}`, color: T.ink, fontSize: 12,
              }}>
                <span style={{ color: T.ink3 }}><Glyph name="clock" size={12}/></span>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ height: 200 }}/>
    </div>
  );
}

window.SearchScreen = SearchScreen;
