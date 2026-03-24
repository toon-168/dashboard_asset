
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Edit2, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Loader2,
  ArrowUpDown,
  ArrowUpAZ,
  ArrowDownAZ
} from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

interface AssetTableProps {
  assets: any[];
  headers: string[];
  filters: Record<string, string>;
  setFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  onUpdateAsset: (asset: any, updates: Record<string, any>) => Promise<boolean>;
  loading: boolean;
}

const ITEMS_PER_PAGE = 50;

const AssetTable: React.FC<AssetTableProps> = ({ 
  assets, 
  headers, 
  filters, 
  setFilters, 
  currentPage, 
  setCurrentPage, 
  onUpdateAsset, 
  loading 
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, setCurrentPage, sortConfig]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedAssets = useMemo(() => {
    let sortableItems = [...assets];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        
        // Try numeric sorting first
        const aNum = parseFloat(String(aValue).replace(/,/g, ''));
        const bNum = parseFloat(String(bValue).replace(/,/g, ''));
        
        if (!isNaN(aNum) && !isNaN(bNum) && String(aValue).match(/^-?\d+(\.\d+)?$/) && String(bValue).match(/^-?\d+(\.\d+)?$/)) {
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }

        // String sorting
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        
        if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [assets, sortConfig]);

  const handleFilterChange = useCallback((header: string, value: string) => {
    setFilters(prev => ({ ...prev, [header]: value }));
  }, [setFilters]);

  const totalItems = assets.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  
  const paginatedAssets = useMemo(() => {
    return sortedAssets.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedAssets, startIndex]);

  const startEdit = (asset: any, field: string) => {
    setEditingId(asset.id);
    setEditingField(field);
    setEditValue(asset[field] || '');
  };

  const cancelEdit = () => {
    if (isSaving) return;
    setEditingId(null);
    setEditingField(null);
    setEditValue('');
  };

  const handleSave = async (asset: any) => {
    if (!editingField) return;
    
    if (editValue.trim() === (asset[editingField] || '')) {
      setEditingId(null);
      setEditingField(null);
      return;
    }

    const result = await MySwal.fire({
      title: 'ยืนยันการบันทึก?',
      html: (
        <div className="text-left space-y-2">
          <p>แก้ไขฟิลด์: <span className="font-bold text-purple-700">{editingField}</span></p>
          <p>เปลี่ยนเป็น: <span className="font-bold text-purple-700">{editValue}</span></p>
          <div className="text-[10px] text-gray-400 bg-gray-50 p-2 rounded">
            <p>สินทรัพย์: {asset[headers.find(h => h.includes('สินทรัพย์')) || headers[0]]}</p>
            <p>รหัสย่อย (B): {asset[headers[1]]}</p>
          </div>
        </div>
      ),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#6C248C',
    });

    if (result.isConfirmed) {
      setIsSaving(true);
      try {
        const updates = { [editingField]: editValue };
        const success = await onUpdateAsset(asset, updates);
        if (success) {
          MySwal.fire('สำเร็จ', 'อัปเดตข้อมูลเรียบร้อยแล้ว', 'success');
          setEditingId(null);
          setEditingField(null);
        } else {
          MySwal.fire('ผิดพลาด', 'ไม่สามารถอัปเดตข้อมูลได้', 'error');
        }
      } catch (error) {
        MySwal.fire('ผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4 flex-1">
        <div className="w-16 h-16 border-4 border-[#6C248C]/20 border-t-[#6C248C] rounded-full animate-spin"></div>
        <div className="text-center">
          <p className="text-[#6C248C] font-bold text-lg">กำลังประมวลผลข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="overflow-auto relative flex-1 scroll-smooth">
        <table className="w-full text-left border-collapse table-auto min-w-full">
          <thead>
            <tr className="bg-gray-100/90 border-b border-gray-200 sticky top-0 z-10 backdrop-blur-md">
              {headers.map((header) => (
                <th 
                  key={header} 
                  className="px-4 py-3 text-[11px] font-bold text-[#6C248C] uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-purple-50 transition-colors"
                  onClick={() => handleSort(header)}
                >
                  <div className="flex flex-col gap-2 min-w-[120px]">
                    <div className="flex items-center justify-between">
                      <span>{header}</span>
                      <div className="ml-2 text-purple-300">
                        {sortConfig?.key === header ? (
                          sortConfig.direction === 'asc' ? <ArrowUpAZ size={14} /> : <ArrowDownAZ size={14} />
                        ) : (
                          <ArrowUpDown size={14} className="opacity-30" />
                        )}
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="text" 
                        list={`list-${header}`}
                        placeholder={`ค้นหา...`}
                        value={filters[header] || ''}
                        onChange={(e) => handleFilterChange(header, e.target.value)}
                        className="w-full px-2 py-1.5 text-[10px] font-normal border border-purple-100 rounded focus:border-purple-500 outline-none bg-white/80 shadow-sm"
                      />
                      <datalist id={`list-${header}`}>
                        {Array.from(new Set(assets.map(a => String(a[header] || '')).filter(v => v.trim() !== ''))).sort().slice(0, 50).map(val => (
                          <option key={val} value={val} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedAssets.map((asset) => (
              <tr key={asset.id} className="hover:bg-purple-50/50 transition-colors duration-75">
                {headers.map((header) => {
                  const isEditable = false;
                  const isNumeric = header.includes('มูลค่าตามบัญชี');
                  return (
                    <td key={`${asset.id}-${header}`} className={`px-4 py-2.5 text-sm text-gray-700 whitespace-nowrap border-r border-gray-50 last:border-0 ${isNumeric ? 'text-right' : 'text-left'}`}>
                      {isEditable && editingId === asset.id && editingField === header ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            value={editValue} 
                            onChange={(e) => setEditValue(e.target.value)}
                            disabled={isSaving}
                            className={`border border-purple-400 rounded px-2 py-1 text-sm focus:outline-none bg-white min-w-[180px] shadow-sm ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSave(asset);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                          />
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => handleSave(asset)} disabled={isSaving} className="text-green-600 hover:bg-green-100 p-1 rounded">
                              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            </button>
                            <button onClick={cancelEdit} disabled={isSaving} className="text-red-500 hover:bg-red-100 p-1 rounded"><X size={16} /></button>
                          </div>
                        </div>
                      ) : (
                          <div className={`flex items-center ${isNumeric ? 'justify-end' : 'justify-start'} group gap-2 min-h-[24px]`}>
                            <span className={isEditable ? 'font-bold text-[#6C248C]' : 'opacity-90'}>{asset[header] || '-'}</span>
                            {isEditable && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => startEdit(asset, header)} className="text-purple-300 hover:text-[#6C248C] p-1 bg-purple-50 rounded" title="แก้ไข"><Edit2 size={13} /></button>
                              </div>
                            )}
                          </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white border-t border-gray-100 px-6 py-3 flex items-center justify-between gap-4 z-20 shadow-sm">
        <div className="text-xs text-gray-400 font-medium whitespace-nowrap">
          พบ {totalItems.toLocaleString()} รายการ
        </div>
        <div className="flex items-center gap-1">
          <PaginationButton onClick={() => setCurrentPage(1)} disabled={currentPage === 1} icon={<ChevronsLeft size={16} />} />
          <PaginationButton onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} icon={<ChevronLeft size={16} />} />
          <div className="flex items-center gap-2 bg-purple-50 px-3 py-1 rounded-full border border-purple-100 mx-2">
            <span className="text-sm font-bold text-[#6C248C]">{currentPage} / {totalPages}</span>
          </div>
          <PaginationButton onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || totalPages === 0} icon={<ChevronRight size={16} />} />
          <PaginationButton onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} icon={<ChevronsRight size={16} />} />
        </div>
      </div>
    </div>
  );
};

const PaginationButton: React.FC<{ onClick: () => void, disabled: boolean, icon: React.ReactNode }> = ({ onClick, disabled, icon }) => (
  <button onClick={onClick} disabled={disabled} className={`p-1.5 rounded-lg border transition-all ${disabled ? 'text-gray-200 border-gray-100 opacity-50' : 'text-[#6C248C] border-purple-100 hover:border-purple-400 hover:bg-white shadow-sm'}`}>{icon}</button>
);

export default AssetTable;
