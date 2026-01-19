
import React, { useState, useEffect } from 'react';
import type { TrainingUnit } from '../../types';
import { storageService } from '../../services/storageService';

declare const XLSX: any;

interface TrainingUnitManagerProps {
    trainingUnits: TrainingUnit[];
    onUnitsImport: (units: TrainingUnit[]) => void;
}

export const TrainingUnitManager: React.FC<TrainingUnitManagerProps> = ({ trainingUnits, onUnitsImport }) => {
    const [unitUploadError, setUnitUploadError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<TrainingUnit | null>(null);
    const [formData, setFormData] = useState({ code: '', name: '' });

    useEffect(() => {
        const loadUnits = async () => {
            try {
                const units = await storageService.getAllTrainingUnits();
                onUnitsImport(units);
            } catch (error) {
                console.error("Failed to load units on mount", error);
            }
        };
        loadUnits();
    }, []);

    const handleUnitFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setUnitUploadError(null);
        if (e.target.files && e.target.files[0]) {
            setIsLoading(true);
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const data = new Uint8Array(event.target!.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    
                    // Chuyển sang mảng thô (rows) để tự động tìm dòng tiêu đề
                    const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    if (rows.length < 2) {
                        setUnitUploadError("File Excel không có dữ liệu.");
                        setIsLoading(false);
                        return;
                    }

                    const possibleCodeKeys = ['MADV', 'MA DV', 'MÃ ĐV', 'MA_DV', 'MA-DV', 'ID'];
                    const possibleNameKeys = ['TENDV', 'TEN DV', 'TÊN ĐV', 'TEN_DV', 'TEN-DV', 'NAME'];

                    let headerIndex = -1;
                    let codeColIdx = -1;
                    let nameColIdx = -1;

                    // Tìm dòng tiêu đề
                    for (let i = 0; i < Math.min(rows.length, 10); i++) {
                        const row = rows[i];
                        for (let j = 0; j < row.length; j++) {
                            const val = String(row[j] || "").trim().toUpperCase().replace(/\s+/g, ' ');
                            if (possibleCodeKeys.includes(val)) codeColIdx = j;
                            if (possibleNameKeys.includes(val)) nameColIdx = j;
                        }
                        if (codeColIdx !== -1 && nameColIdx !== -1) {
                            headerIndex = i;
                            break;
                        }
                    }

                    if (headerIndex === -1) {
                        setUnitUploadError("Không tìm thấy tiêu đề cột 'MaDv' và 'TenDV'. Vui lòng kiểm tra lại file Excel.");
                        setIsLoading(false);
                        return;
                    }

                    const newUnits: TrainingUnit[] = [];
                    for (let i = headerIndex + 1; i < rows.length; i++) {
                        const row = rows[i];
                        const code = String(row[codeColIdx] || "").trim();
                        const name = String(row[nameColIdx] || "").trim();

                        if (code && name) {
                            newUnits.push({
                                id: `unit-${code}`,
                                code: code,
                                name: name
                            });
                        }
                    }

                    if (newUnits.length === 0) {
                        setUnitUploadError("Không tìm thấy dữ liệu hợp lệ dưới dòng tiêu đề.");
                    } else {
                        const success = await storageService.importTrainingUnits(newUnits);
                        const refreshedUnits = await storageService.getAllTrainingUnits();
                        onUnitsImport(refreshedUnits);
                        if (success) {
                            alert(`Đã nhập và lưu thành công ${newUnits.length} đơn vị đào tạo vào hệ thống.`);
                        } else {
                            alert(`Đã nhập ${newUnits.length} đơn vị vào bộ nhớ tạm. Lưu ý: Database Cloud SQL đang ngoại tuyến.`);
                        }
                    }
                } catch (err) {
                    setUnitUploadError("Lỗi đọc file Excel hoặc lỗi lưu dữ liệu");
                    console.error("Error processing Unit Excel:", err);
                } finally {
                    setIsLoading(false);
                    e.target.value = '';
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const downloadUnitSample = () => {
        const sampleData = [
            { 'MaDv': '24001', 'TenDV': 'Trường Trung cấp nghề số 1 Bắc giang' },
            { 'MaDv': '24002', 'TenDV': 'Trường Trung cấp nghề GTVT Bắc Giang' },
            { 'MaDv': '2721', 'TenDV': 'Bộ phận cấp đổi - Sở GTVT Bắc Giang' }
        ];
        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "DonViDaoTao");
        XLSX.writeFile(workbook, "Mau_Don_Vi_Dao_Tao.xlsx");
    };

    const handleAddClick = () => {
        setEditingUnit(null);
        setFormData({ code: '', name: '' });
        setIsModalOpen(true);
    };

    const handleEditClick = (unit: TrainingUnit) => {
        setEditingUnit(unit);
        setFormData({ code: unit.code, name: unit.name });
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (id: string) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa đơn vị này không?')) {
            setIsLoading(true);
            try {
                await storageService.deleteTrainingUnit(id);
                const refreshedUnits = await storageService.getAllTrainingUnits();
                onUnitsImport(refreshedUnits);
            } catch (error) {
                alert('Có lỗi xảy ra khi xóa!');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code || !formData.name) return;
        
        setIsLoading(true);
        try {
            const unitToSave: TrainingUnit = {
                id: editingUnit ? editingUnit.id : `unit-${formData.code.trim()}`,
                code: formData.code.trim(),
                name: formData.name.trim()
            };
            
            await storageService.saveTrainingUnit(unitToSave);
            const refreshedUnits = await storageService.getAllTrainingUnits();
            onUnitsImport(refreshedUnits);
            setIsModalOpen(false);
        } catch (error) {
            alert('Lỗi khi lưu dữ liệu!');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-10 h-full overflow-y-auto bg-gray-100 dark:bg-gray-900 transition-colors">
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Đơn vị Đào tạo</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Quản lý danh sách các đơn vị đào tạo để nhận diện học viên.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleAddClick}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2 font-bold"
                    >
                        <i className="fa-solid fa-plus"></i> Thêm Mới
                    </button>
                    <button 
                        onClick={downloadUnitSample}
                        className="px-4 py-2 bg-white dark:bg-gray-800 border dark:border-gray-700 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 shadow-sm transition-colors flex items-center gap-2 font-medium"
                    >
                        <i className="fa-solid fa-download"></i> Tải file mẫu
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nhập nhanh từ Excel (Tiêu đề cột: MaDv, TenDV)</label>
                    <div className="flex gap-4">
                        <input 
                            type="file" 
                            accept=".xlsx, .xls"
                            onChange={handleUnitFileChange}
                            disabled={isLoading}
                            className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-600 file:text-white hover:file:bg-teal-700 cursor-pointer bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg disabled:opacity-50" 
                        />
                    </div>
                    {unitUploadError && (
                        <div className="mt-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-800 flex items-center gap-2">
                            <i className="fa-solid fa-circle-exclamation"></i>
                            {unitUploadError}
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    {trainingUnits.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <i className="fa-solid fa-building-columns text-4xl mb-3 text-gray-300"></i>
                            <p>Chưa có dữ liệu đơn vị nào.</p>
                            <p className="text-sm mt-1">Vui lòng thêm mới hoặc tải file Excel lên.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 uppercase font-semibold text-xs">
                                <tr>
                                    <th className="px-6 py-4 w-16 text-center">STT</th>
                                    <th className="px-6 py-4 w-48">Mã Đơn Vị</th>
                                    <th className="px-6 py-4">Tên Đơn Vị Đào Tạo</th>
                                    <th className="px-6 py-4 w-32 text-center">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {trainingUnits.map((u, index) => (
                                    <tr key={u.id} className="hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors group">
                                        <td className="px-6 py-4 text-center font-medium text-gray-400">{index + 1}</td>
                                        <td className="px-6 py-4 font-bold text-blue-700 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/20">{u.code}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{u.name}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleEditClick(u)}
                                                    className="w-8 h-8 flex items-center justify-center text-blue-600 bg-blue-100 dark:bg-blue-900/40 rounded hover:bg-blue-200"
                                                    title="Sửa"
                                                >
                                                    <i className="fa-solid fa-pen"></i>
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteClick(u.id)}
                                                    className="w-8 h-8 flex items-center justify-center text-red-600 bg-red-100 dark:bg-red-900/40 rounded hover:bg-red-200"
                                                    title="Xóa"
                                                >
                                                    <i className="fa-solid fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
                        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                                {editingUnit ? 'Cập nhật Đơn vị' : 'Thêm Đơn vị mới'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <i className="fa-solid fa-xmark text-xl"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mã Đơn Vị (Số/Ký tự)</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                    placeholder="VD: 24001"
                                    value={formData.code}
                                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tên Đơn Vị</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                    placeholder="VD: Trường nghề GTVT"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 font-medium">Hủy</button>
                                <button type="submit" disabled={isLoading} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold">Lưu</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
