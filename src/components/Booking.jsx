import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, setDoc, doc, getDoc } from "firebase/firestore";
import sareeimg from '../assets/saree.png';
import coat from '../assets/coat.png';
import dbed from '../assets/dbedsheet.png';
import sbed from '../assets/sbedsheet.png';
import dhotar from '../assets/dhotar.png';
import sherwani from '../assets/sherwani.png';
import shirt from '../assets/shirt.png';
import tshirt from '../assets/tshirt.png';
import starch from '../assets/starch.png';
import sweater from '../assets/sweter.png';
import pant from '../assets/pants.png';
import blouse from '../assets/blouse.png';
import punjabi from '../assets/Punjabi.png';
import shalu from '../assets/shalu.png';
import onepiece from '../assets/lehenga.png';
import shoes from '../assets/shoes.png';
import helmet from '../assets/helmet.png';
import clothsperkg from '../assets/clothsperkg.png';

const Booking = () => {
  const imageMap = {
    shirt, tshirt, pant, starch, saree: sareeimg, blouse, panjabi: punjabi,
    dhotar, shalu, coat, shervani: sherwani, sweater, onepiece, 
    bedsheet: sbed, blanket: dbed, shoes, helmet, clothsPerKg: clothsperkg
  };

  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    serviceType: '',
    urgentDelivery: false,
    pickupDate: new Date().toISOString().split('T')[0],
    deliveryDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
    instructions: '',
    items: {}
  });

  const [servicePrices, setServicePrices] = useState({});
  const [clothingItems, setClothingItems] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfiguration = async () => {
      try {
        const serviceDoc = await getDoc(doc(db, "settings", "serviceConfig"));
        let services = {};
        let serviceList = [];

        if (serviceDoc.exists()) {
          const data = serviceDoc.data();
          services = data.prices || {};
          serviceList = data.serviceTypes || [];
        } else {
          services = {
            "stain-removal": {
              shirt: 100, tshirt: 100, pant: 100, starch: 120, saree: 250,
              blouse: 80, panjabi: 250, dhotar: 200, shalu: 350, coat: 400,
              shervani: 400, sweater: 180, onepiece: 250, bedsheet: 180,
              blanket: 450, shoes: 250, helmet: 250, clothsPerKg: 120
            },
            "ironing": {
              shirt: 12, tshirt: 12, pant: 12, starch: 30, saree: 80,
              blouse: 12, panjabi: 36, dhotar: 80, shalu: 120, coat: 150,
              shervani: 120, sweater: 50, onepiece: 60, bedsheet: 60,
              blanket: 0, shoes: 0, helmet: 0, clothsPerKg: 0
            },
            "wash-and-iron": {
              shirt: 70, tshirt: 70, pant: 70, starch: 80, saree: 200,
              blouse: 70, panjabi: 210, dhotar: 180, shalu: 280, coat: 300,
              shervani: 320, sweater: 150, onepiece: 200, bedsheet: 150,
              blanket: 400, shoes: 200, helmet: 200, clothsPerKg: 99
            },
            "wash-and-fold": {
              shirt: 60, tshirt: 60, pant: 60, starch: 70, saree: 180,
              blouse: 60, panjabi: 190, dhotar: 160, shalu: 250, coat: 280,
              shervani: 300, sweater: 130, onepiece: 180, bedsheet: 130,
              blanket: 350, shoes: 0, helmet: 0, clothsPerKg: 89
            },
            "starch-and-iron": {
              shirt: 80, tshirt: 80, pant: 80, starch: 90, saree: 220,
              blouse: 80, panjabi: 230, dhotar: 200, shalu: 300, coat: 320,
              shervani: 340, sweater: 170, onepiece: 220, bedsheet: 170,
              blanket: 420, shoes: 0, helmet: 0, clothsPerKg: 0
            }
          };

          serviceList = [
            { id: "stain-removal", name: "Stain Removal Treatment", enabled: true },
            { id: "ironing", name: "Ironing", enabled: true },
            { id: "wash-and-iron", name: "Wash & Iron", enabled: true },
            { id: "wash-and-fold", name: "Wash & Fold", enabled: true },
            { id: "starch-and-iron", name: "Starch & Iron", enabled: true }
          ];

          await setDoc(doc(db, "settings", "serviceConfig"), {
            prices: services,
            serviceTypes: serviceList
          });
        }

        setServicePrices(services);
        setAvailableServices(serviceList.filter(s => s.enabled));

        const clothDoc = await getDoc(doc(db, "settings", "clothConfig"));
        let clothTypes = [];

        if (clothDoc.exists()) {
          clothTypes = clothDoc.data().items || [];
        } else {
          clothTypes = [
            { id: 'shirt', name: 'Shirt', icon: 'shirt', enabled: true },
            { id: 'tshirt', name: 'T-Shirt', icon: 'tshirt', enabled: true },
            { id: 'pant', name: 'Pant', icon: 'pant', enabled: true },
            { id: 'starch', name: 'Starch Cloth', icon: 'starch', enabled: true },
            { id: 'saree', name: 'Saree', icon: 'saree', enabled: true },
            { id: 'blouse', name: 'Blouse', icon: 'blouse', enabled: true },
            { id: 'panjabi', name: 'Panjabi Suit', icon: 'panjabi', enabled: true },
            { id: 'dhotar', name: 'Dhotar', icon: 'dhotar', enabled: true },
            { id: 'shalu', name: 'Shalu / Paithani', icon: 'shalu', enabled: true },
            { id: 'coat', name: 'Coat / Blazer', icon: 'coat', enabled: true },
            { id: 'shervani', name: 'Shervani', icon: 'shervani', enabled: true },
            { id: 'sweater', name: 'Sweater / Jerkin', icon: 'sweater', enabled: true },
            { id: 'onepiece', name: 'One Piece Ghagara', icon: 'onepiece', enabled: true },
            { id: 'bedsheet', name: 'Bedsheet (Single/Double)', icon: 'bedsheet', enabled: true },
            { id: 'blanket', name: 'Blanket / Rajai', icon: 'blanket', enabled: true },
            { id: 'shoes', name: 'Shoes Washing', icon: 'shoes', enabled: true },
            { id: 'helmet', name: 'Helmet Washing', icon: 'helmet', enabled: true },
            { id: 'clothsPerKg', name: 'Cloths Per Kg', icon: 'clothsPerKg', enabled: true }
          ];

          await setDoc(doc(db, "settings", "clothConfig"), { items: clothTypes });
        }

        const enabledClothTypes = clothTypes.filter(item => item.enabled);
        setClothingItems(enabledClothTypes);

        const initialItems = {};
        enabledClothTypes.forEach(item => {
          initialItems[item.id] = { quantity: 0, price: 0 };
        });
        setFormData(prev => ({ ...prev, items: initialItems }));

      } catch (error) {
        console.error("Error fetching configuration: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfiguration();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (name === 'serviceType') {
      const updatedItems = Object.keys(formData.items).reduce((acc, item) => {
        acc[item] = {
          ...formData.items[item],
          price: servicePrices[value]?.[item] || 0
        };
        return acc;
      }, {});
      setFormData(prev => ({
        ...prev,
        items: updatedItems
      }));
    }
  };

  const handleItemChange = (item, value) => {
    setFormData(prev => ({
      ...prev,
      items: {
        ...prev.items,
        [item]: {
          ...prev.items[item],
          quantity: parseInt(value) || 0
        }
      }
    }));
  };

  const incrementQuantity = (itemId) => {
    setFormData(prev => ({
      ...prev,
      items: {
        ...prev.items,
        [itemId]: {
          ...prev.items[itemId],
          quantity: prev.items[itemId].quantity + 1
        }
      }
    }));
  };

  const decrementQuantity = (itemId) => {
    setFormData(prev => ({
      ...prev,
      items: {
        ...prev.items,
        [itemId]: {
          ...prev.items[itemId],
          quantity: Math.max(0, prev.items[itemId].quantity - 1)
        }
      }
    }));
  };

  const calculateTotal = () => {
    let totalItems = 0;
    let totalCost = 0;

    Object.values(formData.items).forEach(item => {
      totalItems += item.quantity;
      totalCost += item.quantity * item.price;
    });

    const sgst = totalCost * 0.09;
    const cgst = totalCost * 0.09;
    const grandTotal = totalCost + sgst + cgst;

    return { totalItems, totalCost, sgst, cgst, grandTotal };
  };

  const { totalItems, totalCost, sgst, cgst, grandTotal } = calculateTotal();

  const handlePhoneChange = async (e) => {
    const phoneNumber = e.target.value;
    setFormData(prev => ({
      ...prev,
      phone: phoneNumber
    }));

    if (phoneNumber.length === 10) {
      try {
        const customerDoc = await getDoc(doc(db, "customers", phoneNumber));
        if (customerDoc.exists()) {
          const customerData = customerDoc.data();
          setFormData(prev => ({
            ...prev,
            customerName: customerData.name
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            customerName: ''
          }));
        }
      } catch (error) {
        console.error("Error fetching customer data: ", error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const selectedItems = Object.fromEntries(
        Object.entries(formData.items).filter(([_, item]) => item.quantity > 0)
      );

      const snapshot = await getDocs(collection(db, "Bookings"));
      let maxBookingNum = 0;

      snapshot.forEach(docSnap => {
        const id = docSnap.id;
        const match = id.match(/^(\d{4})$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxBookingNum) maxBookingNum = num;
        }
      });

      const bookingId = String(maxBookingNum + 1).padStart(4, '0');

      await setDoc(doc(db, "customers", formData.phone), {
        name: formData.customerName,
        phone: formData.phone,
        createdAt: new Date()
      }, { merge: true });

      await setDoc(doc(db, "Bookings", bookingId), {
        customerName: formData.customerName,
        phone: formData.phone,
        serviceType: formData.serviceType,
        urgentDelivery: formData.urgentDelivery,
        pickupDate: formData.pickupDate,
        deliveryDate: formData.deliveryDate,
        instructions: formData.instructions,
        items: selectedItems,
        totalItems: Object.values(selectedItems).reduce((sum, item) => sum + item.quantity, 0),
        totalCost: Object.values(selectedItems).reduce((sum, item) => sum + item.quantity * item.price, 0),
        sgst: (Object.values(selectedItems).reduce((sum, item) => sum + item.quantity * item.price, 0) * 0.09).toFixed(2),
        cgst: (Object.values(selectedItems).reduce((sum, item) => sum + item.quantity * item.price, 0) * 0.09).toFixed(2),
        grandTotal: (
          Object.values(selectedItems).reduce((sum, item) => sum + item.quantity * item.price, 0) * 1.18
        ).toFixed(2),
        createdAt: new Date()
      });

      alert(`Booking created successfully!\nOrder ID: ${bookingId}\nCustomer: ${formData.customerName}${formData.urgentDelivery ? '\nURGENT DELIVERY' : ''}`);

      const resetItems = Object.keys(formData.items).reduce((acc, item) => {
        acc[item] = { quantity: 0, price: servicePrices[formData.serviceType]?.[item] || 0 };
        return acc;
      }, {});

      setFormData({
        customerName: '',
        phone: '',
        serviceType: '',
        urgentDelivery: false,
        pickupDate: new Date().toISOString().split('T')[0],
        deliveryDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
        instructions: '',
        items: resetItems
      });

    } catch (error) {
      console.error("Error creating booking: ", error);
      alert("Error creating booking. Please try again.");
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '1.5rem' }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          padding: '2rem',
          border: '1px solid var(--gray-200)'
        }}>
          <p>Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '1.5rem' }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        padding: '2rem',
        border: '1px solid var(--gray-200)'
      }}>
        <h3 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          color: 'var(--gray-800)',
          marginBottom: '1.5rem'
        }}>Create New Booking</h3>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '2.2rem'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--gray-700)',
                marginBottom: '0.5rem'
              }}>
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handlePhoneChange}
                style={{
                  width: '90%',
                  padding: '0.5rem 1rem',
                  border: '1px solid var(--gray-300)',
                  borderRadius: '0.5rem',
                  outline: 'none',
                  fontSize: '0.875rem'
                }}
                placeholder="Enter 10-digit phone number"
                maxLength="10"
                minLength="10"
                required
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--gray-700)',
                marginBottom: '0.5rem'
              }}>Customer Name</label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleInputChange}
                style={{
                  width: '90%',
                  padding: '0.5rem 1rem',
                  border: '1px solid var(--gray-300)',
                  borderRadius: '0.5rem',
                  outline: 'none',
                  fontSize: '0.875rem'
                }}
                placeholder="Enter customer name"
                required
              />
            </div>
          </div>
          
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'var(--gray-700)',
              marginBottom: '0.5rem'
            }}>Service Type</label>
            <select
              name="serviceType"
              value={formData.serviceType}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '0.5rem 1rem',
                border: '1px solid var(--gray-300)',
                borderRadius: '0.5rem',
                outline: 'none',
                fontSize: '0.875rem'
              }}
              required
            >
              <option value="">Select service</option>
              {availableServices.map(service => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
          </div>

          {/* ✅ URGENT DELIVERY CHECKBOX (No Lightning Emoji) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem',
            backgroundColor: formData.urgentDelivery ? '#fff3cd' : 'var(--gray-50)',
            border: formData.urgentDelivery ? '2px solid #ff6b35' : '1px solid var(--gray-200)',
            borderRadius: '0.5rem',
            transition: 'all 0.3s ease'
          }}>
            <input
              type="checkbox"
              id="urgentDelivery"
              name="urgentDelivery"
              checked={formData.urgentDelivery}
              onChange={handleInputChange}
              style={{
                width: '18px',
                height: '18px',
                cursor: 'pointer',
                accentColor: '#ff6b35'
              }}
            />
            <label
              htmlFor="urgentDelivery"
              style={{
                fontSize: '0.95rem',
                fontWeight: '500',
                color: formData.urgentDelivery ? '#ff6b35' : 'var(--gray-700)',
                cursor: 'pointer',
              }}
            >
              Urgent Delivery
            </label>
          </div>
          
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'var(--gray-700)',
              marginBottom: '1rem'
            }}>Select Clothing Items</label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem'
            }}>
              {clothingItems.map(item => (
                <div 
                  key={item.id}
                  style={{
                    border: `2px solid ${formData.items[item.id]?.quantity > 0 ? 'var(--primary)' : 'var(--gray-200)'}`,
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    cursor: 'pointer',
                    backgroundColor: formData.items[item.id]?.quantity > 0 ? 'var(--secondary)' : 'transparent',
                    transition: 'all 0.2s',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ marginBottom: '0.5rem' }}>
                    <img 
                      src={imageMap[item.icon] || imageMap[item.id] || shirt} 
                      alt={item.name} 
                      style={{ width: '60px', height: '60px', objectFit: 'contain' }} 
                    />
                  </div>    
                  <p style={{ fontSize: '0.875rem', fontWeight: '500' }}>{item.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
                    &#8377; {formData.items[item.id]?.price || 0}
                  </p>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    justifyContent: 'center',
                    marginTop: '0.75rem',
                    border: '1px solid var(--gray-300)',
                    borderRadius: '0.25rem',
                    overflow: 'hidden',
                    width: 'fit-content',
                    margin: '0.75rem auto 0'
                  }}>
                    <button
                      type="button"
                      onClick={() => decrementQuantity(item.id)}
                      style={{
                        width: '32px',
                        height: '32px',
                        padding: '0',
                        border: 'none',
                        borderRight: '1px solid var(--gray-300)',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        color: 'var(--gray-700)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    >
                      −
                    </button>
                    
                    <input
                      type="number"
                      value={formData.items[item.id]?.quantity || 0}
                      onChange={(e) => handleItemChange(item.id, e.target.value)}
                      style={{
                        width: '50px',
                        padding: '0.35rem 0.5rem',
                        border: 'none',
                        textAlign: 'center',
                        fontSize: '0.875rem',
                        outline: 'none',
                        backgroundColor: 'white',
                        MozAppearance: 'textfield',
                        WebkitAppearance: 'none',
                        appearance: 'none'
                      }}
                      min="0"
                    />
                    
                    <button
                      type="button"
                      onClick={() => incrementQuantity(item.id)}
                      style={{
                        width: '32px',
                        height: '32px',
                        padding: '0',
                        border: 'none',
                        borderLeft: '1px solid var(--gray-300)',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        color: 'var(--gray-700)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <style>{`
              input[type='number']::-webkit-inner-spin-button,
              input[type='number']::-webkit-outer-spin-button {
                -webkit-appearance: none;
                margin: 0;
              }
              input[type='number'] {
                -moz-appearance: textfield;
              }
            `}</style>
            
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: 'var(--gray-50)',
              borderRadius: '0.5rem'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <span style={{ fontWeight: '500', color: 'var(--gray-700)' }}>Total Items:</span>
                <span style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{totalItems}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: '500', color: 'var(--gray-700)' }}>Estimated Cost:</span>
                <span style={{ fontWeight: 'bold', fontSize: '1.125rem', color: 'var(--primary)' }}>
                  &#8377; {totalCost.toFixed(2)}
                </span>
              </div>

              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span>SGST (9%):</span>
                  <span>&#8377; {sgst.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span>CGST (9%):</span>
                  <span>&#8377; {cgst.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.125rem', color: 'var(--primary)' }}>
                  <span>Grand Total:</span>
                  <span>&#8377; {grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2.2rem'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--gray-700)',
                marginBottom: '0.5rem'
              }}>Pickup Date</label>
              <input
                type="date"
                name="pickupDate"
                value={formData.pickupDate}
                onChange={handleInputChange}
                style={{
                  width: '90%',
                  padding: '0.5rem 1rem',
                  border: '1px solid var(--gray-300)',
                  borderRadius: '0.5rem',
                  outline: 'none',
                  fontSize: '0.875rem'
                }}
                required
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--gray-700)',
                marginBottom: '0.5rem'
              }}>Delivery Date</label>
              <input
                type="date"
                name="deliveryDate"
                value={formData.deliveryDate}
                onChange={handleInputChange}
                style={{
                  width: '90%',
                  padding: '0.5rem 1rem',
                  border: '1px solid var(--gray-300)',
                  borderRadius: '0.5rem',
                  outline: 'none',
                  fontSize: '0.875rem'
                }}
                required
              />
            </div>
          </div>
          
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'var(--gray-700)',
              marginBottom: '0.5rem'
            }}>Special Instructions</label>
            <textarea
              name="instructions"
              value={formData.instructions}
              onChange={handleInputChange}
              rows="3"
              style={{
                width: '95%',
                padding: '0.5rem 1rem',
                border: '1px solid var(--gray-300)',
                borderRadius: '0.5rem',
                outline: 'none',
                fontSize: '0.875rem'
              }}
              placeholder="Any special care instructions..."
            ></textarea>
          </div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '1rem',
            marginTop: '1rem'
          }}>
            <button
              type="button"
              style={{
                padding: '0.5rem 1.5rem',
                border: '1px solid var(--gray-300)',
                color: 'var(--gray-700)',
                borderRadius: '0.5rem',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
              onClick={() => {
                const resetItems = Object.keys(formData.items).reduce((acc, item) => {
                  acc[item] = { quantity: 0, price: servicePrices[formData.serviceType]?.[item] || 0 };
                  return acc;
                }, {});
                setFormData({
                  customerName: '',
                  phone: '',
                  serviceType: '',
                  urgentDelivery: false,
                  pickupDate: new Date().toISOString().split('T')[0],
                  deliveryDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
                  instructions: '',
                  items: resetItems
                });
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: 'var(--primary)',
                color: 'white',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                transition: 'background-color 0.2s'
              }}
              disabled={totalItems === 0 || !formData.serviceType || !formData.customerName || !formData.phone}
            >
              Create Booking
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Booking;