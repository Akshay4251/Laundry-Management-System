import React, { useEffect, useState } from 'react';
import { db, storage } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [clothIconFiles, setClothIconFiles] = useState({}); // Store icon files for each cloth
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('business');

  const [newService, setNewService] = useState({ id: '', name: '' });
  const [newCloth, setNewCloth] = useState({ id: '', name: '', icon: '', iconUrl: '' });

  useEffect(() => {
    const load = async () => {
      try {
        // Load business settings
        const snap = await getDoc(doc(db, ...SETTINGS_DOC_PATH));
        if (snap.exists()) {
          setSettings(prev => ({ ...prev, ...snap.data() }));
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

      } catch (e) {
        console.error(e);
        setMessage({ type: 'error', text: 'Failed to load settings.' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
      setMessage({ type: 'success', text: 'Logo removed.' });
    } catch (e) {
      console.error(e);
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
      setMessage({ type: 'success', text: 'Business settings saved!' });
    } catch (e2) {
      console.error(e2);
      setMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  // Cloth Icon Upload Functions
  const handleClothIconChange = (clothId, file) => {
    if (!file) return;
    const tmpUrl = URL.createObjectURL(file);
    
    // Store the file for later upload
    setClothIconFiles(prev => ({ ...prev, [clothId]: file }));
    
    // Update preview
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

      // Remove from pending uploads
      setClothIconFiles(prev => {
        const updated = { ...prev };
        delete updated[clothId];
        return updated;
      });

      setMessage({ type: 'success', text: 'Icon removed.' });
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Failed to remove icon.' });
    }
  };

  // Service Management
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
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Failed to save services.' });
    } finally {
      setSaving(false);
    }
  };

  // Cloth Type Management
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
      
      // Upload icon if file is selected
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

      // Clear the form and file
      setNewCloth({ id: '', name: '', icon: '', iconUrl: '' });
      setClothIconFiles(prev => {
        const updated = { ...prev };
        delete updated['_new'];
        return updated;
      });

      setMessage({ type: 'success', text: 'Cloth type added. Click "Save Cloth Types" to persist.' });
    } catch (e) {
      console.error(e);
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
      // Remove icon from storage if exists
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
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Failed to delete cloth type.' });
    }
  };

  const saveClothTypes = async () => {
    setSaving(true);
    try {
      // Upload any pending icon files
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
      setClothIconFiles({}); // Clear pending uploads
      
      setMessage({ type: 'success', text: 'Cloth types saved successfully!' });
    } catch (e) {
      console.error(e);
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
            {/* Add New Service */}
            <div>
              <h4 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--gray-800)', marginBottom: '1rem' }}>
                Add New Service
              </h4>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '.875rem', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '.5rem' }}>
                    Service ID (e.g., "express-wash")
                  </label>
                  <input
                    type="text"
                    value={newService.id}
                    onChange={(e) => setNewService({ ...newService, id: e.target.value })}
                    placeholder="express-wash"
                    style={{
                      width: '95%', padding: '.5rem 1rem', border: '1px solid var(--gray-300)',
                      borderRadius: '.5rem', outline: 'none', fontSize: '.875rem'
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '.875rem', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '.5rem' }}>
                    Service Name
                  </label>
                  <input
                    type="text"
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    placeholder="Express Wash"
                    style={{
                      width: '95%', padding: '.5rem 1rem', border: '1px solid var(--gray-300)',
                      borderRadius: '.5rem', outline: 'none', fontSize: '.875rem'
                    }}
                  />
                </div>
                <button
                  onClick={addService}
                  style={{
                    padding: '.5rem 1.5rem',
                    backgroundColor: 'var(--primary, #3b82f6)',
                    color: 'white',
                    borderRadius: '.5rem',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '.875rem'
                  }}
                >
                  Add Service
                </button>
              </div>
            </div>

            {/* Existing Services */}
            <div>
              <h4 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--gray-800)', marginBottom: '1rem' }}>
                Existing Services
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {serviceConfig.serviceTypes.map(service => (
                  <div
                    key={service.id}
                    style={{
                      padding: '1rem',
                      border: '1px solid var(--gray-300)',
                      borderRadius: '.5rem',
                      backgroundColor: service.enabled ? '#fff' : '#f9fafb'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div>
                        <strong>{service.name}</strong>
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: 'var(--gray-500)' }}>
                          ({service.id})
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => toggleService(service.id)}
                          style={{
                            padding: '.35rem .75rem',
                            backgroundColor: service.enabled ? '#10b981' : '#6b7280',
                            color: 'white',
                            borderRadius: '.35rem',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '.8rem'
                          }}
                        >
                          {service.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                        <button
                          onClick={() => deleteService(service.id)}
                          style={{
                            padding: '.35rem .75rem',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            borderRadius: '.35rem',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '.8rem'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Price Matrix for this service */}
                    <div style={{ marginTop: '1rem' }}>
                      <p style={{ fontSize: '.875rem', fontWeight: 500, marginBottom: '.5rem', color: 'var(--gray-700)' }}>
                        Prices (₹):
                      </p>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                        gap: '0.75rem'
                      }}>
                        {clothConfig.items.filter(c => c.enabled).map(cloth => (
                          <div key={cloth.id} style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '.75rem', color: 'var(--gray-600)', marginBottom: '.25rem' }}>
                              {cloth.name}
                            </label>
                            <input
                              type="number"
                              value={serviceConfig.prices[service.id]?.[cloth.id] || 0}
                              onChange={(e) => updatePrice(service.id, cloth.id, e.target.value)}
                              style={{
                                padding: '.35rem .5rem',
                                border: '1px solid var(--gray-300)',
                                borderRadius: '.35rem',
                                outline: 'none',
                                fontSize: '.8rem'
                              }}
                              min="0"
                              step="0.01"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
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
            {/* Add New Cloth Type */}
            <div>
              <h4 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--gray-800)', marginBottom: '1rem' }}>
                Add New Cloth Type
              </h4>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={{ display: 'block', fontSize: '.875rem', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '.5rem' }}>
                    Cloth ID (e.g., "jeans")
                  </label>
                  <input
                    type="text"
                    value={newCloth.id}
                    onChange={(e) => setNewCloth({ ...newCloth, id: e.target.value })}
                    placeholder="jeans"
                    style={{
                      width: '95%', padding: '.5rem 1rem', border: '1px solid var(--gray-300)',
                      borderRadius: '.5rem', outline: 'none', fontSize: '.875rem'
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={{ display: 'block', fontSize: '.875rem', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '.5rem' }}>
                    Cloth Name
                  </label>
                  <input
                    type="text"
                    value={newCloth.name}
                    onChange={(e) => setNewCloth({ ...newCloth, name: e.target.value })}
                    placeholder="Jeans"
                    style={{
                      width: '95%', padding: '.5rem 1rem', border: '1px solid var(--gray-300)',
                      borderRadius: '.5rem', outline: 'none', fontSize: '.875rem'
                    }}
                  />
                </div>
                
                {/* Icon Upload for New Cloth */}
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '.875rem', fontWeight: 500, color: 'var(--gray-700)', marginBottom: '.5rem' }}>
                    Upload Icon
                  </label>
                  <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                    {newCloth.iconUrl && (
                      <div style={{
                        width: 40, height: 40, border: '1px solid var(--gray-300)', borderRadius: '.35rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#fafafa'
                      }}>
                        <img src={newCloth.iconUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                    )}
                    <label
                      htmlFor="new-cloth-icon-upload"
                      style={{
                        padding: '.4rem .8rem', backgroundColor: 'var(--primary, #3b82f6)', color: '#fff',
                        borderRadius: '.4rem', cursor: 'pointer', fontSize: '.8rem'
                      }}
                    >
                      Choose Icon
                    </label>
                    <input
                      id="new-cloth-icon-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleNewClothIconChange(e.target.files?.[0])}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>

                <button
                  onClick={addClothType}
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
                  {saving ? 'Adding...' : 'Add Cloth'}
                </button>
              </div>
            </div>

            {/* Existing Cloth Types */}
            <div>
              <h4 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--gray-800)', marginBottom: '1rem' }}>
                Existing Cloth Types
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1rem'
              }}>
                {clothConfig.items.map(cloth => (
                  <div
                    key={cloth.id}
                    style={{
                      padding: '1rem',
                      border: '1px solid var(--gray-300)',
                      borderRadius: '.5rem',
                      backgroundColor: cloth.enabled ? '#fff' : '#f9fafb'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: '1rem' }}>{cloth.name}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '.25rem' }}>
                          ID: {cloth.id}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <button
                          onClick={() => toggleClothType(cloth.id)}
                          style={{
                            padding: '.25rem .6rem',
                            backgroundColor: cloth.enabled ? '#10b981' : '#6b7280',
                            color: 'white',
                            borderRadius: '.3rem',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '.75rem'
                          }}
                        >
                          {cloth.enabled ? 'On' : 'Off'}
                        </button>
                        <button
                          onClick={() => deleteClothType(cloth.id)}
                          style={{
                            padding: '.25rem .6rem',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            borderRadius: '.3rem',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '.75rem'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Icon Preview and Upload */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '1rem', 
                      alignItems: 'center',
                      padding: '0.75rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '.4rem',
                      border: '1px solid var(--gray-200)'
                    }}>
                      <div style={{
                        width: 60, 
                        height: 60, 
                        border: '1px dashed var(--gray-300)', 
                        borderRadius: '.4rem',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        overflow: 'hidden', 
                        background: '#fff'
                      }}>
                        {cloth.iconUrl ? (
                          <img 
                            src={cloth.iconUrl} 
                            alt={`${cloth.name} icon`} 
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                          />
                        ) : (
                          <span style={{ 
                            color: 'var(--gray-400)', 
                            fontSize: '.65rem', 
                            textAlign: 'center',
                            padding: '0 .25rem'
                          }}>
                            No icon
                          </span>
                        )}
                      </div>

                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                        <label
                          htmlFor={`cloth-icon-${cloth.id}`}
                          style={{
                            padding: '.35rem .75rem',
                            backgroundColor: 'var(--primary, #3b82f6)',
                            color: '#fff',
                            borderRadius: '.35rem',
                            cursor: 'pointer',
                            fontSize: '.75rem',
                            textAlign: 'center',
                            display: 'inline-block'
                          }}
                        >
                          {cloth.iconUrl ? 'Change Icon' : 'Upload Icon'}
                        </label>
                        <input
                          id={`cloth-icon-${cloth.id}`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleClothIconChange(cloth.id, e.target.files?.[0])}
                          style={{ display: 'none' }}
                        />
                        {cloth.iconUrl && (
                          <button
                            onClick={() => removeClothIcon(cloth.id)}
                            style={{
                              padding: '.35rem .75rem',
                              backgroundColor: '#ef4444',
                              color: '#fff',
                              borderRadius: '.35rem',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '.75rem'
                            }}
                          >
                            Remove Icon
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
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