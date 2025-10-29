import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const CustomerBookingsModal = ({ phone, onClose }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('🔍 Fetching bookings for phone:', phone);
        
        const q = query(
          collection(db, 'Bookings'),
          where('phone', '==', phone)
        );
        
        const querySnapshot = await getDocs(q);
        console.log('📦 Found bookings:', querySnapshot.size);

        const bookingsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            status: data.status?.trim() ? data.status : 'Pending',
          };
        });

        // Sort by date in JavaScript
        bookingsData.sort((a, b) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateB - dateA;
        });

        setBookings(bookingsData);
        setLoading(false);
        
      } catch (err) {
        console.error('❌ Error fetching bookings:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    if (phone) {
      fetchBookings();
    }
  }, [phone]);

  const handlePrint = () => {
    const printContent = document.getElementById('printable-area').innerHTML;
    const newWindow = window.open('', '', 'width=1200,height=800');
    newWindow.document.write(`
      <html>
        <head>
          <title>Customer Bookings Report</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 8mm;
            }
            
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body { 
              font-family: Arial, sans-serif; 
              padding: 8px;
              font-size: 10px;
            }
            
            h2 { 
              text-align: center; 
              font-size: 18px;
              margin-bottom: 6px;
              font-weight: bold;
            }
            
            h4 { 
              text-align: center; 
              font-size: 14px;
              margin-bottom: 12px;
              color: #333;
            }
            
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 5px; 
              border: 1px solid #333;
              font-size: 9px;
            }
            
            th, td { 
              border: 1px solid #333; 
              padding: 5px 4px; 
              text-align: center;
              word-wrap: break-word;
            }
            
            th { 
              background-color: #f2f2f2 !important; 
              font-weight: bold;
              border: 1px solid #333;
              font-size: 10px;
              padding: 6px 4px;
            }
            
            ul { 
              list-style-type: circle;
              padding-left: 15px;
              margin: 4px 0;
              text-align: left;
            }
            
            li { 
              padding: 3px 0;
              line-height: 1.5;
              font-size: 9px;
              display: list-item;
            }
            
            .status-badge {
              padding: 3px 6px;
              border-radius: 3px;
              font-size: 8px;
              display: inline-block;
              color: #000;
              border: 1px solid #333;
              font-weight: bold;
            }
            
            .status-pending { background-color: #ffc107 !important; }
            .status-in-progress { background-color: #17a2b8 !important; color: #fff !important; }
            .status-ready { background-color: #28a745 !important; color: #fff !important; }
            .status-completed { background-color: #6c757d !important; color: #fff !important; }
            
            /* Specific column widths for better fit */
            th:nth-child(1), td:nth-child(1) { width: 5%; } /* Booking ID */
            th:nth-child(2), td:nth-child(2) { width: 8%; } /* Customer Name */
            th:nth-child(3), td:nth-child(3) { width: 7%; } /* Phone */
            th:nth-child(4), td:nth-child(4) { width: 6%; } /* Pickup Date */
            th:nth-child(5), td:nth-child(5) { width: 6%; } /* Delivery Date */
            th:nth-child(6), td:nth-child(6) { width: 7%; } /* Service Type */
            th:nth-child(7), td:nth-child(7) { width: 20%; } /* Items */
            th:nth-child(8), td:nth-child(8) { width: 4%; } /* Total Items */
            th:nth-child(9), td:nth-child(9) { width: 6%; } /* Subtotal */
            th:nth-child(10), td:nth-child(10) { width: 5%; } /* SGST */
            th:nth-child(11), td:nth-child(11) { width: 5%; } /* CGST */
            th:nth-child(12), td:nth-child(12) { width: 6%; } /* Grand Total */
            th:nth-child(13), td:nth-child(13) { width: 6%; } /* Status */
            th:nth-child(14), td:nth-child(14) { width: 6%; } /* Instructions */
            th:nth-child(15), td:nth-child(15) { width: 6%; } /* Created At */
            
            small {
              font-size: 7px;
            }
            
            b, strong {
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <h2>Customer Bookings Report</h2>
          <h4>Phone: ${phone}</h4>
          ${printContent}
        </body>
      </html>
    `);
    newWindow.document.close();
    
    // Wait for content to load before printing
    setTimeout(() => {
      newWindow.print();
    }, 250);
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

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.content} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={{ margin: 0 }}>Bookings for {phone}</h3>
          <div style={styles.buttonGroup}>
            <button onClick={onClose} style={styles.button}>Close</button>
            <button
              onClick={handlePrint}
              style={{ ...styles.button, backgroundColor: '#28a745' }}
              disabled={bookings.length === 0}
            >
              Print Report
            </button>
          </div>
        </div>

        <div id="printable-area" style={styles.tableContainer}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>Loading bookings...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>
              <p>Error: {error}</p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Pickup</th>
                  <th style={styles.th}>Delivery</th>
                  <th style={styles.th}>Service</th>
                  <th style={styles.th}>Items</th>
                  <th style={styles.th}>Qty</th>
                  <th style={styles.th}>Subtotal</th>
                  <th style={styles.th}>SGST</th>
                  <th style={styles.th}>CGST</th>
                  <th style={styles.th}>Total</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Notes</th>
                  <th style={styles.th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length > 0 ? (
                  bookings.map(booking => {
                    const subtotal = parseFloat(booking.totalCost) || 0;
                    const sgst = parseFloat(booking.sgst) || 0;
                    const cgst = parseFloat(booking.cgst) || 0;
                    const grandTotal = parseFloat(booking.grandTotal) || subtotal;
                    const gstEnabled = booking.gstEnabled !== false;
                    const sgstPercent = booking.sgstPercentage || 0;
                    const cgstPercent = booking.cgstPercentage || 0;

                    return (
                      <tr key={booking.id}>
                        <td style={styles.td}>{booking.id.slice(0, 8)}...</td>
                        <td style={styles.td}>{booking.customerName}</td>
                        <td style={styles.td}>{booking.phone}</td>
                        <td style={styles.td}>{booking.pickupDate}</td>
                        <td style={styles.td}>{booking.deliveryDate}</td>
                        <td style={styles.td}>{booking.serviceType}</td>
                        <td style={{ ...styles.td, textAlign: 'left', padding: '8px' }}>
                          {booking.items ? (
                            <ul style={styles.itemList}>
                              {Object.entries(booking.items).map(([itemName, details], idx) => (
                                <li key={idx} style={styles.itemListItem}>
                                  <strong>{itemMapping[itemName] || itemName}</strong> ({details.quantity}) - ₹{details.price}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td style={styles.td}>{booking.totalItems}</td>
                        <td style={styles.td}>₹{subtotal.toFixed(2)}</td>
                        <td style={styles.td}>
                          {gstEnabled ? (
                            <div>₹{sgst.toFixed(2)}<br/><small>({sgstPercent}%)</small></div>
                          ) : (
                            <span style={{ color: '#999', fontSize: '0.85em' }}>N/A</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          {gstEnabled ? (
                            <div>₹{cgst.toFixed(2)}<br/><small>({cgstPercent}%)</small></div>
                          ) : (
                            <span style={{ color: '#999', fontSize: '0.85em' }}>N/A</span>
                          )}
                        </td>
                        <td style={styles.td}><b>₹{grandTotal.toFixed(2)}</b></td>
                        <td style={styles.td}>
                          <span
                            className={`status-badge status-${booking.status}`}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '5px',
                              backgroundColor:
                                booking.status === 'pending'
                                  ? '#ffc107'
                                  : booking.status === 'in-progress'
                                  ? '#17a2b8'
                                  : booking.status === 'ready'
                                  ? '#28a745'
                                  : booking.status === 'completed'
                                  ? '#6c757d'
                                  : '#dc3545',
                              color: '#fff',
                              fontSize: '0.85em',
                              fontWeight: '600',
                              display: 'inline-block'
                            }}
                          >
                            {booking.status}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {booking.instructions ? booking.instructions.slice(0, 30) + (booking.instructions.length > 30 ? '...' : '') : '-'}
                        </td>
                        <td style={styles.td}>
                          {booking.createdAt?.toDate
                            ? booking.createdAt.toDate().toLocaleDateString()
                            : '-'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="15" style={{ ...styles.td, textAlign: 'center', padding: '40px', fontSize: '1rem', color: '#666' }}>
                      No bookings found for this phone number
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    maxHeight: '90vh',
    width: '95%',
    maxWidth: '1600px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  header: {
    padding: '20px',
    borderBottom: '1px solid #ddd',
    backgroundColor: '#fff',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
  },
  buttonGroup: {
    marginTop: '15px',
    display: 'flex',
    gap: '10px',
  },
  button: {
    backgroundColor: '#007bff',
    color: '#fff',
    padding: '10px 18px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  tableContainer: {
    overflowY: 'auto',
    overflowX: 'auto',
    padding: '20px',
    flex: 1,
    minHeight: 0,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    border: '1px solid #333',
  },
  th: {
    border: '1px solid #333',
    padding: '12px 10px',
    textAlign: 'center',
    backgroundColor: '#f8f9fa',
    fontWeight: '600',
    fontSize: '1rem',
    color: '#333',
    whiteSpace: 'nowrap',
    // Removed position: 'sticky', top: 0, and zIndex: 10
  },
  td: {
    border: '1px solid #333',
    padding: '12px 10px',
    textAlign: 'center',
    fontSize: '0.95rem',
    color: '#333',
    verticalAlign: 'middle',
    lineHeight: '1.5'
  },
  itemList: {
    listStyleType: 'circle',
    listStylePosition: 'outside',
    paddingLeft: '20px',
    margin: '8px 0',
    textAlign: 'left'
  },
  itemListItem: {
    padding: '4px 0',
    lineHeight: '1.6',
    fontSize: '0.9rem',
    display: 'list-item',
    marginBottom: '4px'
  }
};

export default CustomerBookingsModal;