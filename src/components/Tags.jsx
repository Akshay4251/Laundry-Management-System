import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import ReactDOMServer from 'react-dom/server';

const Tags = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [tagData, setTagData] = useState({
    orderId: '',
    customerName: '',
    serviceType: '',
    deliveryDate: '',
    pickupDate:''
  });

  const [companyInfo, setCompanyInfo] = useState({
    name: '',
    mobile: ''
  });
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      try {
        const docRef = doc(db, 'settings', 'company');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCompanyInfo({
            name: data.businessName || 'LaundryPro',
            mobile: data.phoneNumber || ''
          });
        }
      } catch (error) {
        console.error('Error fetching company info:', error);
      }
    };

    fetchCompanyInfo();
  }, []);

  const [items, setItems] = useState({});
  const [tagPreview, setTagPreview] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    const day = String(date.getDate()).padStart(2, '0');
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    
    const year = String(date.getFullYear()).slice(-2);
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayOfWeek = days[date.getDay()];
    
    return `${day} ${month} ${year} ${dayOfWeek}`;
  };

  useEffect(() => {
    const fetchOrders = async () => {
      const snapshot = await getDocs(collection(db, 'Bookings'));
      const orderList = [];
      snapshot.forEach(docSnap => {
        orderList.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });

      orderList.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return b.createdAt.toDate() - a.createdAt.toDate();
        }
        return 0;
      });

      setOrders(orderList);
      if (orderList.length > 0) {
        setSelectedOrderId(orderList[0].id);
        setSearchTerm(orderList[0].id);
      }
    };

    fetchOrders();
  }, []);

  useEffect(() => {
    if (!selectedOrderId) return;

    const fetchOrderDetails = async () => {
      const docRef = doc(db, 'Bookings', selectedOrderId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTagData({
          orderId: selectedOrderId,
          customerName: data.customerName || '',
          serviceType: data.serviceType || '',
          deliveryDate: data.deliveryDate || '',
          pickupDate: data.pickupDate || ''
        });
        setItems(data.items || {});
        setTagPreview([]);
      }
    };

    fetchOrderDetails();
  }, [selectedOrderId]);

  const handleOrderChange = (e) => {
    setSearchTerm(e.target.value);
    setShowDropdown(true);
  };

  const handleOrderSelect = (orderId) => {
    setSelectedOrderId(orderId);
    setSearchTerm(orderId);
    setShowDropdown(false);
  };

  const abbreviateService = (serviceType) => {
    const abbreviations = {
      'stain-removal': 'SR',
      'ironing': 'I',
      'wash-and-iron': 'W&I',
      'wash-and-fold': 'W&F',
      'starch-and-iron': 'S&I'
    };
    return abbreviations[serviceType] || serviceType.split('-').map(word => word[0].toUpperCase()).join('');
  };

  const generateTag = () => {
    const previews = [];

    // Calculate total tokens
    const totalTokens = Object.values(items).reduce((sum, itemData) => sum + (itemData.quantity || 0), 0);
    let currentToken = 0;

    Object.entries(items).forEach(([itemName, itemData]) => {
      const totalQty = itemData.quantity || 0;
      for (let i = 0; i < totalQty; i++) {
        currentToken++;
        previews.push(
          <div key={`${itemName}-${i}`} className="tag">
            <div className="tag-content" style={{
              border: '2px solid #333',
              borderRadius: '4px',
              padding: '4mm',
              width: '100%',
              height: '100%',
              boxSizing: 'border-box',
              backgroundColor: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '2.5mm'
            }}>
              {/* Order ID - Bold, Big, Center */}
              <div style={{ 
                fontWeight: '900', 
                fontSize: '1.5rem', 
                textAlign: 'center',
                letterSpacing: '1px',
                color: '#000',
                marginBottom: '1mm'
              }}>
                {tagData.orderId}
              </div>

              {/* Customer Name - Normal, Center */}
              <div style={{ 
                fontSize: '0.95rem', 
                textAlign: 'center',
                fontWeight: '500',
                color: '#222'
              }}>
                {tagData.customerName}
              </div>

              {/* Service Type (abbreviated) & Token Number */}
              <div style={{ 
                width: '100%',
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '0.85rem',
                paddingTop: '1mm',
                fontWeight: '600',
                color: '#333'
              }}>
                <span>{abbreviateService(tagData.serviceType)}</span>
                <span>{currentToken}/{totalTokens}</span>
              </div>

              {/* Receiving Date (Pickup Date) */}
              <div style={{ 
                fontSize: '0.8rem',
                width: '100%',
                textAlign: 'left',
                color: '#444',
                fontWeight: '500'
              }}>
                {formatDate(tagData.pickupDate)}
              </div>

              {/* ✅ Garment & Token Number on SAME LINE */}
              <div style={{ 
                width: '100%',
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: '#333'
              }}>
                <span>Garment</span>
                <span>{currentToken}/{totalTokens}</span>
              </div>

              {/* Delivery Date */}
              <div style={{ 
                fontSize: '0.8rem',
                width: '100%',
                textAlign: 'left',
                color: '#444',
                fontWeight: '500'
              }}>
                {formatDate(tagData.deliveryDate)}
              </div>
            </div>
          </div>
        );
      }
    });

    setTagPreview(previews);
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

  const printTag = () => {
    const printWindow = window.open('', '_blank');

    const tempContainer = document.createElement('div');
    tagPreview.forEach(tag => {
      const div = document.createElement('div');
      div.innerHTML = ReactDOMServer.renderToStaticMarkup(tag);
      tempContainer.appendChild(div);
    });

    const tagStyles = `
      @page {
        size: 80mm 50mm;
        margin: 0;
      }
      body {
        font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;
        margin: 0;
        padding: 0;
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-start;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .tag {
        width: 80mm;
        height: 50mm;
        border: 2px solid #333;
        border-radius: 5px;
        margin: 0;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
        page-break-inside: avoid;
        background-color: white;
      }
      .tag-content {
        width: 100%;
        height: 100%;
        padding: 4mm;
        box-sizing: border-box;
        border: 2px solid #333;
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background-color: #ffffff;
        gap: 2.5mm;
      }
      .tag:nth-child(even) .tag-content {
        background-color: #fafafa;
      }
      .tag:nth-child(odd) .tag-content {
        background-color: #ffffff;
      }
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Tags</title>
          <style>${tagStyles}</style>
        </head>
        <body>
          ${tempContainer.innerHTML}
          <script>
            setTimeout(function() { 
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }, 300);
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const filteredOrders = orders.filter(order =>
    order.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        }}>Tag Generator</h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem'
        }}>
          <div>
            <h4 style={{
              fontSize: '1.125rem',
              fontWeight: '500',
              color: 'var(--gray-800)',
              marginBottom: '1rem'
            }}>Tag Information</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontWeight: 500 }}>Order ID</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleOrderChange}
                    style={{
                      width: '100%',
                      padding: '0.5rem 1rem',
                      border: '1px solid var(--gray-300)',
                      borderRadius: '0.5rem'
                    }}
                  />
                  {showDropdown && searchTerm && filteredOrders.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 10,
                      border: '1px solid var(--gray-300)',
                      borderRadius: '0.5rem',
                      maxHeight: '150px',
                      overflowY: 'auto',
                      backgroundColor: 'white',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      {filteredOrders.map(order => (
                        <div
                          key={order.id}
                          onClick={() => handleOrderSelect(order.id)}
                          style={{
                            padding: '0.5rem 1rem',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--gray-300)',
                            backgroundColor: order.id === selectedOrderId ? 'var(--gray-100)' : 'white'
                          }}
                        >
                          {order.id}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label style={{ fontWeight: 500 }}>Customer Name</label>
                <input
                  type="text"
                  value={tagData.customerName}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '0.5rem 1rem',
                    border: '1px solid var(--gray-300)',
                    borderRadius: '0.5rem'
                  }}
                />
              </div>

              <div>
                <label style={{ fontWeight: 500 }}>Service Type</label>
                <input
                  type="text"
                  value={tagData.serviceType}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '0.5rem 1rem',
                    border: '1px solid var(--gray-300)',
                    borderRadius: '0.5rem'
                  }}
                />
              </div>

              <div>
                <label style={{ fontWeight: 500 }}>PickUp Date</label>
                <input
                  type="date"
                  value={tagData.pickupDate}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '0.5rem 1rem',
                    border: '1px solid var(--gray-300)',
                    borderRadius: '0.5rem'
                  }}
                />
              </div>

              <div>
                <label style={{ fontWeight: 500 }}>Delivery Date</label>
                <input
                  type="date"
                  value={tagData.deliveryDate}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '0.5rem 1rem',
                    border: '1px solid var(--gray-300)',
                    borderRadius: '0.5rem'
                  }}
                />
              </div>

              <button
                onClick={generateTag}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: 'var(--primary, #3b82f6)',
                  color: 'white',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  marginTop: '0.5rem'
                }}
              >
                Generate Tag
              </button>
            </div>
          </div>

          <div>
            <h4 style={{
              fontSize: '1.125rem',
              fontWeight: '500',
              color: 'var(--gray-800)',
              marginBottom: '1rem'
            }}>Tag Preview</h4>

            <div style={{
              border: '2px dashed var(--gray-300)',
              borderRadius: '0.5rem',
              padding: '2rem',
              textAlign: 'center',
              minHeight: '400px',
              maxHeight: '600px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              alignItems: 'center',
              justifyContent: tagPreview.length ? 'flex-start' : 'center'
            }}>
              {tagPreview.length > 0 ? tagPreview : (
                <p style={{ color: 'var(--gray-500)' }}>
                  Select an order and click "Generate Tag"
                </p>
              )}
            </div>

            <button
              onClick={printTag}
              disabled={!tagPreview.length}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: tagPreview.length ? 'var(--green-600, #16a34a)' : 'var(--gray-300)',
                color: 'white',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: tagPreview.length ? 'pointer' : 'not-allowed',
                fontSize: '0.875rem',
                marginTop: '1rem'
              }}
            >
              Print Tag
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tags;