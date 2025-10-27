// App.js
import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Booking from './components/Booking';
import Orders from './components/Orders';
import EditOrder from './components/EditOrder'; // New import
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
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showProfile, setShowProfile] = useState(false);
  const [ordersFilter, setOrdersFilter] = useState('all');
  
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

  const sections = {
    dashboard: (
      <Dashboard 
        setActiveSection={setActiveSection} 
        setOrdersFilter={setOrdersFilter} 
      />
    ),
    booking: <Booking />,
    orders: <Orders initialFilter={ordersFilter} />,
    editorder: <EditOrder />, // New section added
    tags: <Tags />,
    customers: <Customers />,
    billing: <Billing />,
    settings: <Settings />
  };

  if (loadingAuth) {
    return <div className="loading">Loading...</div>;
  }

  if (!authenticated) {
    return <Login setAuthenticated={setAuthenticated} />;
  }

  return (
    <div className="app-container">
      <Sidebar 
        activeSection={activeSection} 
        setActiveSection={setActiveSection} 
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
            encryptionKey={ENCRYPTION_KEY}
          />
        ) : (
          sections[activeSection]
        )}
      </div>
    </div>
  );
}

export default App;