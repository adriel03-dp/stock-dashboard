import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Brand from '../components/Brand';
export default function NotFound() {
  return <main className="not-found"><Brand to="/login"/><span className="small-overline">A SMALL DETOUR · 404</span><h1>A little off the chart.</h1><p>This page may have moved, or the address may be incomplete.</p><Link className="auth-submit" to="/"><ArrowLeft size={18}/> Back to your dashboard</Link></main>;
}
