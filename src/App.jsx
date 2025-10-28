// App.js
import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Booking from './components/Booking';
import Orders from './components/Orders';
import EditOrder from './components/EditOrder';
import Tags from './components/Tags';
import Customers from './components/Customers';
import Billing from './components/Billing';
import Settings from './components/Settings';
import Profile from './components/Profile';
import Login from './components/AdminLogin';
import './styles.css';

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const ENCRYPTION_KEY = import.meta.env.VITE_ENC_ID || 'default-secret-key';

  useEffect(() => {
    const checkAuth = async () => {
      const encryptedMobile = localStorage.getItem('adminAuth');
      
      if (!encryptedMobile) {
        setLoadingAuth(false);
        return;
      }

      try {
        const bytes = CryptoJS.AES.decrypt(encryptedMobile, ENCRYPTION_KEY);
        const mobile = bytes.toString(CryptoJS.enc.Utf8);

        if (!mobile) {
          localStorage.removeItem('adminAuth');
          setLoadingAuth(false);
          return;
        }

        const db = getFirestore();
        const adminRef = collection(db, 'admin');
        const q = query(adminRef, where('mobile', '==', mobile));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          setAuthenticated(true);
        } else {
          localStorage.removeItem('adminAuth');
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        localStorage.removeItem('adminAuth');
      } finally {
        setLoadingAuth(false);
      }
    };

    checkAuth();
  }, [ENCRYPTION_KEY]);

  if (loadingAuth) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Loading...</p>
        </div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  if (!authenticated) {
    return <Login setAuthenticated={setAuthenticated} />;
  }

  return <AppContent encryptionKey={ENCRYPTION_KEY} />;
}

function AppContent({ encryptionKey }) {
  const [showProfile, setShowProfile] = useState(false);
  const [ordersFilter, setOrdersFilter] = useState('all');
  const location = useLocation();
  
  // Get active section from current path
  const activeSection = location.pathname.slice(1) || 'dashboard';

  return (
    <div className="app-container">
      <Sidebar 
        activeSection={activeSection}
        setShowProfile={setShowProfile}
      />
      <div className="main-content">
        <Header 
          activeSection={activeSection} 
          setShowProfile={setShowProfile}
        />
        {showProfile ? (
          <Profile 
            setShowProfile={setShowProfile}
            encryptionKey={encryptionKey}
          />
        ) : (
          <Routes>
            {/* Default redirect to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Main routes */}
            <Route 
              path="/dashboard" 
              element={
                <Dashboard 
                  setOrdersFilter={setOrdersFilter} 
                />
              } 
            />
            <Route path="/booking" element={<Booking />} />
            <Route 
              path="/orders" 
              element={<Orders initialFilter={ordersFilter} />} 
            />
            <Route path="/editorder" element={<EditOrder />} />
            <Route path="/tags" element={<Tags />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/settings" element={<Settings />} />
            
            {/* Catch-all redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        )}
      </div>
    </div>
  );
}

export default App;