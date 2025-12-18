
import React, { useState, useEffect, useMemo } from 'react';
import type { StudentRecord, SavedSession, TrainingUnit } from '../../types';
import { storageService } from '../../services/storageService';
import { exportValidationResultsToExcel } from '../../services/excelGenerator';
import { identifyTrainingUnit } from '../../services/reportUtils';

declare const XLSX: any;

interface PassDetail {
    date: string;
    sessionName: string;
    type: 'actual' | 'implicit';
}

interface ValidationResult {
    originalData: any;
    status: 'valid' | 'warning' | 'duplicate';
    messages: string[];
    trainingUnitName: string;
}

interface ContentValidationPageProps {
    trainingUnits?: TrainingUnit[];
}

export const ContentValidationPage: React.FC<ContentValidationPageProps> = ({ trainingUnits = [] }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<ValidationResult[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [studentKnowledgeMap, setStudentKnowledgeMap] = useState<Map<string, Map<string, PassDetail>>>(new Map());

    useEffect(() => {
        const buildHistory = async () => {
            const sessions = await storageService.getAllSessions();
            const masterMap = new Map<string, Map<string, PassDetail>>();
            const studentGroups = new Map<string, { record: StudentRecord, session: SavedSession }[]>();
            
            sessions.forEach(session => {
                session.studentRecords.forEach(record => {
                    const id = String(record['MÃ HỌC VIÊN'] || '').trim();
                    if (!id) return;
                    if (!studentGroups.has(id)) studentGroups.set(id, []);
                    studentGroups.get(id)!.push({ record, session });
                });
            });

            studentGroups.forEach((history, studentId) => {
                const sortedHistory = history.sort((a, b) => 
                    new Date(a.session.reportDate).getTime() - new Date(b.session.reportDate).getTime()
                );

                const knowledge = new Map<string, PassDetail>();
                const first = sortedHistory[0];
                const firstContent = String(first.record['NỘI DUNG THI'] || '').toUpperCase().replace(/Đ/g, 'D');
                const firstDate = new Date(first.session.reportDate).toLocaleDateString('vi-VN');
                
                ['L', 'M', 'H', 'D'].forEach(code => {
                    if (!firstContent.includes(code)) {
                        knowledge.set(code, { date: firstDate, sessionName: first.session.name, type: 'implicit' });
                    }
                });

                sortedHistory.forEach(item => {
                    const r = item.record;
                    const d = new Date(item.session.reportDate).toLocaleDateString('vi-VN');
                    const sName = item.session.name;
                    if (String(r['LÝ THUYẾT']).trim().toUpperCase() === 'ĐẠT') knowledge.set('L', { date: d, sessionName: sName, type: 'actual' });
                    if (String(r['MÔ PHỎNG']).trim().toUpperCase() === 'ĐẠT') knowledge.set('M', { date: d, sessionName: sName, type: 'actual' });
                    if (String(r['SA HÌNH']).trim().toUpperCase() === 'ĐẠT') knowledge.set('H', { date: d, sessionName: sName, type: 'actual' });
                    if (String(r['ĐƯỜNG TRƯỜNG']).trim().toUpperCase() === 'ĐẠT') knowledge.set('D', { date: d, sessionName: sName, type: 'actual' });
                });
                masterMap.set(studentId, knowledge);
            });
            setStudentKnowledgeMap(masterMap);
        };
        buildHistory();
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsLoading(true);
            setError(null);
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = new Uint8Array(event.target!.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const json: any[] = XLSX.utils.sheet_to_json(worksheet);
                    if (json.length === 0) { setError("File không có dữ liệu."); setIsLoading(false); return; }
                    performValidation(json);
                } catch (err) { setError("Lỗi định dạng file Excel."); setIsLoading(false); }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const performValidation = (incomingData: any[]) => {
        const subjectLabels: Record<string, string> = { 'L': 'Lý thuyết', 'M': 'Mô phỏng', 'H': 'Sa hình', 'D': 'Đường trường' };
        
        // Theo dõi trùng lặp nội bộ trong file
        const internalIdCounter = new Map<string, number>();
        incomingData.forEach(row => {
            const id = String(row['MÃ HỌC VIÊN'] || row['MAHOCVIEN'] || '').trim();
            if (id) internalIdCounter.set(id, (internalIdCounter.get(id) || 0) + 1);
        });

        const validated: ValidationResult[] = incomingData.map(row => {
            const studentId = String(row['MÃ HỌC VIÊN'] || row['MAHOCVIEN'] || '').trim();
            const content = String(row['NỘI DUNG THI'] || row['NOIDUNGTHI'] || '').toUpperCase().replace(/Đ/g, 'D');
            const messages: string[] = [];
            const unitName = identifyTrainingUnit(studentId, trainingUnits);

            // 1. Kiểm tra trùng lặp trong cùng file
            if (studentId && (internalIdCounter.get(studentId) || 0) > 1) {
                messages.push(`Cảnh báo: Học viên xuất hiện ${internalIdCounter.get(studentId)} lần trong file upload này.`);
            }

            // 2. Kiểm tra đối soát lịch sử
            if (studentId && studentKnowledgeMap.has(studentId)) {
                const knowledge = studentKnowledgeMap.get(studentId)!;
                ['L', 'M', 'H', 'D'].forEach(code => {
                    if (content.includes(code) && knowledge.has(code)) {
                        const info = knowledge.get(code)!;
                        if (info.type === 'implicit') {
                            messages.push(`Sai nội dung: Môn ${subjectLabels[code]} mặc định đã đạt (kỳ đầu ngày ${info.date})`);
                        } else {
                            messages.push(`Sai nội dung: Môn ${subjectLabels[code]} đã ĐẠT ngày ${info.date} (${info.sessionName})`);
                        }
                    }
                });
            }

            let status: 'valid' | 'warning' | 'duplicate' = 'valid';
            if (messages.some(m => m.includes('Sai nội dung'))) status = 'warning';
            else if (messages.some(m => m.includes('xuất hiện'))) status = 'duplicate';

            return { originalData: row, status, messages, trainingUnitName: unitName };
        });

        setResults(validated);
        setIsLoading(false);
    };

    const warningCount = results.filter(r => r.status === 'warning').length;
    const duplicateCount = results.filter(r => r.status === 'duplicate').length;

    return (
        <div className="p-6 md:p-8 h-full overflow-y-auto bg-slate-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                            <i className="fa-solid fa-shield-check text-blue-600"></i>
                            Đối soát Nội dung thi Thông minh
                        </h2>
                        <p className="text-slate-500 dark:text-gray-400 mt-1">Kiểm tra chéo Lịch sử hệ thống và Trùng lặp nội bộ trong file.</p>
                    </div>
                    {results.length > 0 && (
                        <div className="flex gap-2">
                             <button onClick={() => setResults([])} className="px-4 py-2 bg-white dark:bg-gray-800 border dark:border-gray-600 text-slate-600 dark:text-gray-300 rounded-lg text-sm font-medium transition-all"><i className="fa-solid fa-rotate-left mr-2"></i> Làm lại</button>
                            <button onClick={() => exportValidationResultsToExcel(results)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md text-sm font-bold flex items-center gap-2"><i className="fa-solid fa-file-excel"></i> Xuất kết quả</button>
                        </div>
                    )}
                </div>

                {results.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-slate-200 dark:border-gray-700 p-16 text-center animate-fade-in">
                        <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <i className="fa-solid fa-magnifying-glass-chart text-4xl text-blue-600"></i>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Tải file Excel cần kiểm tra</h3>
                        <p className="text-slate-500 dark:text-gray-400 max-w-xl mx-auto mb-8 text-sm leading-relaxed italic">
                            Hệ thống sẽ tự động truy vết lịch sử học viên: môn nào đã đạt thực tế hoặc đã đạt mặc định (do không đăng ký thi ở kỳ đầu) sẽ bị cảnh báo nếu đăng ký thi lại.
                        </p>
                        <div className="flex flex-col items-center gap-4">
                            <label className={`group block w-full max-w-sm py-12 px-6 border-2 border-dashed rounded-3xl cursor-pointer transition-all ${isLoading ? 'border-slate-300 bg-slate-50 pointer-events-none' : 'border-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/10 dark:hover:bg-blue-900/20'}`}>
                                {isLoading ? <div className="flex flex-col items-center gap-3 text-slate-500"><i className="fa-solid fa-spinner animate-spin text-3xl"></i><span className="font-bold">Đang phân tích dữ liệu lịch sử...</span></div> : <div className="flex flex-col items-center gap-2"><span className="text-blue-700 dark:text-blue-400 font-bold text-lg">Chọn File Sát Hạch</span><span className="text-slate-400 text-xs uppercase font-bold tracking-widest">.xlsx, .xls</span><input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} /></div>}
                            </label>
                        </div>
                        {error && <p className="mt-6 text-red-500 font-bold bg-red-50 py-2 px-4 rounded-lg border border-red-100">{error}</p>}
                    </div>
                ) : (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                             <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-700"><div className="text-xs text-slate-400 font-bold uppercase mb-1">Tổng thí sinh</div><div className="text-3xl font-black text-slate-700 dark:text-white">{results.length}</div></div>
                             <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-red-100 border-l-8 border-l-red-500"><div className="text-xs text-red-500 font-bold uppercase mb-1">Sai nội dung (Lịch sử)</div><div className="text-3xl font-black text-red-600">{warningCount}</div></div>
                             <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-orange-100 border-l-8 border-l-orange-500"><div className="text-xs text-orange-500 font-bold uppercase mb-1">Trùng lặp nội bộ file</div><div className="text-3xl font-black text-orange-600">{duplicateCount}</div></div>
                             <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-green-100 border-l-8 border-l-green-500"><div className="text-xs text-green-500 font-bold uppercase mb-1">Hợp lệ hoàn toàn</div><div className="text-3xl font-black text-green-600">{results.length - warningCount - duplicateCount}</div></div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-slate-200 dark:border-gray-700 overflow-hidden">
                            <div className="overflow-x-auto max-h-[calc(100vh-380px)]">
                                <table className="w-full text-sm text-left text-slate-600 dark:text-gray-300">
                                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-200 uppercase text-[11px] font-black border-b dark:border-gray-600">
                                        <tr>
                                            <th className="px-6 py-4 text-center w-16">STT</th>
                                            <th className="px-6 py-4">Thí sinh & Đơn vị</th>
                                            <th className="px-6 py-4 text-center w-32">Nội dung</th>
                                            <th className="px-6 py-4">Kết quả đối soát chuyên sâu</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                                        {results.map((item, idx) => (
                                            <tr key={idx} className={`hover:bg-slate-50 dark:hover:bg-gray-750 transition-colors ${item.status !== 'valid' ? 'bg-red-50/30' : ''}`}>
                                                <td className="px-6 py-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800 dark:text-white text-base">{item.originalData['HỌ VÀ TÊN'] || item.originalData['HOVATEN']}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] text-slate-500 font-mono bg-slate-100 dark:bg-gray-700 px-1.5 rounded uppercase">MS: {item.originalData['MÃ HỌC VIÊN'] || item.originalData['MAHOCVIEN']}</span>
                                                        <span className="text-[10px] text-blue-600 font-bold">{item.trainingUnitName || 'Không rõ đơn vị'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg font-black text-xs border border-blue-200">
                                                        {item.originalData['NỘI DUNG THI'] || item.originalData['NOIDUNGTHI']}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {item.messages.length > 0 ? (
                                                        <div className="space-y-1.5">
                                                            {item.messages.map((m, mIdx) => (
                                                                <div key={mIdx} className={`text-xs font-bold flex items-start gap-2 leading-tight p-2 rounded-lg border shadow-sm ${m.includes('xuất hiện') ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                                                    <i className={`fa-solid ${m.includes('xuất hiện') ? 'fa-clone' : 'fa-circle-exclamation'} mt-0.5 flex-shrink-0`}></i>
                                                                    <span>{m}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-green-600 dark:text-green-400 text-xs flex items-center gap-2 font-black py-2">
                                                            <i className="fa-solid fa-circle-check text-base"></i>
                                                            <span>Nội dung thi hoàn toàn khớp với lịch sử</span>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
