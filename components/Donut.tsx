'use client';

import React from 'react';

export default function Donut({
  value,
  label,
  active = false,
  onClick,
  size = 160,
}: {
  value: number;          // 0..100
  label: string;
  active?: boolean;
  onClick?: () => void;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const track = '#1f2937';            // ciemny tor
  const fill  = '#f59e0b';            // pomarańcz
  const text  = '#d1d5db';            // jasny opis

  // używam CSS conic-gradient – ZERO „kropek” i lekki antyalias
  const ringStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    background: `conic-gradient(${fill} ${clamped * 3.6}deg, ${track} 0deg)`,
    boxShadow: active
      ? '0 0 0 2px rgba(245,158,11,.7), inset 0 0 40px rgba(245,158,11,.06)'
      : 'inset 0 0 40px rgba(255,255,255,.03)',
    transition: 'box-shadow .2s ease, transform .15s ease',
  };

  const innerStyle: React.CSSProperties = {
    width: size - 34,
    height: size - 34,
    borderRadius: '50%',
    background: 'linear-gradient(180deg, rgba(255,255,255,.04), rgba(0,0,0,.10))',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'grid',
        placeItems: 'center',
        width: '100%',
        background: '#0b0e13',
        borderRadius: 16,
        padding: 12,
        border: `1px solid ${active ? 'rgba(245,158,11,.5)' : 'rgba(255,255,255,.08)'}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color .2s ease, background .2s ease',
      }}
    >
      <div style={ringStyle}>
        <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
          <div style={innerStyle}>
            <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
              <div style={{ textAlign: 'center', lineHeight: 1.05 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#e5e7eb' }}>{clamped}%</div>
                <div style={{ fontSize: 13, color: text, marginTop: 4 }}>{label}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
