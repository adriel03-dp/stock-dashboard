import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, BriefcaseBusiness, Newspaper, Layers, Eye, Settings, LogOut, Sun, Moon, Menu, X, ArrowUpRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Brand from './Brand';
const items = [ ['Overview', '/', LayoutDashboard], ['Explore stocks', '/stocks', TrendingUp], ['Watchlist', '/watchlist', Eye], ['Portfolio', '/portfolio', BriefcaseBusiness], ['Sectors', '/sectors', Layers], ['Market news', '/news', Newspaper] ];
export default function EnhancedNavbar() {
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="mobile-app-header"><Brand/><button id="navigation-toggle" className="icon-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="app-navigation" aria-label={open ? 'Close navigation' : 'Open navigation'}>{open ? <X/> : <Menu/>}</button></header>
    <aside onKeyDown={e => { if (e.key === "Escape") { setOpen(false); document.getElementById("navigation-toggle")?.focus(); } }} className={`app-sidebar ${open ? 'is-open' : ''}`} id="app-navigation">
      <div className="sidebar-brand"><Brand/><span>AN INVESTOR’S PERSPECTIVE</span></div>
      <span className="nav-caption">YOUR WORKSPACE</span>
      <nav aria-label="Main navigation">{items.map(([label, to, Icon]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)} className={({isActive}) => `sidebar-link ${isActive || (to === '/' && location.pathname === '/dashboard') ? 'selected' : ''}`}><Icon size={18}/><span>{label}</span>{to === '/' && <span className="nav-tick"/>}</NavLink>)}</nav>
      <div className="sidebar-note"><span className="small-overline">A LITTLE PERSPECTIVE</span><p>Stay curious.<br/>See the bigger picture.</p><NavLink to="/news" onClick={() => setOpen(false)}>Explore the headlines <ArrowUpRight size={15}/></NavLink></div>
      <div className="sidebar-bottom"><NavLink to="/settings" onClick={() => setOpen(false)} className="sidebar-link"><Settings size={18}/>Settings</NavLink><button className="sidebar-link" onClick={toggleTheme}>{theme === 'light' ? <Moon size={18}/> : <Sun size={18}/>} {theme === 'light' ? 'Dark appearance' : 'Light appearance'}</button><div className="sidebar-user"><span className="user-avatar">{(user?.username || 'S').slice(0,1).toUpperCase()}</span><div><strong>{user?.username || 'Your account'}</strong><span>Personal workspace</span></div><button className="icon-button" aria-label="Sign out" title="Sign out" onClick={() => { logout(); navigate('/login'); }}><LogOut size={17}/></button></div></div>
    </aside>
    {open && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)}/>}
  </>;
}
