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
    <div style={styles.overlay}>
      <div style={styles.content}>
        <h3>Bookings for {phone}</h3>
        <div style={{ marginBottom: '1rem' }}>
          <button onClick={onClose} style={styles.button}>Close</button>
          <button
            onClick={handlePrint}
            style={{ ...styles.button, backgroundColor: '#28a745' }}
          >
            Print Report
          </button>
        </div>

        <div id="printable-area">
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
    <th>GST (18%)</th>
    <th>Grand Total</th>
    <th>Status</th>
    <th>Instructions</th>
    <th>Created At</th>
  </tr>
</thead>
<tbody>
  {bookings.length > 0 ? (
    bookings.map(booking => {
      const subtotal = booking.totalCost || 0;
      const gstRate = 0.18;
      const gstAmount = Math.round(subtotal * gstRate);
      const grandTotal = subtotal + gstAmount;

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

          {/* NEW COLUMNS */}
          <td>₹{subtotal}</td>
          <td>₹{gstAmount}</td>
          <td><b>₹{grandTotal}</b></td>

          <td>
            <span
              style={{
                padding: '4px 8px',
                borderRadius: '5px',
                backgroundColor:
                  booking.status === 'Pending'
                    ? '#ffc107'
                    : booking.status === 'in-progress'
                    ? '#17a2b8'
                    : '#28a745',
                color: '#fff',
              }}
            >
              {booking.status}
            </span>
          </td>
          <td>{booking.instructions}</td>
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
      <td colSpan="14" style={{ textAlign: 'center' }}>
        No bookings found
      </td>
    </tr>
  )}
</tbody>

          </table>
        <style jsx>
  {`
    th, td {
      border: 1px solid gray;
    }
    td{
    padding-left: 5px;
    }
  `}
</style>

        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: '10%',
    width: '90%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    backgroundColor: '#fff',
    padding: '10px',
    borderRadius: '10px',
    width: '92%',
    maxWidth: '930px',
    overflow: 'scroll',
    maxHight:'98vh',
    margin:'auto',
    marginLeft:'12.4%'
  },
  button: {
    backgroundColor: '#007bff',
    color: '#fff',
    padding: '8px 14px',
    border: 'none',
    borderRadius: '5px',
    marginRight: '8px',
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
    border:'1px solid gray',
  },
  
};

export default CustomerBookingsModal;
