import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import ReactDOM from 'react-dom/client';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import html2canvas from 'html2canvas';

const Billing = () => {
  const [billData, setBillData] = useState({
    orderId: '',
    billDate: new Date().toISOString().split('T')[0],
    customerName: '',
    customerPhone: '',
     pickupDate: '',
  deliveryDate: '',
    items: [
      { id: 1, item: '', quantity: 1, price: 0, total: 0 }
    ]
  });
 const [billImage, setBillImage] = useState(null);
const [companySettings, setCompanySettings] = useState({
  businessName: '',
  address: '',
  gstin: '',
  logoUrl: '',
  phoneNumber: ''
});
useEffect(() => {
  const fetchSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'company');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setCompanySettings(docSnap.data());
      }
    } catch (error) {
      console.error('Error fetching company settings:', error);
    }
  };

  fetchSettings();
}, []);

  const [billPreview, setBillPreview] = useState(null);
  const [bookingIds, setBookingIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableServices, setAvailableServices] = useState([]);
const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}-${month}-${year}`;
};
  // Fetch all booking IDs on component mount
  useEffect(() => {
    const fetchBookingIds = async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, 'Bookings'));
        const ids = querySnapshot.docs.map(doc => doc.id);
        setBookingIds(ids);
      } catch (error) {
        console.error('Error fetching booking IDs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookingIds();
  }, []);

  // Filter bookings based on search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = bookingIds.filter(id => 
        id.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredBookings(filtered);
      setShowDropdown(filtered.length > 0);
    } else {
      setFilteredBookings([]);
      setShowDropdown(false);
    }
  }, [searchTerm, bookingIds]);

  const handleBookingSelect = async (bookingId) => {
    try {
      setLoading(true);
      const docRef = doc(db, 'Bookings', bookingId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const bookingData = docSnap.data();
        console.log('bookingData',bookingData);
        
        // Extract services from booking data and update availableServices
        if (bookingData.items) {
          const services = Object.entries(bookingData.items).map(([itemType, itemData]) => ({
            id: itemType,
            name: itemType.charAt(0).toUpperCase() + itemType.slice(1),
            price: itemData.price,
            description: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} - ₹${itemData.price.toFixed(2)}`
          }));
          setAvailableServices(services);
        }

        // Convert booking items to bill items format
        const items = [];
        
        if (bookingData.items) {
          Object.entries(bookingData.items).forEach(([itemType, itemData]) => {
            if (itemData.quantity > 0) { // Only include items with quantity > 0
              items.push({
                id: items.length + 1,
                item: `${itemType}-${itemData.price.toFixed(2)}`,
                quantity: itemData.quantity,
                price: itemData.price,
                total: itemData.price * itemData.quantity
              });
            }
          });
        }
        
setBillData({
  orderId: bookingId,
  pickupDate: bookingData.pickupDate || '',
  deliveryDate: bookingData.deliveryDate || '',
  billDate: new Date().toISOString().split('T')[0],
  customerName: bookingData.customerName || '',
  customerPhone: bookingData.phone || '',
  items: items.length > 0 ? items : [
    { id: 1, item: '', quantity: 1, price: 0, total: 0 }
  ]
});

        
        setSearchTerm(bookingId);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('Error fetching booking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBillData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOrderIdChange = (e) => {
    setSearchTerm(e.target.value);
    setBillData(prev => ({
      ...prev,
      orderId: e.target.value
    }));
  };
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

  const handleItemChange = (id, field, value) => {
    setBillData(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'price') {
            updatedItem.total = updatedItem.quantity * updatedItem.price;
          }
          return updatedItem;
        }
        return item;
      });
      
      return { ...prev, items: updatedItems };
    });
  };

  const addItem = () => {
    setBillData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { id: Date.now(), item: '', quantity: 1, price: 0, total: 0 }
      ]
    }));
  };

  const removeItem = (id) => {
    setBillData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const calculateTotals = () => {
    const subtotal = billData.items.reduce((sum, item) => {
      if (item.item && item.item.includes('-')) {
        const price = parseFloat(item.item.split('-')[1]);
        return sum + (price * item.quantity);
      }
      return sum;
    }, 0);
    
    const total = subtotal;
    
    return { subtotal, total };
  };

  const { subtotal, total } = calculateTotals();

const generateBill = () => {
  if (!billData.orderId || !billData.customerName || !billData.customerPhone) {
    alert('Please fill in all required fields');
    return;
  }

  if (subtotal === 0) {
    alert('Please add at least one item to the bill');
    return;
  }

const itemsRows = billData.items
  .filter(item => item.item && item.total > 0)
  .map((item, index) => {
    const itemParts = item.item.split('-');
    const itemId = itemParts[0]; // Get the item ID
    const itemPrice = itemParts.length > 1 ? parseFloat(itemParts[1]) : 0;
    const displayTotal = typeof item.total === 'number' ? item.total.toFixed(2) : '0.00';
    
    return (
      <tr key={item.id} style={{borderBottom: '1px solid #e2e8f0'}}>
        <td style={{padding: '0.5rem 0', textAlign: 'center'}}>{index + 1}</td>
        <td style={{padding: '0.5rem 0', textAlign: 'left'}}>
          {itemMapping[itemId] || itemId.charAt(0).toUpperCase() + itemId.slice(1)} {/* Use mapping */}
        </td>
        <td style={{padding: '0.5rem 0', textAlign: 'center'}}>{item.quantity}</td>
        <td style={{padding: '0.5rem 0', textAlign: 'right'}}>&#8377; {itemPrice.toFixed(2)}</td>
        <td style={{padding: '0.5rem 0', textAlign: 'right'}}>&#8377; {displayTotal}</td>
      </tr>
    );
  });


  setBillPreview(
    <div id="bill-preview" style={{
      backgroundColor: '#f9f9f9',
      padding: '1.5rem',
      fontSize: '0.875rem',
      maxWidth: '100%',
      margin: '0 auto',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
    }}>
      

<div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
{companySettings.logoUrl && (
  <div style={{ marginBottom: '0.2rem' }}>
    <img 
      src={companySettings.logoUrl} 
      alt="Logo" 
      style={{ maxWidth: '70px', maxHeight: '70px' }}
    />
  </div>
)}

  <h2 style={{
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: '0.3rem'
  }}>{companySettings.businessName || 'Wash & Joy'}</h2>
  <p style={{ color: '#6B7280', marginBottom: '0.20rem' }}>Laundry & Dry Cleaning Service</p>
  <p style={{ color: '#6B7280', marginBottom: '0.20rem', lineHeight: '1.2' }}>
    {companySettings.address || 'Soma Niwas, Ramnagar Bus Stop, Rahatani Main Road, Rahatani Gav, Pune - 411017'}
  </p>
  {companySettings.gstin && (
    <p style={{ color: '#6B7280', marginBottom: '0.20rem' }}>GSTIN: {companySettings.gstin}</p>
  )}
  <p style={{ color: '#6B7280', margin: 0 }}>
    ☎ {companySettings.phoneNumber || '+91 8421586414'}
  </p>
</div>
      
      {/* Customer Details */}
      <div style={{
        borderTop: '2px solid #3B82F6',
        borderBottom: '2px solid #3B82F6',
        padding: '1rem 0',
        marginBottom: '1rem'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem'
        }}>
          <div>
          
            <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Customer Name:</p>
            <p>{billData.customerName}</p>
            <p>Pickup Date: {formatDate(billData.pickupDate)}</p>
            <p>Delivery Date: {formatDate(billData.deliveryDate)}</p>
            <p>Phone: {billData.customerPhone}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p><span style={{ fontWeight: '600' }}>Booking ID:</span> {billData.orderId}</p>
            <p><span style={{ fontWeight: '600' }}>Date:</span> {formatDate(billData.billDate)}</p>
          </div>
        </div>
      </div>
      
      {/* Items Table */}
      <table style={{ width: '100%', marginBottom: '1rem', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #3B82F6' }}>
            <th style={{ padding: '0.5rem 0', textAlign: 'center' }}>Sr. No</th>
            <th style={{ padding: '0.5rem 0', textAlign: 'left' }}>Item</th>
            <th style={{ padding: '0.5rem 0', textAlign: 'center' }}>Qty</th>
            <th style={{ padding: '0.5rem 0', textAlign: 'right' }}>Rate</th>
            <th style={{ padding: '0.5rem 0', textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {itemsRows}
        </tbody>
      </table>
      
      {/* Totals */}
      <div style={{ borderTop: '2px solid #3B82F6', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ color: '#6B7280' }}>Amount:</span>
          <span style={{ fontWeight: '500' }}>&#8377; {subtotal.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ color: '#6B7280' }}>CGST(9%):</span>
          <span style={{ fontWeight: '500' }}>&#8377; {(subtotal * 0.09).toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ color: '#6B7280' }}>SGST(9%):</span>
          <span style={{ fontWeight: '500' }}>&#8377; {(subtotal * 0.09).toFixed(2)}</span>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '1.125rem',
          fontWeight: 'bold',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '0.5rem'
        }}>
          <span>Total:</span>
          <span style={{ color: '#3B82F6' }}>&#8377; {(subtotal + subtotal * 0.18).toFixed(2)}</span>
        </div>
      </div>
      
      {/* Footer */}
      <div style={{
        marginTop: '1.5rem',
        textAlign: 'center',
        color: '#6B7280',
        fontSize: '0.75rem'
      }}>
        <p>Collect your clothes within one week. After that, we are not responsible for any loss.</p>
        <p style={{ marginTop: '1rem' }}>Store Hours: Thursday Closed</p>
        <p style={{ marginTop: '1rem', fontWeight: 'bold' }}>Wash & Joy</p>
        <p style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>Signature: __________________</p>
      </div>
    </div>
  );

  // Capture the bill preview as an image
  setTimeout(() => {
    html2canvas(document.getElementById('bill-preview')).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      setBillImage(imgData);
    });
  }, 0);
};





const sendWhatsAppMessage = () => {
  const {
    customerName,
    customerPhone,
    orderId,
    billDate,
    pickupDate,
    deliveryDate,
    items
  } = billData;

  if (!customerPhone || !customerName || !orderId || items.length === 0) {
    alert("Incomplete bill data");
    return;
  }

  const { subtotal, total } = calculateTotals();
 // Add GST (example 18%)
  const gstRate = 0.18;
  const gstAmount = Math.round(subtotal * gstRate);
  const grandTotal = subtotal + gstAmount;

  let message = `🧾 *${companySettings.businessName } - Bill Summary*\n\n`;


   message += `\n📍 ${companySettings.address || 'Wash & Joy, Rahatani'}\n`;
  message += `☎ ${companySettings.phoneNumber || '-'}\n`;
  if (companySettings.gstin) {
    message += `GSTIN: ${companySettings.gstin}\n`;
  }
  
  message += `👤 *Customer:* ${customerName}\n`;
  message += `📞 *Phone:* ${customerPhone}\n`;
  message += `🆔 *Booking ID:* ${orderId}\n`;
  message += `📅 *Bill Date:* ${formatDate(billDate)}\n`;
  if (pickupDate) message += `📥 *Pickup Date:* ${formatDate(pickupDate)}\n`;
  if (deliveryDate) message += `📤 *Delivery Date:* ${formatDate(deliveryDate)}\n`;

  message += `\n📦 *Items:*\n`;

  items.forEach((item, index) => {
    if (item.item && item.total > 0) {
      const [itemName, itemRate] = item.item.split("-");
      message += `${index + 1}. ${itemName.trim()} x${item.quantity} - ₹${item.total.toFixed(2)}\n`;
    }
  });

  message += `\n💵 *Subtotal:* ₹${subtotal.toFixed(2)}\n`;
  message += `💵 *GST (18%):* ₹${gstAmount.toFixed(2)}\n`;
  message += `----------------------------- \n`;
  message += `💰 *Total:* ₹${grandTotal.toFixed(2)}\n\n`;

  message += `📍 Wash & Joy,  Kharadi, Pune\n☎ 7758925760\n🕒 Thursday Closed\n\nThank you! 🙏`;

  const encodedMessage = encodeURIComponent(message);
  const whatsappLink = `https://wa.me/${customerPhone}?text=${encodedMessage}`;

  window.open(whatsappLink, '_blank');
};




  const printBill = () => {
    if (!billPreview) return;

    const printWindow = window.open('', '_blank');
    const printDocument = printWindow.document;

    const tempDiv = document.createElement('div');
    document.body.appendChild(tempDiv);

    const root = ReactDOM.createRoot(tempDiv);
    root.render(billPreview);

    setTimeout(() => {
      const billContent = tempDiv.innerHTML;
      document.body.removeChild(tempDiv);

      printDocument.write(`
        <html>
          <head>
            <title>Wash & Joy - Bill</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 20mm;
              }

              body {
                font-family: 'Arial', sans-serif;
                font-size: 12px;
                color: #333;
                background: white;
                margin: 0;
                padding: 0;
              }

              .bill {
                width: 100%;
                max-width: 800px;
                margin: 0 auto;
                padding: 0;
              }

              h2 {
                font-size: 24px;
                margin-bottom: 5px;
                color: #1F2937;
              }

              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 1rem;
                font-size: 12px;
              }

              th, td {
                padding: 8px;
                border: 1px solid #ccc;
                text-align: left;
              }

              th {
                background-color: #f3f4f6;
                color: #111827;
                font-weight: bold;
              }

              .totals {
                margin-top: 1rem;
                text-align: right;
                font-weight: bold;
              }

              .footer {
                margin-top: 2rem;
                font-size: 10px;
                text-align: center;
                color: #555;
              }

              .signature {
                margin-top: 2rem;
                text-align: right;
                padding-top: 1rem;
                border-top: 1px solid #ccc;
                width: 50%;
                margin-left: auto;
                font-size: 12px;
              }

              @media print {
                html, body {
                  width: 210mm;
                  height: 297mm;
                }

                .no-print {
                  display: none;
                }
              }
            </style>
          </head>
          <body>
            <div class="bill">
              ${billContent}
            </div>

            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 500);
              }
            </script>
          </body>
        </html>
      `);

      printDocument.close();
    }, 200);
  };

  return (
    <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '1.5rem' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '2rem'
      }}>
        {/* Bill Creation Form */}
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
          }}>Generate Bill</h3>

          <style>
            {`
              @media print {
                body {
                  padding: 0;
                  margin: 0;
                }
                .bill {
                  box-shadow: none;
                  border: none;
                }
              }
            `}
          </style>

          <form style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '2.8rem'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'var(--gray-700)',
                  marginBottom: '0.5rem'
                }}>Booking ID</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    name="orderId"
                    value={searchTerm}
                    onChange={handleOrderIdChange}
                    onFocus={() => setShowDropdown(true)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 1rem',
                      border: '1px solid var(--gray-300)',
                      borderRadius: '0.5rem',
                      outline: 'none',
                      fontSize: '0.875rem'
                    }}
                    placeholder="Search booking ID..."
                    required
                  />
                  {showDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid var(--gray-300)',
                      borderRadius: '0.5rem',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      zIndex: 10,
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      {filteredBookings.map(bookingId => (
                        <div
                          key={bookingId}
                          style={{
                            padding: '0.5rem 1rem',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--gray-200)'
                          }}
                          onClick={() => handleBookingSelect(bookingId)}
                        >
                          {bookingId}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'var(--gray-700)',
                  marginBottom: '0.5rem'
                }}>Bill Date</label>
                <input
                  type="date"
                  name="billDate"
                  value={billData.billDate}
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
                />
              </div>
            </div>



 <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '2.8rem'
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
                  value={billData.pickupDate}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '0.5rem 1rem',
                    border: '1px solid var(--gray-300)',
                    borderRadius: '0.5rem',
                    outline: 'none',
                    fontSize: '0.875rem'
                  }}
                  placeholder="pickup Date"
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
                  value={billData.deliveryDate}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '0.5rem 1rem',
                    border: '1px solid var(--gray-300)',
                    borderRadius: '0.5rem',
                    outline: 'none',
                    fontSize: '0.875rem'
                  }}
                  placeholder="delivery Date"
                  required
                />
              </div>
            </div>




            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '2.8rem'
            }}>
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
                  value={billData.customerName}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '0.5rem 1rem',
                    border: '1px solid var(--gray-300)',
                    borderRadius: '0.5rem',
                    outline: 'none',
                    fontSize: '0.875rem'
                  }}
                  placeholder="John Smith"
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
                }}>Phone Number</label>
                <input
                  type="tel"
                  name="customerPhone"
                  value={billData.customerPhone}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '0.5rem 1rem',
                    border: '1px solid var(--gray-300)',
                    borderRadius: '0.5rem',
                    outline: 'none',
                    fontSize: '0.875rem'
                  }}
                  placeholder="(555) 123-4567"
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
                marginBottom: '1rem'
              }}>Items & Services</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {billData.items.map((item) => (
                  <div key={item.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    backgroundColor: 'var(--gray-50)',
                    borderRadius: '0.5rem'
                  }}>
                    <select
                      value={item.item}
                      onChange={(e) => handleItemChange(item.id, 'item', e.target.value)}
                      style={{
                        flex: '1',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid var(--gray-300)',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                    >
                      <option value="">Select item</option>
                      {availableServices.map(service => (
                        <option key={service.id} value={`${service.id}-${service.price.toFixed(2)}`}>
                          {service.description}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
                      style={{
                        width: '5rem',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid var(--gray-300)',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        textAlign: 'center',
                        outline: 'none'
                      }}
                      placeholder="Qty"
                      min="1"
                    />
                    <span style={{
                      width: '5rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: 'var(--gray-700)',
                      textAlign: 'right'
                    }}>&#8377; {item.total.toFixed(2)}</span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      style={{
                        color: 'var(--red-600)',
                        padding: '0.25rem',
                        cursor: 'pointer',
                        border: 'none',
                        background: 'transparent'
                      }}
                      aria-label="Remove item"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addItem}
                style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem 1rem',
                  border: '1px solid var(--gray-300)',
                  color: 'var(--gray-700)',
                  borderRadius: '0.5rem',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                + Add Item
              </button>
            </div>
            
            <div style={{ borderTop: '1px solid var(--gray-300)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gray-600)' }}>Subtotal:</span>
                  <span style={{ fontWeight: '500' }}>&#8377; {subtotal.toFixed(2)}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1.125rem',
                  fontWeight: 'bold',
                  borderTop: '1px solid var(--gray-300)',
                  paddingTop: '0.5rem'
                }}>
                  <span>Total:</span>
                  <span style={{ color: 'var(--primary)' }}>&#8377; {total.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={generateBill}
                style={{
                  flex: '1',
                  padding: '0.75rem',
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Generate Bill'}
              </button>
              <button
                type="button"
                onClick={printBill}
                disabled={!billPreview}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: billPreview ? 'var(--green-600)' : 'var(--gray-300)',
                  color: 'white',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: billPreview ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem'
                }}
              >
                Print Bill
              </button>
              <button
              type="button"
              onClick={sendWhatsAppMessage}
              disabled={!billImage}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: billImage ? 'var(--green-600)' : 'var(--gray-300)',
                color: 'white',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: billImage ? 'pointer' : 'not-allowed',
                fontSize: '0.875rem'
              }}
            >
              Send via WhatsApp
            </button>
            </div>
          </form>
        </div>
        
        {/* Bill Preview */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          padding: '2rem',
          border: '1px solid var(--gray-200)'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: 'var(--gray-800)',
            marginBottom: '1.5rem'
          }}>Bill Preview</h3>
          <div style={{
            border: '1px solid var(--gray-300)',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            minHeight: '500px'
          }}>
            {billPreview || (
              <div style={{ 
                textAlign: 'center',
                color: 'var(--gray-500)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%'
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📄</div>
                <p>Fill in the details to generate bill preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Billing;
