
import React, { useMemo, useState, useEffect } from 'react';
import type { SavedSession, ConflictWarning, StudentRecord } from '../../types';
import { checkHistoricalConflicts } from '../../services/reportUtils';
import { normalizeData, processExcelData } from '../../services/excelProcessor';
import { storageService } from '../../services/storageService';

declare const XLSX: any;

interface ConflictDetail {
    part: string;
    previousSessionName: string;
    previousDate: string;
    sourceSessionId: string;
    targetSessionId?: string;
}

interface GroupedFinding {
    studentName: string;
    studentId: string;
    conflicts: ConflictDetail[];
}

export const ConflictAuditPage: React.FC<{ sessions: SavedSession[] }> = ({ sessions: initialSessions }) => {
    const [sessions, setSessions] = useState<SavedSession[]>(initialSessions);
    const [activeTab, setActiveTab] = useState<'upload' | 'history'>('history');
    const [searchTerm, setSearchTerm] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadedConflicts, setUploadedConflicts] = useState<ConflictWarning[]>([]);
    const [hasChecked, setHasChecked] = useState(false);

    // Edit Modal State
    const [editingFinding, setEditingFinding] = useState<{finding: GroupedFinding, detail: ConflictDetail} | null>(null);
    const [editForm, setEditForm] = useState<{content: string, theory: string, simulation: string, field: string, road: string}>({
        content: '', theory: '', simulation: '', field: '', road: ''
    });

    useEffect(() => {
        setSessions(initialSessions);
    }, [initialSessions]);

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
            const exists = map.get(w.studentId)!.conflicts.some(c => c.part === w.conflictPart && c.sourceSessionId === w.sourceSessionId);
            if (!exists) {
                map.get(w.studentId)!.conflicts.push({
                    part: w.conflictPart,
                    previousSessionName: w.previousSessionName,
                    previousDate: w.previousDate,
                    sourceSessionId: w.sourceSessionId,
                    targetSessionId: w.targetSessionId
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

        for (let i = 0; i < sortedSessions.length; i++) {
            const currentSession = sortedSessions[i];
            const previousSessions = sortedSessions.slice(0, i);
            const sessionConflicts = checkHistoricalConflicts(currentSession.studentRecords, previousSessions, currentSession.id);
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
                    alert("Có lỗi xảy ra khi đọc file Excel.");
                } finally {
                    setIsProcessing(false);
                    e.target.value = '';
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const handleOpenFix = (finding: GroupedFinding, detail: ConflictDetail) => {
        // Tìm bản ghi học viên trong session nguồn để điền form
        const session = sessions.find(s => s.id === detail.sourceSessionId);
        if (!session) return;
        
        const record = session.studentRecords.find(r => String(r['MÃ HỌC VIÊN']) === finding.studentId);
        if (!record) return;

        setEditForm({
            content: String(record['NỘI DUNG THI'] || ''),
            theory: String(record['LÝ THUYẾT'] || ''),
            simulation: String(record['MÔ PHỎNG'] || ''),
            field: String(record['SA HÌNH'] || ''),
            road: String(record['ĐƯỜNG TRƯỜNG'] || '')
        });
        setEditingFinding({ finding, detail });
    };

    const handleSaveFix = async () => {
        if (!editingFinding) return;
        const { sourceSessionId } = editingFinding.detail;
        const { studentId } = editingFinding.finding;

        setIsProcessing(true);
        try {
            const session = await storageService.getSessionById(sourceSessionId);
            if (!session) throw new Error("Không tìm thấy kỳ sát hạch");

            // Cập nhật bản ghi học viên
            session.studentRecords = session.studentRecords.map(r => {
                if (String(r['MÃ HỌC VIÊN']) === studentId) {
                    return {
                        ...r,
                        'NỘI DUNG THI': editForm.content,
                        'LÝ THUYẾT': editForm.theory,
                        'MÔ PHỎNG': editForm.simulation,
                        'SA HÌNH': editForm.field,
                        'ĐƯỜNG TRƯỜNG': editForm.road,
                        'Ghi chú': (r as any)['Ghi chú'] ? `${(r as any)['Ghi chú']} - Đã cập nhật lại nội dung thi ngày ${new Date().toLocaleDateString()}` : `Đã cập nhật lại nội dung thi ngày ${new Date().toLocaleDateString()}`
                    };
                }
                return r;
            });

            // Tính toán lại grandTotal và appData cho session
            session.appData = processExcelData(session.studentRecords);
            // Tính grandTotal mới
            const allRows = [...session.appData.firstTime.rows, ...session.appData.retake.rows];
            session.grandTotal = allRows.reduce((acc, row) => {
                acc.totalApplications += row.totalApplications;
                acc.totalParticipants += row.totalParticipants;
                acc.theory.total += row.theory.total; acc.theory.pass += row.theory.pass; acc.theory.fail += row.theory.fail;
                acc.simulation.total += row.simulation.total; acc.simulation.pass += row.simulation.pass; acc.simulation.fail += row.simulation.fail;
                acc.practicalCourse.total += row.practicalCourse.total; acc.practicalCourse.pass += row.practicalCourse.pass; acc.practicalCourse.fail += row.practicalCourse.fail;
                acc.onRoad.total += row.onRoad.total; acc.onRoad.pass += row.onRoad.pass; acc.onRoad.fail += row.onRoad.fail;
                acc.finalPass += row.finalPass;
                return acc;
            }, {
                class: 'a+b', totalApplications: 0, totalParticipants: 0,
                theory: { total: 0, pass: 0, fail: 0 }, simulation: { total: 0, pass: 0, fail: 0 },
                practicalCourse: { total: 0, pass: 0, fail: 0 }, onRoad: { total: 0, pass: 0, fail: 0 },
                finalPass: 0,
            });

            await storageService.saveSession(session);
            const refreshedSessions = await storageService.getAllSessions();
            setSessions(refreshedSessions);
            setEditingFinding(null);
            alert("Đã cập nhật dữ liệu thành công. Danh sách rà soát đã được tính toán lại.");
        } catch (err) {
            alert("Lỗi: " + (err as Error).message);
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredHistory = groupedHistoryFindings.filter(f => 
        f.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        f.studentId.includes(searchTerm)
    );

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
                                    {finding.conflicts.map((c, cIdx) => (
                                        <div key={cIdx} className="bg-gray-50 dark:bg-gray-750 p-4 rounded-xl border border-gray-100 dark:border-gray-700 relative overflow-hidden group/item">
                                            <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col gap-2">
                                                    <div className="font-bold text-red-700 dark:text-red-400 text-sm leading-snug">
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
                                                {activeTab === 'history' && (
                                                    <button 
                                                        onClick={() => handleOpenFix(finding, c)}
                                                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm flex items-center gap-2"
                                                    >
                                                        <i className="fa-solid fa-wrench"></i> Xử lý sai sót
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
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
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-2">Hệ thống sẽ rà soát dựa trên lịch sử database hiện có.</p>
                        
                        <div className="mt-8 relative inline-block">
                            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" disabled={isProcessing} />
                            <button className="px-10 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all">Tải và Kiểm toán</button>
                        </div>
                    </div>

                    {hasChecked && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in">
                            <div className="p-4 bg-gray-50 dark:bg-gray-750 font-bold border-b dark:border-gray-700 flex justify-between items-center">
                                <span>Kết quả Kiểm toán ({groupedUploadFindings.length} trường hợp nghi vấn)</span>
                            </div>
                            {groupedUploadFindings.length === 0 ? (
                                <div className="p-16 text-center text-gray-500">
                                    <i className="fa-solid fa-circle-check text-5xl text-green-200 mb-4"></i>
                                    <p className="font-medium">Dữ liệu trong file Excel hoàn toàn hợp lệ.</p>
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
                                placeholder="Tìm kiếm học viên sai sót..." 
                                className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                            />
                        </div>
                    </div>
                    {filteredHistory.length === 0 ? (
                        <div className="p-24 text-center text-gray-500 italic flex flex-col items-center">
                            <i className="fa-solid fa-shield-check text-5xl text-green-100 mb-4"></i>
                            Hệ thống lịch sử nhất quán, không phát hiện sai phạm.
                        </div>
                    ) : renderConflictTable(filteredHistory)}
                </div>
            )}

            {/* Fix Modal */}
            {editingFinding && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-slide-up">
                        <header className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20">
                            <div>
                                <h3 className="text-xl font-bold text-indigo-900 dark:text-indigo-400">Xử lý sai sót dữ liệu</h3>
                                <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium mt-1">
                                    Thí sinh: {editingFinding.finding.studentName} ({editingFinding.finding.studentId})
                                </p>
                            </div>
                            <button onClick={() => setEditingFinding(null)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white">
                                <i className="fa-solid fa-xmark text-xl"></i>
                            </button>
                        </header>
                        
                        <div className="p-8 space-y-6">
                            <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100 dark:border-orange-800">
                                <label className="block text-xs font-black text-orange-600 dark:text-orange-400 uppercase mb-2">Lỗi phát hiện</label>
                                <p className="text-sm font-bold text-orange-900 dark:text-orange-200">{editingFinding.detail.part}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nội dung thi</label>
                                    <input 
                                        type="text" 
                                        value={editForm.content}
                                        onChange={(e) => setEditForm({...editForm, content: e.target.value.toUpperCase()})}
                                        className="w-full px-4 py-2.5 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white font-bold"
                                        placeholder="VD: L+M+H+Đ"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Lý thuyết</label>
                                    <input type="text" value={editForm.theory} onChange={(e) => setEditForm({...editForm, theory: e.target.value})} className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Mô phỏng</label>
                                    <input type="text" value={editForm.simulation} onChange={(e) => setEditForm({...editForm, simulation: e.target.value})} className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Sa hình</label>
                                    <input type="text" value={editForm.field} onChange={(e) => setEditForm({...editForm, field: e.target.value})} className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Đường trường</label>
                                    <input type="text" value={editForm.road} onChange={(e) => setEditForm({...editForm, road: e.target.value})} className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm" />
                                </div>
                            </div>
                            
                            <p className="text-[10px] text-gray-400 italic">
                                * Lưu ý: Việc chỉnh sửa này sẽ cập nhật trực tiếp vào kỳ sát hạch gốc. Hệ thống sẽ tự động tính toán lại tỷ lệ Đạt/Trượt cho kỳ đó.
                            </p>
                        </div>
                        
                        <footer className="p-6 bg-gray-50 dark:bg-gray-750 border-t dark:border-gray-700 flex justify-end gap-4">
                            <button onClick={() => setEditingFinding(null)} className="px-6 py-2.5 text-gray-500 font-bold">Hủy</button>
                            <button 
                                onClick={handleSaveFix} 
                                disabled={isProcessing}
                                className="px-10 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isProcessing ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-check-double"></i>}
                                Lưu & Cập nhật hệ thống
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                .animate-fade-in { animation: fadeIn 0.2s ease-out; }
                .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}} />
        </div>
    );
};
