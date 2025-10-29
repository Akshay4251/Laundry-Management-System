import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const Sidebar = ({ activeSection, setShowProfile }) => {
  const navigate = useNavigate();
  
  const navItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard', path: '/dashboard' },
    { id: 'booking', icon: '➕', label: 'New Booking', path: '/booking' },
    { id: 'orders', icon: '📦', label: 'Order Tracker', path: '/orders' },
    { id: 'editorder', icon: '✏️', label: 'Edit Order', path: '/editorder' },
    { id: 'tags', icon: '🏷️', label: 'Tag Generator', path: '/tags' },
    { id: 'customers', icon: '👥', label: 'Customers', path: '/customers' },
    { id: 'billing', icon: '💰', label: 'Bill Generator', path: '/billing' }
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
          
          // Direct URL usage - no need for getDownloadURL if logoUrl is already a full URL
          if (data.logoUrl) {
            setLogoUrl(data.logoUrl);
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

  const handleNavigation = (path) => {
    setShowProfile(false);
    navigate(path);
  };

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
      height: '100vh',
      overflow: 'auto',
      overflowY: 'scroll',
      overflowX: 'hidden',  
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    }}>
      <style>
        {`
          div::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
      
      {/* Header */}
      <div style={{ 
        padding: '1.5rem', 
        borderBottom: '1px solid var(--gray-200)', 
        textAlign: 'center' 
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: 'var(--primary)',
          marginBottom: '0.5rem',  
          textShadow: "2px 2px 5px rgba(42, 41, 41, 0.2), 4px 4px 10px rgba(0,0,0,0.2)",
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
              style={{ 
                width: '80%', 
                height: '80%', 
                objectFit: 'contain' 
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}

        <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
          Admin Dashboard
        </p>
      </div>

      {/* Navigation */}
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

        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => handleNavigation(item.path)}
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
              cursor: 'pointer',
              position: 'relative',
              fontSize: '0.95rem',
              fontWeight: activeSection === item.id ? '600' : '400'
            }}
            onMouseEnter={e => {
              if (activeSection !== item.id) {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
              }
            }}
            onMouseLeave={e => {
              if (activeSection !== item.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span style={{ marginRight: '0.75rem', fontSize: '1.25rem' }}>
              {item.icon}
            </span>
            <span>{item.label}</span>
            {activeSection === item.id && (
              <span style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '4px',
                backgroundColor: 'var(--primary)',
                borderRadius: '0 4px 4px 0'
              }}></span>
            )}
          </button>
        ))}

        {/* System Section */}
        <div style={{ padding: '0.5rem 1.5rem', marginTop: '1.5rem' }}>
          <p style={{
            fontSize: '0.75rem',
            fontWeight: '600',
            color: 'var(--gray-400)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>System</p>
        </div>

        <button
          onClick={() => handleNavigation('/settings')}
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
            cursor: 'pointer',
            position: 'relative',
            fontSize: '0.95rem',
            fontWeight: activeSection === 'settings' ? '600' : '400'
          }}
          onMouseEnter={e => {
            if (activeSection !== 'settings') {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
            }
          }}
          onMouseLeave={e => {
            if (activeSection !== 'settings') {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <span style={{ marginRight: '0.75rem', fontSize: '1.25rem' }}>⚙️</span>
          Settings
          {activeSection === 'settings' && (
            <span style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '4px',
              backgroundColor: 'var(--primary)',
              borderRadius: '0 4px 4px 0'
            }}></span>
          )}
        </button>
      </nav>

      {/* Footer */}
      <div style={{
        padding: '1rem 1.5rem',
        borderTop: '1px solid var(--gray-200)',
        fontSize: '0.75rem',
        color: 'var(--gray-500)',
        textAlign: 'center'
      }}>
        <p style={{ margin: '0.25rem 0 0 0' }}>© 2025 {businessName}</p>
      </div>
    </div>
  );
};

export default Sidebar;