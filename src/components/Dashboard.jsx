import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import RevenueChart from './RevenueChart';

const Dashboard = ({ setOrdersFilter }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const bookingSnapshot = await getDocs(collection(db, 'Bookings'));
        const customerSnapshot = await getDocs(collection(db, 'customers'));

        const orders = bookingSnapshot.docs.map(doc => {
          const data = doc.data();
          let createdAt = null;
          if (data.createdAt?.seconds) {
            createdAt = new Date(data.createdAt.seconds * 1000);
          } else if (typeof data.createdAt === 'string') {
            const parsed = new Date(data.createdAt);
            createdAt = isNaN(parsed.getTime()) ? null : parsed;
          }
          return { id: doc.id, ...data, createdAt };
        });

        // 📅 Current vs last month comparison
        const today = new Date();
        const currentMonth = today.getMonth();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const currentYear = today.getFullYear();
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        const currentMonthOrders = orders.filter(order =>
          order.createdAt &&
          order.createdAt.getMonth() === currentMonth &&
          order.createdAt.getFullYear() === currentYear
        );

        const lastMonthOrders = orders.filter(order =>
          order.createdAt &&
          order.createdAt.getMonth() === lastMonth &&
          order.createdAt.getFullYear() === lastMonthYear
        );

        // ✅ Filter only COMPLETED orders for revenue calculation
        const completedOrders = orders.filter(order => 
          order.status && order.status.toLowerCase() === 'completed'
        );

        const currentMonthCompletedOrders = currentMonthOrders.filter(order =>
          order.status && order.status.toLowerCase() === 'completed'
        );

        const lastMonthCompletedOrders = lastMonthOrders.filter(order =>
          order.status && order.status.toLowerCase() === 'completed'
        );

        // ✅ Calculate revenue from completed orders with GST
        const currentMonthRevenue = currentMonthCompletedOrders.reduce((sum, order) => {
          const total = parseFloat(order.grandTotal) || parseFloat(order.totalCost) || 0;
          return sum + total;
        }, 0);

        const lastMonthRevenue = lastMonthCompletedOrders.reduce((sum, order) => {
          const total = parseFloat(order.grandTotal) || parseFloat(order.totalCost) || 0;
          return sum + total;
        }, 0);

        const totalOrders = orders.length;
        
        // ✅ Calculate total revenue from completed orders (with GST)
        const totalRevenue = completedOrders.reduce((sum, order) => {
          const total = parseFloat(order.grandTotal) || parseFloat(order.totalCost) || 0;
          return sum + total;
        }, 0);

        const totalCustomers = customerSnapshot.size;
        
        // ✅ Calculate pending orders
        const pendingOrders = orders.filter(order =>
          !order.status || order.status.toLowerCase() === 'pending'
        ).length;

        const calculatePercentageChange = (current, previous) => {
          if (previous === 0) return current === 0 ? 0 : 100;
          return Math.round(((current - previous) / previous) * 100);
        };

        // ✅ Function to navigate to all orders
        const handleTotalOrdersClick = () => {
          if (setOrdersFilter) setOrdersFilter('all');
          navigate('/orders');
        };

        // ✅ Function to navigate to pending orders
        const handlePendingOrdersClick = () => {
          if (setOrdersFilter) setOrdersFilter('pending');
          navigate('/orders');
        };

        // ✅ Function to navigate to urgent orders
        const handleUrgentOrdersClick = () => {
          if (setOrdersFilter) setOrdersFilter('urgent');
          navigate('/orders');
        };

        // ✅ Calculate urgent orders count
        const urgentOrders = orders.filter(order => 
          order.urgentDelivery === true && 
          (!order.status || order.status.toLowerCase() === 'pending')
        ).length;

        // ✅ Updated stats with clickable cards
        setStats([
          {
            title: 'Total Orders',
            value: totalOrders.toLocaleString(),
            change: `${calculatePercentageChange(currentMonthOrders.length, lastMonthOrders.length)}% from last month`,
            changeColor: calculatePercentageChange(currentMonthOrders.length, lastMonthOrders.length) >= 0 ? 'var(--green-600)' : 'var(--red-600)',
            icon: '📦',
            bgColor: 'var(--blue-100)',
            clickable: true,
            onClick: handleTotalOrdersClick
          },
          {
            title: 'Pending Orders',
            value: pendingOrders,
            change: urgentOrders > 0 ? `${urgentOrders} urgent orders` : 'No urgent orders',
            changeColor: urgentOrders > 0 ? 'var(--red-600)' : 'var(--green-600)',
            icon: '⏳',
            bgColor: 'var(--yellow-100)',
            clickable: true,
            onClick: handlePendingOrdersClick
          },
          {
            title: 'Revenue (Completed)',
            value: `₹ ${totalRevenue.toLocaleString()}`,
            change: `${calculatePercentageChange(currentMonthRevenue, lastMonthRevenue)}% from last month`,
            changeColor: calculatePercentageChange(currentMonthRevenue, lastMonthRevenue) >= 0 ? 'var(--green-600)' : 'var(--red-600)',
            icon: '💰',
            bgColor: 'var(--green-100)',
            clickable: false
          },
          {
            title: 'Total Customers',
            value: totalCustomers.toLocaleString(),
            change: 'All time',
            changeColor: 'var(--gray-600)',
            icon: '👥',
            bgColor: 'var(--purple-100)',
            clickable: false
          }
        ]);

        // ✅ FIXED: Updated sorting to work with new 4-digit ID format
        const recentOrdersData = orders
          .sort((a, b) => parseInt(b.id) - parseInt(a.id))
          .slice(0, 5)
          .map(order => ({
            id: `#${order.id}`,
            customer: order.customerName || 'N/A',
            service: order.serviceType || 'N/A',
            status: order.status || 'Pending',
            urgent: order.urgentDelivery || false,
            statusColor: 
              !order.status || order.status.toLowerCase() === 'pending' 
                ? 'var(--yellow-100)' 
                : order.status.toLowerCase() === 'in-progress'
                ? 'var(--blue-100)'
                : order.status.toLowerCase() === 'ready'
                ? 'var(--green-100)'
                : order.status.toLowerCase() === 'completed'
                ? 'var(--gray-100)'
                : 'var(--red-100)',
            textColor: 
              !order.status || order.status.toLowerCase() === 'pending' 
                ? 'var(--yellow-600)' 
                : order.status.toLowerCase() === 'in-progress'
                ? 'var(--blue-600)'
                : order.status.toLowerCase() === 'ready'
                ? 'var(--green-600)'
                : order.status.toLowerCase() === 'completed'
                ? 'var(--gray-600)'
                : 'var(--red-600)'
          }));

        setRecentOrders(recentOrdersData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, setOrdersFilter]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        fontSize: '1.125rem',
        color: 'var(--gray-600)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Loading dashboard...</p>
        </div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {stats.map((stat, index) => (
          <div 
            key={index} 
            onClick={stat.clickable ? stat.onClick : undefined}
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              padding: '1.5rem',
              border: '1px solid var(--gray-200)',
              cursor: stat.clickable ? 'pointer' : 'default',
              transition: 'all 0.2s',
              transform: 'scale(1)',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              if (stat.clickable) {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (stat.clickable) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
              }
            }}
          >
            {stat.clickable && (
              <div style={{
                position: 'absolute',
                top: '0.5rem',
                right: '0.5rem',
                fontSize: '0.75rem',
                color: 'var(--gray-500)',
                fontStyle: 'italic'
              }}>
                Click to view
              </div>
            )}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'var(--gray-600)',
                  marginBottom: '0.25rem'
                }}>{stat.title}</p>
                <p style={{
                  fontSize: '1.875rem',
                  fontWeight: 'bold',
                  color: 'var(--gray-900)',
                  marginBottom: '0.25rem'
                }}>{stat.value}</p>
                <p style={{
                  fontSize: '0.875rem',
                  color: stat.changeColor
                }}>{stat.change}</p>
              </div>
              <div style={{
                padding: '0.75rem',
                backgroundColor: stat.bgColor,
                borderRadius: '9999px',
                fontSize: '1.5rem'
              }}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts and Recent Orders */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Revenue Chart */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          padding: '1.5rem',
          border: '1px solid var(--gray-200)'
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: 'var(--gray-800)',
            marginBottom: '1rem'
          }}>Revenue Overview (Completed Orders)</h3>
          <RevenueChart />
        </div>
        
        {/* Recent Orders */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          padding: '1.5rem',
          border: '1px solid var(--gray-200)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: 'var(--gray-800)',
              margin: 0
            }}>Recent Orders</h3>
            <button
              onClick={() => navigate('/orders')}
              style={{
                fontSize: '0.875rem',
                color: 'var(--primary)',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500',
                textDecoration: 'underline'
              }}
            >
              View All →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentOrders.length > 0 ? (
              recentOrders.map((order, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  backgroundColor: order.urgent ? '#fff3e0' : 'var(--gray-50)',
                  borderRadius: '0.5rem',
                  borderLeft: order.urgent ? '4px solid #ff6b35' : 'none'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <p style={{
                        fontWeight: '600',
                        color: 'var(--gray-900)',
                        fontSize: '0.9rem',
                        margin: 0
                      }}>{order.id}</p>
                      {order.urgent && (
                        <span style={{
                          fontSize: '0.65rem',
                          backgroundColor: '#ff6b35',
                          color: 'white',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '0.25rem',
                          fontWeight: 'bold'
                        }}>
                          URGENT
                        </span>
                      )}
                    </div>
                    <p style={{
                      fontSize: '0.8rem',
                      color: 'var(--gray-600)',
                      margin: '0.25rem 0 0 0'
                    }}>{order.customer}</p>
                    <p style={{
                      fontSize: '0.75rem',
                      color: 'var(--gray-500)',
                      margin: '0.125rem 0 0 0'
                    }}>{order.service}</p>
                  </div>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    backgroundColor: order.statusColor,
                    color: order.textColor,
                    fontSize: '0.75rem',
                    borderRadius: '9999px',
                    fontWeight: '500',
                    whiteSpace: 'nowrap'
                  }}>{order.status}</span>
                </div>
              ))
            ) : (
              <p style={{
                textAlign: 'center',
                color: 'var(--gray-500)',
                padding: '2rem'
              }}>No recent orders</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;