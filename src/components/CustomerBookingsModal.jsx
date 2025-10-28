import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const CustomerBookingsModal = ({ phone, onClose }) => {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const q = query(
          collection(db, 'Bookings'),
          where('phone', '==', phone),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);

        const bookingsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            status: data.status?.trim() ? data.status : 'Pending',
          };
        });

        setBookings(bookingsData);
      } catch (err) {
        console.error('Error fetching bookings:', err);
      }
    };

    if (phone) fetchBookings();
  }, [phone]);

  const handlePrint = () => {
    const printContent = document.getElementById('printable-area').innerHTML;
    const newWindow = window.open('', '', 'width=900,height=700');
    newWindow.document.write(`
      <html>
        <head>
          <title>Customer Bookings Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2, h4 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #444; padding: 8px; text-align: center; }
            th { background-color: #f2f2f2; }
            ul { list-style: none; padding: 0; margin: 0; }
            li { border-bottom: 1px solid #ccc; padding: 2px 0; }
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
    newWindow.print();
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
            >
              Print Report
            </button>
          </div>
        </div>

        <div id="printable-area" style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Customer Name</th>
                <th>Phone</th>
                <th>Pickup Date</th>
                <th>Delivery Date</th>
                <th>Service Type</th>
                <th>Items</th>
                <th>Total Items</th>
                <th>Subtotal</th>
                <th>SGST</th>
                <th>CGST</th>
                <th>Grand Total</th>
                <th>Status</th>
                <th>Instructions</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length > 0 ? (
                bookings.map(booking => {
                  const subtotal = parseFloat(booking.totalCost) || 0;
                  const sgst = parseFloat(booking.sgst) || 0;
                  const cgst = parseFloat(booking.cgst) || 0;
                  const grandTotal = parseFloat(booking.grandTotal) || subtotal;
                  const gstEnabled = booking.gstEnabled !== false; // Default to true for old bookings
                  const sgstPercent = booking.sgstPercentage || 0;
                  const cgstPercent = booking.cgstPercentage || 0;

                  return (
                    <tr key={booking.id}>
                      <td>{booking.id}</td>
                      <td>{booking.customerName}</td>
                      <td>{booking.phone}</td>
                      <td>{booking.pickupDate}</td>
                      <td>{booking.deliveryDate}</td>
                      <td>{booking.serviceType}</td>
                      <td style={{ textAlign: 'left' }}>
                        {booking.items ? (
                          <ul style={{ margin: 0, paddingLeft: '15px' }}>
                            {Object.entries(booking.items).map(([itemName, details], idx) => (
                              <li key={idx}>
                                {itemMapping[itemName]} ({details.quantity}) - price: ₹{details.price}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>{booking.totalItems}</td>
                      <td>₹{subtotal.toFixed(2)}</td>
                      <td>
                        {gstEnabled ? (
                          <>₹{sgst.toFixed(2)}<br/><small>({sgstPercent}%)</small></>
                        ) : (
                          <span style={{ color: '#999', fontSize: '0.85em' }}>N/A</span>
                        )}
                      </td>
                      <td>
                        {gstEnabled ? (
                          <>₹{cgst.toFixed(2)}<br/><small>({cgstPercent}%)</small></>
                        ) : (
                          <span style={{ color: '#999', fontSize: '0.85em' }}>N/A</span>
                        )}
                      </td>
                      <td><b>₹{grandTotal.toFixed(2)}</b></td>
                      <td>
                        <span
                          style={{
                            padding: '4px 8px',
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
                          }}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td>{booking.instructions || '-'}</td>
                      <td>
                        {booking.createdAt?.toDate
                          ? booking.createdAt.toDate().toLocaleString()
                          : booking.createdAt}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="15" style={{ textAlign: 'center' }}>
                    No bookings found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <style jsx>
          {`
            th, td {
              border: 1px solid gray;
              padding: 8px;
            }
            th {
              background-color: #f2f2f2;
              font-weight: 600;
            }
          `}
        </style>
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
    overflowY: 'auto',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    maxHeight: '90vh',
    width: '90%',
    maxWidth: '1200px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  header: {
    padding: '20px',
    borderBottom: '1px solid #e0e0e0',
    position: 'sticky',
    top: 0,
    backgroundColor: '#fff',
    zIndex: 10,
  },
  buttonGroup: {
    marginTop: '15px',
  },
  button: {
    backgroundColor: '#007bff',
    color: '#fff',
    padding: '8px 14px',
    border: 'none',
    borderRadius: '5px',
    marginRight: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  tableContainer: {
    overflowY: 'auto',
    overflowX: 'auto',
    padding: '20px',
    flex: 1,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    border: '1px solid gray',
  },
};

export default CustomerBookingsModal;