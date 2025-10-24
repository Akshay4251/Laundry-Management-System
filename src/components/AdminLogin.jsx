import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import CryptoJS from 'crypto-js';

const Login = ({ setAuthenticated }) => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const db = getFirestore();
      const adminRef = collection(db, 'admin');
      const q = query(adminRef, where('mobile', '==', mobile));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Invalid credentials');
      }

      const adminData = querySnapshot.docs[0].data();
      
      if (adminData.password !== password) {
        throw new Error('Invalid credentials');
      }

      const encryptedMobile = CryptoJS.AES.encrypt(
        mobile,
        import.meta.env.VITE_ENC_ID || 'default-secret-key'
      ).toString();
      
      localStorage.setItem('adminAuth', encryptedMobile);
      setAuthenticated(true);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
      <h1 style={{
          textAlign: 'center',
          color: '#2d2491ff',
          marginBottom: '1.8rem',
          borderBottom:'1px solid gray',
          fontSize: '2rem'
        }}>Wash & Joy</h1>


        <h2 style={{
          textAlign: 'center',
          color: '#333',
          marginBottom: '1.5rem',
          fontSize: '1.8rem'
        }}>Admin Login</h2>
        
        <form onSubmit={handleLogin} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{
            marginBottom: '1rem'
          }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#555'
            }}>Mobile Number</label>
            <input
              type="text"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required maxLength={10}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          <div style={{
            marginBottom: '1.5rem'
          }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#555'
            }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {error && <div style={{
            color: '#e53e3e',
            backgroundColor: '#fff5f5',
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>{error}</div>}
          
          <button 
            type="submit" 
            disabled={loading}
            style={{
              backgroundColor: '#4f46e5',
              color: 'white',
              padding: '0.75rem',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              ':hover': {
                backgroundColor: '#4338ca'
              },
              ':disabled': {
                backgroundColor: '#a5b4fc',
                cursor: 'not-allowed'
              }
            }}
          >
            {loading ? (
              <span>Logging in...</span>
            ) : (
              <span>Login</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;