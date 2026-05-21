// MobileApp shell — hosts screens, tabbar, mini-player and now-playing modal.
// Renders identically inside iOS or Android frames.

function MobileApp({ initialTab = 'library', initialCategory = null, initialNowPlaying = false, safeTop = 50, safeBottom = 24, platform = 'ios' }) {
  const [tab, setTab] = React.useState(initialTab);
  const [category, setCategory] = React.useState(initialCategory);
  const [npOpen, setNpOpen] = React.useState(initialNowPlaying);
  const [playing, setPlaying] = React.useState(true);
  const [track] = React.useState(NOW_PLAYING);

  // Render current screen
  let screen;
  if (category) {
    screen = <CategoryScreen cat={category} onBack={() => setCategory(null)} onPlay={() => setNpOpen(true)}/>;
  } else if (tab === 'library') {
    screen = <LibraryScreen
      onOpenCategory={(c) => setCategory(c)}
      onPlay={() => setNpOpen(true)}
      onOpenScene={() => setNpOpen(true)}/>;
  } else if (tab === 'scenes') {
    screen = <ScenesScreen onPlay={() => setNpOpen(true)}/>;
  } else if (tab === 'soundboard') {
    screen = <SoundboardScreen/>;
  } else if (tab === 'search') {
    screen = <SearchScreen onPlay={() => setNpOpen(true)}/>;
  }

  return (
    <div className="mc-app" style={{
      position: 'relative', width: '100%', height: '100%',
      overflow: 'hidden', background: T.bg, color: T.ink,
    }}>
      {/* top safe area: dark filler so iOS status text reads */}
      <div style={{ height: safeTop, background: T.bg, position: 'relative', zIndex: 1 }}/>

      {/* main content fills remaining */}
      <div style={{ position: 'absolute', top: safeTop, left: 0, right: 0, bottom: 0 }}>
        {screen}

        {/* Sticky bottom: mini-player + tabbar */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: safeBottom, zIndex: 50, pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto' }}>
            <div style={{ marginBottom: 6 }}>
              <MiniPlayer track={track} playing={playing}
                onToggle={() => setPlaying(p => !p)}
                onExpand={() => setNpOpen(true)}/>
            </div>
            <TabBar active={tab} onChange={(t) => { setCategory(null); setTab(t); }}/>
          </div>
        </div>
      </div>

      {/* Now Playing overlay */}
      {npOpen && (
        <NowPlayingScreen track={track} playing={playing}
          onTogglePlay={() => setPlaying(p => !p)}
          onClose={() => setNpOpen(false)}/>
      )}
    </div>
  );
}

window.MobileApp = MobileApp;
