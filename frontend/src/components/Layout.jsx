import { Activity, Droplets, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'

export default function Layout() {
  const [open, setOpen] = useState(false)
  const links = [['/', 'Home'], ['/about', 'About System'], ['/demo', 'Admin / Demo']]
  return <div className="app-shell">
    <header className="topbar">
      <Link className="brand" to="/"><span className="brand-mark"><Droplets size={25} /></span><span>AquaSentinel<small>Public Water Infrastructure</small></span></Link>
      <button className="menu-button" aria-label="Toggle navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      <nav className={open ? 'nav open' : 'nav'}>{links.map(([to, label]) => <NavLink key={to} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'active' : ''} to={to}>{label}</NavLink>)}</nav>
      <div className="mode-pill live"><Activity size={14} />FastAPI + SQLite</div>
    </header>
    <main><Outlet /></main>
    <footer><div><strong>AquaSentinel</strong><span>Maintenance intelligence for public water infrastructure</span></div><p>Condition monitoring only — not a substitute for laboratory water-quality testing.</p></footer>
  </div>
}
