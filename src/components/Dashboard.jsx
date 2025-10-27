import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import RevenueChart from './RevenueChart';

const Dashboard = ({ setActiveSection, setOrdersFilter }) => {
  const [stats, setStats] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  const endOfYear = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);

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

        const currentMonthRevenue = currentMonthCompletedOrders.reduce((sum, order) => sum + (order.totalCost || 0), 0);
        const lastMonthRevenue = lastMonthCompletedOrders.reduce((sum, order) => sum + (order.totalCost || 0), 0);

        const totalOrders = orders.length;
        
        // ✅ Calculate revenue only from completed orders
        const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.totalCost || 0), 0);

        // ✅ GST calculation on completed orders only
        const gstRate = 0.18;
        const gstAmount = totalRevenue * gstRate;
        const grandTotalRevenue = totalRevenue + gstAmount;

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
          if (setActiveSection) setActiveSection('orders');
        };

        // ✅ Function to navigate to pending orders
        const handlePendingOrdersClick = () => {
          if (setOrdersFilter) setOrdersFilter('pending');
          if (setActiveSection) setActiveSection('orders');
        };

        // ✅ Updated stats with Total Orders clickable
        setStats([
          {
            title: 'Total Orders',
            value: totalOrders.toLocaleString(),
            change: `${calculatePercentageChange(currentMonthOrders.length, lastMonthOrders.length)}% from last month`,
            changeColor: 'var(--green-600)',
            icon: '📦',
            bgColor: 'var(--blue-100)',
            clickable: true,
            onClick: handleTotalOrdersClick
          },
          {
            title: 'Pending Orders',
            value: pendingOrders,
            change: 'Click to view details',
            changeColor: 'var(--red-600)',
            icon: '⏳',
            bgColor: 'var(--red-100)',
            clickable: true,
            onClick: handlePendingOrdersClick
          },
          {
            title: 'Revenue (Completed)',
            value: `₹ ${grandTotalRevenue.toLocaleString()}`,
            change: `${calculatePercentageChange(currentMonthRevenue, lastMonthRevenue)}% from last month`,
            changeColor: 'var(--green-600)',
            icon: '💰',
            bgColor: 'var(--green-100)',
            clickable: false
          }
        ]);

        // ✅ FIXED: Updated sorting to work with new 4-digit ID format
        const recentOrdersData = orders
          .sort((a, b) => parseInt(b.id) - parseInt(a.id))
          .slice(0, 3)
          .map(order => ({
            id: `#${order.id}`,
            customer: `${order.customerName} - ${order.serviceType}`,
            status: order.status || 'Pending',
            statusColor: order.status && order.status.toLowerCase() === 'completed' ? 'var(--green-100)' : 'var(--yellow-100)',
            textColor: order.status && order.status.toLowerCase() === 'completed' ? 'var(--green-600)' : 'var(--yellow-600)'
          }));

        setRecentOrders(recentOrdersData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [setActiveSection, setOrdersFilter]);

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
        Loading dashboard...
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
              transform: stat.clickable ? 'scale(1)' : 'none',
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
              <div>
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
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: 'var(--gray-800)',
            marginBottom: '1rem'
          }}>Recent Orders</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentOrders.length > 0 ? (
              recentOrders.map((order, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  backgroundColor: 'var(--gray-50)',
                  borderRadius: '0.5rem'
                }}>
                  <div>
                    <p style={{
                      fontWeight: '500',
                      color: 'var(--gray-900)'
                    }}>{order.id}</p>
                    <p style={{
                      fontSize: '0.875rem',
                      color: 'var(--gray-600)'
                    }}>{order.customer}</p>
                  </div>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    backgroundColor: order.statusColor,
                    color: order.textColor,
                    fontSize: '0.875rem',
                    borderRadius: '9999px'
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