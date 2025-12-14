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

    // Refresh data on mount to ensure we have the latest from DB
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
                    const json: any[] = XLSX.utils.sheet_to_json(worksheet);
                    
                    const newUnits: TrainingUnit[] = [];
                    json.forEach((row, index) => {
                        const code = row['MaDv'] || row['MADV'] || row['MaDV'] || row['Mã ĐV'];
                        const name = row['TenDV'] || row['TENDV'] || row['TenDv'] || row['Tên ĐV'];

                        if (code && name) {
                            const codeStr = String(code).trim();
                            // Generate stable ID based on code to allow updates via re-import
                            const stableId = `unit-${codeStr}`; 
                            
                            newUnits.push({
                                id: stableId,
                                code: codeStr,
                                name: String(name).trim()
                            });
                        }
                    });

                    if (newUnits.length === 0) {
                        setUnitUploadError("Không tìm thấy dữ liệu hợp lệ (Cột 'MaDv', 'TenDV')");
                    } else {
                        // Persist to Storage
                        await storageService.importTrainingUnits(newUnits);
                        // Refresh parent
                        const refreshedUnits = await storageService.getAllTrainingUnits();
                        onUnitsImport(refreshedUnits);
                    }
                } catch (err) {
                    setUnitUploadError("Lỗi đọc file Excel hoặc lỗi lưu server");
                    console.error("Error processing Unit Excel:", err);
                } finally {
                    setIsLoading(false);
                    // Reset input
                    e.target.value = '';
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const downloadUnitSample = () => {
        const sampleData = [
            { 'MaDv': '2721', 'TenDV': 'Trung tâm Đông Đô' },
            { 'MaDv': '2722', 'TenDV': 'Trung tâm Âu Lạc' },
            { 'MaDv': '01', 'TenDV': 'Đơn vị khác' }
        ];
        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "DonViDaoTao");
        XLSX.writeFile(workbook, "Mau_Don_Vi_Dao_Tao.xlsx");
    };

    // CRUD Handlers
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
                // Refresh
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
            
            // Refresh
            const refreshedUnits = await storageService.getAllTrainingUnits();
            onUnitsImport(refreshedUnits);
            
            setIsModalOpen(false);
        } catch (error) {
            alert('Lỗi khi lưu dữ liệu!');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-10 h-full overflow-y-auto bg-gray-100">
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Đơn vị Đào tạo</h2>
                    <p className="text-gray-500 mt-1">Quản lý danh sách các đơn vị đào tạo lái xe.</p>
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
                        className="px-4 py-2 bg-white border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 shadow-sm transition-colors flex items-center gap-2 font-medium"
                    >
                        <i className="fa-solid fa-download"></i> Tải file mẫu
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nhập nhanh từ Excel (Cột: MaDv, TenDV)</label>
                    <div className="flex gap-4">
                        <input 
                            type="file" 
                            accept=".xlsx, .xls"
                            onChange={handleUnitFileChange}
                            disabled={isLoading}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-600 file:text-white hover:file:bg-teal-700 cursor-pointer bg-white border border-gray-300 rounded-lg disabled:opacity-50" 
                        />
                    </div>
                    {unitUploadError && (
                        <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100 flex items-center gap-2">
                            <i className="fa-solid fa-circle-exclamation"></i>
                            {unitUploadError}
                        </div>
                    )}
                </div>

                {isLoading && (
                    <div className="p-4 text-center text-blue-600 bg-blue-50">
                        <i className="fa-solid fa-spinner animate-spin mr-2"></i> Đang xử lý...
                    </div>
                )}

                <div className="overflow-x-auto">
                    {trainingUnits.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <i className="fa-solid fa-building-columns text-4xl mb-3 text-gray-300"></i>
                            <p>Chưa có dữ liệu đơn vị nào.</p>
                            <p className="text-sm mt-1">Vui lòng thêm mới hoặc tải file Excel lên.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-100 text-gray-700 uppercase font-semibold text-xs">
                                <tr>
                                    <th className="px-6 py-4 w-16 text-center">STT</th>
                                    <th className="px-6 py-4 w-48">Mã Đơn Vị</th>
                                    <th className="px-6 py-4">Tên Đơn Vị Đào Tạo</th>
                                    <th className="px-6 py-4 w-32 text-center">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {trainingUnits.map((u, index) => (
                                    <tr key={u.id} className="hover:bg-blue-50 transition-colors group">
                                        <td className="px-6 py-4 text-center font-medium text-gray-400">{index + 1}</td>
                                        <td className="px-6 py-4 font-bold text-blue-700 bg-blue-50/30">{u.code}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{u.name}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleEditClick(u)}
                                                    className="w-8 h-8 flex items-center justify-center text-blue-600 bg-blue-100 rounded hover:bg-blue-200"
                                                    title="Sửa"
                                                >
                                                    <i className="fa-solid fa-pen"></i>
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteClick(u.id)}
                                                    className="w-8 h-8 flex items-center justify-center text-red-600 bg-red-100 rounded hover:bg-red-200"
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
                
                {trainingUnits.length > 0 && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50 text-right text-xs text-gray-500">
                        Tổng số: <strong>{trainingUnits.length}</strong> đơn vị
                    </div>
                )}
            </div>

            {/* Modal Add/Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-fade-in-down">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800">
                                {editingUnit ? 'Cập nhật Đơn vị' : 'Thêm Đơn vị mới'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <i className="fa-solid fa-xmark text-xl"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mã Đơn Vị (Prefix)</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="VD: 2721"
                                    value={formData.code}
                                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                                />
                                <p className="text-xs text-gray-500 mt-1">Dùng để nhận diện học viên qua Mã HV.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Đơn Vị</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="VD: Trung tâm Đông Đô"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                                >
                                    Hủy
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isLoading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {isLoading ? 'Đang lưu...' : 'Lưu'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};