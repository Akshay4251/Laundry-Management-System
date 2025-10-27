import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import CustomerBookingsModal from './CustomerBookingsModal';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    totalOrders: 0,
    lastOrder: new Date().toISOString().split('T')[0]
  });
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editCustomerId, setEditCustomerId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch all customers
      const customerSnapshot = await getDocs(collection(db, 'customers'));
      const customerList = customerSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch all bookings
      const bookingsSnapshot = await getDocs(collection(db, 'Bookings'));
      const bookings = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Map to store booking data by phone
      const bookingStatsByPhone = {};

      bookings.forEach(booking => {
        const phone = booking.phone;
        const createdAt = booking.createdAt?.seconds ? new Date(booking.createdAt.seconds * 1000) : null;

        if (!phone || !createdAt) return;

        if (!bookingStatsByPhone[phone]) {
          bookingStatsByPhone[phone] = {
            totalOrders: 1,
            lastOrder: createdAt
          };
        } else {
          bookingStatsByPhone[phone].totalOrders += 1;

          if (createdAt > bookingStatsByPhone[phone].lastOrder) {
            bookingStatsByPhone[phone].lastOrder = createdAt;
          }
        }
      });

      // Combine booking stats with customers
      const updatedCustomerList = customerList.map(customer => {
        const stats = bookingStatsByPhone[customer.phone];
        return {
          ...customer,
          totalOrders: stats?.totalOrders || 0,
          lastOrder: stats?.lastOrder
            ? stats.lastOrder.toISOString().split('T')[0]
            : '—'
        };
      });

      setCustomers(updatedCustomerList);
    };

    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCustomer(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const saveCustomer = async () => {
    if (isEditMode && newCustomer.phone !== editCustomerId) {
      await deleteDoc(doc(db, 'customers', editCustomerId));
    }

    const customerRef = doc(db, 'customers', newCustomer.phone);
    await setDoc(customerRef, newCustomer);

    setCustomers(prev => {
      const withoutOld = prev.filter(c => c.phone !== editCustomerId);
      return [...withoutOld, { ...newCustomer, id: newCustomer.phone }];
    });

    resetForm();
  };

  const openModal = (phone) => {
    setSelectedPhone(phone);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPhone(null);
  };

  const resetForm = () => {
    setNewCustomer({
      name: '',
      phone: ''
    });
    setShowAddForm(false);
    setIsEditMode(false);
    setEditCustomerId(null);
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        border: '1px solid var(--gray-200)'
      }}>
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--gray-200)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: 'var(--gray-800)'
            }}>Customer Management</h3>
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--primary)',
                color: 'white',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Add Customer
            </button>
          </div>
        </div>
        
        {showAddForm && (
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid var(--gray-200)',
            backgroundColor: 'var(--gray-50)'
          }}>
            <h4 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: 'var(--gray-800)',
              marginBottom: '1rem'
            }}>{isEditMode ? 'Edit Customer' : 'Add New Customer'}</h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.6rem',
              marginBottom: '1rem'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'var(--gray-700)',
                  marginBottom: '0.5rem'
                }}>Name</label>
                <input
                  type="text"
                  name="name"
                  value={newCustomer.name}
                  onChange={handleInputChange}
                  style={{
                    width: '95%',
                    padding: '0.5rem 1rem',
                    border: '1px solid var(--gray-300)',
                    borderRadius: '0.5rem',
                    outline: 'none',
                    fontSize: '0.875rem'
                  }}
                  placeholder="Customer Name"
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'var(--gray-700)',
                  marginBottom: '0.5rem'
                }}>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={newCustomer.phone}
                  onChange={handleInputChange}
                  style={{
                    width: '95%',
                    padding: '0.5rem 1rem',
                    border: '1px solid var(--gray-300)',
                    borderRadius: '0.5rem',
                    outline: 'none',
                    fontSize: '0.875rem'
                  }}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.5rem'
            }}>
              <button
                onClick={() => setShowAddForm(false)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid var(--gray-300)',
                  color: 'var(--gray-700)',
                  borderRadius: '0.5rem',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveCustomer}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {isEditMode ? 'Update Customer' : 'Save Customer'}
              </button>
            </div>
          </div>
        )}
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%' }}>
            <thead style={{ backgroundColor: 'var(--gray-50)' }}>
              <tr>
                <th style={{
                  padding: '0.75rem 1.5rem',
                  textAlign: 'left',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: 'var(--gray-500)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>Name</th>
                <th style={{
                  padding: '0.75rem 1.5rem',
                  textAlign: 'left',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: 'var(--gray-500)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>Phone</th>
                <th style={{
                  padding: '0.75rem 1.5rem',
                  textAlign: 'left',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: 'var(--gray-500)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>Total Orders</th>
                <th style={{
                  padding: '0.75rem 1.5rem',
                  textAlign: 'left',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: 'var(--gray-500)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>Last Order</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} style={{
                  backgroundColor: 'white',
                  borderBottom: '1px solid var(--gray-200)',
                  cursor: 'pointer'
                }} onClick={() => openModal(customer.phone)}>
                  <td style={{
                    padding: '1rem 1.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: 'var(--gray-900)',
                    whiteSpace: 'nowrap'
                  }}>{customer.name}</td>
                  <td style={{
                    padding: '1rem 1.5rem',
                    fontSize: '0.875rem',
                    color: 'var(--gray-900)',
                    whiteSpace: 'nowrap'
                  }}>{customer.phone}</td>
                  <td style={{
                    padding: '1rem 1.5rem',
                    fontSize: '0.875rem',
                    color: 'var(--gray-900)',
                    whiteSpace: 'nowrap'
                  }}>{customer.totalOrders}</td>
                  <td style={{
                    padding: '1rem 1.5rem',
                    fontSize: '0.875rem',
                    color: 'var(--gray-900)',
                    whiteSpace: 'nowrap'
                  }}>{customer.lastOrder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal with transparent background - only modal visible */}
      {showModal && (
        <div 
          onClick={closeModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'transparent',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingTop: '70px',
            paddingBottom: '40px',
            zIndex: 1000,
            overflowY: 'auto',
            pointerEvents: 'auto'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              width: '90%',
              maxWidth: '900px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
              marginBottom: '40px',
              pointerEvents: 'auto'
            }}
          >
            <CustomerBookingsModal phone={selectedPhone} onClose={closeModal} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;