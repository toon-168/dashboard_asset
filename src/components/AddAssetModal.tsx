
import React, { useState } from 'react';
import { X, Save, AlertCircle, PlusCircle } from 'lucide-react';

interface AddAssetModalProps {
  headers: string[];
  onClose: () => void;
  onSubmit: (asset: any) => void;
}

import Swal from 'sweetalert2';

const AddAssetModal: React.FC<AddAssetModalProps> = ({ headers, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<Record<string, string>>(
    headers.reduce((acc, header) => ({ ...acc, [header]: '' }), {})
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate some field, usually the first one or Computername
    const firstKey = headers[0];
    if (!formData[firstKey]) {
      Swal.fire('แจ้งเตือน', `กรุณากรอกข้อมูลช่อง ${firstKey}`, 'warning');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-[#6C248C] px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2">
            <PlusCircle size={20} />
            <h3 className="text-xl font-bold">เพิ่มรายการใหม่ตามโครงสร้าง Sheet</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-1.5 rounded-full"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-5">
            {headers.map((header) => (
              <div key={header} className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 capitalize">
                  {header} {header.toLowerCase().includes('name') && <span className="text-red-500">*</span>}
                </label>
                <input 
                  name={header}
                  value={formData[header]}
                  onChange={handleChange}
                  placeholder={`ระบุ ${header}...`}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-200 focus:border-[#6C248C] outline-none transition-all"
                />
              </div>
            ))}
          </div>

          <div className="p-6 border-t bg-gray-50 flex items-center justify-between gap-4 shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-blue-600 text-xs font-medium">
              <AlertCircle size={14} />
              <span>หัวข้อเหล่านี้อ้างอิงจากลำดับคอลัมน์ใน Google Sheet โดยตรง</span>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-white font-medium">ยกเลิก</button>
              <button type="submit" className="px-8 py-2 rounded-lg bg-[#6C248C] text-white hover:bg-[#5a1e75] font-bold shadow-lg">บันทึกข้อมูล</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAssetModal;
