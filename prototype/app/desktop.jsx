// Desktop (Windows 11) shell for Music Companion.
// Three-pane workspace: Sidebar · Main · Right rail, with persistent transport bar.

function DesktopApp({ view = 'library', initialCategory = CATEGORIES[0] }) {
  const [tab, setTab] = React.useState(view);
  const [cat, setCat] = React.useState(initialCategory);
  const [npTrack] = React.useState(NOW_PLAYING);
  const [playing, setPlaying] = React.useState(true);

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: T.bg, color: T.ink,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Subtle ambient gradient based on now-playing category */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.6,
        background: `radial-gradient(60% 50% at 75% 0%, ${CATEGORIES.find(c => c.id === npTrack.cat).color}22 0%, transparent 60%),
                     radial-gradient(40% 40% at 0% 100%, ${T.gold}11 0%, transparent 60%)`,
      }}/>
      <DesktopHeader tab={tab} setTab={setTab}/>
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        <DesktopSidebar selected={cat} onSelect={setCat} tab={tab}/>
        <DesktopMain tab={tab} cat={cat}/>
        <DesktopRightRail track={npTrack}/>
      </div>
      <DesktopTransport track={npTrack} playing={playing} onToggle={() => setPlaying(p => !p)}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HEADER (toolbar)
// ─────────────────────────────────────────────────────────────
function DesktopHeader({ tab, setTab }) {
  const tabs = [
    { id: 'library', label: 'Library', icon: 'library' },
    { id: 'scenes', label: 'Scenes', icon: 'scenes' },
    { id: 'soundboard', label: 'Soundboard', icon: 'soundboard' },
  ];
  return (
    <div style={{
      position: 'relative', zIndex: 2, flexShrink: 0, height: 56,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 18px', borderBottom: `1px solid ${T.rule}`,
      background: 'rgba(11,9,19,0.6)', backdropFilter: 'blur(20px)',
    }}>
      {/* App name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: 244 }}>
        <h1 className="mc-display" style={{ margin: 0, fontSize: 22, fontWeight: 600, color: T.ink }}>
          Major <span style={{ fontStyle: 'italic', color: T.gold }}>Ambience</span>
        </h1>
      </div>

      {/* Tabs (center) */}
      <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: T.bgChip }}>
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '7px 14px', borderRadius: 9,
              background: active ? T.gold + '26' : 'transparent',
              color: active ? T.gold : T.ink2,
              fontSize: 13, fontWeight: 500,
            }}>
              <Glyph name={t.icon} size={15} stroke={active ? 1.9 : 1.5}/>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Right cluster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 360, justifyContent: 'flex-end' }}>
        {/* Global search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderRadius: 10,
          background: T.bgCard, border: `1px solid ${T.rule}`,
          width: 240, color: T.ink2,
        }}>
          <Glyph name="search" size={14}/>
          <input placeholder="Search 4,796 tracks…" style={{
            flex: 1, background: 'transparent', border: 0, outline: 0, fontSize: 12, color: T.ink2,
          }}/>
          <span className="mc-mono" style={{ fontSize: 10, color: T.ink3,
            padding: '2px 6px', borderRadius: 4, background: T.bgChip, border: `1px solid ${T.rule}` }}>⌘K</span>
        </div>
        <button style={iconBtnDesktop} title="Roll NPC name"><Glyph name="dice" size={16}/></button>
        <button style={iconBtnDesktop} title="DM mode"><Glyph name="theatre" size={16}/></button>
        <button style={iconBtnDesktop} title="Settings"><Glyph name="settings" size={16}/></button>
      </div>
    </div>
  );
}

const iconBtnDesktop = {
  width: 34, height: 34, borderRadius: 9, background: 'transparent', color: T.ink2,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};

// ─────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────
function DesktopSidebar({ selected, onSelect }) {
  return (
    <div className="mc-scroll" style={{
      flexShrink: 0, width: 244, borderRight: `1px solid ${T.rule}`,
      padding: '14px 8px 14px 14px', position: 'relative',
    }}>
      {/* Folder */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', borderRadius: 10, marginBottom: 14,
        background: T.bgChip,
      }}>
        <span style={{ color: T.gold }}><Glyph name="library" size={16}/></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>MUSIC</div>
          <div className="mc-mono" style={{ fontSize: 10, color: T.ink3 }}>4,796 tracks</div>
        </div>
      </div>

      {/* Virtual lists */}
      <SidebarSection title="Library">
        <SidebarRow icon="star" label="Favorites"     count={73}  color={T.gold}/>
        <SidebarRow icon="clock" label="Recently played" count={12}  color={T.ink2}/>
      </SidebarSection>

      <SidebarSection title="Categories">
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => onSelect(c)} style={{
            width: '100%', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', borderRadius: 9,
            background: selected.id === c.id ? c.color + '20' : 'transparent',
            color: selected.id === c.id ? c.color : T.ink2,
            fontSize: 13, fontWeight: 500, marginBottom: 2,
            borderLeft: selected.id === c.id ? `2px solid ${c.color}` : '2px solid transparent',
          }}>
            <Glyph name={c.glyph} size={15} stroke={selected.id === c.id ? 1.9 : 1.5}/>
            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
            <span className="mc-mono" style={{ fontSize: 10, color: T.ink3 }}>{c.count}</span>
          </button>
        ))}
      </SidebarSection>

      <button style={{
        marginTop: 4, marginLeft: 12, padding: '6px 0',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 12, color: T.ink3,
      }}>
        <Glyph name="plus" size={12}/> New category
      </button>
    </div>
  );
}

function SidebarSection({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div className="mc-eyebrow" style={{ padding: '4px 12px 8px' }}>{title}</div>
      {children}
    </div>
  );
}

function SidebarRow({ icon, label, count, color }) {
  return (
    <button style={{
      width: '100%', textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', borderRadius: 9, color: T.ink2,
      fontSize: 13, fontWeight: 500,
    }}>
      <span style={{ color }}><Glyph name={icon} size={15}/></span>
      <span style={{ flex: 1 }}>{label}</span>
      <span className="mc-mono" style={{ fontSize: 10, color: T.ink3 }}>{count}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN (center)
// ─────────────────────────────────────────────────────────────
function DesktopMain({ tab, cat }) {
  if (tab === 'scenes') return <DesktopScenesView/>;
  if (tab === 'soundboard') return <DesktopSoundboardView/>;
  return <DesktopLibraryView cat={cat}/>;
}

function DesktopLibraryView({ cat }) {
  const tracks = React.useMemo(() => {
    const samples = [
      ['GreatStart Bed', 'Blockbusterbeasts', '1:44', 'S', 14],
      ['MountainHigh Full', 'Blockbusterbeasts', '2:33', 'A', 8],
      ['MountainHigh Bed', 'Blockbusterbeasts', '2:33', 'A', 6],
      ['GreatStart 60 Full', 'Blockbusterbeasts', '1:00', 'B', 3],
      ['Mark of Davy Jones', 'Haunted Harmonies', '4:18', 'S', 22],
      ['Battle Lines Drawn', 'Haunted Harmonies', '3:44', 'A', 11],
      ['The Apocalypse', 'Haunted Harmonies', '5:12', 'S', 47, true],
      ['Sails Set', "Hero's Journey", '3:08', 'B', 5],
      ['Dawn of Apocalypse', 'Ominous Overtures', '4:50', 'S', 12],
      ['Rise Against the Machines', "Hero's Journey", '3:22', 'A', 9],
      ['Pirates Hidden Lair', "Hero's Journey", '2:48', 'B', 7],
      ['Black Powder Musket', 'Grand Fleet', '3:34', 'C', 2],
    ];
    return samples.map(([title, pack, dur, grade, plays, np], i) => ({
      id: i, title, pack, dur, grade, plays, cat: cat.id, np,
    }));
  }, [cat.id]);

  return (
    <div className="mc-scroll" style={{ flex: 1, minWidth: 0, position: 'relative' }}>
      {/* Hero */}
      <div style={{
        position: 'relative', overflow: 'hidden', padding: '24px 32px 20px',
        background: `linear-gradient(180deg, ${cat.dark}88, transparent 100%)`,
      }}>
        <div style={{ position: 'absolute', inset: 0, background:
          `radial-gradient(60% 100% at 100% 0%, ${cat.color}33 0%, transparent 60%)` }}/>
        <div className="mc-grain"/>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 22 }}>
          <div style={{
            width: 112, height: 112, borderRadius: 22, flexShrink: 0,
            background: `linear-gradient(140deg, ${cat.color}, ${cat.dark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.ink,
            boxShadow: `inset 0 -18px 32px rgba(0,0,0,0.4), 0 14px 32px ${cat.color}55`,
          }}>
            <Glyph name={cat.glyph} size={52} stroke={1.4}/>
          </div>
          <div style={{ flex: 1, paddingBottom: 6 }}>
            <div className="mc-eyebrow" style={{ color: cat.color }}>Category</div>
            <h1 className="mc-display" style={{ margin: '4px 0 4px', fontSize: 46, lineHeight: 1, fontWeight: 600, color: T.ink }}>
              {cat.name}
            </h1>
            <div style={{ fontSize: 13, color: T.ink2, maxWidth: 540 }}>{cat.desc}</div>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 18 }}>
              <button style={{
                padding: '10px 18px', borderRadius: 999,
                background: cat.color, color: cat.dark,
                fontWeight: 600, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8,
                boxShadow: `0 6px 18px ${cat.color}55`,
              }}><Glyph name="shuffle" size={14}/> Shuffle weighted</button>
              <button style={{
                padding: '10px 14px', borderRadius: 999, background: T.bgChip, color: T.ink, fontSize: 13,
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}><Glyph name="plus" size={14}/> Save as scene</button>
              <div className="mc-mono" style={{ fontSize: 11, color: T.ink3 }}>
                {cat.count} tracks · {cat.subcats ? cat.subcats.length + ' subcats' : '12 packs'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subcategory tabs + grade filter */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 32px 10px', borderBottom: `1px solid ${T.rule}`, gap: 18,
      }}>
        <div style={{ display: 'flex', gap: 20 }}>
          {(cat.subcats || ['All']).map((s, i) => (
            <div key={s} style={{
              fontSize: 13, fontWeight: 500, paddingBottom: 8,
              color: i === 0 ? cat.color : T.ink3,
              borderBottom: i === 0 ? `2px solid ${cat.color}` : '2px solid transparent',
            }}>{s} {i === 0 && cat.subcats && <span className="mc-mono" style={{ color: T.ink3, marginLeft: 4 }}>{Math.floor(cat.count * 0.4)}</span>}</div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="mc-eyebrow" style={{ marginRight: 4 }}>Grade</span>
          {['All','S','A','B','C','D','F'].map((g, i) => (
            <button key={g} style={{
              width: 26, height: 26, borderRadius: 6,
              background: i === 0 ? cat.color + '22' : T.bgChip,
              color: i === 0 ? cat.color : T.ink2,
              fontWeight: 600, fontSize: 11, fontFamily: 'Geist Mono, monospace',
              border: i === 0 ? `1px solid ${cat.color}55` : `1px solid transparent`,
            }}>{g}</button>
          ))}
        </div>
      </div>

      {/* Track list header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '32px 1fr 240px 70px 60px 60px 130px',
        padding: '8px 32px', fontSize: 10, color: T.ink3,
        textTransform: 'uppercase', letterSpacing: 0.12, borderBottom: `1px solid ${T.rule}`,
      }}>
        <div>#</div><div>Title</div><div>Pack</div><div>Plays</div><div>Grade</div><div>Time</div><div></div>
      </div>

      {/* Track rows (desktop) */}
      {tracks.map((t, i) => <DesktopTrackRow key={t.id} t={t} i={i+1}/>)}

      <div style={{ height: 24 }}/>
    </div>
  );
}

function DesktopTrackRow({ t, i }) {
  const c = CATEGORIES.find(x => x.id === t.cat);
  return (
    <div className="mc-row-tap" style={{
      display: 'grid', gridTemplateColumns: '32px 1fr 240px 70px 60px 60px 130px',
      padding: '10px 32px', alignItems: 'center', gap: 8,
      borderBottom: `1px solid ${T.rule}`,
      background: t.np ? `linear-gradient(90deg, ${c.color}14, transparent 40%)` : 'transparent',
    }}>
      <div style={{ color: t.np ? c.color : T.ink3, fontSize: 12 }}>
        {t.np ? <Visualizer color={c.color} bars={4} height={14}/> : i}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 7, flexShrink: 0,
          background: `linear-gradient(140deg, ${c.color}66, ${c.dark})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.ink,
        }}><Glyph name={c.glyph} size={14}/></div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: t.np ? c.color : T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t.title}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: T.ink2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {t.pack}
      </div>
      <div className="mc-mono" style={{ fontSize: 11, color: T.ink3 }}>{t.plays}×</div>
      <GradeChip grade={t.grade} size={22}/>
      <div className="mc-mono" style={{ fontSize: 12, color: T.ink2 }}>{t.dur}</div>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
        {['queue','speaker','pin','note'].map(n => (
          <button key={n} style={{
            width: 28, height: 28, borderRadius: 7, color: T.ink3,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}><Glyph name={n} size={13}/></button>
        ))}
      </div>
    </div>
  );
}

function DesktopScenesView() {
  return (
    <div className="mc-scroll" style={{ flex: 1, minWidth: 0, position: 'relative', padding: '24px 32px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div className="mc-eyebrow">Snapshots</div>
          <h1 className="mc-display" style={{ margin: '4px 0 4px', fontSize: 38, fontWeight: 600 }}>
            <span style={{ fontStyle: 'italic', color: T.gold }}>Scenes</span>
          </h1>
          <div style={{ fontSize: 13, color: T.ink2, maxWidth: 560 }}>
            Snapshot the current category, soundboard layout, fade and playback mode. Tap to restore everything.
          </div>
        </div>
        <button style={{
          padding: '10px 16px', borderRadius: 999, background: T.gold, color: '#1a1108',
          fontWeight: 600, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8,
        }}><Glyph name="plus" size={14}/> Save current scene</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {SCENES.map(s => <SceneCardLarge key={s.id} scene={s} onTap={() => {}}/>)}
      </div>
    </div>
  );
}

function DesktopSoundboardView() {
  const [page, setPage] = React.useState('A');
  return (
    <div className="mc-scroll" style={{ flex: 1, minWidth: 0, position: 'relative', padding: '24px 32px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div className="mc-eyebrow">Instant triggers</div>
          <h1 className="mc-display" style={{ margin: '4px 0 4px', fontSize: 38, fontWeight: 600 }}>
            <span style={{ fontStyle: 'italic', color: '#5cc4d9' }}>Soundboard</span>
          </h1>
          <div style={{ fontSize: 13, color: T.ink2, maxWidth: 560 }}>
            24 slots across A / B / C. Click pads to fire, drag tracks to assign. Press 1–8 for the active page.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['A','B','C'].map(p => (
            <button key={p} onClick={() => setPage(p)} style={{
              padding: '8px 18px', borderRadius: 10,
              background: page === p ? '#5cc4d922' : T.bgChip,
              color: page === p ? '#5cc4d9' : T.ink2,
              border: `1px solid ${page === p ? '#5cc4d966' : T.rule}`,
              fontWeight: 600, fontSize: 13,
            }}>Page {p}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {SOUNDBOARD[page].map(slot => <SoundPad key={slot.slot} slot={slot}/>)}
      </div>

      {/* SFX Layer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 12 }}>
        <h2 className="mc-display" style={{ margin: 0, fontSize: 22, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Glyph name="speaker" size={18}/> Active SFX Layer
        </h2>
        <span className="mc-eyebrow" style={{ color: '#5cc4d9' }}>{ACTIVE_SFX.length} playing · ducking 40%</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {ACTIVE_SFX.map((sfx, i) => <ActiveSfxRow key={i} sfx={sfx}/>)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RIGHT RAIL (Now Playing + Queue + Soundboard mini)
// ─────────────────────────────────────────────────────────────
function DesktopRightRail({ track }) {
  const c = CATEGORIES.find(x => x.id === track.cat);
  const pct = (track.cur / track.dur) * 100;
  const mins = (s) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

  return (
    <div className="mc-scroll" style={{
      flexShrink: 0, width: 360, borderLeft: `1px solid ${T.rule}`,
      padding: 16, position: 'relative',
    }}>
      {/* Now Playing card */}
      <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: 18, padding: 18,
        background: `linear-gradient(165deg, ${c.dark} 0%, ${T.bgCard} 100%)`,
        border: `1px solid ${c.color}33`,
      }}>
        <div style={{ position: 'absolute', inset: 0,
          background: `radial-gradient(100% 80% at 50% 0%, ${c.color}33 0%, transparent 60%)` }}/>
        <div className="mc-grain"/>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <CatChip catId={track.cat}/>
            <button style={{ color: T.ink3 }}><Glyph name="settings" size={14}/></button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 6px' }}>
            <OrbVisualizer color={c.color} size={156} playing={true}/>
          </div>
          <div className="mc-display" style={{
            textAlign: 'center', fontSize: 26, lineHeight: 1.05, fontWeight: 600, color: T.ink,
          }}>{track.title}</div>
          <div style={{ textAlign: 'center', fontSize: 11, color: T.ink2, marginTop: 4 }}>
            {track.pack}
          </div>

          {track.note && (
            <div style={{
              marginTop: 12, padding: '8px 12px', borderRadius: 10,
              background: T.gold + '14', border: `1px solid ${T.gold}33`,
              fontSize: 11, color: T.ink, fontStyle: 'italic', lineHeight: 1.4,
              display: 'flex', gap: 8,
            }}>
              <span style={{ color: T.gold, flexShrink: 0, marginTop: 1 }}><Glyph name="note" size={12}/></span>
              {track.note}
            </div>
          )}

          <div style={{ marginTop: 14, position: 'relative', height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: c.color, borderRadius: 2 }}/>
          </div>
          <div className="mc-mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.ink2, marginTop: 6 }}>
            <span>{mins(track.cur)}</span><span>−{mins(track.dur - track.cur)}</span>
          </div>

          {/* Grade row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 14 }}>
            {['S','A','B','C','D','F'].map(g => (
              <button key={g} style={{
                width: 26, height: 26, borderRadius: 6,
                background: g === track.grade ? GRADE_COLOR[g] + '26' : 'transparent',
                border: `1px solid ${g === track.grade ? GRADE_COLOR[g] + '88' : T.rule}`,
                color: g === track.grade ? GRADE_COLOR[g] : T.ink3,
                fontWeight: 600, fontSize: 11, fontFamily: 'Geist Mono, monospace',
              }}>{g}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Up Next */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Glyph name="queue" size={14}/>
            <h3 className="mc-display" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Up Next</h3>
          </div>
          <span className="mc-mono" style={{ fontSize: 10, color: T.ink3 }}>{UP_NEXT.length} queued</span>
        </div>
        {UP_NEXT.map((t, i) => {
          const c2 = CATEGORIES.find(x => x.id === t.cat);
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 4px', borderBottom: `1px solid ${T.rule}`,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                background: `linear-gradient(140deg, ${c2.color}66, ${c2.dark})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.ink,
              }}><Glyph name={c2.glyph} size={12}/></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                <div style={{ fontSize: 10, color: T.ink3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.pack}</div>
              </div>
              <div className="mc-mono" style={{ fontSize: 10, color: T.ink3 }}>{t.dur}</div>
            </div>
          );
        })}
      </div>

      {/* Active SFX */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Glyph name="speaker" size={14}/>
            <h3 className="mc-display" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>SFX Layer</h3>
          </div>
          <span className="mc-eyebrow" style={{ fontSize: 9, color: '#5cc4d9' }}>{ACTIVE_SFX.length} active</span>
        </div>
        {ACTIVE_SFX.map((sfx, i) => <ActiveSfxRow key={i} sfx={sfx}/>)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TRANSPORT BAR (bottom)
// ─────────────────────────────────────────────────────────────
function DesktopTransport({ track, playing, onToggle }) {
  const c = CATEGORIES.find(x => x.id === track.cat);
  const pct = (track.cur / track.dur) * 100;
  const mins = (s) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  return (
    <div style={{
      position: 'relative', zIndex: 5, flexShrink: 0, height: 88,
      borderTop: `1px solid ${T.rule}`,
      background: 'rgba(11,9,19,0.75)', backdropFilter: 'blur(20px)',
      display: 'flex', alignItems: 'center', padding: '0 18px',
    }}>
      {/* Track info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: 280 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 11, flexShrink: 0,
          background: `linear-gradient(140deg, ${c.color}, ${c.dark})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.ink,
          boxShadow: `inset 0 -8px 16px rgba(0,0,0,0.3), 0 0 0 1px ${c.color}33`,
        }}><Glyph name={c.glyph} size={22}/></div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {track.title}
          </div>
          <div style={{ fontSize: 10, color: T.ink2, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ color: c.color }}>{CATEGORIES.find(x => x.id === track.cat).name.toUpperCase()}</span> · {track.pack}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            {['S','A','B','C','D','F'].map(g => (
              <span key={g} style={{
                fontSize: 9, padding: '1px 4px', borderRadius: 3,
                background: g === track.grade ? GRADE_COLOR[g] + '40' : 'transparent',
                color: g === track.grade ? GRADE_COLOR[g] : T.ink3,
                fontFamily: 'Geist Mono, monospace', fontWeight: 600,
              }}>{g}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Center transport */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button style={{ color: T.ink2 }}><Glyph name="shuffle" size={16}/></button>
          <button style={{ color: T.ink }}><Glyph name="prev" size={20}/></button>
          <button onClick={onToggle} style={{
            width: 40, height: 40, borderRadius: 999,
            background: T.ink, color: c.dark,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 16px ${c.color}55`,
          }}><Glyph name={playing ? 'pause' : 'play'} size={16}/></button>
          <button style={{ color: T.ink }}><Glyph name="next" size={20}/></button>
          <button style={{ color: T.gold }}><Glyph name="loop" size={16}/></button>
          <button style={{ color: T.ink3 }}><Glyph name="fade" size={16}/></button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', maxWidth: 540 }}>
          <span className="mc-mono" style={{ fontSize: 10, color: T.ink2, width: 32, textAlign: 'right' }}>{mins(track.cur)}</span>
          <div style={{ flex: 1, position: 'relative', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: c.color, borderRadius: 2 }}/>
            <div style={{
              position: 'absolute', left: `${pct}%`, top: '50%', transform: 'translate(-50%, -50%)',
              width: 10, height: 10, borderRadius: 999, background: T.ink,
            }}/>
          </div>
          <span className="mc-mono" style={{ fontSize: 10, color: T.ink2, width: 32 }}>{mins(track.dur)}</span>
        </div>
      </div>

      {/* Right: Visualizer + Volume + Compact */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: 280, justifyContent: 'flex-end' }}>
        <div style={{ color: c.color, opacity: 0.85 }}>
          <Visualizer color={c.color} bars={16} height={26}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.ink2 }}>
          <Glyph name="speaker" size={14}/>
          <div style={{ width: 84, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '72%', background: T.ink2, borderRadius: 2 }}/>
          </div>
        </div>
        <button style={{ ...iconBtnDesktop }} title="Compact mode"><Glyph name="library" size={14}/></button>
      </div>
    </div>
  );
}

window.DesktopApp = DesktopApp;
