import React, { useState } from 'react';

const ADMIN_PASS = 'coles2024';

export default function Admin() {
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw]             = useState('');
  const [err, setErr]           = useState('');
  const [saved, setSaved]       = useState(false);
  const [rates, setRates]       = useState({
    ft: 27.12, pt: 27.12, cas: 33.90,
    sat: 1.25, sun: 1.50,
    night: 1.15, nightStart: 19, nightEnd: 7,
    ot1: 1.5, ot1Threshold: 7.6,
    ot2: 2.0, ot2Threshold: 10,
  });

  function checkPw() {
    if (pw === ADMIN_PASS) { setUnlocked(true); setErr(''); }
    else setErr('Incorrect password. Try: coles2024');
  }

  function update(key, val) {
    setRates(prev => ({ ...prev, [key]: parseFloat(val) }));
  }

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const fields = [
    { key: 'ft',           label: 'Full-time rate ($/hr)' },
    { key: 'pt',           label: 'Part-time rate ($/hr)' },
    { key: 'cas',          label: 'Casual rate ($/hr)' },
    { key: 'sat',          label: 'Saturday multiplier' },
    { key: 'sun',          label: 'Sunday multiplier' },
    { key: 'night',        label: 'Night penalty multiplier' },
    { key: 'nightStart',   label: 'Night start (24hr e.g. 19)' },
    { key: 'nightEnd',     label: 'Night end (24hr e.g. 7)' },
    { key: 'ot1',          label: 'Overtime multiplier (1.5x)' },
    { key: 'ot1Threshold', label: 'Overtime starts at (hrs)' },
    { key: 'ot2',          label: 'Double time multiplier (2x)' },
    { key: 'ot2Threshold', label: 'Double time starts at (hrs)' },
  ];

  if (!unlocked) return (
    <div className="card" style={{textAlign:'center', padding:'2.5rem 1.25rem'}}>
      <div style={{fontSize:'36px', marginBottom:'12px'}}>🔒</div>
      <p style={{fontSize:'16px', fontWeight:'700', marginBottom:'6px'}}>Admin panel</p>
      <p style={{fontSize:'13px', color:'#aaa', marginBottom:'1.25rem'}}>
        Enter password to manage pay rates
      </p>
      <input
        type="password"
        value={pw}
        onChange={e => setPw(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && checkPw()}
        placeholder="Enter password"
        style={{
          width:'100%', maxWidth:'240px', padding:'10px 14px',
          border:'1px solid #ddd', borderRadius:'10px',
          fontSize:'14px', textAlign:'center',
          display:'block', margin:'0 auto 8px'
        }}
      />
      {err && <p style={{fontSize:'12px', color:'#e74c3c', marginBottom:'10px'}}>{err}</p>}
      <button
        className="btn-primary"
        style={{maxWidth:'240px', margin:'0 auto', display:'block'}}
        onClick={checkPw}
      >
        Unlock
      </button>
    </div>
  );

  return (
    <div>
      <div className="card">
        <p className="section-title">Pay rates & multipliers</p>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
          {fields.map(f => (
            <div key={f.key}>
              <p style={{fontSize:'12px', color:'#aaa', marginBottom:'5px'}}>{f.label}</p>
              <input
                type="number"
                step="0.01"
                value={rates[f.key]}
                onChange={e => update(f.key, e.target.value)}
                style={{
                  width:'100%', padding:'9px 10px',
                  border:'1px solid #eee', borderRadius:'8px',
                  fontSize:'14px', color:'#1a1a1a'
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="btn-row">
        <button className="btn-primary" onClick={save}>
          {saved ? '✓ Rates saved!' : 'Save rates'}
        </button>
        <button className="btn-clear" onClick={() => { setUnlocked(false); setPw(''); }}>
          Lock
        </button>
      </div>
    </div>
  );
}