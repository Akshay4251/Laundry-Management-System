import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';

const Profile = ({ setShowProfile, encryptionKey }) => {
  const [adminData, setAdminData] = useState({
    name: '',
    mobile: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const encryptedMobile = localStorage.getItem('adminAuth');
        if (!encryptedMobile) throw new Error('Not authenticated');

        const bytes = CryptoJS.AES.decrypt(encryptedMobile, encryptionKey);
        const mobile = bytes.toString(CryptoJS.enc.Utf8);

        const db = getFirestore();
        const adminRef = collection(db, 'admin');
        const q = query(adminRef, where('mobile', '==', mobile));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) throw new Error('Admin not found');

        const data = querySnapshot.docs[0].data();
        setAdminData(prev => ({
          ...prev,
          name: data.name || '',
          mobile: data.mobile || ''
        }));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [encryptionKey]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAdminData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setUpdating(true);

    try {
      // Validate password fields if shown
      if (showPasswordFields) {
        if (!adminData.newPassword || !adminData.confirmPassword) {
          throw new Error('Both password fields are required');
        }
        if (adminData.newPassword !== adminData.confirmPassword) {
          throw new Error('New passwords do not match');
        }
      }

      const encryptedMobile = localStorage.getItem('adminAuth');
      if (!encryptedMobile) throw new Error('Not authenticated');

      const bytes = CryptoJS.AES.decrypt(encryptedMobile, encryptionKey);
      const currentMobile = bytes.toString(CryptoJS.enc.Utf8);

      const db = getFirestore();
      const adminRef = collection(db, 'admin');
      const q = query(adminRef, where('mobile', '==', currentMobile));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) throw new Error('Admin not found');

      const docRef = doc(db, 'admin', querySnapshot.docs[0].id);
      const updateData = {
        name: adminData.name
      };

      // Update mobile if changed
      if (adminData.mobile !== currentMobile) {
        updateData.mobile = adminData.mobile;
        
        // Re-encrypt and store new mobile
        const newEncryptedMobile = CryptoJS.AES.encrypt(
          adminData.mobile,
          encryptionKey
        ).toString();
        localStorage.setItem('adminAuth', newEncryptedMobile);
      }

      // Update password if changed
      if (showPasswordFields && adminData.newPassword) {
        updateData.password = adminData.newPassword;
      }

      await updateDoc(docRef, updateData);
      setSuccess('Profile updated successfully!');
      
      // Clear password fields and hide them
      setAdminData(prev => ({
        ...prev,
        newPassword: '',
        confirmPassword: ''
      }));
      setShowPasswordFields(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '200px',
      color: '#666',
      fontSize: '1.2rem'
    }}>
      Loading profile...
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        width: '100%',
        maxWidth: '500px',
        padding: '2rem',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            margin: 0,
            color: '#333',
            fontSize: '1.5rem'
          }}>Admin Profile</h2>
          <button 
            onClick={() => setShowProfile(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666',
              padding: '0.5rem'
            }}
          >
            &times;
          </button>
        </div>
        
        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}
        
        {success && (
          <div style={{
            backgroundColor: '#d1fae5',
            color: '#059669',
            padding: '0.75rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#555',
              fontWeight: '500'
            }}>Name</label>
            <input
              type="text"
              name="name"
              value={adminData.name}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#555',
              fontWeight: '500'
            }}>Mobile Number</label>
            <input
              type="text"
              name="mobile"
              value={adminData.mobile}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

          {!showPasswordFields ? (
            <div style={{ marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setShowPasswordFields(true)}
                style={{
                  color: '#3b82f6',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem 0',
                  fontSize: '0.9rem'
                }}
              >
                Change Password
              </button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#555',
                  fontWeight: '500'
                }}>New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={adminData.newPassword}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#555',
                  fontWeight: '500'
                }}>Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={adminData.confirmPassword}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
              </div>
            </>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '1rem',
            marginTop: '2rem'
          }}>
            <button 
              type="button" 
              onClick={() => setShowProfile(false)}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#f3f4f6',
                color: '#4b5563',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={updating}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1rem',
                opacity: updating ? 0.7 : 1
              }}
            >
              {updating ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;