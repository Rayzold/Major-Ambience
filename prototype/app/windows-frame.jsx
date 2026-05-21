// Windows 11 desktop window chrome.
// Renders an app frame with title bar (Mica), caption buttons, and content area.
//
// <WindowsWindow width={1440} height={900} title="Music Companion">
//   ...your app...
// </WindowsWindow>

function WindowsCaptionBtn({ kind = 'min', dark = true }) {
  const c = dark ? '#e5e0d0' : '#1a1a1a';
  const ic = {
    min:   <svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="4.5" width="8" height="1" fill={c}/></svg>,
    max:   <svg width="10" height="10" viewBox="0 0 10 10"><rect x="1.5" y="1.5" width="7" height="7" rx="0.5" fill="none" stroke={c} strokeWidth="1"/></svg>,
    close: <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1l-8 8" stroke={c} strokeWidth="1" strokeLinecap="square"/></svg>,
  }[kind];
  return (
    <div style={{
      width: 46, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background .12s', cursor: 'default',
    }}
      onMouseEnter={(e) => { if (kind === 'close') e.currentTarget.style.background = '#c42b1c'; else e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >{ic}</div>
  );
}

function WindowsWindow({ width = 1440, height = 900, title = 'Major Ambience', dark = true, accent = '#e3b66a', children }) {
  return (
    <div style={{
      width, height, borderRadius: 8, overflow: 'hidden',
      background: dark ? '#1a1622' : '#fafafa',
      border: '1px solid rgba(0,0,0,0.35)',
      boxShadow: '0 40px 100px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04) inset',
      display: 'flex', flexDirection: 'column',
      fontFamily: '"Geist", "Segoe UI Variable", system-ui, sans-serif',
      color: dark ? '#e5e0d0' : '#1a1a1a',
    }}>
      {/* Title bar */}
      <div style={{
        height: 32, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: dark
          ? 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.0) 100%)'
          : '#fff',
        borderBottom: dark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px' }}>
          <div style={{
            width: 16, height: 16, borderRadius: 4,
            background: `linear-gradient(135deg, ${accent}, #b9842a)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M3 1v8M7 3v6" stroke="#1a1108" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="3" cy="9" r="1.2" fill="#1a1108"/>
              <circle cx="7" cy="9" r="1.2" fill="#1a1108"/>
            </svg>
          </div>
          <span style={{ fontSize: 12, color: dark ? 'rgba(229,224,208,0.7)' : 'rgba(0,0,0,0.7)' }}>
            {title}
          </span>
        </div>
        <div style={{ display: 'flex' }}>
          <WindowsCaptionBtn kind="min" dark={dark}/>
          <WindowsCaptionBtn kind="max" dark={dark}/>
          <WindowsCaptionBtn kind="close" dark={dark}/>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

Object.assign(window, { WindowsWindow, WindowsCaptionBtn });
