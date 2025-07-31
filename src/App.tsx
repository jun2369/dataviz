/* eslint-disable */
import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DataVisualizationApp = () => {
  // 登录状态
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // 数据状态
  const [files, setFiles] = useState([]);
  const [receivingData, setReceivingData] = useState([]);
  const [putawayData, setPutawayData] = useState([]);
  const [pickingData, setPickingData] = useState([]);
  const [packingData, setPackingData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('receiving');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [workingHoursInterval, setWorkingHoursInterval] = useState(15); // 新增：工作时长间隔选择
  const fileInputRef = useRef(null);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B', '#4ECDC4', '#45B7D1'];

  // 预定义的文件列表
  const PRELOADED_FILES = [
    'PackageReceiveDetail.xlsx',
    'PutawayDetailFile20250724_01_23_50_802005991.xlsx',
    'PickingTaskDetailFile20250630_01_07_18_876889781.xlsx',
    'CombinePackingRecordsFile20250630_01_08_57_803777091.xlsx'
  ];

  // 处理登录
  const handleLogin = () => {
    if (username === 'AGSSHEIN@2020' && password === '2025001') {
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('用户名或密码错误');
    }
  };

  // 组件加载时自动加载预定义文件
  React.useEffect(() => {
    if (!isLoggedIn || dataLoaded) return;
    
    const loadPreloadedFiles = async () => {
      setIsLoading(true);
      
      for (const fileName of PRELOADED_FILES) {
        try {
          const fileData = await window.fs.readFile(fileName);
          const workbook = XLSX.read(fileData, { type: 'array', cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            raw: false,
            dateNF: 'yyyy-mm-dd'
          });
          
          const lowerFileName = fileName.toLowerCase();
          if (lowerFileName.includes('packagereceive') || lowerFileName.includes('receiving')) {
            setReceivingData(prev => [...jsonData]);
          } else if (lowerFileName.includes('putaway')) {
            setPutawayData(prev => [...jsonData]);
          } else if (lowerFileName.includes('picking')) {
            setPickingData(prev => [...jsonData]);
          } else if (lowerFileName.includes('packing') || lowerFileName.includes('combinepack')) {
            setPackingData(prev => [...jsonData]);
          }
          
          setFiles(prev => [...prev, { name: fileName, data: jsonData, preloaded: true }]);
        } catch (error) {
          console.log(`预加载文件 ${fileName} 失败:`, error);
        }
      }
      
      setDataLoaded(true);
      setIsLoading(false);
      
      // 设置默认激活的标签
      setActiveTab('receiving');
    };
    
    loadPreloadedFiles();
  }, [isLoggedIn, dataLoaded]);

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (event) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;
    
    setIsLoading(true);
    
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            raw: false,
            dateNF: 'yyyy-mm-dd'
          });
          
          const fileName = file.name.toLowerCase();
          if (fileName.includes('packagereceive') || fileName.includes('receiving')) {
            setReceivingData(prev => [...prev, ...jsonData]);
            setActiveTab('receiving');
          } else if (fileName.includes('putaway')) {
            setPutawayData(prev => [...prev, ...jsonData]);
            setActiveTab('putaway');
          } else if (fileName.includes('picking')) {
            setPickingData(prev => [...prev, ...jsonData]);
            setActiveTab('picking');
          } else if (fileName.includes('packing')) {
            setPackingData(prev => [...prev, ...jsonData]);
            setActiveTab('packing');
          } else {
            if (jsonData[0] && (jsonData[0]['RECEIVEQUANTITY'] || jsonData[0]['Receive Quantity'])) {
              setReceivingData(prev => [...prev, ...jsonData]);
              setActiveTab('receiving');
            } else {
              setPutawayData(prev => [...prev, ...jsonData]);
              setActiveTab('putaway');
            }
          }
          
          setFiles(prev => [...prev, { name: file.name, data: jsonData }]);
          setIsLoading(false);
        } catch (error) {
          console.error('文件处理错误:', error);
          alert(`文件 ${file.name} 处理失败: ${error.message}`);
          setIsLoading(false);
        }
      };
      
      reader.readAsArrayBuffer(file);
    }
  };

  const getDateOptions = (data, dataType) => {
    const years = new Set();
    const months = new Set();
    const days = new Set();
    
    data.forEach(row => {
      let dateStr;
      
      if (dataType === 'picking') {
        dateStr = row['拣货时间'];
        if (!dateStr) return;
      } else if (dataType === 'packing') {
        dateStr = row['操作时间'];
      } else {
        dateStr = row['TRANSACTIONDATE'] || row['Transaction Date'] || row['TransactionDate'] || 
                 row['操作时间'] || row['日期'] || row['时间'];
      }
      
      if (!dateStr) return;
      
      let dateValue;
      if (typeof dateStr === 'string') {
        dateValue = new Date(dateStr);
        if (isNaN(dateValue.getTime())) {
          const parts = dateStr.split(/[-/]/);
          if (parts.length === 3) {
            dateValue = new Date(parts[0], parts[1] - 1, parts[2]);
          }
        }
      } else if (dateStr instanceof Date) {
        dateValue = dateStr;
      }
      
      if (dateValue && !isNaN(dateValue.getTime())) {
        const year = dateValue.getFullYear();
        if (year > 2000 && year < 2100) {
          years.add(year);
          if (!selectedYear || selectedYear === year) {
            months.add(dateValue.getMonth() + 1);
            if (!selectedMonth || selectedMonth === dateValue.getMonth() + 1) {
              days.add(dateValue.getDate());
            }
          }
        }
      }
    });
    
    return {
      years: Array.from(years).sort(),
      months: Array.from(months).sort(),
      days: Array.from(days).sort()
    };
  };

  const filterDataByDate = (data, dataType) => {
    return data.filter(row => {
      let dateStr;
      
      if (dataType === 'picking') {
        dateStr = row['拣货时间'];
        if (!dateStr) return false;
      } else if (dataType === 'packing') {
        dateStr = row['操作时间'];
      } else {
        dateStr = row['TRANSACTIONDATE'] || row['Transaction Date'] || row['TransactionDate'] || 
                 row['操作时间'] || row['日期'] || row['时间'];
      }
      
      if (!dateStr) return false;
      
      let dateValue;
      if (typeof dateStr === 'string') {
        dateValue = new Date(dateStr);
        if (isNaN(dateValue.getTime())) {
          const parts = dateStr.split(/[-/]/);
          if (parts.length === 3) {
            dateValue = new Date(parts[0], parts[1] - 1, parts[2]);
          }
        }
      } else if (dateStr instanceof Date) {
        dateValue = dateStr;
      }
      
      if (!dateValue || isNaN(dateValue.getTime())) return false;
      
      if (selectedYear && dateValue.getFullYear() !== selectedYear) return false;
      if (selectedMonth && dateValue.getMonth() + 1 !== selectedMonth) return false;
      if (selectedDay && dateValue.getDate() !== selectedDay) return false;
      
      return true;
    });
  };

  // 计算汇总数据
  const calculateSummaryData = () => {
    const summaryByMonth = {};
    
    // 处理 Receiving 数据
    receivingData.forEach(row => {
      const dateStr = row['操作时间'];
      if (!dateStr) return;
      
      const dateValue = new Date(dateStr);
      if (!isNaN(dateValue.getTime())) {
        const monthKey = `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}`;
        if (!summaryByMonth[monthKey]) {
          summaryByMonth[monthKey] = {
            receiving: new Set(),
            putaway: new Set(),
            picking: new Set(),
            packing: new Set()
          };
        }
        const packageId = row['包裹号'];
        if (packageId) {
          summaryByMonth[monthKey].receiving.add(packageId);
        }
      }
    });
    
    // 处理 Putaway 数据
    putawayData.forEach(row => {
      const dateStr = row['操作时间'];
      if (!dateStr) return;
      
      const dateValue = new Date(dateStr);
      if (!isNaN(dateValue.getTime())) {
        const monthKey = `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}`;
        if (!summaryByMonth[monthKey]) {
          summaryByMonth[monthKey] = {
            receiving: new Set(),
            putaway: new Set(),
            picking: new Set(),
            packing: new Set()
          };
        }
        const packageId = row['子包裹号'];
        if (packageId) {
          summaryByMonth[monthKey].putaway.add(packageId);
        }
      }
    });
    
    // 处理 Picking 数据 - 只统计有拣货时间的
    pickingData.forEach(row => {
      const dateStr = row['拣货时间'];
      if (!dateStr) return; // 跳过没有拣货时间的记录
      
      const dateValue = new Date(dateStr);
      if (!isNaN(dateValue.getTime())) {
        const monthKey = `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}`;
        if (!summaryByMonth[monthKey]) {
          summaryByMonth[monthKey] = {
            receiving: new Set(),
            putaway: new Set(),
            picking: new Set(),
            packing: new Set()
          };
        }
        const packageId = row['子包裹号'];
        if (packageId) {
          summaryByMonth[monthKey].picking.add(packageId);
        }
      }
    });
    
    // 处理 Packing 数据
    packingData.forEach(row => {
      const dateStr = row['操作时间'];
      if (!dateStr) return;
      
      const dateValue = new Date(dateStr);
      if (!isNaN(dateValue.getTime())) {
        const monthKey = `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}`;
        if (!summaryByMonth[monthKey]) {
          summaryByMonth[monthKey] = {
            receiving: new Set(),
            putaway: new Set(),
            picking: new Set(),
            packing: new Set()
          };
        }
        const packageId = row['子包裹号'];
        if (packageId) {
          summaryByMonth[monthKey].packing.add(packageId);
        }
      }
    });
    
    // 转换为表格数据
    const tableData = Object.entries(summaryByMonth)
      .map(([month, data]) => ({
        month,
        receiving: data.receiving.size,
        putaway: data.putaway.size,
        picking: data.picking.size,
        packing: data.packing.size,
        total: data.receiving.size + data.putaway.size + data.picking.size + data.packing.size
      }))
      .sort((a, b) => b.month.localeCompare(a.month)); // 按月份倒序排序
    
    return tableData;
  };

  // 过滤汇总数据
  const filterSummaryData = () => {
    const allData = calculateSummaryData();
    
    // 汇总数据表格始终显示所有数据，不受时间筛选器影响
    return allData;
  };

  const summaryData = useMemo(() => {
    return filterSummaryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receivingData, putawayData, pickingData, packingData]);

  // 计算工作时长
  const calculateWorkingHours = (data, dataType) => {
    const filtered = filterDataByDate(data, dataType);
    const operatorHours = {};
    
    // 按操作员分组
    const groupedByOperator = {};
    filtered.forEach(row => {
      let operator;
      let timeStr;
      
      if (dataType === 'picking') {
        operator = row['拣货人'] || 'Unknown';
        timeStr = row['拣货时间'];
        if (!timeStr) return;
      } else if (dataType === 'packing') {
        operator = row['操作人'] || 'Unknown';
        timeStr = row['操作时间'];
      } else {
        operator = row['OPERATORID'] || row['Operator ID'] || row['操作员'] || row['操作人'] || 'Unknown';
        timeStr = row['TRANSACTIONDATE'] || row['Transaction Date'] || row['TransactionDate'] || 
                  row['操作时间'] || row['日期'] || row['时间'];
      }
      
      if (!groupedByOperator[operator]) {
        groupedByOperator[operator] = [];
      }
      
      let dateValue;
      if (typeof timeStr === 'string') {
        dateValue = new Date(timeStr);
      } else if (timeStr instanceof Date) {
        dateValue = timeStr;
      }
      
      if (dateValue && !isNaN(dateValue.getTime())) {
        groupedByOperator[operator].push(dateValue);
      }
    });
    
    // 计算每个操作员的有效工作时长
    Object.entries(groupedByOperator).forEach(([operator, times]) => {
      // 按时间排序
      times.sort((a, b) => a - b);
      
      let totalMinutes = 0;
      for (let i = 1; i < times.length; i++) {
        const timeDiff = (times[i] - times[i-1]) / 1000 / 60; // 转换为分钟
        
        // 根据选择的时间间隔计算有效工作时长
        if (timeDiff <= workingHoursInterval) {
          totalMinutes += timeDiff;
        }
      }
      
      // 转换为小时
      operatorHours[operator] = totalMinutes / 60;
    });
    
    // 生成柱状图数据
    const hourData = Object.entries(operatorHours)
      .map(([operator, hours]) => ({ 
        operator, 
        hours: parseFloat(hours.toFixed(2))
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);
    
    return hourData;
  };

  const processData = (data, quantityField = null, dataType = 'default') => {
    const filtered = filterDataByDate(data, dataType);
    const operatorMonthlyStats = {};
    const monthlyTotalStats = {};
    
    filtered.forEach(row => {
      let operator;
      let dateStr;
      
      if (dataType === 'picking') {
        operator = row['拣货人'] || 'Unknown';
        dateStr = row['拣货时间'];
        if (!dateStr) return;
      } else if (dataType === 'packing') {
        operator = row['操作人'] || 'Unknown';
        dateStr = row['操作时间'];
      } else {
        operator = row['OPERATORID'] || row['Operator ID'] || row['操作员'] || row['操作人'] || 'Unknown';
        dateStr = row['TRANSACTIONDATE'] || row['Transaction Date'] || row['TransactionDate'] || 
                 row['操作时间'] || row['日期'] || row['时间'];
      }
      
      const quantity = quantityField ? 
        parseInt(row[quantityField] || row['Receive Quantity'] || row['接收数量'] || row['数量'] || 1) : 1;
      
      if (dateStr) {
        let dateValue;
        if (typeof dateStr === 'string') {
          dateValue = new Date(dateStr);
        } else if (dateStr instanceof Date) {
          dateValue = dateStr;
        }
        
        if (dateValue && !isNaN(dateValue.getTime())) {
          const monthKey = `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}`;
          
          if (!operatorMonthlyStats[operator]) {
            operatorMonthlyStats[operator] = {};
          }
          if (!operatorMonthlyStats[operator][monthKey]) {
            operatorMonthlyStats[operator][monthKey] = 0;
          }
          operatorMonthlyStats[operator][monthKey] += quantity;
          
          if (!monthlyTotalStats[monthKey]) {
            monthlyTotalStats[monthKey] = 0;
          }
          monthlyTotalStats[monthKey] += quantity;
        }
      }
    });
    
    const operatorTotals = {};
    Object.entries(operatorMonthlyStats).forEach(([operator, months]) => {
      operatorTotals[operator] = Object.values(months).reduce((sum, val) => sum + val, 0);
    });
    
    const barData = Object.entries(operatorTotals)
      .map(([operator, total]) => ({ operator, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
    
    const pieData = [];
    if (selectedMonth) {
      const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      Object.entries(operatorMonthlyStats).forEach(([operator, months]) => {
        if (months[monthKey]) {
          pieData.push({
            name: operator,
            value: months[monthKey]
          });
        }
      });
    } else {
      Object.entries(monthlyTotalStats).forEach(([month, total]) => {
        pieData.push({
          name: month,
          value: total
        });
      });
    }
    
    const total = Object.values(monthlyTotalStats).reduce((sum, val) => sum + val, 0);
    const workingHoursData = calculateWorkingHours(data, dataType);
    
    return { barData, pieData, total, workingHoursData };
  };

  const processReceivingData = useMemo(() => {
    return processData(receivingData, 'RECEIVEQUANTITY', 'receiving');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receivingData, selectedYear, selectedMonth, selectedDay, workingHoursInterval]);

  const processPutawayData = useMemo(() => {
    return processData(putawayData, null, 'putaway');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [putawayData, selectedYear, selectedMonth, selectedDay, workingHoursInterval]);

  const processPickingData = useMemo(() => {
    return processData(pickingData, null, 'picking');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickingData, selectedYear, selectedMonth, selectedDay, workingHoursInterval]);

  const processPackingData = useMemo(() => {
    return processData(packingData, null, 'packing');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packingData, selectedYear, selectedMonth, selectedDay, workingHoursInterval]);

  const getCurrentData = () => {
    switch (activeTab) {
      case 'receiving': return receivingData;
      case 'putaway': return putawayData;
      case 'picking': return pickingData;
      case 'packing': return packingData;
      default: return [];
    }
  };

  const getCurrentProcessedData = () => {
    switch (activeTab) {
      case 'receiving': return processReceivingData;
      case 'putaway': return processPutawayData;
      case 'picking': return processPickingData;
      case 'packing': return processPackingData;
      default: return { barData: [], pieData: [], total: 0, workingHoursData: [] };
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'receiving': return 'Package Receiving Analysis';
      case 'putaway': return 'Putaway Scan Analysis';
      case 'picking': return 'Picking Analysis';
      case 'packing': return 'Packing Analysis';
      default: return '数据分析';
    }
  };

  const dateOptions = useMemo(() => {
    return getDateOptions(getCurrentData(), activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receivingData, putawayData, pickingData, packingData, selectedYear, selectedMonth, activeTab]);

  const sidebarStyle = {
    width: '280px',
    backgroundColor: '#f3f4f6',
    padding: '20px',
    height: '100vh',
    overflowY: 'auto',
    flexShrink: 0
  };

  const mainContentStyle = {
    flex: 1,
    background: 'linear-gradient(135deg, #ffffff 0%, #e0f2fe 50%, #f3f4f6 100%)',
    padding: '30px',
    height: '100vh',
    overflowY: 'auto'
  };

  const tabStyle = (isActive) => ({
    padding: '12px 20px',
    marginBottom: '8px',
    backgroundColor: isActive ? '#3b82f6' : '#ffffff',
    color: isActive ? '#ffffff' : '#374151',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  });

  const hasData = (type) => {
    switch (type) {
      case 'receiving': return receivingData.length > 0;
      case 'putaway': return putawayData.length > 0;
      case 'picking': return pickingData.length > 0;
      case 'packing': return packingData.length > 0;
      default: return false;
    }
  };

  // 登录页面
  if (!isLoggedIn) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100vh',
        background: 'linear-gradient(135deg, #dc2626 0%, #1e40af 50%, #ffffff 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
        padding: 0,
        overflow: 'hidden'
      }}>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '40px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          width: '400px',
          maxWidth: '90%'
        }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '30px',
            color: '#1f2937'
          }}>
            AGS - SHEIN CONSOLIDATION 2.0<br />DATA ANALYSIS
          </h1>
          
          <div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                marginBottom: '8px',
                color: '#374151'
              }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleLogin();
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                placeholder="Please enter Username"
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                marginBottom: '8px',
                color: '#374151'
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleLogin(e);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                placeholder="Please enter Password"
              />
            </div>
            
            {loginError && (
              <div style={{
                color: '#dc2626',
                fontSize: '14px',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                {loginError}
              </div>
            )}
            
            <button
              onClick={handleLogin}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
            >
              Log in
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 主应用界面
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={sidebarStyle}>
        <h1 style={{ fontSize: '25px', fontWeight: 'bold', marginBottom: '20px' }}>
          DATA ANALYSIS
        </h1>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            📁 Upload File
          </h3>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <button
            onClick={handleUploadClick}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Upload File
          </button>
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
            .xlsx format
          </p>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            📊 Scan Flow
          </h3>
          <div>
            <div 
              style={tabStyle(activeTab === 'receiving')}
              onClick={() => hasData('receiving') && setActiveTab('receiving')}
            >
              <span>Receiving Scan</span>
              {hasData('receiving') && <span style={{ fontSize: '12px' }}>✓</span>}
            </div>
            <div 
              style={tabStyle(activeTab === 'putaway')}
              onClick={() => hasData('putaway') && setActiveTab('putaway')}
            >
              <span>Put Away</span>
              {hasData('putaway') && <span style={{ fontSize: '12px' }}>✓</span>}
            </div>
            <div 
              style={tabStyle(activeTab === 'picking')}
              onClick={() => hasData('picking') && setActiveTab('picking')}
            >
              <span>Picking</span>
              {hasData('picking') && <span style={{ fontSize: '12px' }}>✓</span>}
            </div>
            <div 
              style={tabStyle(activeTab === 'packing')}
              onClick={() => hasData('packing') && setActiveTab('packing')}
            >
              <span>Packing</span>
              {hasData('packing') && <span style={{ fontSize: '12px' }}>✓</span>}
            </div>
          </div>
        </div>

        {files.length > 0 && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              📄 Files uploaded
            </h3>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {files.map((file, index) => (
                <div key={`file-${index}`} style={{ marginBottom: '4px' }}>
                  • {file.name} {file.preloaded && <span style={{ fontSize: '12px', color: '#10b981' }}>(预加载)</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={mainContentStyle}>
        {isLoading && !dataLoaded ? (
          <div style={{ textAlign: 'center', paddingTop: '100px' }}>
            <div style={{ fontSize: '24px', color: '#3b82f6', marginBottom: '20px' }}>
              正在加载数据...
            </div>
            <p style={{ color: '#6b7280' }}>
              请稍候，正在加载预设数据文件
            </p>
          </div>
        ) : getCurrentData().length > 0 ? (
          <div style={{ display: 'flex', gap: '20px' }}>
            {/* 左侧主要内容区域 - 加宽 */}
            <div style={{ flex: '1 1 70%', minWidth: 0 }}>
              <div style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px' }}>
                  {getTabTitle()}
                </h2>
                
                <div style={{ backgroundColor: '#f9fafb', padding: '10px', borderRadius: '8px' }}>
                  <h3 style={{ fontSize: '23px', fontWeight: '500', marginBottom: '16px' }}>
                    📅 Time Filter
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', maxWidth: '600px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>
                        Year
                      </label>
                      <select
                        value={selectedYear || ''}
                        onChange={(e) => {
                          const value = e.target.value ? parseInt(e.target.value) : null;
                          setSelectedYear(value);
                          setSelectedMonth(null);
                          setSelectedDay(null);
                        }}
                        style={{ 
                          width: '100%', 
                          padding: '8px', 
                          border: '1px solid #d1d5db', 
                          borderRadius: '6px'
                        }}
                      >
                        <option value="">All</option>
                        {dateOptions.years.map(year => (
                          <option key={year} value={year}>{year}年</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>
                        Month
                      </label>
                      <select
                        value={selectedMonth || ''}
                        onChange={(e) => {
                          const value = e.target.value ? parseInt(e.target.value) : null;
                          setSelectedMonth(value);
                          setSelectedDay(null);
                        }}
                        style={{ 
                          width: '100%', 
                          padding: '8px', 
                          border: '1px solid #d1d5db', 
                          borderRadius: '6px',
                          opacity: selectedYear ? 1 : 0.5
                        }}
                        disabled={!selectedYear}
                      >
                        <option value="">All</option>
                        {dateOptions.months.map(month => (
                          <option key={month} value={month}>{month}月</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px' }}>
                        Date
                      </label>
                      <select
                        value={selectedDay || ''}
                        onChange={(e) => {
                          const value = e.target.value ? parseInt(e.target.value) : null;
                          setSelectedDay(value);
                        }}
                        style={{ 
                          width: '100%', 
                          padding: '8px', 
                          border: '1px solid #d1d5db', 
                          borderRadius: '6px',
                          opacity: selectedMonth ? 1 : 0.5
                        }}
                        disabled={!selectedMonth}
                      >
                        <option value="">All</option>
                        {dateOptions.days.map(day => (
                          <option key={day} value={day}>{day}日</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <div style={{ backgroundColor: '#f0f9ff', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
                  <h3 style={{ fontSize: '23px', fontWeight: '500', marginBottom: '8px' }}>
                    📊 Data Overview
                  </h3>
                  <p style={{ fontSize: '25px', fontWeight: 'bold', color: '#3b82f6' }}>
                    Total：{getCurrentProcessedData().total.toLocaleString()}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(670px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div style={{ backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px' }}>
                  <h3 style={{ fontSize: '23px', fontWeight: '500', marginBottom: '20px' }}>
                    Operator Processing Volume (Top10)
                  </h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={getCurrentProcessedData().barData} margin={{ top: 10, right: 10, left: 10, bottom: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="operator" angle={-45} textAnchor="end" height={25} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="total" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '20px' }}>
                    {selectedMonth ? `${selectedYear}年${selectedMonth}月各操作员占比` : '月度处理量分布'}
                  </h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={getCurrentProcessedData().pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getCurrentProcessedData().pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <div style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '20px' }}>
                    ⏱️ 操作员有效工作时长（Top 10, Hours）
                  </h3>
                  <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                    * 仅统计连续操作时间间隔在{workingHoursInterval}分钟以内的有效工作时长
                  </p>
                  
                  {/* 时间间隔选择器 */}
                  <div style={{ 
                    marginBottom: '20px', 
                    display: 'flex', 
                    gap: '10px',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '14px', fontWeight: '500', marginRight: '10px' }}>
                      时间间隔：
                    </span>
                    {[5, 10, 15].map(interval => (
                      <button
                        key={interval}
                        onClick={() => setWorkingHoursInterval(interval)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: workingHoursInterval === interval ? '#3b82f6' : '#ffffff',
                          color: workingHoursInterval === interval ? '#ffffff' : '#374151',
                          border: `1px solid ${workingHoursInterval === interval ? '#3b82f6' : '#d1d5db'}`,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: workingHoursInterval === interval ? '600' : '400',
                          transition: 'all 0.2s'
                        }}
                      >
                        {interval}分钟
                      </button>
                    ))}
                  </div>
                  
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={getCurrentProcessedData().workingHoursData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="operator" angle={-45} textAnchor="end" height={30} />
                      <YAxis />
                      <Tooltip formatter={(value) => `${value} 小时`} />
                      <Bar dataKey="hours" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 右侧汇总表格 - 加宽 */}
            <div style={{ 
              flex: '0 0 30%', 
              minWidth: '620px'
            }}>
              <div style={{ backgroundColor: '#f9fafb', padding: '8px', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '23px', fontWeight: '500', marginBottom: '20px' }}>
                  📊 Summary Data Statistics
                </h3>
                <div>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: '14px'
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: '#e5e7eb' }}>
                        <th style={{ 
                          padding: '10px', 
                          textAlign: 'left', 
                          borderBottom: '2px solid #d1d5db',
                          fontWeight: '600',
                          fontSize: '14px'
                        }}>
                          Month
                        </th>
                        <th style={{ 
                          padding: '10px', 
                          textAlign: 'center', 
                          borderBottom: '2px solid #d1d5db',
                          fontWeight: '600',
                          fontSize: '14px'
                        }}>
                          Receiving
                        </th>
                        <th style={{ 
                          padding: '10px', 
                          textAlign: 'center', 
                          borderBottom: '2px solid #d1d5db',
                          fontWeight: '600',
                          fontSize: '14px'
                        }}>
                          Put Away
                        </th>
                        <th style={{ 
                          padding: '10px', 
                          textAlign: 'center', 
                          borderBottom: '2px solid #d1d5db',
                          fontWeight: '600',
                          fontSize: '14px'
                        }}>
                          Picking
                        </th>
                        <th style={{ 
                          padding: '10px', 
                          textAlign: 'center', 
                          borderBottom: '2px solid #d1d5db',
                          fontWeight: '600',
                          fontSize: '14px'
                        }}>
                          Packing
                        </th>
                        <th style={{ 
                          padding: '10px', 
                          textAlign: 'center', 
                          borderBottom: '2px solid #d1d5db',
                          fontWeight: '600',
                          backgroundColor: '#dbeafe',
                          fontSize: '14px'
                        }}>
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.length > 0 ? (
                        summaryData.map((row, index) => (
                          <tr key={`${row.month}-${index}`} style={{ 
                            backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' 
                          }}>
                            <td style={{ 
                              padding: '8px 10px', 
                              borderBottom: '2px solid #e5e7eb',
                              fontWeight: '500'
                            }}>
                              {row.month}
                            </td>
                            <td style={{ 
                              padding: '8px 10px', 
                              textAlign: 'center', 
                              borderBottom: '1px solid #e5e7eb'
                            }}>
                              {row.receiving.toLocaleString()}
                            </td>
                            <td style={{ 
                              padding: '8px 10px', 
                              textAlign: 'center', 
                              borderBottom: '1px solid #e5e7eb'
                            }}>
                              {row.putaway.toLocaleString()}
                            </td>
                            <td style={{ 
                              padding: '8px 10px', 
                              textAlign: 'center', 
                              borderBottom: '1px solid #e5e7eb'
                            }}>
                              {row.picking.toLocaleString()}
                            </td>
                            <td style={{ 
                              padding: '8px 10px', 
                              textAlign: 'center', 
                              borderBottom: '1px solid #e5e7eb'
                            }}>
                              {row.packing.toLocaleString()}
                            </td>
                            <td style={{ 
                              padding: '8px 10px', 
                              textAlign: 'center', 
                              borderBottom: '1px solid #e5e7eb',
                              fontWeight: '600',
                              backgroundColor: '#dbeafe'
                            }}>
                              {row.total.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} style={{ 
                            padding: '20px', 
                            textAlign: 'center',
                            color: '#6b7280'
                          }}>
                            暂无数据
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {summaryData.length > 0 && (
                      <tfoot>
                        <tr style={{ backgroundColor: '#e5e7eb' }}>
                          <td style={{ 
                            padding: '10px', 
                            fontWeight: 'bold',
                            borderTop: '2px solid #d1d5db'
                          }}>
                            Total
                          </td>
                          <td style={{ 
                            padding: '10px', 
                            textAlign: 'center', 
                            fontWeight: 'bold',
                            borderTop: '2px solid #d1d5db'
                          }}>
                            {summaryData.reduce((sum, row) => sum + row.receiving, 0).toLocaleString()}
                          </td>
                          <td style={{ 
                            padding: '10px', 
                            textAlign: 'center', 
                            fontWeight: 'bold',
                            borderTop: '2px solid #d1d5db'
                          }}>
                            {summaryData.reduce((sum, row) => sum + row.putaway, 0).toLocaleString()}
                          </td>
                          <td style={{ 
                            padding: '10px', 
                            textAlign: 'center', 
                            fontWeight: 'bold',
                            borderTop: '2px solid #d1d5db'
                          }}>
                            {summaryData.reduce((sum, row) => sum + row.picking, 0).toLocaleString()}
                          </td>
                          <td style={{ 
                            padding: '10px', 
                            textAlign: 'center', 
                            fontWeight: 'bold',
                            borderTop: '2px solid #d1d5db'
                          }}>
                            {summaryData.reduce((sum, row) => sum + row.packing, 0).toLocaleString()}
                          </td>
                          <td style={{ 
                            padding: '10px', 
                            textAlign: 'center', 
                            fontWeight: 'bold',
                            borderTop: '2px solid #d1d5db',
                            backgroundColor: '#93c5fd'
                          }}>
                            {summaryData.reduce((sum, row) => sum + row.total, 0).toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', paddingTop: '100px' }}>
            <div style={{ fontSize: '72px', marginBottom: '20px' }}>📊</div>
            <h2 style={{ fontSize: '24px', color: '#6b7280' }}>
              Please upload your Excel for analysis
            </h2>
            <p style={{ color: '#9ca3af', marginTop: '10px' }}>
              *Only original files from SHEIN supported*
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataVisualizationApp;
/* eslint-enable */