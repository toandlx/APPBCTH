import React, { useMemo, useState } from 'react';
import type { SavedSession, ConflictWarning, StudentRecord } from '../../types';
import { checkHistoricalConflicts } from '../../services/reportUtils';
import { normalizeData } from '../../services/excelProcessor';

declare const XLSX: any;

interface ConflictDetail {
    part: string;
    previousSessionName: string;
    previousDate: string;
}

interface GroupedFinding {
    studentName: string;
    studentId: string;
    conflicts: ConflictDetail[];
}

export const ConflictAuditPage: React.FC<{ sessions: SavedSession[] }> = ({ sessions }) => {
    const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
    const [searchTerm, setSearchTerm] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadedConflicts, setUploadedConflicts] = useState<ConflictWarning[]>([]);
    const [hasChecked, setHasChecked] = useState(false);

    const groupConflicts = (warnings: ConflictWarning[]): GroupedFinding[] => {
        const map = new Map<string, GroupedFinding>();
        
        warnings.forEach(w => {
            if (!map.has(w.studentId)) {
                map.set(w.studentId, {
                    studentId: w.studentId,
                    studentName: w.studentName,
                    conflicts: []
                });
            }
            const exists = map.get(w.studentId)!.conflicts.some(c => c.part === w.conflictPart);
            if (!exists) {
                map.get(w.studentId)!.conflicts.push({
                    part: w.conflictPart,
                    previousSessionName: w.previousSessionName,
                    previousDate: w.previousDate
                });
            }
        });
        
        return Array.from(map.values());
    };

    const groupedHistoryFindings = useMemo(() => {
        if (sessions.length < 2) return [];

        const allConflicts: ConflictWarning[] = [];
        const sortedSessions = [...sessions].sort((a, b) => 
            new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime()
        );

        for (let i = 1; i < sortedSessions.length; i++) {
            const currentSession = sortedSessions[i];
            const previousSessions = sortedSessions.slice(0, i);
            const sessionConflicts = checkHistoricalConflicts(currentSession.studentRecords, previousSessions);
            allConflicts.push(...sessionConflicts);
        }

        return groupConflicts(allConflicts).reverse();
    }, [sessions]);

    const groupedUploadFindings = useMemo(() => groupConflicts(uploadedConflicts), [uploadedConflicts]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsProcessing(true);
            setHasChecked(false);
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const data = new Uint8Array(event.target!.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const json: any[] = XLSX.utils.sheet_to_json(worksheet);
                    
                    const normalized = normalizeData(json);
                    const conflicts = checkHistoricalConflicts(normalized, sessions);
                    
                    setUploadedConflicts(conflicts);
                    setHasChecked(true);
                } catch (err) {
                    console.error("Error processing file:", err);
                    alert("Có lỗi xảy ra khi đọc file Excel.");
                } finally {
                    setIsProcessing(false);
                    e.target.value = '';
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const filteredHistory = groupedHistoryFindings.filter(f => 
        f.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        f.studentId.includes(searchTerm)
    );

    const getConflictType = (msg: string) => {
        if (msg.includes('Đã ĐẠT')) return 'retake';
        if (msg.includes('không có trong nội dung đăng ký lần đầu')) return 'framework';
        if (msg.includes('Thi thiếu môn điều kiện')) return 'prerequisite';
        return 'other';
    };

    const renderConflictTable = (findings: GroupedFinding[]) => (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                        <th className="px-6 py-4 w-1/3">Thí sinh / Mã HV</th>
                        <th className="px-6 py-4">Mô tả sai sót & Cơ sở đối chiếu</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {findings.map((finding, idx) => (
                        <tr key={idx} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors align-top">
                            <td className="px-6 py-5">
                                <div className="font-bold text-gray-900 dark:text-white text-base">{finding.studentName}</div>
                                <div className="text-xs text-blue-600 dark:text-blue-400 font-mono mt-1 flex items-center gap-1">
                                    <i className="fa-solid fa-id-card-clip"></i> ID: {finding.studentId}
                                </div>
                            </td>
                            <td className="px-6 py-5">
                                <div className="space-y-4">
                                    {finding.conflicts.map((c, cIdx) => {
                                        const type = getConflictType(c.part);
                                        const borderClass = type === 'prerequisite' ? 'bg-amber-500' : 'bg-red-500';
                                        const textClass = type === 'prerequisite' ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400';
                                        
                                        return (
                                            <div key={cIdx} className="bg-gray-50 dark:bg-gray-750 p-4 rounded-xl border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                                                <div className={`absolute top-0 left-0 w-1.5 h-full ${borderClass}`}></div>
                                                <div className="flex flex-col gap-2">
                                                    <div className={`font-bold ${textClass} text-sm leading-snug`}>
                                                        {type === 'prerequisite' && <i className="fa-solid fa-arrow-up-right-from-square mr-2"></i>}
                                                        {c.part}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Cơ sở lịch sử:</div>
                                                        <div className="flex items-center gap-2 bg-white dark:bg-gray-700 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 shadow-sm">
                                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{c.previousSessionName}</span>
                                                            <span className="text-[10px] text-gray-400 italic">({c.previousDate})</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="p-6 md:p-10 h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Kiểm toán Nội dung thi</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Đảm bảo thí sinh thi đúng bộ khung, không thi lại môn đã đạt và thi đủ môn điều kiện.</p>
            </div>

            <div className="flex gap-1 bg-gray-200 dark:bg-gray-800 p-1 rounded-xl w-fit mb-6 shadow-inner">
                <button 
                    onClick={() => setActiveTab('upload')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'upload' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    <i className="fa-solid fa-file-import mr-2"></i> Đối soát File Excel
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    <i className="fa-solid fa-clock-rotate-left mr-2"></i> Rà soát Hệ thống
                </button>
            </div>

            {activeTab === 'upload' ? (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-10 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 text-center shadow-sm">
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className={`fa-solid ${isProcessing ? 'fa-spinner animate-spin text-blue-500' : 'fa-cloud-arrow-up text-blue-600'} text-3xl`}></i>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Kiểm tra File Excel mới</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-2">Tải file lên để hệ thống rà soát dựa trên toàn bộ lịch sử đã lưu.</p>
                        
                        <div className="mt-8 relative inline-block">
                            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" disabled={isProcessing} />
                            <button className="px-10 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all">Tải và Kiểm toán</button>
                        </div>
                    </div>

                    {hasChecked && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in">
                            <div className="p-4 bg-gray-50 dark:bg-gray-750 font-bold border-b dark:border-gray-700 flex justify-between items-center">
                                <span>Kết quả Kiểm toán ({groupedUploadFindings.length} trường hợp sai phạm)</span>
                                {groupedUploadFindings.length === 0 && <span className="text-green-600 text-xs font-bold uppercase tracking-wider"><i className="fa-solid fa-check-circle mr-1"></i> Không có sai sót</span>}
                            </div>
                            {groupedUploadFindings.length === 0 ? (
                                <div className="p-16 text-center text-gray-500">
                                    <i className="fa-solid fa-circle-check text-5xl text-green-200 mb-4"></i>
                                    <p className="font-medium">Dữ liệu hoàn toàn hợp lệ.</p>
                                </div>
                            ) : renderConflictTable(groupedUploadFindings)}
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                            <input 
                                type="text" 
                                placeholder="Tìm kiếm học viên..." 
                                className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                            />
                        </div>
                    </div>
                    {filteredHistory.length === 0 ? (
                        <div className="p-24 text-center text-gray-500 italic">Hệ thống lịch sử nhất quán, không phát hiện sai phạm.</div>
                    ) : renderConflictTable(filteredHistory)}
                </div>
            )}
            <style dangerouslySetInnerHTML={{ __html: `
                .animate-fade-in { animation: fadeIn 0.2s ease-out; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}} />
        </div>
    );
};