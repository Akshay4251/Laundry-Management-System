import React, { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

Chart.register(...registerables);

const RevenueChart = () => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [baseRevenueData, setBaseRevenueData] = useState(Array(12).fill(0));
  const [gstRevenueData, setGstRevenueData] = useState(Array(12).fill(0));

  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'Bookings'));
        const currentYear = new Date().getFullYear();

        const monthlyBaseRevenue = Array(12).fill(0);
        const monthlyGSTRevenue = Array(12).fill(0);
        const gstRate = 0.18;

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const timestamp = data.createdAt;

          if (timestamp?.seconds) {
            const orderDate = new Date(timestamp.seconds * 1000);
            const year = orderDate.getFullYear();
            const month = orderDate.getMonth();

            if (year === currentYear) {
              const base = data.totalCost || 0;
              const gst = base * gstRate;
              monthlyBaseRevenue[month] += base;
              monthlyGSTRevenue[month] += base + gst; // ✅ Revenue + GST
            }
          }
        });

        setBaseRevenueData(monthlyBaseRevenue);
        setGstRevenueData(monthlyGSTRevenue);
      } catch (err) {
        console.error('Error fetching revenue data:', err);
      }
    };

    fetchRevenueData();
  }, []);

  useEffect(() => {
    const ctx = chartRef.current.getContext('2d');

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ],
        datasets: [
          {
            label: 'Base Revenue (₹)',
            data: baseRevenueData,
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#3B82F6',
            pointRadius: 4,
          },
          {
            label: 'Revenue + GST (₹)',
            data: gstRevenueData,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#10B981',
            pointRadius: 4,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              color: '#374151',
              font: {
                size: 12
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => `₹ ${value.toLocaleString()}`
            }
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [baseRevenueData, gstRevenueData]);

  return (
    <div style={{ height: '250px' }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

export default RevenueChart;
