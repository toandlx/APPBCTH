
import React, { useState, useMemo } from 'react';
import type { StudentRecord, TrainingUnit, SavedSession } from '../../types';
import { storageService } from '../../services/storageService';
import { exportValidationResultsToExcel } from '../../services/excelGenerator';
import { StudentHistoryModal } from '../ui/StudentHistoryModal';

declare const XLSX: any;

interface ValidationResult extends StudentRecord {
    _status: 'valid' | 'invalid';
    _messages: string[];
}

interface PassDetail {
    date: string;
    session: string;
    isImplicit: boolean;
}

export const ContentValidationPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<ValidationResult[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Modal State
    const [selectedHistoryStudent, setSelectedHistoryStudent] = useState<{ id: string, name: string } | null>(null);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'invalid'>('all');
    const [classFilter, setClassFilter] = useState('all');
    const [contentFilter, setContentFilter] = useState('all');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsLoading(true);
            setError(null);
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = async (event) => {
                try {
                    const data = new Uint8Array(event.target!.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const json: any[] = XLSX.utils.sheet_to_json(worksheet);

                    if (json.length === 0) {
                        setError("File Excel không có dữ liệu.");
                        setIsLoading(false);
                        return;
                    }

                    await performValidation(json);
                } catch (err) {
                    setError("Lỗi xử lý file Excel.");
                    setIsLoading(false);
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const performValidation = async (incomingData: any[]) => {
        try {
            const pastSessions = await storageService.getAllSessions();
            
            // 1. Build Pass Map
            const passMap = new Map<string, Map<string, PassDetail>>();
            const studentHistory = new Map<string, { record: StudentRecord, sessionName: string, date: Date }[]>();
            
            pastSessions.forEach(session => {
                const date = new Date(session.reportDate);
                session.studentRecords.forEach(record => {
                    const studentId = String(record['MÃ HỌC VIÊN']).trim();
                    if (!studentId) return;
                    if (!studentHistory.has(studentId)) studentHistory.set(studentId, []);
                    studentHistory.get(studentId)!.push({ record, sessionName: session.name, date });
                });
            });

            studentHistory.forEach((history, studentId) => {
                history.sort((a, b) => a.date.getTime() - b.date.getTime());
                const studentPasses = new Map<string, PassDetail>();
                const firstEntry = history[0];
                const firstContent = (firstEntry.record['NỘI DUNG THI'] || '').toUpperCase().replace(/Đ/g, 'D');
                const firstDateStr = firstEntry.date.toLocaleDateString('vi-VN');

                ['L', 'M', 'H', 'D'].forEach(code => {
                    if (!firstContent.includes(code)) {
                        studentPasses.set(code, { date: firstDateStr, session: firstEntry.sessionName, isImplicit: true });
                    }
                });

                history.forEach(h => {
                    const dStr = h.date.toLocaleDateString('vi-VN');
                    if (String(h.record['LÝ THUYẾT']).trim().toUpperCase() === 'ĐẠT') studentPasses.set('L', { date: dStr, session: h.sessionName, isImplicit: false });
                    if (String(h.record['MÔ PHỎNG']).trim().toUpperCase() === 'ĐẠT') studentPasses.set('M', { date: dStr, session: h.sessionName, isImplicit: false });
                    if (String(h.record['SA HÌNH']).trim().toUpperCase() === 'ĐẠT') studentPasses.set('H', { date: dStr, session: h.sessionName, isImplicit: false });
                    if (String(h.record['ĐƯỜNG TRƯỜNG']).trim().toUpperCase() === 'ĐẠT') studentPasses.set('D', { date: dStr, session: h.sessionName, isImplicit: false });
                });
                passMap.set(studentId, studentPasses);
            });

            // 2. Validate Incoming Data (normalize keys)
            const subjectLabels: Record<string, string> = { 'L': 'Lý thuyết', 'M': 'Mô phỏng', 'H': 'Sa hình', 'D': 'Đường trường' };
            const validated: ValidationResult[] = incomingData.map(row => {
                // Handle different possible column names for Mã học viên and Nội dung thi
                const studentId = String(row['MÃ HỌC VIÊN'] || row['MA HOC VIEN'] || row['MAHV'] || '').trim();
                const rawContent = String(row['NỘI DUNG THI'] || row['NOI DUNG THI'] || row['ND THI'] || '').toUpperCase();
                const content = rawContent.replace(/Đ/g, 'D');
                
                const messages: string[] = [];

                if (studentId && passMap.has(studentId)) {
                    const history = passMap.get(studentId)!;
                    ['L', 'M', 'H', 'D'].forEach(code => {
                        if (content.includes(code) && history.has(code)) {
                            const h = history.get(code)!;
                            if (h.isImplicit) {
                                messages.push(`Mặc định đạt ${subjectLabels[code]} (${h.date})`);
                            } else {
                                messages.push(`Đã đạt ${subjectLabels[code]} (${h.date})`);
                            }
                        }
                    });
                }

                return {
                    ...row,
                    // Ensure standard keys exist for filtering/display
                    'MÃ HỌC VIÊN': studentId,
                    'NỘI DUNG THI': rawContent,
                    'HỌ VÀ TÊN': row['HỌ VÀ TÊN'] || row['HO VA TEN'] || row['HỌ TÊN'] || '',
                    'HẠNG': row['HẠNG'] || row['HANG'] || row['HẠNG GPLX'] || '',
                    _status: messages.length > 0 ? 'invalid' : 'valid',
                    _messages: messages
                };
            });

            setResults(validated);
        } catch (err) {
            console.error(err);
            setError("Lỗi khi đối soát dữ liệu.");
        } finally {
            setIsLoading(false);
        }
    };

    // Derived Filter Data
    const uniqueClasses = useMemo(() => {
        const classes = new Set<string>();
        results.forEach(r => { if (r['HẠNG']) classes.add(String(r['HẠNG']).trim()); });
        return Array.from(classes).sort();
    }, [results]);

    const uniqueContents = useMemo(() => {
        const contents = new Set<string>();
        results.forEach(r => { if (r['NỘI DUNG THI']) contents.add(String(r['NỘI DUNG THI']).trim()); });
        return Array.from(contents).sort();
    }, [results]);

    const filteredResults = useMemo(() => {
        return results.filter(r => {
            const matchesSearch = searchTerm === '' || 
                String(r['HỌ VÀ TÊN']).toLowerCase().includes(searchTerm.toLowerCase()) ||
                String(r['MÃ HỌC VIÊN']).toLowerCase().includes(searchTerm.toLowerCase()) ||
                String(r['SỐ BÁO DANH'] || r['SBD']).toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = statusFilter === 'all' || r._status === statusFilter;
            const matchesClass = classFilter === 'all' || String(r['HẠNG']) === classFilter;
            const matchesContent = contentFilter === 'all' || String(r['NỘI DUNG THI']) === contentFilter;

            return matchesSearch && matchesStatus && matchesClass && matchesContent;
        });
    }, [results, searchTerm, statusFilter, classFilter, contentFilter]);

    const handleExport = () => {
        if (filteredResults.length === 0) return;
        exportValidationResultsToExcel(filteredResults);
    };

    const handleClear = () => {
        if (window.confirm('Xóa kết quả hiện tại?')) {
            setResults([]);
            setError(null);
            setSearchTerm('');
            setStatusFilter('all');
            setClassFilter('all');
            setContentFilter('all');
        }
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setClassFilter('all');
        setContentFilter('all');
    };

    return (
        <div className="p-6 md:p-8 h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <i className="fa-solid fa-file-shield text-blue-600"></i>
                        Kiểm tra Nội dung thi
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Đối soát nội dung thi của học viên với lịch sử sát hạch trong hệ thống.</p>
                </div>
                {results.length > 0 && (
                    <div className="flex gap-2">
                        <button 
                            onClick={handleClear}
                            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 text-sm font-medium transition-colors"
                        >
                            <i className="fa-solid fa-trash-can mr-2"></i> Xóa dữ liệu
                        </button>
                        <button 
                            onClick={handleExport}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm text-sm font-bold flex items-center gap-2 transition-transform hover:scale-[1.02]"
                        >
                            <i className="fa-solid fa-file-excel"></i> Xuất ({filteredResults.length}) dòng
                        </button>
                    </div>
                )}
            </div>

            {results.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center animate-fade-in">
                    <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i className="fa-solid fa-upload text-5xl text-blue-500"></i>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Tải file Excel để bắt đầu</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
                        Hệ thống sẽ đối chiếu cột <strong>Mã Học Viên</strong> và <strong>Nội Dung Thi</strong> với toàn bộ lịch sử đã lưu.
                    </p>
                    
                    <div className="max-w-xs mx-auto">
                        <label className={`block w-full py-5 px-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${isLoading ? 'border-gray-300 bg-gray-50 pointer-events-none' : 'border-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/10 dark:hover:bg-blue-900/20'}`}>
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-3 text-blue-600">
                                    <i className="fa-solid fa-circle-notch animate-spin text-2xl"></i>
                                    <span className="font-bold">Đang đối soát...</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <i className="fa-solid fa-file-circle-plus text-blue-600 text-2xl mb-1"></i>
                                    <span className="text-blue-700 dark:text-blue-400 font-bold">Chọn file từ máy tính</span>
                                    <span className="text-xs text-blue-500 opacity-70">Hỗ trợ .xlsx, .xls</span>
                                    <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
                                </div>
                            )}
                        </label>
                    </div>
                    {error && <div className="mt-6 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100 inline-block">{error}</div>}
                </div>
            ) : (
                <div className="space-y-4 animate-fade-in">
                    {/* Filter Bar */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                        <div className="lg:col-span-2">
                            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Tìm kiếm</label>
                            <div className="relative">
                                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                                <input 
                                    type="text" 
                                    placeholder="Tên, Mã HV, SBD..."
                                    className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm dark:bg-gray-700 dark:text-white"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Trạng thái</label>
                            <select 
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm dark:bg-gray-700 dark:text-white"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                            >
                                <option value="all">Tất cả trạng thái</option>
                                <option value="invalid">⚠️ Cảnh báo</option>
                                <option value="valid">✅ Hợp lệ</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Hạng</label>
                            <select 
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm dark:bg-gray-700 dark:text-white"
                                value={classFilter}
                                onChange={(e) => setClassFilter(e.target.value)}
                            >
                                <option value="all">Tất cả hạng</option>
                                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div className="flex gap-2">
                            <select 
                                className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm dark:bg-gray-700 dark:text-white"
                                value={contentFilter}
                                onChange={(e) => setContentFilter(e.target.value)}
                            >
                                <option value="all">Nội dung thi</option>
                                {uniqueContents.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <button 
                                onClick={handleResetFilters}
                                className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors"
                                title="Làm mới bộ lọc"
                            >
                                <i className="fa-solid fa-filter-circle-xmark"></i>
                            </button>
                        </div>
                    </div>

                    {/* Results Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                             <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                                    Kết quả lọc: {filteredResults.length} / {results.length} học viên
                                </span>
                                {statusFilter === 'all' && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[11px] font-bold">
                                        {results.filter(r => r._status === 'invalid').length} lỗi
                                    </span>
                                )}
                             </div>
                        </div>
                        <div className="overflow-x-auto max-h-[calc(100vh-320px)]">
                            <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
                                <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 uppercase text-[10px] font-bold">
                                    <tr>
                                        <th className="px-4 py-3 text-center w-12">STT</th>
                                        <th className="px-4 py-3">Thông tin học viên</th>
                                        <th className="px-4 py-3 text-center">Hạng</th>
                                        <th className="px-4 py-3">Nội dung thi</th>
                                        <th className="px-4 py-3">Trạng thái & Cảnh báo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {filteredResults.length > 0 ? (
                                        filteredResults.map((item, idx) => (
                                            <tr key={idx} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${item._status === 'invalid' ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                                                <td className="px-4 py-3 text-center text-gray-400 text-xs">{idx + 1}</td>
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-gray-800 dark:text-gray-100">{item['HỌ VÀ TÊN']}</div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded text-gray-500">{item['MÃ HỌC VIÊN']}</span>
                                                        <span className="text-[10px] text-gray-400">SBD: {item['SỐ BÁO DANH'] || item['SBD']}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="font-bold text-gray-700 dark:text-gray-300">{item['HẠNG']}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded font-bold text-[11px] border border-blue-200 dark:border-blue-800">
                                                        {item['NỘI DUNG THI']}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-2">
                                                        {item._status === 'invalid' ? (
                                                            <div className="space-y-1">
                                                                {item._messages.map((m, mIdx) => (
                                                                    <div key={mIdx} className="text-red-600 dark:text-red-400 text-[11px] font-bold flex items-start gap-1.5 leading-tight">
                                                                        <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
                                                                        {m}
                                                                    </div>
                                                                ))}
                                                                <button 
                                                                    onClick={() => setSelectedHistoryStudent({ id: String(item['MÃ HỌC VIÊN']), name: item['HỌ VÀ TÊN'] })}
                                                                    className="text-blue-600 dark:text-blue-400 text-[10px] font-bold underline hover:text-blue-800 mt-1 flex items-center gap-1"
                                                                >
                                                                    <i className="fa-solid fa-eye"></i> Xem lịch sử lỗi
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-green-600 dark:text-green-400 text-xs flex items-center gap-1 font-medium">
                                                                    <i className="fa-solid fa-circle-check"></i> Hợp lệ
                                                                </span>
                                                                <button 
                                                                    onClick={() => setSelectedHistoryStudent({ id: String(item['MÃ HỌC VIÊN']), name: item['HỌ VÀ TÊN'] })}
                                                                    className="text-gray-400 hover:text-blue-500 transition-colors"
                                                                    title="Xem lịch sử"
                                                                >
                                                                    <i className="fa-solid fa-clock-rotate-left"></i>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-gray-500 italic">
                                                <i className="fa-solid fa-filter-circle-xmark block text-3xl mb-2 opacity-20"></i>
                                                Không có dữ liệu phù hợp với bộ lọc
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {selectedHistoryStudent && (
                <StudentHistoryModal 
                    studentId={selectedHistoryStudent.id}
                    studentName={selectedHistoryStudent.name}
                    onClose={() => setSelectedHistoryStudent(null)}
                />
            )}
        </div>
    );
};
