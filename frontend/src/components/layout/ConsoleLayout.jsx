import { useState } from 'react';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';

/**
 * The console frame: grouped dark rail on the left, sticky heading, then the
 * profile header followed by the active section.
 */
export function ConsoleLayout({
  product,
  navGroups,
  activeNav,
  onNavChange,
  identity,
  title,
  subtitle,
  actions,
  profile,
  greet,
  children,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar
        product={product}
        groups={navGroups}
        value={activeNav}
        onChange={onNavChange}
        identity={identity}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <div className="lg:pl-[268px]">
        <Topbar
          title={title}
          subtitle={subtitle}
          actions={actions}
          onMenu={() => setMenuOpen(true)}
          greet={greet}
        />
        <main className="space-y-6 px-5 py-6 lg:px-8 lg:py-8">
          {profile}
          {children}
        </main>
      </div>
    </div>
  );
}
