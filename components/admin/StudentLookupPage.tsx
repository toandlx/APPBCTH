import React, { useState, useMemo, useEffect } from 'react';
import type { SavedSession, StudentRecord } from '../../types';
import { storageService } from '../../services/storageService';
import { isStudentPassed, isStudentAbsent } from '../../services/reportUtils';

interface StudentProfile {
    studentId: string;
    studentName: string;
    cccd: string;
    licenseClass: string;
    // Danh sách các lượt thi của CHÍNH MÃ HỌC VIÊN NÀY
    attempts: {
        sessionName: string;
        reportDate: string;
        data: StudentRecord;
    }[];
    // Danh sách các Mã học viên khác có cùng số CCCD (Cảnh báo đa mã)
    otherIdsWithSameCCCD: string[];
}

export const StudentLookupPage: React.FC = () => {
    const [sessions, setSessions] = useState<SavedSession[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedClass, setSelectedClass] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'passed' | 'failed' | 'absent'>('all');

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const data = await storageService.getAllSessions();
                setSessions(data);
            } catch (error) {
                console.error("Failed to load sessions", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const uniqueClasses = useMemo(() => {
        const classes = new Set<string>();
        sessions.forEach(session => {
            session.studentRecords?.forEach(s => {
                if (s['HẠNG GPLX']) classes.add(s['HẠNG GPLX'].toString().trim());
            });
        });
        return Array.from(classes).sort();
    }, [sessions]);

    // Main Grouping Logic
    const searchResults = useMemo(() => {
        if (sessions.length === 0) return [];

        const studentMap = new Map<string, StudentProfile>();
        const cccdToIdsMap = new Map<string, Set<string>>(); // Để phát hiện trùng CCCD
        
        const term = searchTerm.toLowerCase().trim();
        const fromDate = dateFrom ? new Date(dateFrom).getTime() : 0;
        const toDate = dateTo ? new Date(dateTo).getTime() + (86400000 - 1) : Infinity;

        // BƯỚC 1: Xây dựng bản đồ CCCD -> Danh sách Mã HV (toàn bộ data để cảnh báo)
        sessions.forEach(session => {
            session.studentRecords?.forEach(student => {
                const sid = (student['MÃ HỌC VIÊN'] || '').toString().trim();
                const cccd = (student['SỐ CHỨNG MINH'] || '').toString().trim();
                if (cccd && sid) {
                    if (!cccdToIdsMap.has(cccd)) cccdToIdsMap.set(cccd, new Set());
                    cccdToIdsMap.get(cccd)!.add(sid);
                }
            });
        });

        // BƯỚC 2: Gom nhóm theo Mã Học Viên và lọc theo điều kiện search
        sessions.forEach(session => {
            const sessionTime = new Date(session.reportDate).getTime();
            if (sessionTime < fromDate || sessionTime > toDate) return;

            session.studentRecords?.forEach(student => {
                const sid = (student['MÃ HỌC VIÊN'] || '').toString().trim();
                if (!sid) return;

                // Filter by Class & Status
                if (selectedClass !== 'all' && student['HẠNG GPLX'] !== selectedClass) return;
                
                const isPass = isStudentPassed(student);
                const isAbs = isStudentAbsent(student);
                if (selectedStatus === 'passed' && !isPass) return;
                if (selectedStatus === 'absent' && !isAbs) return;
                if (selectedStatus === 'failed' && (isPass || isAbs)) return;

                // Filter by Search Term
                if (term) {
                    const name = (student['HỌ VÀ TÊN'] || '').toLowerCase();
                    const cccd = (student['SỐ CHỨNG MINH'] || '').toString().toLowerCase();
                    const sbd = (student['SỐ BÁO DANH'] || '').toString().toLowerCase();
                    if (!name.includes(term) && !sid.toLowerCase().includes(term) && !cccd.includes(term) && sbd !== term) return;
                }

                if (!studentMap.has(sid)) {
                    const currentCCCD = (student['SỐ CHỨNG MINH'] || '').toString().trim();
                    // Lấy các mã khác có cùng CCCD này
                    const otherIds = Array.from(cccdToIdsMap.get(currentCCCD) || [])
                        .filter(id => id !== sid);

                    studentMap.set(sid, {
                        studentId: sid,
                        studentName: student['HỌ VÀ TÊN'],
                        cccd: currentCCCD,
                        licenseClass: student['HẠNG GPLX'],
                        attempts: [],
                        otherIdsWithSameCCCD: otherIds
                    });
                }
                
                studentMap.get(sid)!.attempts.push({
                    sessionName: session.name,
                    reportDate: session.reportDate,
                    data: student
                });
            });
        });

        const list = Array.from(studentMap.values());
        // Sắp xếp lịch sử thi mỗi mã (mới nhất lên trên)
        list.forEach(s => s.attempts.sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()));
        // Sắp xếp danh sách chính theo ngày thi gần nhất
        return list.sort((a, b) => new Date(b.attempts[0].reportDate).getTime() - new Date(a.attempts[0].reportDate).getTime());
    }, [sessions, searchTerm, dateFrom, dateTo, selectedClass, selectedStatus]);

    const getScoreColor = (score: string | undefined) => {
        if (!score) return 'text-gray-300';
        const s = score.trim().toUpperCase();
        if (s === 'ĐẠT') return 'text-green-600 font-bold';
        if (s === 'KHÔNG ĐẠT' || s === 'TRƯỢT') return 'text-red-600 font-bold';
        return 'text-gray-800 font-medium';
    };

    return (
        <div className="p-6 md:p-8 h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Tra cứu Hồ sơ Thí sinh</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Quản lý lịch sử thi theo Mã học viên và đối soát trùng lặp CCCD.</p>
            </div>

            {/* Filter Panel */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input 
                            type="text" 
                            className="w-full pl-11 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-gray-700 dark:text-white"
                            placeholder="Nhập Mã học viên, Tên hoặc CCCD..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-1 rounded-lg border dark:border-gray-600">
                        <input type="date" className="w-full bg-transparent border-none text-xs p-2 text-gray-600 dark:text-gray-300" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="Từ ngày" />
                        <span className="text-gray-400">→</span>
                        <input type="date" className="w-full bg-transparent border-none text-xs p-2 text-gray-600 dark:text-gray-300" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="Đến ngày" />
                    </div>
                    <select className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white outline-none" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                        <option value="all">Tất cả Hạng</option>
                        {uniqueClasses.map(cls => <option key={cls} value={cls}>Hạng {cls}</option>)}
                    </select>
                    <select className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white outline-none" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)}>
                        <option value="all">Kết quả sau cùng</option>
                        <option value="passed">Đạt sát hạch</option>
                        <option value="failed">Trượt sát hạch</option>
                        <option value="absent">Vắng thi</option>
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-20"><i className="fa-solid fa-spinner animate-spin text-3xl text-blue-500"></i></div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {searchResults.map((profile, index) => {
                        const latest = profile.attempts[0].data;
                        const hasConflict = profile.otherIdsWithSameCCCD.length > 0;
                        
                        return (
                            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:border-blue-300 dark:hover:border-blue-500 transition-all group relative overflow-hidden">
                                {hasConflict && (
                                    <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg shadow-sm">
                                        ⚠️ TRÙNG CCCD
                                    </div>
                                )}
                                
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-bold text-gray-800 dark:text-white group-hover:text-blue-600 transition-colors">{profile.studentName}</h3>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded uppercase">Hạng {profile.licenseClass}</span>
                                        </div>
                                        <div className="text-sm text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                                            <span className="font-mono bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded text-xs border border-blue-100 dark:border-blue-800">
                                                ID: <span className="font-bold">{profile.studentId}</span>
                                            </span>
                                            {profile.cccd && (
                                                <span className="font-mono text-gray-500 dark:text-gray-400 text-xs">
                                                    CCCD: {profile.cccd}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right ml-4">
                                        <div className="px-3 py-1 bg-blue-600 text-white rounded-full text-[10px] font-bold shadow-sm">
                                            {profile.attempts.length} Lượt thi
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-3 mb-4 grid grid-cols-4 gap-2 text-center text-xs">
                                    <div className="border-r dark:border-gray-700"><div className="text-gray-400 font-bold mb-1 uppercase text-[10px]">Lý thuyết</div><div className={getScoreColor(latest['LÝ THUYẾT'])}>{latest['LÝ THUYẾT'] || '-'}</div></div>
                                    <div className="border-r dark:border-gray-700"><div className="text-gray-400 font-bold mb-1 uppercase text-[10px]">Mô phỏng</div><div className={getScoreColor(latest['MÔ PHỎNG'])}>{latest['MÔ PHỎNG'] || '-'}</div></div>
                                    <div className="border-r dark:border-gray-700"><div className="text-gray-400 font-bold mb-1 uppercase text-[10px]">Sa hình</div><div className={getScoreColor(latest['SA HÌNH'])}>{latest['SA HÌNH'] || '-'}</div></div>
                                    <div><div className="text-gray-400 font-bold mb-1 uppercase text-[10px]">Đ.Trường</div><div className={getScoreColor(latest['ĐƯỜNG TRƯỜNG'])}>{latest['ĐƯỜNG TRƯỜNG'] || '-'}</div></div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => setSelectedStudent(profile)}
                                        className="flex-1 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 border border-blue-100 dark:border-blue-800"
                                    >
                                        <i className="fa-solid fa-clock-rotate-left"></i> Xem lịch sử thi mã này
                                    </button>
                                </div>
                                
                                {hasConflict && (
                                    <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-md border border-orange-100 dark:border-orange-800 text-[10px] text-orange-700 dark:text-orange-400 flex items-start gap-2 animate-pulse">
                                        <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
                                        <span>CCCD này còn gắn với các mã học viên khác: <span className="font-bold">{profile.otherIdsWithSameCCCD.join(', ')}</span>. Vui lòng kiểm tra đối soát!</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Chi tiết */}
            {selectedStudent && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
                        <header className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-750">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedStudent.studentName}</h2>
                                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                                    <span className="font-bold text-blue-600 dark:text-blue-400">Mã HV: {selectedStudent.studentId}</span>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    <span>CCCD: {selectedStudent.cccd || '---'}</span>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    <span>Hạng: {selectedStudent.licenseClass}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
                                <i className="fa-solid fa-xmark text-xl"></i>
                            </button>
                        </header>
                        
                        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-800">
                            {/* Cảnh báo đa mã trong Modal */}
                            {selectedStudent.otherIdsWithSameCCCD.length > 0 && (
                                <div className="mb-8 p-4 bg-orange-50 dark:bg-orange-900/30 border-l-4 border-orange-500 rounded-r-lg">
                                    <h4 className="text-sm font-bold text-orange-800 dark:text-orange-400 flex items-center gap-2">
                                        <i className="fa-solid fa-triangle-exclamation"></i> CẢNH BÁO TRÙNG CCCD
                                    </h4>
                                    <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                                        Số CCCD <span className="font-bold">{selectedStudent.cccd}</span> của học viên này đang được ghi nhận dưới các mã học viên khác: 
                                        <span className="font-bold ml-1">{selectedStudent.otherIdsWithSameCCCD.join(', ')}</span>. 
                                        Học viên có thể đã đổi mã hoặc đăng ký lại.
                                    </p>
                                </div>
                            )}

                            <h3 className="font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                <i className="fa-solid fa-list-check text-blue-500"></i> Lịch sử thi của Mã {selectedStudent.studentId}
                            </h3>

                            <div className="relative border-l-2 border-blue-200 dark:border-blue-900 ml-3 pl-8 space-y-8">
                                {selectedStudent.attempts.map((attempt, idx) => {
                                    const isPass = isStudentPassed(attempt.data);
                                    const isAbs = isStudentAbsent(attempt.data);
                                    return (
                                        <div key={idx} className="relative">
                                            {/* Point dot */}
                                            <div className={`absolute -left-11 top-1 w-6 h-6 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center shadow-sm ${
                                                isAbs ? 'bg-gray-400' : isPass ? 'bg-green-500' : 'bg-red-500'
                                            }`}>
                                                {isPass ? <i className="fa-solid fa-check text-[10px] text-white"></i> : <i className="fa-solid fa-xmark text-[10px] text-white"></i>}
                                            </div>
                                            
                                            <div className="bg-gray-50 dark:bg-gray-750 p-5 rounded-xl border border-gray-100 dark:border-gray-700">
                                                <div className="flex flex-col md:flex-row justify-between md:items-start mb-4 gap-3">
                                                    <div>
                                                        <h4 className="font-bold text-gray-800 dark:text-white text-base">{attempt.sessionName}</h4>
                                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-medium">
                                                            <span><i className="fa-regular fa-calendar-check mr-1 text-blue-500"></i> {new Date(attempt.reportDate).toLocaleDateString('vi-VN')}</span>
                                                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                            <span>SBD: <span className="text-blue-600 dark:text-blue-400 font-bold">{attempt.data['SỐ BÁO DANH']}</span></span>
                                                        </div>
                                                    </div>
                                                    <div className={`self-start px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                        isAbs ? 'bg-gray-200 text-gray-600 border-gray-300' : isPass ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
                                                    }`}>
                                                        {isAbs ? 'VẮNG' : isPass ? 'ĐẠT SÁT HẠCH' : 'KHÔNG ĐẠT'}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-600 text-center">
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Lý thuyết</div>
                                                        <div className={`text-sm ${getScoreColor(attempt.data['LÝ THUYẾT'])}`}>{attempt.data['LÝ THUYẾT'] || 'N/A'}</div>
                                                    </div>
                                                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-600 text-center">
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Mô phỏng</div>
                                                        <div className={`text-sm ${getScoreColor(attempt.data['MÔ PHỎNG'])}`}>{attempt.data['MÔ PHỎNG'] || 'N/A'}</div>
                                                    </div>
                                                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-600 text-center">
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Sa hình</div>
                                                        <div className={`text-sm ${getScoreColor(attempt.data['SA HÌNH'])}`}>{attempt.data['SA HÌNH'] || 'N/A'}</div>
                                                    </div>
                                                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-600 text-center">
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Đường trường</div>
                                                        <div className={`text-sm ${getScoreColor(attempt.data['ĐƯỜNG TRƯỜNG'])}`}>{attempt.data['ĐƯỜNG TRƯỜNG'] || 'N/A'}</div>
                                                    </div>
                                                </div>
                                                <div className="mt-4 pt-3 border-t dark:border-gray-700 text-[11px] text-gray-500">
                                                    <span className="font-bold">Nội dung đăng ký:</span> <span className="text-blue-600 dark:text-blue-400 font-bold">{attempt.data['NỘI DUNG THI'] || '---'}</span>
                                                    <span className="mx-2 font-light">|</span>
                                                    <span className="font-bold">Nơi cư trú:</span> <span>{attempt.data['NƠI CƯ TRÚ'] || '---'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        
                        <footer className="p-4 bg-gray-50 dark:bg-gray-750 border-t dark:border-gray-700 text-center">
                            <button onClick={() => setSelectedStudent(null)} className="px-12 py-2.5 bg-gray-800 dark:bg-gray-700 text-white rounded-xl font-bold hover:bg-gray-900 transition-all shadow-md">Đóng chi tiết</button>
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