import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import RevenueChart from './RevenueChart';

const Dashboard = ({ setOrdersFilter, setRevenueFilter }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [revenueData, setRevenueData] = useState({ orders: [], totalRevenue: 0 });
  const [selectedTab, setSelectedTab] = useState('overview');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [revenueStats, setRevenueStats] = useState(null);

  // Icons as SVG components
  const Icons = {
    Download: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
    ),
    TrendingUp: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
        <polyline points="17 6 23 6 23 12"></polyline>
      </svg>
    ),
    Calendar: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
    ),
    FileText: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    ),
    X: () => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    )
  };

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

        // Store revenue data for report generation
        const completedOrders = orders.filter(order => 
          order.status && order.status.toLowerCase() === 'completed'
        );
        
        setRevenueData({ 
          orders: completedOrders,
          totalRevenue: completedOrders.reduce((sum, order) => {
            const total = parseFloat(order.grandTotal) || parseFloat(order.totalCost) || 0;
            return sum + total;
          }, 0)
        });

        // Calculate revenue statistics
        calculateRevenueStats(completedOrders);

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

        // ✅ Function to handle revenue card click
        const handleRevenueClick = () => {
          setShowRevenueModal(true);
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
            clickable: true,
            onClick: handleRevenueClick
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

  const calculateRevenueStats = (orders) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const thisWeekRevenue = orders
      .filter(order => order.createdAt && order.createdAt >= weekStart)
      .reduce((sum, order) => sum + (parseFloat(order.grandTotal) || parseFloat(order.totalCost) || 0), 0);
    
    const thisMonthRevenue = orders
      .filter(order => 
        order.createdAt &&
        order.createdAt.getMonth() === currentMonth &&
        order.createdAt.getFullYear() === currentYear
      )
      .reduce((sum, order) => sum + (parseFloat(order.grandTotal) || parseFloat(order.totalCost) || 0), 0);
    
    const thisYearRevenue = orders
      .filter(order => 
        order.createdAt &&
        order.createdAt.getFullYear() === currentYear
      )
      .reduce((sum, order) => sum + (parseFloat(order.grandTotal) || parseFloat(order.totalCost) || 0), 0);
    
    setRevenueStats({
      thisWeek: thisWeekRevenue,
      thisMonth: thisMonthRevenue,
      thisYear: thisYearRevenue,
      totalOrders: orders.length
    });
  };

  const generateRevenueReport = (filterType) => {
    const today = new Date();
    let filteredOrders = [...revenueData.orders];
    let reportTitle = 'Revenue Report - ';

    if (filterType === 'custom' && dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      
      filteredOrders = filteredOrders.filter(order =>
        order.createdAt &&
        order.createdAt >= startDate &&
        order.createdAt <= endDate
      );
      reportTitle += `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
    } else {
      switch(filterType) {
        case 'today':
          const todayStart = new Date(today);
          todayStart.setHours(0, 0, 0, 0);
          filteredOrders = filteredOrders.filter(order =>
            order.createdAt && order.createdAt >= todayStart
          );
          reportTitle += `Today (${today.toLocaleDateString()})`;
          break;
        case 'thisWeek':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          weekStart.setHours(0, 0, 0, 0);
          filteredOrders = filteredOrders.filter(order =>
            order.createdAt && order.createdAt >= weekStart
          );
          reportTitle += `This Week`;
          break;
        case 'thisMonth':
          filteredOrders = filteredOrders.filter(order =>
            order.createdAt &&
            order.createdAt.getMonth() === today.getMonth() &&
            order.createdAt.getFullYear() === today.getFullYear()
          );
          reportTitle += `${today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
          break;
        case 'lastMonth':
          const lastMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
          const lastMonthYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
          filteredOrders = filteredOrders.filter(order =>
            order.createdAt &&
            order.createdAt.getMonth() === lastMonth &&
            order.createdAt.getFullYear() === lastMonthYear
          );
          const lastMonthDate = new Date(lastMonthYear, lastMonth);
          reportTitle += `${lastMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
          break;
        case 'thisYear':
          filteredOrders = filteredOrders.filter(order =>
            order.createdAt &&
            order.createdAt.getFullYear() === today.getFullYear()
          );
          reportTitle += today.getFullYear();
          break;
        default:
          reportTitle += 'All Time';
      }
    }

    const totalRevenue = filteredOrders.reduce((sum, order) => {
      const total = parseFloat(order.grandTotal) || parseFloat(order.totalCost) || 0;
      return sum + total;
    }, 0);

    const BOM = '\uFEFF';
    let csvContent = BOM;
    csvContent += `${reportTitle}\n`;
    csvContent += `Generated on: ${today.toLocaleDateString()} at ${today.toLocaleTimeString()}\n`;
    csvContent += `\n`;
    csvContent += `SUMMARY\n`;
    csvContent += `Total Revenue: Rs. ${totalRevenue.toLocaleString()}\n`;
    csvContent += `Total Orders: ${filteredOrders.length}\n`;
    csvContent += `Average Order Value: Rs. ${filteredOrders.length > 0 ? (totalRevenue / filteredOrders.length).toFixed(2) : '0'}\n`;
    csvContent += `\n`;
    csvContent += `DETAILED ORDERS\n`;
    csvContent += 'Order ID,Customer Name,Service Type,Amount (Rs.),GST (18%),Total (Rs.),Date,Payment Status\n';

    filteredOrders.forEach(order => {
      const baseAmount = parseFloat(order.totalCost) || 0;
      const gst = baseAmount * 0.18;
      const total = parseFloat(order.grandTotal) || baseAmount + gst;
      const date = order.createdAt ? order.createdAt.toLocaleDateString() : 'N/A';
      const paymentStatus = order.paymentStatus || 'Pending';
      
      csvContent += `#${order.id},"${order.customerName || 'N/A'}","${order.serviceType || 'N/A'}",${baseAmount.toFixed(2)},${gst.toFixed(2)},${total.toFixed(2)},${date},${paymentStatus}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `revenue_report_${filterType}_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert(`Report downloaded successfully!`);
  };

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
      {/* Revenue Modal - Minimalistic Design */}
      {showRevenueModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '1000px',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '24px 32px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  color: '#111827',
                  margin: 0
                }}>Revenue Management</h2>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  marginTop: '4px'
                }}>View analytics and generate reports</p>
              </div>
              <button
                onClick={() => setShowRevenueModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  color: '#6b7280',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#111827'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
              >
                <Icons.X />
              </button>
            </div>

            {/* Tab Navigation */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #e5e7eb',
              padding: '0 32px'
            }}>
              <button
                onClick={() => setSelectedTab('overview')}
                style={{
                  padding: '16px 24px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: selectedTab === 'overview' ? '2px solid #111827' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: selectedTab === 'overview' ? '600' : '400',
                  color: selectedTab === 'overview' ? '#111827' : '#6b7280',
                  marginBottom: '-1px',
                  transition: 'all 0.2s'
                }}
              >
                Overview
              </button>
              <button
                onClick={() => setSelectedTab('reports')}
                style={{
                  padding: '16px 24px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: selectedTab === 'reports' ? '2px solid #111827' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: selectedTab === 'reports' ? '600' : '400',
                  color: selectedTab === 'reports' ? '#111827' : '#6b7280',
                  marginBottom: '-1px',
                  transition: 'all 0.2s'
                }}
              >
                Reports
              </button>
            </div>

            {/* Modal Content */}
            <div style={{
              padding: '32px',
              overflowY: 'auto',
              maxHeight: 'calc(90vh - 200px)'
            }}>
              {selectedTab === 'overview' && revenueStats && (
                <div>
                  {/* Key Metrics */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '24px',
                    marginBottom: '32px'
                  }}>
                    <div style={{
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      padding: '24px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '12px'
                      }}>
                        <Icons.TrendingUp />
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '500',
                          color: '#6b7280',
                          marginLeft: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>This Week</span>
                      </div>
                      <div style={{
                        fontSize: '28px',
                        fontWeight: '600',
                        color: '#111827'
                      }}>₹{revenueStats.thisWeek.toLocaleString()}</div>
                    </div>

                    <div style={{
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      padding: '24px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '12px'
                      }}>
                        <Icons.Calendar />
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '500',
                          color: '#6b7280',
                          marginLeft: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>This Month</span>
                      </div>
                      <div style={{
                        fontSize: '28px',
                        fontWeight: '600',
                        color: '#111827'
                      }}>₹{revenueStats.thisMonth.toLocaleString()}</div>
                    </div>

                    <div style={{
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      padding: '24px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '12px'
                      }}>
                        <Icons.FileText />
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '500',
                          color: '#6b7280',
                          marginLeft: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>This Year</span>
                      </div>
                      <div style={{
                        fontSize: '28px',
                        fontWeight: '600',
                        color: '#111827'
                      }}>₹{revenueStats.thisYear.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Revenue Breakdown */}
                  <div style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    padding: '24px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: '16px'
                    }}>Revenue Details</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '12px 0',
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        <span style={{ color: '#6b7280', fontSize: '14px' }}>Total Completed Orders</span>
                        <span style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>
                          {revenueStats.totalOrders}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '12px 0'
                      }}>
                        <span style={{ color: '#6b7280', fontSize: '14px' }}>All-Time Revenue</span>
                        <span style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>
                          ₹{revenueData.totalRevenue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedTab === 'reports' && (
                <div>
                  {/* Custom Date Range */}
                  <div style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    padding: '24px',
                    marginBottom: '32px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: '16px'
                    }}>Custom Date Range</h3>
                    <div style={{
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'center'
                    }}>
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '4px',
                          fontSize: '14px',
                          flex: 1,
                          backgroundColor: '#ffffff'
                        }}
                      />
                      <span style={{ color: '#6b7280', fontSize: '14px' }}>to</span>
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '4px',
                          fontSize: '14px',
                          flex: 1,
                          backgroundColor: '#ffffff'
                        }}
                      />
                      <button
                        onClick={() => generateRevenueReport('custom')}
                        disabled={!dateRange.start || !dateRange.end}
                        style={{
                          padding: '8px 20px',
                          backgroundColor: dateRange.start && dateRange.end ? '#111827' : '#e5e7eb',
                          color: dateRange.start && dateRange.end ? '#ffffff' : '#9ca3af',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: dateRange.start && dateRange.end ? 'pointer' : 'not-allowed',
                          fontSize: '14px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <Icons.Download /> Generate
                      </button>
                    </div>
                  </div>

                  {/* Quick Reports */}
                  <div>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: '16px'
                    }}>Quick Reports</h3>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                      gap: '16px'
                    }}>
                      {[
                        { id: 'today', label: 'Today' },
                        { id: 'thisWeek', label: 'This Week' },
                        { id: 'thisMonth', label: 'This Month' },
                        { id: 'lastMonth', label: 'Last Month' },
                        { id: 'thisYear', label: 'This Year' },
                        { id: 'all', label: 'All Time' }
                      ].map((report) => (
                        <button
                          key={report.id}
                          onClick={() => generateRevenueReport(report.id)}
                          style={{
                            padding: '16px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#111827';
                            e.currentTarget.style.backgroundColor = '#f9fafb';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#e5e7eb';
                            e.currentTarget.style.backgroundColor = '#ffffff';
                          }}
                        >
                          <span style={{
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#111827'
                          }}>{report.label}</span>
                          <Icons.Download />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Info Note */}
                  <div style={{
                    marginTop: '32px',
                    padding: '16px',
                    backgroundColor: '#fef3c7',
                    borderRadius: '8px',
                    border: '1px solid #fcd34d'
                  }}>
                    <p style={{
                      fontSize: '14px',
                      color: '#92400e',
                      margin: 0,
                      lineHeight: '1.5'
                    }}>
                      <strong>Note:</strong> Reports include completed orders with base amount, GST (18%), and total amount. 
                      CSV files can be opened in Excel or Google Sheets.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards - KEEPING ORIGINAL DESIGN */}
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
                {stat.title === 'Revenue (Completed)' ? 'Click for details' : 'Click to view'}
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

      {/* Charts and Recent Orders - KEEPING ORIGINAL DESIGN */}
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