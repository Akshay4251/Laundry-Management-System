import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, updateDoc, doc, getDoc, Timestamp } from 'firebase/firestore';
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

const Orders = ({ initialFilter = 'all' }) => {
  const [orders, setOrders] = useState([]);
  const [filterStatus, setFilterStatus] = useState(initialFilter);
  const [pickupDateFilter, setPickupDateFilter] = useState('');
  const [deliveryDateFilter, setDeliveryDateFilter] = useState('');
  
  // Edit modal states
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editedOrder, setEditedOrder] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Configuration states
  const [servicePrices, setServicePrices] = useState({});
  const [availableServices, setAvailableServices] = useState([]);
  const [clothingItems, setClothingItems] = useState([]);
  const [gstConfig, setGstConfig] = useState({
    enabled: true,
    sgstPercentage: 9,
    cgstPercentage: 9
  });

  const imageMap = {
    shirt, tshirt, pant, starch, saree: sareeimg, blouse, panjabi: punjabi,
    dhotar, shalu, coat, shervani: sherwani, sweater, onepiece, 
    bedsheet: sbed, blanket: dbed, shoes, helmet, clothsPerKg: clothsperkg
  };

  const defaultIcon = shirt;

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

  useEffect(() => {
    setFilterStatus(initialFilter);
  }, [initialFilter]);

  useEffect(() => {
    fetchConfiguration();
    
    const unsub = onSnapshot(collection(db, 'Bookings'), (snapshot) => {
      const orderList = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        
        return {
          id: docSnap.id,
          customerName: data.customerName || '',
          customer: data.customerName || '',
          serviceType: data.serviceType || '',
          service: data.serviceType || '',
          status: data.status || 'pending',
          instructions: data.instructions || '',
          phone: data.phone || '',
          amount: parseFloat(data.grandTotal || 0).toFixed(2),
          grandTotal: parseFloat(data.grandTotal || 0),
          totalCost: parseFloat(data.totalCost || 0),
          totalItems: data.totalItems || 0,
          sgst: parseFloat(data.sgst || 0),
          cgst: parseFloat(data.cgst || 0),
          sgstPercentage: data.sgstPercentage || 0,
          cgstPercentage: data.cgstPercentage || 0,
          gstEnabled: data.gstEnabled !== false,
          items: data.items || {},
          urgentDelivery: data.urgentDelivery || false,
          pickupDate: data.pickupDate || '',
          deliveryDate: data.deliveryDate || '',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          lastModified: data.lastModified?.toDate ? data.lastModified.toDate() : data.lastModified
        };
      });
      setOrders(orderList);
    });

    return () => unsub();
  }, []);

  const fetchConfiguration = async () => {
    try {
      const gstDoc = await getDoc(doc(db, "settings", "gstConfig"));
      if (gstDoc.exists()) {
        setGstConfig(gstDoc.data());
      }

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
      }

      setServicePrices(services);
      setAvailableServices(serviceList.filter(s => s.enabled));

      const clothDoc = await getDoc(doc(db, "settings", "clothConfig"));
      let clothTypes = [];

      if (clothDoc.exists()) {
        clothTypes = clothDoc.data().items || [];
      } else {
        clothTypes = [
          { id: 'shirt', name: 'Shirt', icon: 'shirt', iconUrl: '', enabled: true },
          { id: 'tshirt', name: 'T-Shirt', icon: 'tshirt', iconUrl: '', enabled: true },
          { id: 'pant', name: 'Pant', icon: 'pant', iconUrl: '', enabled: true },
          { id: 'starch', name: 'Starch Cloth', icon: 'starch', iconUrl: '', enabled: true },
          { id: 'saree', name: 'Saree', icon: 'saree', iconUrl: '', enabled: true },
          { id: 'blouse', name: 'Blouse', icon: 'blouse', iconUrl: '', enabled: true },
          { id: 'panjabi', name: 'Panjabi Suit', icon: 'panjabi', iconUrl: '', enabled: true },
          { id: 'dhotar', name: 'Dhotar', icon: 'dhotar', iconUrl: '', enabled: true },
          { id: 'shalu', name: 'Shalu / Paithani', icon: 'shalu', iconUrl: '', enabled: true },
          { id: 'coat', name: 'Coat / Blazer', icon: 'coat', iconUrl: '', enabled: true },
          { id: 'shervani', name: 'Shervani', icon: 'shervani', iconUrl: '', enabled: true },
          { id: 'sweater', name: 'Sweater / Jerkin', icon: 'sweater', iconUrl: '', enabled: true },
          { id: 'onepiece', name: 'One Piece Ghagara', icon: 'onepiece', iconUrl: '', enabled: true },
          { id: 'bedsheet', name: 'Bedsheet (Single/Double)', icon: 'bedsheet', iconUrl: '', enabled: true },
          { id: 'blanket', name: 'Blanket / Rajai', icon: 'blanket', iconUrl: '', enabled: true },
          { id: 'shoes', name: 'Shoes Washing', icon: 'shoes', iconUrl: '', enabled: true },
          { id: 'helmet', name: 'Helmet Washing', icon: 'helmet', iconUrl: '', enabled: true },
          { id: 'clothsPerKg', name: 'Cloths Per Kg', icon: 'clothsPerKg', iconUrl: '', enabled: true }
        ];
      }

      const enabledClothTypes = clothTypes.filter(item => item.enabled);
      setClothingItems(enabledClothTypes);

    } catch (error) {
      console.error('Error fetching configuration:', error);
    }
  };

  const getClothIcon = (item) => {
    if (item.iconUrl && item.iconUrl.trim() !== '') {
      return item.iconUrl;
    }
    
    if (item.icon && imageMap[item.icon]) {
      return imageMap[item.icon];
    }
    
    if (imageMap[item.id]) {
      return imageMap[item.id];
    }
    
    return defaultIcon;
  };

  const calculateTotals = (items) => {
    let totalItems = 0;
    let totalCost = 0;
    
    Object.values(items).forEach(item => {
      totalItems += item.quantity || 0;
      totalCost += (item.quantity || 0) * (item.price || 0);
    });

    let sgst = 0;
    let cgst = 0;
    let grandTotal = totalCost;

    if (gstConfig.enabled) {
      sgst = totalCost * (gstConfig.sgstPercentage / 100);
      cgst = totalCost * (gstConfig.cgstPercentage / 100);
      grandTotal = totalCost + sgst + cgst;
    }

    return {
      totalItems,
      totalCost,
      sgst,
      cgst,
      grandTotal
    };
  };

  const handleEditClick = (order) => {
    if (order.status.toLowerCase() !== 'pending') {
      alert('Only pending orders can be edited!');
      return;
    }
    
    setSelectedOrder(order);
    setEditedOrder({ ...order });
    setShowEditModal(true);
  };

  const handleInputChange = (field, value) => {
    setEditedOrder(prev => ({
      ...prev,
      [field]: value
    }));

    if (field === 'serviceType') {
      const updatedItems = Object.keys(editedOrder.items).reduce((acc, itemId) => {
        acc[itemId] = {
          ...editedOrder.items[itemId],
          price: servicePrices[value]?.[itemId] || 0
        };
        return acc;
      }, {});
      
      const totals = calculateTotals(updatedItems);
      
      setEditedOrder(prev => ({
        ...prev,
        items: updatedItems,
        ...totals
      }));
    }
  };

  const handleItemChange = (itemName, field, value) => {
    const numValue = field === 'quantity' || field === 'price' ? Number(value) || 0 : value;
    
    setEditedOrder(prev => {
      const updatedItems = {
        ...prev.items,
        [itemName]: {
          ...prev.items[itemName],
          [field]: numValue
        }
      };
      
      const totals = calculateTotals(updatedItems);
      
      return {
        ...prev,
        items: updatedItems,
        ...totals
      };
    });
  };

  const handleAddItemClick = () => {
    setShowAddItemModal(true);
  };

  const handleSelectItemToAdd = (itemId) => {
    const currentServiceType = editedOrder.serviceType;
    const itemPrice = servicePrices[currentServiceType]?.[itemId] || 0;
    
    const updatedItems = {
      ...editedOrder.items,
      [itemId]: {
        quantity: 1,
        price: itemPrice
      }
    };

    const totals = calculateTotals(updatedItems);

    setEditedOrder(prev => ({
      ...prev,
      items: updatedItems,
      ...totals
    }));

    setShowAddItemModal(false);
  };

  const handleRemoveItem = (itemName) => {
    setEditedOrder(prev => {
      const { [itemName]: removed, ...remainingItems } = prev.items;
      
      const totals = calculateTotals(remainingItems);
      
      return {
        ...prev,
        items: remainingItems,
        ...totals
      };
    });
  };

  const handleSaveChanges = async () => {
    if (!editedOrder.customerName || !editedOrder.phone) {
      alert('Customer name and phone are required!');
      return;
    }

    if (!editedOrder.serviceType) {
      alert('Service type is required!');
      return;
    }
    
    setSaving(true);
    try {
      const orderRef = doc(db, 'Bookings', selectedOrder.id);
      
      const totals = calculateTotals(editedOrder.items || {});
      
      const updateData = {
        customerName: editedOrder.customerName,
        phone: editedOrder.phone,
        pickupDate: editedOrder.pickupDate,
        deliveryDate: editedOrder.deliveryDate,
        serviceType: editedOrder.serviceType,
        instructions: editedOrder.instructions || '',
        items: editedOrder.items || {},
        totalItems: totals.totalItems,
        totalCost: parseFloat(totals.totalCost.toFixed(2)),
        gstEnabled: gstConfig.enabled,
        sgstPercentage: gstConfig.enabled ? gstConfig.sgstPercentage : 0,
        cgstPercentage: gstConfig.enabled ? gstConfig.cgstPercentage : 0,
        sgst: parseFloat(totals.sgst.toFixed(2)),
        cgst: parseFloat(totals.cgst.toFixed(2)),
        grandTotal: parseFloat(totals.grandTotal.toFixed(2)),
        lastModified: Timestamp.now(),
        status: 'pending',
        urgentDelivery: editedOrder.urgentDelivery || false
      };
      
      await updateDoc(orderRef, updateData);
      
      setShowEditModal(false);
      alert('Order updated successfully!');
      
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order. Please try again.\nError: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleShare = (order) => {
    if (!order.phone) {
      alert("Customer phone number not available!");
      return;
    }

    const itemsList = Object.entries(order.items || {})
      .map(([itemName, details]) => `${details.quantity} ${itemMapping[itemName] || itemName}`)
      .join(", ");

    const urgentText = order.urgentDelivery ? "\n*URGENT DELIVERY*" : "";

    const message = `Hello 🙏 ${order.customer}, 
Your order (${order.id}) for *${order.service}* is currently *${order.status.toUpperCase()}*.${urgentText}

Items: ${itemsList}
*Grand Total: ₹${order.amount}*

Pickup Date: ${order.pickupDate}
Delivery Date: ${order.deliveryDate}

Instructions: ${order.instructions || "No Instructions Given"}

Thank you for choosing us!
- Wash & Joy
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
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status: ' + error.message);
    }
  };

  const filteredOrders = orders.filter(order => {
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
    if (status === 'pending' && isUrgent) {
      return { bg: '#ff6b35', text: '#ffffff' };
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

  const getFilterDisplayName = (filter) => {
    if (filter === 'urgent') return 'Urgent';
    return filter.charAt(0).toUpperCase() + filter.slice(1).replace('-', ' ');
  };

  const getServiceName = (serviceId) => {
    const service = availableServices.find(s => s.id === serviceId);
    return service ? service.name : serviceId;
  };

  const availableItemsToAdd = clothingItems.filter(
    item => !editedOrder?.items || !editedOrder.items[item.id]
  );

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
                <th style={styles.th}>Order ID</th>
                <th style={styles.th}>Customer</th>
                <th style={styles.th}>Phone</th>
                <th style={styles.th}>Service</th>
                <th style={styles.th}>Pickup</th>
                <th style={styles.th}>Delivery</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Instruction</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const isUrgent = order.urgentDelivery;
                const isPending = order.status.toLowerCase() === 'pending';
                const statusStyles = getStatusStyles(order.status, isUrgent);
                
                return (
                  <tr
                    key={order.id}
                    style={{
                      backgroundColor: isUrgent ? '#fff3e0' : 'white',
                      borderBottom: '1px solid var(--gray-200)',
                      borderLeft: isUrgent ? '4px solid #ff6b35' : 'none',
                      transition: 'all 0.2s',
                      cursor: isPending ? 'pointer' : 'default'
                    }}
                    onClick={() => isPending && handleEditClick(order)}
                    onMouseEnter={e => {
                      if (isPending) {
                        e.currentTarget.style.backgroundColor = isUrgent ? '#ffe0b2' : 'var(--gray-50)';
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = isUrgent ? '#fff3e0' : 'white';
                    }}
                  >
                    <td style={{ ...styles.td, fontWeight: isUrgent ? 'bold' : 'normal' }}>
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
                    <td style={styles.td}>{order.customer}</td>
                    <td style={styles.td}>{order.phone}</td>
                    <td style={styles.td}>{getServiceName(order.service)}</td>
                    <td style={styles.td}>{order.pickupDate}</td>
                    <td style={styles.td}>{order.deliveryDate}</td>
                    <td style={styles.td}>
                      <select
                        value={order.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleStatusChange(order.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
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
                    <td style={{ ...styles.td, fontWeight: isUrgent ? 'bold' : 'normal' }}>
                      &#8377;{order.amount}
                    </td>
                    <td style={styles.td}>{order.instructions}</td>
                    <td style={styles.td}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(order);
                        }}
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

      {/* Edit Modal */}
      {showEditModal && editedOrder && (
        <div style={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={{ margin: 0 }}>Edit Order - {selectedOrder.id}</h3>
                <p style={{ 
                  margin: '0.25rem 0 0 0', 
                  fontSize: '0.875rem', 
                  color: 'var(--gray-500)' 
                }}>
                  Last modified: {editedOrder.lastModified 
                    ? new Date(editedOrder.lastModified).toLocaleString() 
                    : 'Never'}
                </p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                style={styles.closeButton}
                onMouseEnter={e => e.target.style.backgroundColor = 'var(--gray-200)'}
                onMouseLeave={e => e.target.style.backgroundColor = 'var(--gray-100)'}
              >
                ×
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Customer Name *</label>
                  <input
                    type="text"
                    value={editedOrder.customerName || ''}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Phone *</label>
                  <input
                    type="text"
                    value={editedOrder.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Pickup Date</label>
                  <input
                    type="date"
                    value={editedOrder.pickupDate || ''}
                    onChange={(e) => handleInputChange('pickupDate', e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Delivery Date</label>
                  <input
                    type="date"
                    value={editedOrder.deliveryDate || ''}
                    onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Service Type *</label>
                  <select
                    value={editedOrder.serviceType || ''}
                    onChange={(e) => handleInputChange('serviceType', e.target.value)}
                    style={styles.input}
                    required
                  >
                    <option value="">Select service</option>
                    {availableServices.map(service => (
                      <option key={service.id} value={service.id}>{service.name}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Urgent Delivery</label>
                  <select
                    value={editedOrder.urgentDelivery ? 'true' : 'false'}
                    onChange={(e) => handleInputChange('urgentDelivery', e.target.value === 'true')}
                    style={styles.input}
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>

                <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                  <label style={styles.label}>Instructions</label>
                  <textarea
                    value={editedOrder.instructions || ''}
                    onChange={(e) => handleInputChange('instructions', e.target.value)}
                    style={{ ...styles.input, minHeight: '60px', resize: 'vertical' }}
                    placeholder="Special instructions..."
                  />
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginTop: '1.5rem',
                marginBottom: '1rem'
              }}>
                <h4 style={{ margin: 0 }}>Items</h4>
                <button
                  onClick={handleAddItemClick}
                  disabled={availableItemsToAdd.length === 0}
                  style={{
                    padding: '0.25rem 0.75rem',
                    backgroundColor: availableItemsToAdd.length === 0 ? 'var(--gray-300)' : 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: availableItemsToAdd.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  + Add Item
                </button>
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #333' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--gray-50)' }}>
                      <th style={styles.tableHeader}>Item</th>
                      <th style={styles.tableHeader}>Quantity</th>
                      <th style={styles.tableHeader}>Price (₹)</th>
                      <th style={styles.tableHeader}>Total (₹)</th>
                      <th style={styles.tableHeader}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editedOrder.items && Object.entries(editedOrder.items).length > 0 ? (
                      Object.entries(editedOrder.items).map(([itemName, details]) => (
                        <tr key={itemName}>
                          <td style={styles.tableCell}>{itemMapping[itemName] || itemName}</td>
                          <td style={styles.tableCell}>
                            <input
                              type="number"
                              min="0"
                              value={details.quantity || 0}
                              onChange={(e) => handleItemChange(itemName, 'quantity', e.target.value)}
                              style={{ ...styles.input, width: '80px' }}
                            />
                          </td>
                          <td style={styles.tableCell}>
                            <input
                              type="number"
                              min="0"
                              value={details.price || 0}
                              onChange={(e) => handleItemChange(itemName, 'price', e.target.value)}
                              style={{ ...styles.input, width: '80px' }}
                            />
                          </td>
                          <td style={styles.tableCell}>
                            <strong>₹{parseFloat((details.quantity || 0) * (details.price || 0)).toFixed(2)}</strong>
                          </td>
                          <td style={styles.tableCell}>
                            <button
                              onClick={() => handleRemoveItem(itemName)}
                              style={{
                                padding: '0.25rem 0.5rem',
                                backgroundColor: '#ff6b6b',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                              }}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ ...styles.tableCell, textAlign: 'center', color: 'var(--gray-500)' }}>
                          No items added. Click "Add Item" to add items.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: 'var(--gray-50)' }}>
                      <td colSpan="3" style={{ 
                        ...styles.tableCell, 
                        textAlign: 'right', 
                        fontWeight: '500'
                      }}>
                        Subtotal:
                      </td>
                      <td colSpan="2" style={{ 
                        ...styles.tableCell, 
                        fontWeight: 'bold'
                      }}>
                        ₹{parseFloat(editedOrder.totalCost || 0).toFixed(2)}
                      </td>
                    </tr>
                    {gstConfig.enabled && (
                      <>
                        <tr>
                          <td colSpan="3" style={{ 
                            ...styles.tableCell, 
                            textAlign: 'right',
                            fontSize: '0.875rem'
                          }}>
                            SGST ({gstConfig.sgstPercentage}%):
                          </td>
                          <td colSpan="2" style={styles.tableCell}>
                            ₹{parseFloat(editedOrder.sgst || 0).toFixed(2)}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="3" style={{ 
                            ...styles.tableCell, 
                            textAlign: 'right',
                            fontSize: '0.875rem'
                          }}>
                            CGST ({gstConfig.cgstPercentage}%):
                          </td>
                          <td colSpan="2" style={styles.tableCell}>
                            ₹{parseFloat(editedOrder.cgst || 0).toFixed(2)}
                          </td>
                        </tr>
                      </>
                    )}
                    <tr style={{ backgroundColor: 'var(--primary-light, #e3f2fd)' }}>
                      <td colSpan="3" style={{ 
                        ...styles.tableCell, 
                        textAlign: 'right', 
                        fontWeight: 'bold',
                        fontSize: '1rem'
                      }}>
                        Grand Total:
                      </td>
                      <td colSpan="2" style={{ 
                        ...styles.tableCell, 
                        fontWeight: 'bold',
                        fontSize: '1.125rem',
                        color: 'var(--primary)'
                      }}>
                        ₹{parseFloat(editedOrder.grandTotal || 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {!gstConfig.enabled && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#fff3cd',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  color: '#856404',
                  border: '1px solid #ffeeba'
                }}>
                  ℹ️ GST is currently disabled. Orders will be saved without GST.
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button
                onClick={() => setShowEditModal(false)}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={saving}
                style={{
                  ...styles.saveButton,
                  opacity: saving ? 0.6 : 1,
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                {saving ? '⏳ Saving...' : '✓ Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddItemModal(false)}>
          <div style={{ ...styles.modalContent, maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>Add Item</h3>
              <button
                onClick={() => setShowAddItemModal(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
            
            <div style={styles.modalBody}>
              {availableItemsToAdd.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '1rem'
                }}>
                  {availableItemsToAdd.map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectItemToAdd(item.id)}
                      style={{
                        border: '2px solid var(--gray-200)',
                        borderRadius: '0.5rem',
                        padding: '1rem',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                        backgroundColor: 'white'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--primary)';
                        e.currentTarget.style.backgroundColor = 'var(--secondary)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--gray-200)';
                        e.currentTarget.style.backgroundColor = 'white';
                      }}
                    >
                      <img 
                        src={getClothIcon(item)}
                        alt={item.name} 
                        style={{ width: '60px', height: '60px', objectFit: 'contain', marginBottom: '0.5rem' }} 
                      />
                      <p style={{ fontSize: '0.875rem', fontWeight: '500', margin: '0.25rem 0' }}>
                        {item.name}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', margin: 0 }}>
                        ₹{servicePrices[editedOrder.serviceType]?.[item.id] || 0}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '2rem' }}>
                  All items have been added already!
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  th: {
    padding: '0.75rem 1rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'var(--gray-600)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '2px solid var(--gray-200)'
  },
  td: {
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    color: 'var(--gray-900)',
    borderBottom: '1px solid var(--gray-100)'
  },
  tableHeader: {
    padding: '0.75rem 1rem',
    textAlign: 'center',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#333',
    border: '1px solid #333',
    backgroundColor: '#f8f9fa'
  },
  tableCell: {
    padding: '0.75rem 1rem',
    textAlign: 'center',
    fontSize: '0.875rem',
    color: '#333',
    border: '1px solid #333'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '1rem',
    overflowY: 'auto'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '0.75rem',
    width: '100%',
    maxWidth: '900px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    margin: 'auto'
  },
  modalHeader: {
    padding: '1.5rem',
    borderBottom: '2px solid var(--gray-200)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: 'var(--gray-50)'
  },
  modalBody: {
    padding: '1.5rem',
    overflowY: 'auto',
    flex: 1,
    backgroundColor: 'white'
  },
  modalFooter: {
    padding: '1.5rem',
    borderTop: '2px solid var(--gray-200)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    backgroundColor: 'var(--gray-50)'
  },
  closeButton: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'var(--gray-100)',
    color: 'var(--gray-600)',
    cursor: 'pointer',
    fontSize: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.25rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem'
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--gray-700)'
  },
  input: {
    padding: '0.625rem',
    border: '1px solid var(--gray-300)',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  saveButton: {
    padding: '0.625rem 1.25rem',
    backgroundColor: 'var(--primary)',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    transition: 'opacity 0.2s'
  },
  cancelButton: {
    padding: '0.625rem 1.25rem',
    backgroundColor: 'white',
    color: 'var(--gray-700)',
    border: '1px solid var(--gray-300)',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  }
};

export default Orders;