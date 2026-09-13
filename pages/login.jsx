import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Login() {
  const router = useRouter();
  const [pw, setPw]           = useState('');
  const [show, setShow]       = useState(false);
  const [err, setErr]         = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!pw.trim()) return;
    setLoading(true);
    setErr('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        router.replace('/admin');
      } else {
        const d = await res.json();
        setErr(d.error || 'Sai mật khẩu');
        setPw('');
      }
    } catch {
      setErr('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>ThlongPremium — Login</title></Head>
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#080808',
        fontFamily: "'JetBrains Mono','Fira Code','Courier New',monospace",
      }}>
        <div style={{
          width: 360, padding: '40px 36px', background: '#0e0e0e',
          border: '1px solid #1a1a1a', borderRadius: 8, animation: 'fadeUp 0.25s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF5350', boxShadow: '0 0 10px #EF535066' }} />
            <span style={{ color: '#fff', fontWeight: 700, letterSpacing: 2, fontSize: 13 }}>THLONGPREMIUM</span>
          </div>

          <p style={{ color: '#333', fontSize: 10, letterSpacing: 2, marginBottom: 28 }}>ADMIN ACCESS ONLY</p>

          <form onSubmit={handleLogin}>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <input
                type={show ? 'text' : 'password'}
                placeholder="Mật khẩu admin"
                value={pw}
                onChange={e => setPw(e.target.value)}
                autoFocus
                style={{
                  width: '100%', padding: '10px 48px 10px 14px',
                  background: '#111', border: `1px solid ${err ? '#3a1010' : '#1f1f1f'}`,
                  borderRadius: 5, color: '#e0e0e0', fontSize: 12,
                }}
              />
              <button
                type="button"
                onClick={() => setShow(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#333', fontSize: 10 }}
              >{show ? 'HIDE' : 'SHOW'}</button>
            </div>

            {err && <p style={{ color: '#EF5350', fontSize: 11, marginBottom: 14 }}>✕ {err}</p>}

            <button
              type="submit"
              disabled={loading || !pw.trim()}
              style={{
                width: '100%', padding: '10px 0',
                background: loading ? '#1a1a1a' : '#EF5350',
                border: 'none', borderRadius: 5,
                color: loading ? '#555' : '#fff',
                fontWeight: 700, fontSize: 12, letterSpacing: 1.5,
              }}
            >{loading ? 'ĐANG XÁC THỰC...' : 'ĐĂNG NHẬP'}</button>
          </form>
        </div>
      </div>
    </>
  );
      }
