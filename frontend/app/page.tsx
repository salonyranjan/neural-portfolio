"use client";

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

const Scene = dynamic(() => import('../components/Scene'), {
  ssr: false,
  loading: () => <Loader />,
});

function Loader() {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);

  const phases = [
    'Initializing neural pathways...',
    'Mapping knowledge nodes...',
    'Calibrating force vectors...',
    'Rendering synaptic connections...',
    'Neural map ready.',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = p + Math.random() * 12;
        if (next >= 100) {
          clearInterval(interval);
          return 100;
        }
        setPhase(Math.floor((next / 100) * phases.length));
        return next;
      });
    }, 120);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#050510',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'JetBrains Mono, monospace',
      color: '#00ffcc',
    }}>
      {/* Animated grid background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,255,204,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,204,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        animation: 'gridPulse 4s ease-in-out infinite',
      }} />

      {/* Central orb */}
      <div style={{
        width: 120, height: 120,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 40% 35%, #00ffcc33, #00ffcc08 60%, transparent)',
        border: '1px solid #00ffcc44',
        boxShadow: '0 0 60px #00ffcc22, inset 0 0 40px #00ffcc11',
        marginBottom: 40,
        animation: 'orbPulse 2s ease-in-out infinite',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="3" fill="#00ffcc" />
          <circle cx="8" cy="12" r="2" fill="#00ffcc88" />
          <circle cx="32" cy="12" r="2" fill="#00ffcc88" />
          <circle cx="8" cy="28" r="2" fill="#00ffcc88" />
          <circle cx="32" cy="28" r="2" fill="#00ffcc88" />
          <line x1="20" y1="20" x2="8" y2="12" stroke="#00ffcc44" strokeWidth="1" />
          <line x1="20" y1="20" x2="32" y2="12" stroke="#00ffcc44" strokeWidth="1" />
          <line x1="20" y1="20" x2="8" y2="28" stroke="#00ffcc44" strokeWidth="1" />
          <line x1="20" y1="20" x2="32" y2="28" stroke="#00ffcc44" strokeWidth="1" />
        </svg>
      </div>

      {/* Progress bar */}
      <div style={{
        width: 280, height: 2,
        background: '#00ffcc15',
        borderRadius: 2, overflow: 'hidden',
        marginBottom: 16,
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #00ffcc, #0088ff)',
          boxShadow: '0 0 12px #00ffcc',
          transition: 'width 0.1s ease',
          borderRadius: 2,
        }} />
      </div>

      {/* Status text */}
      <div style={{ fontSize: 11, letterSpacing: '0.15em', opacity: 0.6, marginBottom: 8 }}>
        {phases[Math.min(phase, phases.length - 1)]}
      </div>
      <div style={{ fontSize: 10, letterSpacing: '0.2em', opacity: 0.3 }}>
        {Math.round(progress)}%
      </div>

      <style>{`
        @keyframes gridPulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes orbPulse { 0%,100%{transform:scale(1);box-shadow:0 0 60px #00ffcc22,inset 0 0 40px #00ffcc11} 50%{transform:scale(1.05);box-shadow:0 0 90px #00ffcc44,inset 0 0 60px #00ffcc22} }
      `}</style>
    </div>
  );
}

export default function Page() {
  return (
    <main style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <Scene />
    </main>
  );
}