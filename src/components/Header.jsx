import React from 'react';
import { useState } from 'react';

const Header = ({ activeSection, setShowProfile }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const titles = {
    'dashboard': 'Dashboard',
    'booking': 'New Booking',
    'orders': 'Order Tracker',
    'tags': 'Tag Generator',
    'customers': 'Customer Management',
    'billing': 'Bill Generator',
    'settings': 'Settings'
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    window.location.href = '/login'; // Full page reload to clear state
  };

  const handleProfileClick = () => {
    setShowProfile(true);
    setShowDropdown(false);
  };

  return (
    <header style={{
      backgroundColor: 'white',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      borderBottom: '1px solid var(--gray-200)',
      padding: '1rem 1.5rem',
      position: 'relative',
      zIndex: 10
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          color: 'var(--gray-800)'
        }}>{titles[activeSection] || 'Dashboard'}</h2>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{ position: 'relative' }}>
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer'
              }}
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <div style={{
                width: '2rem',
                height: '2rem',
                borderRadius: '9999px',
                backgroundColor: 'var(--primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}>A</div>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--gray-700)'
              }}>Admin</span>
            </div>

            {showDropdown && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: '0.5rem',
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                width: '200px',
                zIndex: 20
              }}>
                <button 
                  onClick={handleProfileClick}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.75rem 1rem',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: 'var(--gray-700)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    ':hover': {
                      backgroundColor: 'var(--gray-100)'
                    }
                  }}
                >
                  👤 Profile
                </button>
                <button 
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.75rem 1rem',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: 'var(--gray-700)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    ':hover': {
                      backgroundColor: 'var(--gray-100)'
                    }
                  }}
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;