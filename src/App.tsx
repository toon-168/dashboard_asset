
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Monitor, 
  LayoutDashboard, 
  PlusCircle, 
  Menu, 
  X, 
  Database, 
  RefreshCw, 
  Bell 
} from 'lucide-react';
import AssetTable from './components/AssetTable';
import AddAssetModal from './components/AddAssetModal';
import { fetchSheetData, updateAssetOnSheet, deleteAssetOnSheet, addAssetOnSheet, fetchBusAMapping, FETCH_SHEET_NAME, UPDATE_SHEET_NAME } from './services/sheetService';
import Swal from 'sweetalert2';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assets'>('assets');
  const [assets, setAssets] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const rawHeadersRef = useRef<string[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [globalSearch, setGlobalSearch] = useState('');
  const [busAFilter, setBusAFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [busAMapping, setBusAMapping] = useState<Record<string, string>>({});

  // Helper to find header index by name or fallback to index
  const getHeaderName = useCallback((name: string, fallbackIdx: number) => {
    const found = rawHeadersRef.current.find(h => h.toLowerCase() === name.toLowerCase());
    return found || rawHeadersRef.current[fallbackIdx] || '';
  }, []);

  // Helper to get filtered assets excluding specific filters (for dependent dropdowns)
  const getFilteredForOptions = useCallback((excludeKey: 'busA' | 'dept' | 'global' | 'table' | 'none') => {
    let result = assets;

    // 1. BusA Filter
    if (excludeKey !== 'busA' && busAFilter !== '') {
      const busAHeader = getHeaderName('busa', 9);
      if (busAHeader) {
        result = result.filter(asset => {
          const val = String(asset[busAHeader] || '').trim();
          const normalizedVal = val.replace(/\.0$/, '');
          return normalizedVal === busAFilter.trim();
        });
      }
    }

    // 2. Dept Filter
    if (excludeKey !== 'dept' && deptFilter !== '') {
      const deptHeader = getHeaderName('หน่วยงาน', 11);
      if (deptHeader) {
        result = result.filter(asset => String(asset[deptHeader] || '').trim() === deptFilter.trim());
      }
    }

    // 3. Global Quick Search
    if (excludeKey !== 'global' && globalSearch.trim() !== '') {
      const searchStr = globalSearch.toLowerCase();
      const searchHeaders = [
        getHeaderName('สินทรัพย์', 0),
        getHeaderName('คำอธิบายทรัพย์สิน', 2),
        getHeaderName('เลขที่ผลิตภัณฑ์', 3),
        getHeaderName('หน่วยงาน', 11),
        getHeaderName('รหัสพนักงาน', 12),
        getHeaderName('ชื่อนามสกุล', 13),
        getHeaderName('Computername', 14),
        getHeaderName('ประวัติการซ่อม', 15)
      ].filter(h => h !== '');

      result = result.filter(asset => {
        return searchHeaders.some(header => {
          const val = asset[header];
          return val && String(val).toLowerCase().includes(searchStr);
        });
      });
    }

    // 4. Column-specific filters
    if (excludeKey !== 'table') {
      const filterEntries = Object.entries(filters).filter(([_, val]) => val !== '') as [string, string][];
      if (filterEntries.length > 0) {
        result = result.filter(asset => {
          for (let i = 0; i < filterEntries.length; i++) {
            const [key, val] = filterEntries[i];
            const rawValue = asset[key];
            const assetValue = (rawValue !== null && rawValue !== undefined ? String(rawValue) : '').toLowerCase();
            const searchStr = String(val).toLowerCase();
            if (!assetValue.includes(searchStr)) return false;
          }
          return true;
        });
      }
    }

    return result;
  }, [assets, busAFilter, deptFilter, globalSearch, filters]);

  const busAValues = useMemo(() => {
    if (assets.length === 0) return [];
    const busAHeader = getHeaderName('busa', 9);
    if (!busAHeader) return [];
    
    const dataForOptions = getFilteredForOptions('busA');
    const uniqueCodes = Array.from(new Set(dataForOptions.map(a => {
      const val = String(a[busAHeader] || '').trim();
      return val.replace(/\.0$/, ''); // Normalize
    }).filter(v => v !== ''))).sort();
    
    return uniqueCodes.map(code => {
      const description = busAMapping[code];
      return {
        code,
        display: description ? `${code} - ${description}` : code
      };
    });
  }, [assets, getFilteredForOptions, busAMapping, getHeaderName]);

  const deptValues = useMemo(() => {
    if (assets.length === 0) return [];
    const deptHeader = getHeaderName('หน่วยงาน', 11);
    if (!deptHeader) return [];
    
    const dataForOptions = getFilteredForOptions('dept');
    const values = dataForOptions.map(a => String(a[deptHeader] || '').trim()).filter(v => v !== '');
    return Array.from(new Set(values)).sort();
  }, [assets, getFilteredForOptions, getHeaderName]);

  const filteredAssets = useMemo(() => {
    return getFilteredForOptions('none');
  }, [getFilteredForOptions]);

  const computerNameKey = useMemo(() => {
    if (assets.length === 0) return '';
    return Object.keys(assets[0]).find(key => key.toLowerCase().includes('computername')) || '';
  }, [assets]);

  const timestampKey = useMemo(() => {
    if (assets.length === 0) return '';
    return Object.keys(assets[0]).find(key => key.includes('วันเวลา')) || '';
  }, [assets]);

  const repairHistoryKey = useMemo(() => {
    if (assets.length === 0) return '';
    return Object.keys(assets[0]).find(key => key.includes('ประวัติการซ่อม')) || '';
  }, [assets]);

  const parseDate = (dateStr: any) => {
    if (!dateStr) return 0;
    let s = String(dateStr).trim();
    if (!s || s === '-' || s.toLowerCase() === 'null') return 0;
    
    // If there are multiple lines, take the last non-empty line
    if (s.includes('\n')) {
      const lines = s.split('\n').map(l => l.trim()).filter(l => l !== '');
      if (lines.length > 0) {
        s = lines[lines.length - 1];
      }
    }
    
    // Expected format: dd/MM/yyyy HH:mm:ss or similar
    // Split by non-digit characters to get parts
    const parts = s.split(/[^\d]+/);
    if (parts.length < 3) return 0;
    
    const d = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    let y = parseInt(parts[2]);
    
    // Handle Buddhist Era (BE) to Common Era (CE) conversion if needed
    if (y > 2400) y -= 543;
    
    const h = parts[3] ? parseInt(parts[3]) : 0;
    const min = parts[4] ? parseInt(parts[4]) : 0;
    const sec = parts[5] ? parseInt(parts[5]) : 0;
    
    try {
      const date = new Date(y, m - 1, d, h, min, sec);
      return date.getTime();
    } catch (e) {
      return 0;
    }
  };

  const computerNameCount = useMemo(() => {
    if (!computerNameKey) return 0;
    
    return filteredAssets.filter(asset => {
      const val = asset[computerNameKey];
      return val && String(val).trim() !== '' && String(val).trim() !== '-' && String(val).trim().toLowerCase() !== 'null';
    }).length;
  }, [filteredAssets, computerNameKey]);

  const handleUpdateAsset = async (asset: any, updates: Record<string, any>): Promise<boolean> => {
    // พิกัดคอลัมน์อ้างอิงที่ใช้ส่งไป Apps Script
    const h1Index = 0; // Column A (สินทรัพย์)
    const h4Index = 1; // Column B (รหัสย่อย)
    
    const h1 = rawHeadersRef.current[h1Index];
    const h4 = rawHeadersRef.current[h4Index];

    const key1Value = String(asset[h1]).trim();
    const key2Value = String(asset[h4]).trim();

    console.log("🔍 Debug Update Keys:", {
      key1_AssetID: key1Value,
      key2_SubID: key2Value,
      updates: updates
    });

    if (!key1Value || !key2Value) {
      Swal.fire('Error', 'ไม่พบข้อมูลอ้างอิง (สินทรัพย์ หรือ รหัสย่อย)', 'error');
      return false;
    }

    const success = await updateAssetOnSheet({
      key1: key1Value,
      key2: key2Value,
      updates: updates
    });

    if (success) {
      setAssets(prev => prev.map(a => 
        (a[h1] === key1Value && a[h4] === key2Value) 
        ? { ...a, ...updates } 
        : a
      ));
      return true;
    } else {
      return false;
    }
  };

  const handleAddAsset = async (newAsset: any) => {
    Swal.fire({
      title: 'กำลังบันทึก...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const success = await addAssetOnSheet(newAsset);
    
    if (success) {
      const assetWithId = { ...newAsset, id: `new-${Date.now()}` };
      setAssets(prev => [assetWithId, ...prev]);
      setShowAddModal(false);
      Swal.fire('สำเร็จ', 'เพิ่มข้อมูลเรียบร้อยแล้ว', 'success');
    } else {
      Swal.fire('ผิดพลาด', 'ไม่สามารถเพิ่มข้อมูลได้', 'error');
    }
  };

  const handleRefresh = useCallback(() => {
    setFilters({});
    setBusAFilter('');
    setDeptFilter('');
    setGlobalSearch('');
    setCurrentPage(1);
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [sheetResult, mappingResult] = await Promise.all([
          fetchSheetData(),
          fetchBusAMapping()
        ]);
        
        const { data, headers: allHeaders, rawHeaders } = sheetResult;
        rawHeadersRef.current = rawHeaders;
        setBusAMapping(mappingResult);
        
        const excludedColumns = ['เลขที่สินค้าคงคลัง', 'ค่าเสื่อมสะสม', 'cap.date', 'มูลค่าการได้มา', 'busa', 'วันเวลาทำรายการ'];
        const filteredHeaders = allHeaders
          .filter((_, index) => index < 17 || index > 25) // ตัดคอลัมน์ R-Z (index 17 ถึง 25)
          .filter(header => 
            !excludedColumns.some(ex => header.toLowerCase() === ex.toLowerCase())
          );
        
        setAssets(data);
        setHeaders(filteredHeaders);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [refreshKey]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <aside className={`${sidebarOpen ? 'w-72' : 'w-20'} transition-all duration-300 bg-[#6C248C] text-white flex flex-col shadow-xl z-20 shrink-0`}>
        <div className="p-6 flex items-center justify-between border-b border-purple-500/30">
          <div className={`flex items-center gap-3 overflow-hidden ${!sidebarOpen && 'hidden'}`}>
            <div className="bg-white p-1.5 rounded-lg"><Database className="text-[#6C248C] w-6 h-6" /></div>
            <span className="font-bold text-lg whitespace-nowrap">PEA Asset</span>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-purple-700 rounded-md">
            {sidebarOpen ? <X size={20} /> : <Menu size={24} className="mx-auto" />}
          </button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <SidebarItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            collapsed={!sidebarOpen} 
            onClick={() => setActiveTab('dashboard')}
          />
          <SidebarItem 
            icon={<Monitor size={20} />} 
            label="ข้อมูลทรัพย์สินคอมพิวเตอร์" 
            active={activeTab === 'assets'} 
            collapsed={!sidebarOpen} 
            onClick={() => setActiveTab('assets')}
          />
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 shadow-sm shrink-0">
          <h1 className="text-xl font-semibold text-gray-800 truncate pr-4">
            {activeTab === 'dashboard' ? 'Dashboard ภาพรวมระบบ' : 'ระบบการจัดการไอที (IT Management System)'}
          </h1>
          <div className="flex items-center gap-4 shrink-0">
            <div className="relative">
              <Bell className="text-gray-500 cursor-pointer" size={20} />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">3</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-[#6C248C] font-bold text-sm cursor-pointer">AD</div>
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
            <StatCard title="จำนวนรายการทั้งหมด" value={filteredAssets.length} color="bg-purple-600" />
            
            {/* Small Pie Chart replacing "Number of Columns" card */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex-1">
                <p className="text-gray-500 text-xs font-medium">สัดส่วนการตั้งชื่อ Computername/IP Printer</p>
                <div className="flex flex-col mt-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-[10px] text-gray-600 font-medium">ตั้งชื่อแล้ว: {computerNameCount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-[10px] text-gray-600 font-medium">ยังไม่ได้ตั้ง: {(filteredAssets.length - computerNameCount).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="w-16 h-16 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Done', value: computerNameCount },
                        { name: 'Pending', value: filteredAssets.length - computerNameCount }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={18}
                      outerRadius={30}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill="#10B981" />
                      <Cell fill="#EF4444" />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ fontSize: '10px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ padding: '0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <StatCard title="ตั้งชื่อ Computername/IP Printer (เครื่อง)" value={computerNameCount} color="bg-green-500" />
          </div>

          {activeTab === 'dashboard' ? (
            <div className="flex-1 overflow-y-auto space-y-6 pb-6">
              <div className="grid grid-cols-1 gap-6">
                {/* Chart 2: Assets by Department */}
                <div className="bg-white p-6 rounded-xl shadow-md border">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">จำนวนทรัพย์สินแยกตามหน่วยงาน (Top 5)</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(() => {
                          const deptHeader = getHeaderName('หน่วยงาน', 11);
                          if (!deptHeader) return [];
                          const counts: Record<string, number> = {};
                          filteredAssets.forEach(a => {
                            const dept = a[deptHeader] || 'ไม่ระบุ';
                            counts[dept] = (counts[dept] || 0) + 1;
                          });
                          return Object.entries(counts)
                            .map(([name, value]) => ({ name, value }))
                            .sort((a, b) => b.value - a.value)
                            .slice(0, 5);
                        })()}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#6C248C" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Recent Activity or Summary Table */}
              <div className="bg-white p-6 rounded-xl shadow-md border">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">รายการล่าสุดที่มีการแก้ไข</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">สินทรัพย์</th>
                        <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Computername</th>
                        <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">หน่วยงาน</th>
                        <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">ประวัติการซ่อม</th>
                        <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">วันเวลาทำรายการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredAssets
                        .filter(a => {
                          // Show items that have a timestamp (recently touched)
                          const hasTS = timestampKey && a[timestampKey] && a[timestampKey] !== '-' && a[timestampKey] !== '';
                          return hasTS;
                        })
                        .sort((a, b) => {
                          const timeA = timestampKey ? parseDate(a[timestampKey]) : 0;
                          const timeB = timestampKey ? parseDate(b[timestampKey]) : 0;
                          // If both have timestamps, sort by them
                          if (timeA !== timeB) return timeB - timeA;
                          return 0;
                        })
                        .slice(0, 5)
                        .map((a, i) => {
                          return (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm">{a[rawHeadersRef.current[0]]}</td>
                              <td className="px-4 py-3 text-sm font-bold text-[#6C248C]">{computerNameKey ? a[computerNameKey] : '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{a[rawHeadersRef.current[11]]}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-[200px]">
                                {repairHistoryKey ? (() => {
                                  const val = String(a[repairHistoryKey] || '-').trim();
                                  if (val.includes('\n')) {
                                    const lines = val.split('\n').map(l => l.trim()).filter(l => l !== '');
                                    return lines.length > 0 ? lines[lines.length - 1] : '-';
                                  }
                                  return val;
                                })() : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500 italic">
                                {timestampKey ? (() => {
                                  const val = String(a[timestampKey] || '-').trim();
                                  if (val.includes('\n')) {
                                    const lines = val.split('\n').map(l => l.trim()).filter(l => l !== '');
                                    return lines.length > 0 ? lines[lines.length - 1] : '-';
                                  }
                                  return val;
                                })() : '-'}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col lg:flex-row justify-between items-center bg-white p-3 rounded-xl shadow-sm border gap-4 shrink-0">
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                  <div className="flex items-center gap-2 min-w-[140px]">
                    <span className="text-xs font-bold text-gray-500 whitespace-nowrap">BusA:</span>
                    <select
                      value={busAFilter}
                      onChange={(e) => {
                        setBusAFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#6C248C] focus:border-[#6C248C]"
                    >
                      <option value="">ทั้งหมด ({busAValues.length})</option>
                      {busAValues.map(val => (
                        <option key={val.code} value={val.code}>{val.display}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 min-w-[180px]">
                    <span className="text-xs font-bold text-gray-500 whitespace-nowrap">หน่วยงาน:</span>
                    <select
                      value={deptFilter}
                      onChange={(e) => {
                        setDeptFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#6C248C] focus:border-[#6C248C]"
                    >
                      <option value="">ทั้งหมด ({deptValues.length})</option>
                      {deptValues.map(val => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                  </div>
                  <div className="relative w-full sm:w-[480px]">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <RefreshCw size={16} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                    </div>
                    <input
                      type="text"
                      placeholder="ค้นหาด่วน (สินทรัพย์, คำอธิบาย, ผลิตภัณฑ์, หน่วยงาน, รหัส/ชื่อพนักงาน, Computername, ประวัติซ่อม)"
                      value={globalSearch}
                      onChange={(e) => {
                        setGlobalSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#6C248C] focus:border-[#6C248C] sm:text-sm transition-all"
                    />
                    {globalSearch && (
                      <button 
                        onClick={() => setGlobalSearch('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                  <button onClick={handleRefresh} className="p-2 text-[#6C248C] hover:bg-purple-50 rounded-lg border border-purple-100 transition-all flex items-center gap-2 group">
                    <RefreshCw size={18} className={`${loading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
                    <span className="text-xs font-medium hidden md:inline">Refresh</span>
                  </button>
                  {/* <button onClick={() => setShowAddModal(true)} className="flex items-center justify-center gap-2 bg-[#6C248C] hover:bg-[#5a1e75] text-white px-5 py-2 rounded-lg text-sm font-medium shadow-md w-full sm:w-auto">
                    <PlusCircle size={18} /><span>เพิ่มข้อมูล</span>
                  </button> */}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-md border overflow-hidden flex flex-col flex-1 min-h-0">
                <AssetTable 
                  assets={filteredAssets} 
                  headers={headers} 
                  filters={filters} 
                  setFilters={setFilters} 
                  currentPage={currentPage} 
                  setCurrentPage={setCurrentPage} 
                  onUpdateAsset={handleUpdateAsset} 
                  loading={loading} 
                />
              </div>
            </>
          )}
        </div>
      </main>

      {showAddModal && <AddAssetModal headers={headers} onClose={() => setShowAddModal(false)} onSubmit={handleAddAsset} />}
    </div>
  );
};

const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, collapsed: boolean, onClick: () => void }> = ({ icon, label, active, collapsed, onClick }) => (
  <div 
    onClick={onClick}
    className={`flex items-center gap-4 px-4 py-3 rounded-lg cursor-pointer transition-all ${active ? 'bg-white/20 text-white font-semibold' : 'text-purple-100 hover:bg-white/10 hover:text-white'}`}
  >
    <div className="min-w-[20px]">{icon}</div>
    {!collapsed && <span className="whitespace-nowrap truncate">{label}</span>}
  </div>
);

const StatCard: React.FC<{ title: string, value: number, color: string }> = ({ title, value, color }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
    <div>
      <p className="text-gray-500 text-xs font-medium">{title}</p>
      <p className="text-2xl font-bold text-gray-800 mt-0.5">{value.toLocaleString()}</p>
    </div>
    <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-white shadow-lg opacity-80`}><Monitor size={20} /></div>
  </div>
);

export default App;
