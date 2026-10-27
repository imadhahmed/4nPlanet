// src/components/ui/LoadingScreen.jsx
import React from 'react';

export default function LoadingScreen({ message = 'Loading…' }) {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0f2f7',
      gap: 16,
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 10,
        background: '#2563eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: 18,
        color: 'white',
        marginBottom: 8,
      }}>4N</div>
      <div className="spinner spinner-lg" />
      <div style={{ fontSize: 14, color: '#6b7280' }}>{message}</div>
    </div>
  );
}
