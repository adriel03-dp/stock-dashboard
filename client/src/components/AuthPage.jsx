import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, Eye, EyeOff, LockKeyhole, LoaderCircle, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Brand from './Brand';
import '../pages/Auth.css';

function MarketIllustration() {
  return <div className="market-art" aria-label="Illustrative market chart, not live data">
    <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
    <div className="preview-card">
      <div className="preview-top"><span><span className="status-dot" /> THE BIGGER PICTURE</span><ArrowUpRight size={18} /></div>
      <div className="preview-title">A little perspective.<br />A world of possibility.</div>
      <div className="preview-chart" aria-hidden="true"><div className="chart-grid" />
        <svg viewBox="0 0 440 180" preserveAspectRatio="none"><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b8d09c" stopOpacity=".4"/><stop offset="100%" stopColor="#b8d09c" stopOpacity="0"/></linearGradient></defs><path d="M0 155 L20 145 L38 154 L58 125 L77 132 L98 109 L116 121 L137 101 L158 111 L178 78 L194 90 L218 65 L240 85 L258 72 L280 81 L300 49 L318 59 L343 35 L360 45 L380 18 L400 27 L420 9 L440 17 V180 H0Z" fill="url(#chart-fill)"/><path d="M0 155 L20 145 L38 154 L58 125 L77 132 L98 109 L116 121 L137 101 L158 111 L178 78 L194 90 L218 65 L240 85 L258 72 L280 81 L300 49 L318 59 L343 35 L360 45 L380 18 L400 27 L420 9 L440 17" fill="none" stroke="#b8d09c" strokeWidth="2.5" strokeLinejoin="round"/></svg>
      </div><div className="chart-caption"><span>STAY CURIOUS</span><span>THINK LONG TERM</span></div>
    </div>
    <div className="insight-note"><span className="note-icon"><ArrowUpRight size={21}/></span><div><strong>Less noise. More insight.</strong><span>Your markets, in one place.</span></div></div>
    <span className="illustration-label">ILLUSTRATIVE VIEW · NOT MARKET DATA</span>
  </div>;
}

export default function AuthPage({ signup = false }) {
  const [values, setValues] = useState({ email: '', username: '', password: '', confirmPassword: '' });
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const update = (e) => { const { name, value } = e.target; setValues(v => ({ ...v, [name]: value })); setErrors(v => ({ ...v, [name]: undefined, submit: undefined })); };
  async function submit(e) {
    e.preventDefault();
    if (loading) return;
    const next = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) next.email = 'Enter a valid email address.';
    if (!values.password) next.password = 'Enter your password.';
    if (signup) {
      if (values.username.trim().length < 3) next.username = 'Use at least 3 characters.';
      if (values.password.length < 6) next.password = 'Use at least 6 characters.';
      if (values.password !== values.confirmPassword || !values.confirmPassword) next.confirmPassword = 'Your passwords need to match.';
    }
    setErrors(next);
    if (Object.keys(next).length) { document.getElementById(["username", "email", "password", "confirmPassword"].find(name => next[name]))?.focus(); return; }
    setLoading(true);
    try {
      if (signup) await register(values.email.trim(), values.username.trim(), values.password, values.confirmPassword);
      else await login(values.email.trim(), values.password);
      navigate('/dashboard');
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || (err.response ? (signup ? 'We couldn’t create your account. Please try again.' : 'We couldn’t sign you in. Please try again.') : 'We couldn’t reach the server. Please try again in a moment.') });
    } finally { setLoading(false); }
  }
  function field(name, label, type, placeholder, autocomplete) {
    const password = type === 'password';
    return <div className="auth-field"><label htmlFor={name}>{label}</label><div className="auth-input-wrap"><input id={name} name={name} type={password && visible ? 'text' : type} value={values[name]} onChange={update} placeholder={placeholder} autoComplete={autocomplete} required disabled={loading} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : name === 'password' && signup ? 'password-hint' : undefined} />{password && name === 'password' && <button type="button" className="password-toggle" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button>}</div>{errors[name] && <p className="field-error" id={`${name}-error`}>{errors[name]}</p>}</div>;
  }
  return <div className={`auth-page ${signup ? 'auth-signup' : ''}`}>
    <a className="skip-link" href="#auth-form">Skip to {signup ? 'sign up' : 'sign in'}</a>
    <aside className="auth-story"><Brand to="/login" /><div className="story-content"><div className="eyebrow"><span /> A CLEARER VIEW OF THE MARKET</div><h2>Big picture.<br /> Better <em>perspective.</em></h2><p>Bring your watchlist, portfolio, and market insights together. Make room for what matters.</p><MarketIllustration /></div><div className="story-footer"><span>Built for the curious investor.</span><span>STAY CURIOUS <ArrowUpRight size={14}/></span></div></aside>
    <section className="auth-panel">
      <div className="auth-topline"><span>{signup ? 'Already have an account?' : 'New to StockDash?'}</span><Link to={signup ? '/login' : '/register'}>{signup ? 'Sign in' : 'Create an account'} <ArrowUpRight size={15}/></Link></div>
      <main className="auth-main" id="auth-form"><div className="form-eyebrow">YOUR NEXT CHAPTER STARTS HERE</div><h1>{signup ? <>A fresh start.<br />A clearer outlook.</> : <>Good to have<br />you back.</>}</h1><p className="auth-description">{signup ? 'Create your account and make the market your own.' : 'Your next insight is waiting. Sign in to StockDash.'}</p>
        <form onSubmit={submit} noValidate className="auth-form" aria-busy={loading}>
          {signup && field('username', 'Username', 'text', 'How should we call you?', 'username')}
          {field('email', 'Email address', 'email', 'you@example.com', 'email')}
          {field('password', 'Password', 'password', signup ? 'Create a password' : 'Enter your password', signup ? 'new-password' : 'current-password')}
          {signup && <p id="password-hint" className="password-hint"><Check size={13}/> At least 6 characters. Make it uniquely yours.</p>}
          {signup && field('confirmPassword', 'Confirm password', 'password', 'One more time', 'new-password')}
          {errors.submit && <div className="auth-error" role="alert"><AlertCircle size={18}/><span>{errors.submit}</span></div>}
          <button className="auth-submit" disabled={loading} type="submit"><span>{loading ? (signup ? 'Creating your account…' : 'Signing you in…') : (signup ? 'Create account' : 'Sign in')}</span>{loading ? <LoaderCircle size={19} className="animate-spin"/> : <ArrowRight size={19}/>}</button>
        </form>
        <div className="auth-assurance"><LockKeyhole size={14}/><span>Your space. Your watchlist. Your perspective.</span></div><div className="auth-bottom-switch">{signup ? 'Already part of the picture?' : 'A little curiosity goes a long way.'} <Link to={signup ? '/login' : '/register'}>{signup ? 'Sign in' : 'Join StockDash'} <ArrowUpRight size={14}/></Link></div>
      </main><footer className="auth-footer"><span>© {new Date().getFullYear()} StockDash</span><span>Keep a little perspective.</span></footer>
    </section>
  </div>;
}
