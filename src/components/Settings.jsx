import React, { useEffect, useState, useRef } from 'react';
import { db, storage } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const SETTINGS_DOC_PATH = ['settings', 'company'];

const Settings = () => {
  const [settings, setSettings] = useState({
    businessName: '',
    address: '',
    gstin: '',
    phoneNumber: '',
    logoUrl: '',
  });

  const [serviceConfig, setServiceConfig] = useState({
    serviceTypes: [],
    prices: {}
  });

  const [clothConfig, setClothConfig] = useState({
    items: []
  });

  const [orderCounter, setOrderCounter] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [clothIconFiles, setClothIconFiles] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('business');

  const [newService, setNewService] = useState({ id: '', name: '' });
  const [newCloth, setNewCloth] = useState({ id: '', name: '', icon: '', iconUrl: '' });
  
  // Refs for scrolling
  const tableScrollRef = useRef(null);
  const [scrollInfo, setScrollInfo] = useState({ 
    scrollLeft: 0, 
    scrollWidth: 0, 
    clientWidth: 0,
    isDragging: false,
    startX: 0,
    scrollLeftStart: 0
  });

  // Handle scroll event to update custom scrollbar
  const handleTableScroll = () => {
    if (tableScrollRef.current) {
      setScrollInfo(prev => ({
        ...prev,
        scrollLeft: tableScrollRef.current.scrollLeft,
        scrollWidth: tableScrollRef.current.scrollWidth,
        clientWidth: tableScrollRef.current.clientWidth
      }));
    }
  };

  // Initialize scroll info when the table is rendered
  useEffect(() => {
    if (activeTab === 'services' && tableScrollRef.current) {
      handleTableScroll();
    }
  }, [activeTab, clothConfig.items.length, serviceConfig.serviceTypes.length]);

  // Custom scrollbar events
  const handleScrollStart = (e) => {
    setScrollInfo(prev => ({
      ...prev,
      isDragging: true,
      startX: e.clientX,
      scrollLeftStart: prev.scrollLeft
    }));
  };

  const handleScrollMove = (e) => {
    if (!scrollInfo.isDragging) return;
    
    const dx = e.clientX - scrollInfo.startX;
    const scrollRatio = scrollInfo.scrollWidth / scrollInfo.clientWidth;
    const scrollAmount = dx * scrollRatio;
    
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollLeft = scrollInfo.scrollLeftStart + scrollAmount;
    }
  };

  const handleScrollEnd = () => {
    setScrollInfo(prev => ({ ...prev, isDragging: false }));
  };

  // Add global mouse event listeners for smooth scrolling
  useEffect(() => {
    if (scrollInfo.isDragging) {
      document.addEventListener('mousemove', handleScrollMove);
      document.addEventListener('mouseup', handleScrollEnd);
    } else {
      document.removeEventListener('mousemove', handleScrollMove);
      document.removeEventListener('mouseup', handleScrollEnd);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleScrollMove);
      document.removeEventListener('mouseup', handleScrollEnd);
    };
  }, [scrollInfo.isDragging]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load business settings
        const businessSnap = await getDoc(doc(db, ...SETTINGS_DOC_PATH));
        if (businessSnap.exists()) {
          setSettings(prev => ({ ...prev, ...businessSnap.data() }));
        }

        // Load order counter
        const counterSnap = await getDoc(doc(db, 'settings', 'orderCounter'));
        if (counterSnap.exists()) {
          setOrderCounter(counterSnap.data().currentId || 0);
        } else {
          await setDoc(doc(db, 'settings', 'orderCounter'), { currentId: 0 });
          setOrderCounter(0);
        }

        // Load service configuration
        const serviceSnap = await getDoc(doc(db, 'settings', 'serviceConfig'));
        if (serviceSnap.exists()) {
          setServiceConfig(serviceSnap.data());
        } else {
          const defaultServiceConfig = {
            serviceTypes: [
              { id: "stain-removal", name: "Stain Removal Treatment", enabled: true },
              { id: "ironing", name: "Ironing", enabled: true },
              { id: "wash-and-iron", name: "Wash & Iron", enabled: true },
              { id: "wash-and-fold", name: "Wash & Fold", enabled: true },
              { id: "starch-and-iron", name: "Starch & Iron", enabled: true }
            ],
            prices: {
              "stain-removal": { shirt: 100, tshirt: 100, pant: 100 },
              "ironing": { shirt: 12, tshirt: 12, pant: 12 },
              "wash-and-iron": { shirt: 70, tshirt: 70, pant: 70 },
              "wash-and-fold": { shirt: 60, tshirt: 60, pant: 60 },
              "starch-and-iron": { shirt: 80, tshirt: 80, pant: 80 }
            }
          };
          setServiceConfig(defaultServiceConfig);
        }

        // Load cloth configuration
        const clothSnap = await getDoc(doc(db, 'settings', 'clothConfig'));
        if (clothSnap.exists()) {
          setClothConfig(clothSnap.data());
        } else {
          const defaultClothConfig = {
            items: [
              { id: 'shirt', name: 'Shirt', icon: 'shirt', iconUrl: '', enabled: true },
              { id: 'tshirt', name: 'T-Shirt', icon: 'tshirt', iconUrl: '', enabled: true },
              { id: 'pant', name: 'Pant', icon: 'pant', iconUrl: '', enabled: true }
            ]
          };
          setClothConfig(defaultClothConfig);
        }

      } catch (error) {
        console.error('Error loading initial data:', error);
        setMessage({ type: 'error', text: 'Failed to load settings.' });
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Business settings functions
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const tmpUrl = URL.createObjectURL(file);
    setSettings(prev => ({ ...prev, logoUrl: tmpUrl }));
  };

  const uploadLogoIfNeeded = async () => {
    if (!logoFile) return settings.logoUrl || '';
    const safeName = `${Date.now()}_${logoFile.name.replace(/\s+/g, '_')}`;
    const storageRef = ref(storage, `logos/${safeName}`);
    await uploadBytes(storageRef, logoFile);
    const url = await getDownloadURL(storageRef);
    return url;
  };

  const removeLogo = async () => {
    try {
      if (!settings.logoUrl) return;
      try {
        const pathMatch = decodeURIComponent(settings.logoUrl).match(/\/o\/(.+)\?/);
        if (pathMatch?.[1]) {
          const filePath = pathMatch[1];
          await deleteObject(ref(storage, filePath));
        }
      } catch { }
      setSettings(prev => ({ ...prev, logoUrl: '' }));
      setLogoFile(null);
      setMessage({ type: 'success', text: 'Logo removed successfully.' });
    } catch (error) {
      console.error('Error removing logo:', error);
      setMessage({ type: 'error', text: 'Failed to remove logo.' });
    }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!settings.businessName.trim() || !settings.phoneNumber.trim()) {
      setMessage({ type: 'error', text: 'Business name and phone are required.' });
      return;
    }

    setSaving(true);
    try {
      const logoUrl = await uploadLogoIfNeeded();
      const payload = {
        businessName: settings.businessName.trim(),
        address: settings.address.trim(),
        gstin: settings.gstin.trim().toUpperCase(),
        phoneNumber: settings.phoneNumber.trim(),
        logoUrl: logoUrl,
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, ...SETTINGS_DOC_PATH), payload, { merge: true });
      setSettings(prev => ({ ...prev, ...payload }));
      setLogoFile(null);
      setMessage({ type: 'success', text: 'Business settings saved successfully!' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  // Order ID Reset Function - Enhanced to delete all orders
  const deleteAllOrders = async () => {
    try {
      // Get all documents from the Bookings collection
      const bookingsSnapshot = await getDocs(collection(db, 'Bookings'));
      
      if (bookingsSnapshot.empty) {
        return { deletedCount: 0 };
      }

      // Use batch operations for efficient deletion
      const batch = writeBatch(db);
      let deleteCount = 0;

      bookingsSnapshot.docs.forEach((docSnapshot) => {
        batch.delete(docSnapshot.ref);
        deleteCount++;
      });

      // Commit the batch
      await batch.commit();
      
      return { deletedCount: deleteCount };
    } catch (error) {
      console.error('Error deleting orders:', error);
      throw new Error('Failed to delete existing orders');
    }
  };

  const handleResetOrderId = async () => {
    // First confirmation
    const confirmReset = window.confirm(
      '⚠️ CRITICAL WARNING: This action will:\n\n' +
      '• Delete ALL existing orders from the database\n' +
      '• Reset the Order ID counter to 0001\n' +
      '• This action CANNOT be undone\n\n' +
      'Are you absolutely sure you want to continue?'
    );

    if (!confirmReset) return;

    // Second confirmation with explicit typing requirement
    const confirmationText = prompt(
      '🚨 FINAL CONFIRMATION\n\n' +
      'This will permanently delete ALL orders and reset the counter.\n\n' +
      'Type "DELETE ALL ORDERS" (exactly as shown) to confirm:'
    );

    if (confirmationText !== 'DELETE ALL ORDERS') {
      setMessage({ type: 'error', text: 'Reset cancelled. Confirmation text did not match.' });
      return;
    }

    setSaving(true);
    try {
      // Delete all existing orders
      const { deletedCount } = await deleteAllOrders();
      
      // Reset the order counter
      await setDoc(doc(db, 'settings', 'orderCounter'), {
        currentId: 0,
        lastReset: serverTimestamp(),
        resetBy: 'admin',
        deletedOrdersCount: deletedCount
      });
      
      setOrderCounter(0);
      setMessage({ 
        type: 'success', 
        text: `Order system reset successfully! Deleted ${deletedCount} orders. Next order will be 0001.` 
      });
      
    } catch (error) {
      console.error('Error resetting order system:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to reset order system. Please try again.' 
      });
    } finally {
      setSaving(false);
    }
  };

  // Cloth Icon Upload Functions
  const handleClothIconChange = (clothId, file) => {
    if (!file) return;
    const tmpUrl = URL.createObjectURL(file);
    setClothIconFiles(prev => ({ ...prev, [clothId]: file }));
    setClothConfig(prev => ({
      ...prev,
      items: prev.items.map(c =>
        c.id === clothId ? { ...c, iconUrl: tmpUrl } : c
      )
    }));
  };

  const handleNewClothIconChange = (file) => {
    if (!file) return;
    const tmpUrl = URL.createObjectURL(file);
    setClothIconFiles(prev => ({ ...prev, '_new': file }));
    setNewCloth(prev => ({ ...prev, iconUrl: tmpUrl }));
  };

  const uploadClothIcon = async (clothId, file) => {
    if (!file) return '';
    const safeName = `${Date.now()}_${clothId}_${file.name.replace(/\s+/g, '_')}`;
    const storageRef = ref(storage, `cloth-icons/${safeName}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  };

  const removeClothIcon = async (clothId) => {
    try {
      const cloth = clothConfig.items.find(c => c.id === clothId);
      if (!cloth?.iconUrl) return;

      try {
        const pathMatch = decodeURIComponent(cloth.iconUrl).match(/\/o\/(.+)\?/);
        if (pathMatch?.[1]) {
          const filePath = pathMatch[1];
          await deleteObject(ref(storage, filePath));
        }
      } catch { }

      setClothConfig(prev => ({
        ...prev,
        items: prev.items.map(c =>
          c.id === clothId ? { ...c, iconUrl: '', icon: '' } : c
        )
      }));

      setClothIconFiles(prev => {
        const updated = { ...prev };
        delete updated[clothId];
        return updated;
      });

      setMessage({ type: 'success', text: 'Icon removed successfully.' });
    } catch (error) {
      console.error('Error removing icon:', error);
      setMessage({ type: 'error', text: 'Failed to remove icon.' });
    }
  };

  // Service Management Functions
  const addService = () => {
    if (!newService.id || !newService.name) {
      setMessage({ type: 'error', text: 'Service ID and name are required.' });
      return;
    }

    const exists = serviceConfig.serviceTypes.find(s => s.id === newService.id);
    if (exists) {
      setMessage({ type: 'error', text: 'Service ID already exists.' });
      return;
    }

    setServiceConfig(prev => ({
      ...prev,
      serviceTypes: [...prev.serviceTypes, { ...newService, enabled: true }],
      prices: { ...prev.prices, [newService.id]: {} }
    }));

    setNewService({ id: '', name: '' });
    setMessage({ type: 'success', text: 'Service added. Click "Save Services" to persist.' });
  };

  const toggleService = (serviceId) => {
    setServiceConfig(prev => ({
      ...prev,
      serviceTypes: prev.serviceTypes.map(s =>
        s.id === serviceId ? { ...s, enabled: !s.enabled } : s
      )
    }));
  };

  const deleteService = (serviceId) => {
    if (!window.confirm('Delete this service?')) return;
    setServiceConfig(prev => ({
      ...prev,
      serviceTypes: prev.serviceTypes.filter(s => s.id !== serviceId),
      prices: Object.fromEntries(Object.entries(prev.prices).filter(([key]) => key !== serviceId))
    }));
    setMessage({ type: 'success', text: 'Service removed. Click "Save Services" to persist.' });
  };

  const updatePrice = (serviceId, clothId, value) => {
    setServiceConfig(prev => ({
      ...prev,
      prices: {
        ...prev.prices,
        [serviceId]: {
          ...prev.prices[serviceId],
          [clothId]: parseFloat(value) || 0
        }
      }
    }));
  };

  const saveServices = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'serviceConfig'), serviceConfig);
      setMessage({ type: 'success', text: 'Services saved successfully!' });
    } catch (error) {
      console.error('Error saving services:', error);
      setMessage({ type: 'error', text: 'Failed to save services.' });
    } finally {
      setSaving(false);
    }
  };

  // Cloth Type Management Functions
  const addClothType = async () => {
    if (!newCloth.id || !newCloth.name) {
      setMessage({ type: 'error', text: 'Cloth ID and name are required.' });
      return;
    }

    const exists = clothConfig.items.find(c => c.id === newCloth.id);
    if (exists) {
      setMessage({ type: 'error', text: 'Cloth ID already exists.' });
      return;
    }

    try {
      setSaving(true);
      
      let iconUrl = newCloth.iconUrl || '';
      if (clothIconFiles['_new']) {
        iconUrl = await uploadClothIcon(newCloth.id, clothIconFiles['_new']);
      }

      const clothToAdd = {
        id: newCloth.id,
        name: newCloth.name,
        icon: newCloth.icon || newCloth.id,
        iconUrl: iconUrl,
        enabled: true
      };

      setClothConfig(prev => ({
        ...prev,
        items: [...prev.items, clothToAdd]
      }));

      setNewCloth({ id: '', name: '', icon: '', iconUrl: '' });
      setClothIconFiles(prev => {
        const updated = { ...prev };
        delete updated['_new'];
        return updated;
      });

      setMessage({ type: 'success', text: 'Cloth type added. Click "Save Cloth Types" to persist.' });
    } catch (error) {
      console.error('Error adding cloth type:', error);
      setMessage({ type: 'error', text: 'Failed to upload icon.' });
    } finally {
      setSaving(false);
    }
  };

  const toggleClothType = (clothId) => {
    setClothConfig(prev => ({
      ...prev,
      items: prev.items.map(c =>
        c.id === clothId ? { ...c, enabled: !c.enabled } : c
      )
    }));
  };

  const deleteClothType = async (clothId) => {
    if (!window.confirm('Delete this cloth type?')) return;

    try {
      const cloth = clothConfig.items.find(c => c.id === clothId);
      if (cloth?.iconUrl) {
        try {
          const pathMatch = decodeURIComponent(cloth.iconUrl).match(/\/o\/(.+)\?/);
          if (pathMatch?.[1]) {
            await deleteObject(ref(storage, pathMatch[1]));
          }
        } catch { }
      }

      setClothConfig(prev => ({
        ...prev,
        items: prev.items.filter(c => c.id !== clothId)
      }));

      setMessage({ type: 'success', text: 'Cloth type removed. Click "Save Cloth Types" to persist.' });
    } catch (error) {
      console.error('Error deleting cloth type:', error);
      setMessage({ type: 'error', text: 'Failed to delete cloth type.' });
    }
  };

  const saveClothTypes = async () => {
    setSaving(true);
    try {
      const updatedItems = await Promise.all(
        clothConfig.items.map(async (cloth) => {
          if (clothIconFiles[cloth.id]) {
            const iconUrl = await uploadClothIcon(cloth.id, clothIconFiles[cloth.id]);
            return { ...cloth, iconUrl };
          }
          return cloth;
        })
      );

      const updatedConfig = { ...clothConfig, items: updatedItems };
      
      await setDoc(doc(db, 'settings', 'clothConfig'), updatedConfig);
      setClothConfig(updatedConfig);
      setClothIconFiles({});
      
      setMessage({ type: 'success', text: 'Cloth types saved successfully!' });
    } catch (error) {
      console.error('Error saving cloth types:', error);
      setMessage({ type: 'error', text: 'Failed to save cloth types.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '1.5rem' }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 2px rgba(0,0,0,.05)',
          padding: '2rem',
          border: '1px solid var(--gray-200)'
        }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--gray-800)' }}>Settings</h3>
          <p style={{ marginTop: '1rem' }}>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '1.5rem' }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
        padding: '2rem',
        border: '1px solid var(--gray-200)'
      }}>
        {message.text && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              backgroundColor: message.type === 'error' ? '#fee2e2' : '#ecfdf5',
              color: message.type === 'error' ? '#991b1b' : '#065f46',
              border: `1px solid ${message.type === 'error' ? '#fecaca' : '#a7f3d0'}`
            }}
          >
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div style={{ marginBottom: '2rem', borderBottom: '2px solid var(--gray-200)' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {['business', 'services', 'clothTypes'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? '3px solid var(--primary)' : '3px solid transparent',
                  color: activeTab === tab ? 'var(--primary)' : 'var(--gray-600)',
                  fontWeight: activeTab === tab ? 600 : 400,
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s'
                }}
              >
                {tab === 'business' ? 'Business Info' : tab === 'services' ? 'Services' : 'Cloth Types'}
              </button>
            ))}
          </div>
        </div>

        {/* Business Information Tab */}
        {activeTab === 'business' && (
          <form onSubmit={saveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <h4 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--gray-800)', marginBottom: '1rem' }}>
                Business Information
              </h4>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '2.5rem'
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '.875rem', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '.5rem' }}>
                    Business Name
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    value={settings.businessName}
                    onChange={handleInputChange}
                    placeholder="Wash & Joy"
                    required
                    style={{
                      width: '90%', padding: '.5rem 1rem', border: '1px solid var(--gray-300)',
                      borderRadius: '.5rem', outline: 'none', fontSize: '.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '.875rem', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '.5rem' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={settings.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="+91 98765 43210"
                    maxLength="10"
                    minLength="10"
                    required
                    style={{
                      width: '90%', padding: '.5rem 1rem', border: '1px solid var(--gray-300)',
                      borderRadius: '.5rem', outline: 'none', fontSize: '.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '.875rem', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '.5rem' }}>
                    GSTIN
                  </label>
                  <input
                    type="text"
                    name="gstin"
                    value={settings.gstin}
                    onChange={handleInputChange}
                    placeholder="27ABCDE1234F1Z5"
                    style={{
                      width: '90%', padding: '.5rem 1rem', border: '1px solid var(--gray-300)',
                      borderRadius: '.5rem', outline: 'none', fontSize: '.875rem', textTransform: 'uppercase'
                    }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '.875rem', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '.5rem' }}>
                    Address
                  </label>
                  <textarea
                    name="address"
                    value={settings.address}
                    onChange={handleInputChange}
                    placeholder="Street, Area, City, Pincode"
                    rows={3}
                    style={{
                      width: '97%', padding: '.75rem 1rem', border: '1px solid var(--gray-300)',
                      borderRadius: '.5rem', outline: 'none', fontSize: '.875rem', resize: 'vertical'
                    }}
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--gray-800)', marginBottom: '1rem' }}>
                Brand Logo
              </h4>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{
                  width: 96, height: 96, border: '1px dashed var(--gray-300)', borderRadius: '0.5rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#fafafa'
                }}>
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ color: 'var(--gray-500)', fontSize: '.75rem', textAlign: 'center', padding: '0 .5rem' }}>
                      No logo
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                  <label
                    htmlFor="logo-upload"
                    style={{
                      padding: '.5rem 1rem', backgroundColor: 'var(--primary, #3b82f6)', color: '#fff',
                      borderRadius: '.5rem', cursor: 'pointer', fontSize: '.875rem'
                    }}
                  >
                    Upload Logo
                  </label>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={removeLogo}
                    disabled={!settings.logoUrl}
                    style={{
                      padding: '.5rem 1rem', backgroundColor: settings.logoUrl ? '#ef4444' : '#e5e7eb',
                      color: '#fff', borderRadius: '.5rem', border: 'none',
                      cursor: settings.logoUrl ? 'pointer' : 'not-allowed', fontSize: '.875rem'
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>

            {/* Order ID Management Section */}
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#fef3c7',
              border: '2px solid #f59e0b',
              borderRadius: '0.5rem'
            }}>
              <h4 style={{ fontSize: '1.125rem', fontWeight: 500, color: '#92400e', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>⚙️</span> Order ID Management
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#78350f', marginBottom: '0.25rem' }}>
                      Current Order Counter:
                    </p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#92400e' }}>
                      {String(orderCounter).padStart(4, '0')}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#78350f', marginTop: '0.25rem' }}>
                      Next Order ID will be: {String(orderCounter + 1).padStart(4, '0')}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetOrderId}
                    disabled={saving}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: saving ? '#dc2626' : '#dc2626',
                      color: 'white',
                      borderRadius: '0.5rem',
                      border: 'none',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      opacity: saving ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!saving) e.target.style.backgroundColor = '#b91c1c';
                    }}
                    onMouseLeave={(e) => {
                      if (!saving) e.target.style.backgroundColor = '#dc2626';
                    }}
                  >
                    <span>🔄</span>
                    {saving ? 'Resetting...' : 'Reset Order System'}
                  </button>
                </div>

                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#fef2f2',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  color: '#991b1b',
                  border: '1px solid #fecaca'
                }}>
                  <strong>🚨 DANGER ZONE:</strong> This will permanently delete ALL existing orders from the database and reset the order counter to 0001. 
                  This action cannot be undone. Only use this if you want to completely restart your order system.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.75rem' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '.5rem 1.5rem',
                  backgroundColor: saving ? '#93c5fd' : 'var(--primary, #3b82f6)',
                  color: 'white',
                  borderRadius: '.5rem',
                  border: 'none',
                  cursor: saving ? 'wait' : 'pointer',
                  fontSize: '.875rem'
                }}
              >
                {saving ? 'Saving…' : 'Save Business Settings'}
              </button>
            </div>
          </form>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <h4 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--gray-800)', marginBottom: '1.5rem' }}>
                Services
              </h4>

              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={newService.id}
                    onChange={(e) => setNewService({ ...newService, id: e.target.value })}
                    placeholder="Service ID (e.g., dry-clean)"
                    style={{
                      padding: '.5rem 1rem', border: '1px solid var(--gray-300)',
                      borderRadius: '.5rem', outline: 'none', fontSize: '.875rem',
                      flexGrow: 1, minWidth: '180px'
                    }}
                  />
                  <input
                    type="text"
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    placeholder="Service Name (e.g., Dry Cleaning)"
                    style={{
                      padding: '.5rem 1rem', border: '1px solid var(--gray-300)',
                      borderRadius: '.5rem', outline: 'none', fontSize: '.875rem',
                      flexGrow: 1, minWidth: '180px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={addService}
                    disabled={!newService.id || !newService.name}
                    style={{
                      padding: '.5rem 1.5rem',
                      backgroundColor: !newService.id || !newService.name ? '#e5e7eb' : 'var(--primary, #3b82f6)',
                      color: '#fff',
                      borderRadius: '.5rem',
                      border: 'none',
                      cursor: !newService.id || !newService.name ? 'not-allowed' : 'pointer',
                      fontSize: '.875rem',
                      minWidth: '100px'
                    }}
                  >
                    Add Service
                  </button>
                </div>
              </div>

              {serviceConfig.serviceTypes.length > 0 ? (
                <div style={{ border: '1px solid var(--gray-200)', borderRadius: '.5rem', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 100px', backgroundColor: 'var(--gray-50)', padding: '.75rem 1rem', fontWeight: 500 }}>
                    <div>ID</div>
                    <div>Service Name</div>
                    <div style={{ textAlign: 'center' }}>Status</div>
                    <div style={{ textAlign: 'center' }}>Action</div>
                  </div>

                  {serviceConfig.serviceTypes.map(service => (
                    <div key={service.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 100px', padding: '.75rem 1rem', borderTop: '1px solid var(--gray-200)' }}>
                      <div style={{ fontSize: '.875rem', color: 'var(--gray-700)' }}>{service.id}</div>
                      <div>{service.name}</div>
                      <div style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => toggleService(service.id)}
                          style={{
                            padding: '.25rem .75rem', fontSize: '.75rem', borderRadius: '9999px',
                            backgroundColor: service.enabled ? '#dcfce7' : '#fee2e2',
                            color: service.enabled ? '#166534' : '#991b1b',
                            border: 'none', cursor: 'pointer'
                          }}
                        >
                          {service.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => deleteService(service.id)}
                          style={{
                            padding: '.25rem .75rem', fontSize: '.75rem', borderRadius: '.25rem',
                            backgroundColor: '#fee2e2', color: '#991b1b',
                            border: 'none', cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 0', backgroundColor: 'var(--gray-50)', borderRadius: '.5rem' }}>
                  <p style={{ color: 'var(--gray-500)' }}>No services added yet</p>
                </div>
              )}
            </div>

            <div>
              <h4 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--gray-800)', marginBottom: '1.5rem' }}>
                Service Prices
              </h4>

              {serviceConfig.serviceTypes.length > 0 && clothConfig.items.length > 0 ? (
                <div style={{ 
                  border: '1px solid var(--gray-200)', 
                  borderRadius: '.5rem', 
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  {/* Table wrapper with horizontal scroll */}
                  <div 
                    ref={tableScrollRef}
                    onScroll={handleTableScroll}
                    style={{ 
                      overflowX: 'auto', 
                      width: '100%',
                      position: 'relative',
                      paddingBottom: '5px'
                    }}
                  >
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'collapse',
                      minWidth: clothConfig.items.length > 3 ? `${clothConfig.items.length * 120 + 200}px` : '100%'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--gray-50)' }}>
                          <th style={{ 
                            padding: '.75rem 1rem', 
                            textAlign: 'left', 
                            fontWeight: 500, 
                            borderBottom: '1px solid var(--gray-200)',
                            position: 'sticky',
                            left: 0,
                            backgroundColor: 'var(--gray-50)',
                            zIndex: 2,
                            minWidth: '200px'
                          }}>Service</th>
                          {clothConfig.items.map(cloth => (
                            <th key={cloth.id} style={{ 
                              padding: '.75rem 1rem', 
                              textAlign: 'center', 
                              fontWeight: 500, 
                              borderBottom: '1px solid var(--gray-200)',
                              minWidth: '120px'
                            }}>
                              {cloth.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {serviceConfig.serviceTypes.map(service => (
                          <tr key={service.id}>
                            <td style={{ 
                              padding: '.75rem 1rem', 
                              borderBottom: '1px solid var(--gray-200)',
                              position: 'sticky',
                              left: 0,
                              backgroundColor: 'white',
                              zIndex: 1,
                              boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)'
                            }}>
                              {service.name}
                              {!service.enabled && <span style={{ fontSize: '.75rem', color: '#ef4444', marginLeft: '.5rem' }}>(Disabled)</span>}
                            </td>
                            {clothConfig.items.map(cloth => (
                              <td key={cloth.id} style={{ padding: '.5rem', borderBottom: '1px solid var(--gray-200)', textAlign: 'center' }}>
                                <input
                                  type="number"
                                  value={serviceConfig.prices[service.id]?.[cloth.id] || ''}
                                  onChange={(e) => updatePrice(service.id, cloth.id, e.target.value)}
                                  placeholder="0"
                                  style={{
                                    width: '80px',
                                    padding: '.5rem',
                                    border: '1px solid var(--gray-300)',
                                    borderRadius: '.25rem',
                                    textAlign: 'center'
                                  }}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Custom scrollbar */}
                  {clothConfig.items.length > 3 && scrollInfo.scrollWidth > scrollInfo.clientWidth && (
                    <div style={{
                      padding: '0.5rem 0',
                      marginTop: '0.5rem',
                      position: 'relative'
                    }}>
                      <div style={{
                        height: '6px',
                        backgroundColor: '#e5e7eb',
                        borderRadius: '999px',
                        position: 'relative',
                        cursor: 'pointer'
                      }}>
                        <div 
                          onMouseDown={handleScrollStart}
                          style={{
                            position: 'absolute',
                            left: `${(scrollInfo.scrollLeft / (scrollInfo.scrollWidth - scrollInfo.clientWidth)) * 100}%`,
                            width: `${(scrollInfo.clientWidth / scrollInfo.scrollWidth) * 100}%`,
                            height: '100%',
                            backgroundColor: '#6366f1',
                            borderRadius: '999px',
                            cursor: 'grab',
                            transform: 'translateX(-0%)',
                            transition: scrollInfo.isDragging ? 'none' : 'left 0.1s ease-out'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 0', backgroundColor: 'var(--gray-50)', borderRadius: '.5rem' }}>
                  <p style={{ color: 'var(--gray-500)' }}>Add services and cloth types to configure prices</p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.75rem' }}>
              <button
                type="button"
                onClick={saveServices}
                disabled={saving}
                style={{
                  padding: '.5rem 1.5rem',
                  backgroundColor: saving ? '#93c5fd' : 'var(--primary, #3b82f6)',
                  color: 'white',
                  borderRadius: '.5rem',
                  border: 'none',
                  cursor: saving ? 'wait' : 'pointer',
                  fontSize: '.875rem'
                }}
              >
                {saving ? 'Saving…' : 'Save Services'}
              </button>
            </div>
          </div>
        )}

        {/* Cloth Types Tab */}
        {activeTab === 'clothTypes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <h4 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--gray-800)', marginBottom: '1.5rem' }}>
                Cloth Types
              </h4>

              {/* New Cloth Type Card */}
              <div style={{
                padding: '2rem',
                backgroundColor: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginBottom: '1.5rem' }}>
                  Add New Cloth Type
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#475569', marginBottom: '0.5rem' }}>
                      Cloth ID
                    </label>
                    <input
                      type="text"
                      value={newCloth.id}
                      onChange={(e) => setNewCloth({ ...newCloth, id: e.target.value })}
                      placeholder="e.g., jeans"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        outline: 'none',
                        fontSize: '0.95rem',
                        backgroundColor: 'white',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#475569', marginBottom: '0.5rem' }}>
                      Cloth Name
                    </label>
                    <input
                      type="text"
                      value={newCloth.name}
                      onChange={(e) => setNewCloth({ ...newCloth, name: e.target.value })}
                      placeholder="e.g., Jeans"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        outline: 'none',
                        fontSize: '0.95rem',
                        backgroundColor: 'white',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#475569', marginBottom: '0.5rem' }}>
                      Icon
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {newCloth.iconUrl && (
                        <div style={{
                          width: 42,
                          height: 42,
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          backgroundColor: 'white'
                        }}>
                          <img src={newCloth.iconUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                      )}
                      <label
                        htmlFor="new-cloth-icon"
                        style={{
                          padding: '0.75rem 1rem',
                          backgroundColor: '#6366f1',
                          color: 'white',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: 500,
                          display: 'inline-block'
                        }}
                      >
                        Choose
                      </label>
                      <input
                        id="new-cloth-icon"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleNewClothIconChange(e.target.files?.[0])}
                        style={{ display: 'none' }}
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={addClothType}
                    disabled={saving || !newCloth.id || !newCloth.name}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: (saving || !newCloth.id || !newCloth.name) ? '#93c5fd' : '#3b82f6',
                      color: 'white',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: (saving || !newCloth.id || !newCloth.name) ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {saving ? 'Adding...' : 'Add Cloth'}
                  </button>
                </div>
              </div>

              <div style={{ marginTop: '2rem' }}>
                {clothConfig.items.length > 0 ? (
                  <div style={{ border: '1px solid var(--gray-200)', borderRadius: '.5rem', overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 100px 120px', backgroundColor: 'var(--gray-50)', padding: '.75rem 1rem', fontWeight: 500 }}>
                      <div>Icon</div>
                      <div>Cloth Type</div>
                      <div style={{ textAlign: 'center' }}>Status</div>
                      <div style={{ textAlign: 'center' }}>Actions</div>
                    </div>

                    {clothConfig.items.map(cloth => (
                      <div key={cloth.id} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 100px 120px', padding: '.75rem 1rem', borderTop: '1px solid var(--gray-200)', alignItems: 'center' }}>
                        <div>
                          <div style={{ 
                            width: 48, 
                            height: 48, 
                            border: '1px solid var(--gray-200)', 
                            borderRadius: '.25rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                            backgroundColor: 'white'
                          }}>
                            {cloth.iconUrl ? (
                              <img src={cloth.iconUrl} alt={cloth.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            ) : (
                              <span style={{ color: 'var(--gray-500)', fontSize: '.75rem' }}>{cloth.id.substr(0, 2)}</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontWeight: 500 }}>{cloth.name}</div>
                          <div style={{ fontSize: '.75rem', color: 'var(--gray-500)' }}>ID: {cloth.id}</div>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => toggleClothType(cloth.id)}
                            style={{
                              padding: '.25rem .75rem', fontSize: '.75rem', borderRadius: '9999px',
                              backgroundColor: cloth.enabled ? '#dcfce7' : '#fee2e2',
                              color: cloth.enabled ? '#166534' : '#991b1b',
                              border: 'none', cursor: 'pointer'
                            }}
                          >
                            {cloth.enabled ? 'Enabled' : 'Disabled'}
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              document.getElementById(`cloth-icon-${cloth.id}`).click();
                            }}
                            style={{
                              padding: '.25rem .75rem', fontSize: '.75rem', borderRadius: '.25rem',
                              backgroundColor: '#f3f4f6', color: '#374151',
                              border: 'none', cursor: 'pointer'
                            }}
                          >
                            Icon
                          </button>
                          <input
                            id={`cloth-icon-${cloth.id}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleClothIconChange(cloth.id, e.target.files?.[0])}
                            style={{ display: 'none' }}
                          />

                          <button
                            type="button"
                            onClick={() => deleteClothType(cloth.id)}
                            style={{
                              padding: '.25rem .75rem', fontSize: '.75rem', borderRadius: '.25rem',
                              backgroundColor: '#fee2e2', color: '#991b1b',
                              border: 'none', cursor: 'pointer'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem 0', backgroundColor: 'var(--gray-50)', borderRadius: '.5rem' }}>
                    <p style={{ color: 'var(--gray-500)' }}>No cloth types added yet</p>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.75rem' }}>
              <button
                type="button"
                onClick={saveClothTypes}
                disabled={saving}
                style={{
                  padding: '.5rem 1.5rem',
                  backgroundColor: saving ? '#93c5fd' : 'var(--primary, #3b82f6)',
                  color: 'white',
                  borderRadius: '.5rem',
                  border: 'none',
                  cursor: saving ? 'wait' : 'pointer',
                  fontSize: '.875rem'
                }}
              >
                {saving ? 'Saving…' : 'Save Cloth Types'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;