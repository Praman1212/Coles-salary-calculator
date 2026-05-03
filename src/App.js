import React, { useState } from 'react';
import Calculator from './components/Calculator';
import History from './components/History';
import Admin from './components/Admin';
import './App.css';

export default function App() {
  const [tab, setTab] = useState('calculator');

  const tabs = ['calculator', 'history', 'admin'];

  return (
    <div className="app">
      <div className="container">

        <div className="header">
          <div className="header-icon" style={{ borderRadius: '50%', overflow: 'hidden' }}>🛒</div>          <div>
            <h1 className="app-title">Coles Pay Calculator</h1>
            <p className="app-sub">Calculate your weekly pay instantly</p>
          </div>
        </div>

        <div className="tab-bar">
          {tabs.map(t => (
            <button
              key={t}
              className={`tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'calculator' && <Calculator />}
        {tab === 'history' && <History />}
        {tab === 'admin' && <Admin />}

      </div>
    </div>
  );
}