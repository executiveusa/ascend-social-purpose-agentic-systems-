'use client';
import { useState } from 'react';
import { login } from '../../lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@asc3nd.local');
  const [password, setPassword] = useState('change-this-password');
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    setError('');
    try { await login(email, password); window.location.href = '/ops'; }
    catch (err) { setError(err.message); }
  }
  return (
    <main className="login-page">
      <form className="login-card form" onSubmit={submit}>
        <a className="brand" href="/"><span className="logo">A3</span><span>Mission OS Login</span></a>
        <p>Sign into the reusable operations backend. Demo credentials are prefilled for local testing.</p>
        {error && <div className="notice">{error}</div>}
        <label>Email<input className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Password<input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button className="cta">Enter cockpit</button>
      </form>
    </main>
  );
}
