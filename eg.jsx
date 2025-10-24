
import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; // Adjust the import path accordingly
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

const Booking = () => {
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    serviceType: '',
    pickupDate: new Date().toISOString().split('T')[0],
    deliveryDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
    instructions: '',
    items: {
      shirt: { quantity: 0, price: 0 },
      tshirt: { quantity: 0, price: 0 },
      pant: { quantity: 0, price: 0 },
      starch: { quantity: 0, price: 0 },
      saree: { quantity: 0, price: 0 },
      blouse: { quantity: 0, price: 0 },
      panjabi: { quantity: 0, price: 0 },
      dhotar: { quantity: 0, price: 0 },
      shalu: { quantity: 0, price: 0 },
      coat: { quantity: 0, price: 0 },
      shervani: { quantity: 0, price: 0 },
      sweater: { quantity: 0, price: 0 },
      onepiece: { quantity: 0, price: 0 },
      bedsheet: { quantity: 0, price: 0 },
      blanket: { quantity: 0, price: 0 },
      shoes: { quantity: 0, price: 0 },
      helmet: { quantity: 0, price: 0 },
      clothsPerKg:{quantity:0, price:0}
    }
  });

  const servicePrices = {
    "wash-and-iron": {
      shirt: { price: 70 },
      tshirt: { price: 70 },
      pant: { price: 70 },
      starch: { price: 80 },
      saree: { price: 200 },
      blouse: { price: 70 },
      panjabi: { price: 210 },
      dhotar: { price: 180 },
      shalu: { price: 280 },
      coat: { price: 300 },
      shervani: { price: 320 },
      sweater: { price: 150 },
      onepiece: { price: 200 },
      bedsheet: { price: 150 },
      blanket: { price: 400 },
      shoes: { price: 200 },
      helmet: { price: 200 },
      clothsPerKg:{price:99}
    },
    "ironing": {
      shirt: { price: 12 },
      tshirt: { price: 12 },
      pant: { price: 12 },
      starch: { price: 30 },
      saree: { price: 80 },
      blouse: { price: 12 },
      panjabi: { price: 36 },
      dhotar: { price: 80 },
      shalu: { price: 120 },
      coat: { price: 150 },
      shervani: { price: 120 },
      sweater: { price: 50 },
      onepiece: { price: 60 },
      bedsheet: { price: 60 }, 
      blanket: { price: 0 }, 
      shoes: { price: 0 }, 
      helmet: { price: 0 } 
    },
    "wash-and-fold":{
      clothsPerKg:{price:89}
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Update item prices based on selected service type
    if (name === 'serviceType') {
      const updatedItems = Object.keys(formData.items).reduce((acc, item) => {
        acc[item] = {
          ...formData.items[item],
          price: servicePrices[value][item]?.price || 0
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

    if (phoneNumber.length === 10) { // Assuming 10-digit phone number
      try {
        const customerDoc = await getDoc(doc(db, "customers", phoneNumber));
        if (customerDoc.exists()) {
          const customerData = customerDoc.data();
          setFormData(prev => ({
            ...prev,
            customerName: customerData.name // Fetch the name from the customer document
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            customerName: '' // Reset name if not found
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
      // Step 1: Filter only selected items
      const selectedItems = Object.fromEntries(
        Object.entries(formData.items).filter(([_, item]) => item.quantity > 0)
      );

      // Step 2: Get highest booking number
      const snapshot = await getDocs(collection(db, "Bookings"));
      let maxBookingNum = 0;

      snapshot.forEach(docSnap => {
        const id = docSnap.id;
        const match = id.match(/^BID(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxBookingNum) maxBookingNum = num;
        }
      });

      const bookingId = `BID${maxBookingNum + 1}`;

      // Step 3: Save customer (phone as unique ID)
      await setDoc(doc(db, "customers", formData.phone), {
        name: formData.customerName,
        phone: formData.phone,
        createdAt: new Date()
      }, { merge: true }); // merge = update if exists

      // Step 4: Save booking
      await setDoc(doc(db, "Bookings", bookingId), {
        customerName: formData.customerName,
        phone: formData.phone,
        serviceType: formData.serviceType,
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

      alert(`Booking created successfully!\nOrder ID: ${bookingId}\nCustomer: ${formData.customerName}`);

      // Reset form
      const resetItems = Object.keys(formData.items).reduce((acc, item) => {
        acc[item] = { ...formData.items[item], quantity: 0, price: servicePrices[formData.serviceType][item]?.price || 0 };
        return acc;
      }, {});

      setFormData({
        customerName: '',
        phone: '',
        serviceType: '',
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

  const clothingItems = [
    {
      id: 'shirt',
      name: 'Shirt',
      icon: '👕',
      price: 70
    },
    {
      id: 'tshirt',
      name: 'T-Shirt',
      icon: shirt,
      price: 70
    },
    {
      id: 'pant',
      name: 'Pant',
      icon: '👖',
      price: 70
    },
    {
      id: 'starch',
      name: 'Starch Cloth',
      icon: starch,
      price: 80
    },
    {
      id: 'saree',
      name: 'Saree',
      icon: sareeimg,
      price: 200
    },
    {
      id: 'blouse',
      name: 'Blouse',
      icon: '👚',
      price: 12
    },
    {
      id: 'panjabi',
      name: 'Panjabi Suit',
      icon: '👘',
      price: 210
    },
    {
      id: 'dhotar',
      name: 'Dhotar',
      icon: dhotar,
      price: 180
    },
    {
      id: 'shalu',
      name: 'Shalu / Paithani',
      icon: '🥻',
      price: 280
    },
    {
      id: 'coat',
      name: 'Coat / Blazer',
      icon: coat,
      price: 300
    },
    {
      id: 'shervani',
      name: 'Shervani',
      icon: sherwani,
      price: 320
    },
    {
      id: 'sweater',
      name: 'Sweater / Jerkin',
      icon:sweater,
      price: 150
    },
    {
      id: 'onepiece',
      name: 'One Piece Ghagara',
      icon: '👗',
      price: 200
    },
    {
      id: 'bedsheet',
      name: 'Bedsheet (Single/Double)',
      icon: sbed,
      price: 150
    },
    {
      id: 'blanket',
      name: 'Blanket / Rajai',
      icon: dbed,
      price: 400
    },
    {
      id: 'shoes',
      name: 'Shoes Washing',
      icon: '👞',
      price: 200
    },
    {
      id: 'helmet',
      name: 'Helmet Washing',
      icon: '⛑️',
      price: 200
    },
    
    {
      id: 'clothsPerKg',
      name: 'Cloths Per Kg',
      icon: '👘',
      price: 99
    }
  ];

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
                onChange={handlePhoneChange} // Change to handlePhoneChange
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
                title="Enter a valid 10-digit phone number starting with 6-9"
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
              <option value="ironing">Ironing</option>
              <option value="wash-and-iron">Wash and Iron</option>
              <option value="wash-and-fold">Wash and Fold</option>
            </select>
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
                    border: `2px solid ${formData.items[item.id].quantity > 0 ? 'var(--primary)' : 'var(--gray-200)'}`,
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    cursor: 'pointer',
                    backgroundColor: formData.items[item.id].quantity > 0 ? 'var(--secondary)' : 'transparent',
                    transition: 'all 0.2s',
                    textAlign: 'center'
                  }}
                >
<div style={{ fontSize: '4.5rem', marginBottom: '0.5rem' }}>
  {typeof item.icon === 'string' ? (
    <span>{item.icon}</span> // For emoji strings
  ) : (
    <img 
      src={item.icon} 
      alt=" "
      style={{ 
        width: '64px', 
        height: '64px',
        objectFit: 'contain'
      }} 
    />
  )}
</div>                  <p style={{ fontSize: '0.875rem', fontWeight: '500' }}>{item.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>&#8377; 
                    <input
                      type="number"
                      value={formData.items[item.id].price}
                      onChange={(e) => handlePriceChange(item.id, e.target.value)}
                      style={{
                        width: '4rem',
                        marginTop: '0.5rem',
                        padding: '0.25rem 0.5rem',
                        border: '1px solid var(--gray-300)',
                        borderRadius: '0.25rem',
                        textAlign: 'center',
                        fontSize: '0.875rem'
                      }}
                      readOnly // Make price input read-only
                    />
                  </p>
                  <input
                    type="number"
                    value={formData.items[item.id].quantity}
                    onChange={(e) => handleItemChange(item.id, e.target.value)}
                    style={{
                      width: '4rem',
                      marginTop: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      border: '1px solid var(--gray-300)',
                      borderRadius: '0.25rem',
                      textAlign: 'center',
                      fontSize: '0.875rem'
                    }}
                    placeholder="0"
                    min="0"
                  />
                </div>
              ))}
            </div>
            
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
              onClick={() => setFormData({
                customerName: '',
                phone: '',
                serviceType: '',
                pickupDate: new Date().toISOString().split('T')[0],
                deliveryDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
                instructions: '',
                items: Object.keys(formData.items).reduce((acc, item) => {
                  acc[item] = { ...formData.items[item], quantity: 0, price: servicePrices[formData.serviceType][item]?.price || 0 };
                  return acc;
                }, {})
              })}
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
