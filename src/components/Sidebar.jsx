import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';

const Sidebar = ({ activeSection, setActiveSection }) => {
  const navItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'booking', icon: '➕', label: 'New Booking' },
    { id: 'orders', icon: '📦', label: 'Order Tracker' },
    { id: 'tags', icon: '🏷️', label: 'Tag Generator' },
    { id: 'customers', icon: '👥', label: 'Customers' },
    { id: 'billing', icon: '💰', label: 'Bill Generator' },
    { id: 'settings', icon: '⚙️', label: 'Settings' }
  ];

  const [businessName, setCompanyName] = useState('Loading...');
  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const settingsDoc = doc(db, 'settings', 'company');
        const settingsSnap = await getDoc(settingsDoc);
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setCompanyName(data.businessName || 'LaundryPro');

          // fetch logo from Firebase Storage (logoPath must be saved in Firestore)
          if (data.logoUrl) {
            const storage = getStorage();
            const logoRef = ref(storage, data.logoUrl);
            const url = await getDownloadURL(logoRef);
            setLogoUrl(url);
          }
        } else {
          setCompanyName('LaundryPro');
        }
      } catch (error) {
        console.error('Failed to fetch company info:', error);
        setCompanyName('LaundryPro');
      }
    };

    fetchCompanyInfo();
  }, []);

  return (
    <div style={{
      width: '256px',
      background: 'linear-gradient(180deg, #ffffff, #f7f7f7)',
      boxShadow: '4px 0 12px rgba(0, 0, 0, 0.1)',
      minHeight: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 40,
      display: 'flex',
      flexDirection: 'column',
      height:'100vh',
      overflow:'auto',
      overflowY:'scroll',
      overflowX:'hidden',  scrollbarWidth: 'none',       // Firefox
    msOverflowStyle: 'none',
    }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--gray-200)', textAlign: 'center' }}>
        <h1 style={{
          fontSikze: '1.5rem',
          fontWeight: 'bold',
          color: 'var(--primary)',
          marginBottom: '0.5rem',  textShadow: "2px 2px 5px rgba(42, 41, 41, 0.2), 4px 4px 10px rgba(0,0,0,0.2)", // 3D shadow
   
        }}>
          {businessName}
        </h1>

        {logoUrl && (
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 0.75rem auto',
            borderRadius: '50%',
            overflow: 'hidden',
            boxShadow: '0 6px 15px rgba(0,0,0,0.2)',
            border: '3px solid #fff',
            background: 'linear-gradient(145deg, #ffffff, #e6e6e6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'perspective(600px) rotateX(5deg) rotateY(-5deg)',
          }}>
            <img
              src={logoUrl}
              alt="Company Logo"
              style={{ width: '80%', height: '80%', objectFit: 'contain' }}
            />
          </div>
        )}

        <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Admin Dashboard</p>
      </div>

      <nav style={{ marginTop: '1.5rem', flex: 1 }}>
        <div style={{ padding: '0.5rem 1.5rem' }}>
          <p style={{
            fontSize: '0.75rem',
            fontWeight: '600',
            color: 'var(--gray-400)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>Main</p>
        </div>

        {navItems.slice(0, 6).map(item => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            style={{
              width: '100%',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              padding: '0.75rem 1.5rem',
              color: activeSection === item.id ? 'var(--primary)' : 'var(--gray-700)',
              backgroundColor: activeSection === item.id ? 'var(--secondary)' : 'transparent',
              transition: 'all 0.2s',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <span style={{ marginRight: '0.75rem', fontSize: '1.25rem' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}

        <div style={{ padding: '0.5rem 1.5rem', marginTop: '1.5rem' }}>
          <p style={{
            fontSize: '0.75rem',
            fontWeight: '600',
            color: 'var(--gray-400)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>Settings</p>
        </div>

        <button
          onClick={() => setActiveSection('settings')}
          style={{
            width: '100%',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            padding: '0.75rem 1.5rem',
            color: activeSection === 'settings' ? 'var(--primary)' : 'var(--gray-700)',
            backgroundColor: activeSection === 'settings' ? 'var(--secondary)' : 'transparent',
            transition: 'all 0.2s',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <span style={{ marginRight: '0.75rem', fontSize: '1.25rem' }}>⚙️</span>
          Settings
        </button>
      </nav>
    </div>
  );
};

export default Sidebar;
