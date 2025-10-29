import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, updateDoc, doc, getDoc, Timestamp } from 'firebase/firestore';

const Orders = ({ initialFilter = 'all' }) => {
  const [orders, setOrders] = useState([]);
  const [filterStatus, setFilterStatus] = useState(initialFilter);
  const [pickupDateFilter, setPickupDateFilter] = useState('');
  const [deliveryDateFilter, setDeliveryDateFilter] = useState('');
  
  // Company settings state
  const [companySettings, setCompanySettings] = useState({
    businessName: 'Wash & Joy',
    logoUrl: '',
    phoneNumber: '',
    address: '',
    gstin: ''
  });

  useEffect(() => {
    setFilterStatus(initialFilter);
  }, [initialFilter]);

  // Fetch company settings
  useEffect(() => {
    const fetchCompanySettings = async () => {
      try {
        const companyDoc = await getDoc(doc(db, 'settings', 'company'));
        if (companyDoc.exists()) {
          setCompanySettings(prev => ({ ...prev, ...companyDoc.data() }));
        }
      } catch (error) {
        console.error('Error fetching company settings:', error);
      }
    };

    fetchCompanySettings();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'Bookings'), (snapshot) => {
      const orderList = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        
        return {
          id: docSnap.id,
          customer: data.customerName || '',
          service: data.serviceType || '',
          status: data.status || 'pending',
          instructions: data.instructions || '',
          phone: data.phone || '',
          amount: parseFloat(data.grandTotal || 0).toFixed(2),
          items: data.items || {},
          urgentDelivery: data.urgentDelivery || false,
          pickupDate: data.pickupDate || '',
          deliveryDate: data.deliveryDate || '',
        };
      });
      setOrders(orderList);
    });

    return () => unsub();
  }, []);

  const itemMapping = {
    shirt: 'Shirt',
    tshirt: 'T-Shirt',
    pant: 'Pant',
    starch: 'Starch Cloth',
    saree: 'Saree',
    blouse: 'Blouse',
    panjabi: 'Panjabi Suit',
    dhotar: 'Dhotar',
    shalu: 'Shalu / Paithani',
    coat: 'Coat / Blazer',
    shervani: 'Shervani',
    sweater: 'Sweater / Jerkin',
    onepiece: 'One Piece Ghagara',
    bedsheet: 'Bedsheet (Single/Double)',
    blanket: 'Blanket / Rajai',
    shoes: 'Shoes Washing',
    helmet: 'Helmet Washing',
    clothsPerKg: 'Cloths Per Kg'
  };

  const handleShare = (order) => {
  if (!order.phone) {
    alert("Customer phone number not available!");
    return;
  }

  const itemsList = Object.entries(order.items || {})
    .map(([itemName, details], index) => `${index + 1}. ${itemMapping[itemName] || itemName} × ${details.quantity}`)
    .join("\n");

  const urgentNotice = order.urgentDelivery 
    ? "\n⚠️ *PRIORITY SERVICE ACTIVATED* ⚠️\nYour order is being processed urgently!\n" 
    : "";

  // Dynamic company details
  const companyName = companySettings.businessName || 'Wash & Joy';
  const companyPhone = companySettings.phoneNumber || '';
  const companyAddress = companySettings.address || '';

  const message = `
┏━━━━━━━━━━━━━━━━━━━━┓
┃   💧 ${companyName.toUpperCase()} 💧   ┃
┃  Premium Laundry     ┃
┗━━━━━━━━━━━━━━━━━━━━┛

Hello *${order.customer}* 👋
${urgentNotice}
━━━━━━━━━━━━━━━━━━━━━━

📌 *ORDER INFORMATION*

🔖 Order ID: *#${order.id}*
🏷️ Service Type: *${order.service}*
📊 Current Status: *${order.status.toUpperCase()}*

━━━━━━━━━━━━━━━━━━━━━━

🧺 *ITEMS IN YOUR ORDER*

${itemsList}

━━━━━━━━━━━━━━━━━━━━━━

📅 *SERVICE SCHEDULE*

📥 Pickup Date: *${order.pickupDate || 'TBD'}*
📦 Delivery Date: *${order.deliveryDate || 'TBD'}*

${order.instructions ? `━━━━━━━━━━━━━━━━━━━━━━\n\n📝 *Special Instructions*\n${order.instructions}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━

💰 *BILL SUMMARY*
Total Amount: *₹${order.amount}*

━━━━━━━━━━━━━━━━━━━━━━

✅ *Why Choose Us?*
• Professional Cleaning
• Eco-Friendly Products
• Timely Delivery
• Affordable Pricing

━━━━━━━━━━━━━━━━━━━━━━

Thank you for your business! 🙏

${companyPhone ? `📞 Contact: ${companyPhone}\n` : ''}${companyAddress ? `📍 Address: ${companyAddress}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━

*${companyName}*
_Making Laundry Easy_ ✨
`;

  const whatsappUrl = `https://wa.me/${order.phone}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank");
};

  const handleStatusChange = async (docId, newStatus) => {
    try {
      await updateDoc(doc(db, 'Bookings', docId), { 
        status: newStatus,
        lastModified: Timestamp.now()
      });
      setOrders((prev) =>
        prev.map((order) =>
          order.id === docId ? { ...order, status: newStatus } : order
        )
      );
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const filteredOrders = orders.filter(order => {
    // Handle urgent filter separately
    if (filterStatus === 'urgent') {
      if (!order.urgentDelivery) return false;
    } else if (filterStatus !== 'all' && order.status !== filterStatus) {
      return false;
    }
    
    if (pickupDateFilter && order.pickupDate !== pickupDateFilter) return false;
    if (deliveryDateFilter && order.deliveryDate !== deliveryDateFilter) return false;
    return true;
  });

  const clearFilters = () => {
    setFilterStatus('all');
    setPickupDateFilter('');
    setDeliveryDateFilter('');
  };

  const getStatusStyles = (status, isUrgent = false) => {
    // Special styling for urgent pending orders
    if (status === 'pending' && isUrgent) {
      return { bg: '#ff6b35', text: '#ffffff' }; // Dark orange background with white text
    }

    switch (status) {
      case 'pending':
        return { bg: 'var(--yellow-100)', text: 'var(--yellow-800)' };
      case 'in-progress':
        return { bg: 'var(--blue-100)', text: 'var(--primary)' };
      case 'ready':
        return { bg: 'var(--green-100)', text: 'var(--green-600)' };
      case 'completed':
        return { bg: 'var(--gray-100)', text: 'var(--gray-800)' };
      case 'canceled':
        return { bg: 'var(--red-100)', text: 'var(--red-800)' };
      default:
        return { bg: 'var(--gray-100)', text: 'var(--gray-800)' };
    }
  };

  // Helper function to get filter display name
  const getFilterDisplayName = (filter) => {
    if (filter === 'urgent') return 'Urgent';
    return filter.charAt(0).toUpperCase() + filter.slice(1).replace('-', ' ');
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          border: '1px solid var(--gray-200)',
        }}
      >
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid var(--gray-200)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <h3
              style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: 'var(--gray-800)',
              }}
            >
              Order Tracker
            </h3>
            
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--gray-300)',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              >
                <option value="all">All Status</option>
                <option value="urgent">Urgent</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="ready">Ready</option>
                <option value="completed">Completed</option>
                <option value="canceled">Canceled</option>
              </select>

              <input
                type="date"
                value={pickupDateFilter}
                onChange={(e) => setPickupDateFilter(e.target.value)}
                placeholder="Pickup Date"
                style={{
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--gray-300)',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />

              <input
                type="date"
                value={deliveryDateFilter}
                onChange={(e) => setDeliveryDateFilter(e.target.value)}
                placeholder="Delivery Date"
                style={{
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--gray-300)',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />

              {(filterStatus !== 'all' || pickupDateFilter || deliveryDateFilter) && (
                <button
                  onClick={clearFilters}
                  style={{
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {(filterStatus !== 'all' || pickupDateFilter || deliveryDateFilter) && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Active Filters:</span>
              {filterStatus !== 'all' && (
                <span style={{
                  padding: '0.25rem 0.75rem',
                  backgroundColor: filterStatus === 'urgent' ? '#fff3e0' : 'var(--blue-100)',
                  color: filterStatus === 'urgent' ? '#ff6b35' : 'var(--primary)',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  border: filterStatus === 'urgent' ? '1px solid #ff6b35' : 'none'
                }}>
                  Status: {getFilterDisplayName(filterStatus)}
                </span>
              )}
              {pickupDateFilter && (
                <span style={{
                  padding: '0.25rem 0.75rem',
                  backgroundColor: 'var(--green-100)',
                  color: 'var(--green-600)',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}>
                  Pickup: {pickupDateFilter}
                </span>
              )}
              {deliveryDateFilter && (
                <span style={{
                  padding: '0.25rem 0.75rem',
                  backgroundColor: 'var(--green-100)',
                  color: 'var(--green-600)',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}>
                  Delivery: {deliveryDateFilter}
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%' }}>
            <thead style={{ backgroundColor: 'var(--gray-50)' }}>
              <tr>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left' }}>Order ID</th>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left' }}>Customer</th>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left' }}>Phone</th>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left' }}>Service</th>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left' }}>Pickup</th>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left' }}>Delivery</th>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left' }}>Amount</th>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left' }}>Instruction</th>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left' }}>Share</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const isUrgent = order.urgentDelivery;
                const statusStyles = getStatusStyles(order.status, isUrgent);
                
                return (
                  <tr
                    key={order.id}
                    style={{
                      backgroundColor: isUrgent ? '#fff3e0' : 'white',
                      borderBottom: '1px solid var(--gray-200)',
                      borderLeft: isUrgent ? '4px solid #ff6b35' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <td style={{ padding: '1rem 1.5rem', fontWeight: isUrgent ? 'bold' : 'normal' }}>
                      {order.id}
                      {isUrgent && (
                        <span style={{
                          marginLeft: '0.5rem',
                          padding: '0.125rem 0.5rem',
                          backgroundColor: '#ff6b35',
                          color: 'white',
                          fontSize: '0.65rem',
                          borderRadius: '0.25rem',
                          fontWeight: 'bold'
                        }}>
                          URGENT
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>{order.customer}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>{order.phone}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>{order.service}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>{order.pickupDate}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>{order.deliveryDate}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <select
                        value={order.status}
                        onChange={(e) =>
                          handleStatusChange(order.id, e.target.value)
                        }
                        style={{
                          padding: '0.25rem 0.75rem',
                          fontSize: '0.875rem',
                          borderRadius: '9999px',
                          border: 'none',
                          backgroundColor: statusStyles.bg,
                          color: statusStyles.text,
                          outline: 'none',
                          cursor: 'pointer',
                          fontWeight: isUrgent && order.status === 'pending' ? '600' : 'normal'
                        }}
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="ready">Ready</option>
                        <option value="completed">Completed</option>
                        <option value="canceled">Canceled</option>
                      </select>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: isUrgent ? 'bold' : 'normal' }}>
                      &#8377;{order.amount}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>{order.instructions}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <button
                        onClick={() => handleShare(order)}
                        style={{
                          color: 'green',
                          cursor: 'pointer',
                          border: 'none',
                          background: 'transparent',
                          fontWeight: '600',
                          fontSize: '0.875rem'
                        }}
                      >
                        Share
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            color: 'var(--gray-500)'
          }}>
            <p>No orders found with the selected filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;