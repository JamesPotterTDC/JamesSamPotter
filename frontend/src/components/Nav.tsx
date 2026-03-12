'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-void/90 backdrop-blur-xl border-b border-white/[0.06]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="font-bebas text-xl tracking-[0.18em] text-white/90 hover:text-white transition-colors">
          JAMES POTTER
        </Link>

        {/* Links */}
        <div className="flex items-center gap-8">
          <NavLink href="/" active={pathname === '/'}>Dashboard</NavLink>
          <NavLink href="/activities" active={pathname.startsWith('/activities')}>Activities</NavLink>
        </div>

        {/* Strava badge */}
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-50">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" fill="#FC4C02"/>
          </svg>
          <span className="text-xs text-slate-600 tracking-wider font-medium">STRAVA</span>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`text-sm font-medium tracking-wide transition-colors relative group ${
        active ? 'text-white' : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      {children}
      <span
        className={`absolute -bottom-1 left-0 h-px bg-orange-400 transition-all duration-300 ${
          active ? 'w-full' : 'w-0 group-hover:w-full'
        }`}
      />
    </Link>
  );
}
