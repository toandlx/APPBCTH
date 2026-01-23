
import React, { useState, useMemo, useEffect } from 'react';
import type { SavedSession, StudentRecord } from '../../types';
import { storageService } from '../../services/storageService';
import { isStudentPassed, isStudentAbsent } from '../../services/reportUtils';

interface StudentProfile {
    studentId: string;
    studentName: string;
    cccd: string;
    licenseClass: string;
    attempts: {
        sessionName: string;
        reportDate: string;
        data: StudentRecord;
    }[];
    otherIdsWithSameCCCD: string[];
}

interface StudentLookupPageProps {
    sessions: SavedSession[];
    isLoading: boolean;
    onRefresh: () => void;
}

// Cải tiến hàm lấy giá trị cột: Nhạy bén hơn với các biến thể của tiêu đề cột
const getStudentVal = (s: any, keys: string[]) => {
    if (!s) return '';
    const objKeys = Object.keys(s);
    
    // Ưu tiên khớp chính xác hoặc khớp hoa/thường
    for (const targetKey of keys) {
        const foundKey = objKeys.find(k => k.trim().toUpperCase() === targetKey.toUpperCase());
        if (foundKey && s[foundKey] !== undefined && s[foundKey] !== null) {
            return String(s[foundKey]).trim();
        }
    }
    return '';
};

export const StudentLookupPage: React.FC<StudentLookupPageProps> = ({ sessions, isLoading, onRefresh }) => {
    const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedClass, setSelectedClass] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'passed' | 'failed' | 'absent'>('all');

    const uniqueClasses = useMemo(() => {
        const classes = new Set<string>();
        sessions.forEach(session => {
            session.studentRecords?.forEach(s => {
                const cls = getStudentVal(s, ['HẠNG GPLX', 'HẠNG', 'HANG', 'HANG XE']);
                if (cls) classes.add(cls);
            });
        });
        return Array.from(classes).sort();
    }, [sessions]);

    const searchResults = useMemo(() => {
        if (!sessions || sessions.length === 0) return [];

        const studentMap = new Map<string, StudentProfile>();
        const cccdToIdsMap = new Map<string, Set<string>>();
        
        const term = searchTerm.toLowerCase().trim();
        const fromDateStr = dateFrom ? new Date(dateFrom).getTime() : 0;
        const toDateStr = dateTo ? new Date(dateTo).getTime() + 86399999 : Infinity;

        // BƯỚC 1: Bản đồ CCCD -> Danh sách các Mã HV khác nhau
        sessions.forEach(session => {
            session.studentRecords?.forEach(student => {
                const sid = getStudentVal(student, ['MÃ HỌC VIÊN', 'MAHV', 'MADK', 'MÃ ĐK']);
                const cccd = getStudentVal(student, ['SỐ CHỨNG MINH', 'CCCD', 'CMND', 'SỐ THẺ']);
                if (cccd && sid) {
                    if (!cccdToIdsMap.has(cccd)) cccdToIdsMap.set(cccd, new Set());
                    cccdToIdsMap.get(cccd)!.add(sid);
                }
            });
        });

        // BƯỚC 2: Xử lý tìm kiếm và gom nhóm theo Mã Học Viên
        sessions.forEach(session => {
            const sessionTime = new Date(session.reportDate).getTime();
            if (sessionTime < fromDateStr || sessionTime > toDateStr) return;

            session.studentRecords?.forEach(student => {
                const sid = getStudentVal(student, ['MÃ HỌC VIÊN', 'MAHV', 'MADK', 'MÃ ĐK']);
                if (!sid) return;

                const sClass = getStudentVal(student, ['HẠNG GPLX', 'HẠNG', 'HANG']);
                if (selectedClass !== 'all' && sClass !== selectedClass) return;
                
                const isPass = isStudentPassed(student);
                const isAbs = isStudentAbsent(student);
                if (selectedStatus === 'passed' && !isPass) return;
                if (selectedStatus === 'absent' && !isAbs) return;
                if (selectedStatus === 'failed' && (isPass || isAbs)) return;

                const name = getStudentVal(student, ['HỌ VÀ TÊN', 'HOTEN', 'TEN', 'HỌ TÊN']).toLowerCase();
                const cccd = getStudentVal(student, ['SỐ CHỨNG MINH', 'CCCD', 'CMND']).toLowerCase();
                const sbd = getStudentVal(student, ['SỐ BÁO DANH', 'SBD']).toLowerCase();

                if (term && !name.includes(term) && !sid.toLowerCase().includes(term) && !cccd.includes(term) && !sbd.includes(term)) return;

                if (!studentMap.has(sid)) {
                    const studentCccd = getStudentVal(student, ['SỐ CHỨNG MINH', 'CCCD', 'CMND']);
                    const otherIds = Array.from(cccdToIdsMap.get(studentCccd) || []).filter(id => id !== sid);

                    studentMap.set(sid, {
                        studentId: sid,
                        studentName: getStudentVal(student, ['HỌ VÀ TÊN', 'HỌ TÊN', 'TEN']),
                        cccd: studentCccd,
                        licenseClass: sClass,
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
        
        // Sắp xếp các lần thi theo ngày mới nhất
        list.forEach(s => {
            s.attempts.sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
        });

        // Sắp xếp danh sách thí sinh theo lần thi cuối cùng
        return list.sort((a, b) => {
            const dateA = a.attempts[0] ? new Date(a.attempts[0].reportDate).getTime() : 0;
            const dateB = b.attempts[0] ? new Date(b.attempts[0].reportDate).getTime() : 0;
            return dateB - dateA;
        });
    }, [sessions, searchTerm, dateFrom, dateTo, selectedClass, selectedStatus]);

    const getScoreColor = (score: any) => {
        if (!score) return 'text-gray-300';
        const s = String(score).trim().toUpperCase();
        if (s === 'ĐẠT' || s === 'P' || s === 'PASSED') return 'text-green-600 font-bold';
        if (s === 'KHÔNG ĐẠT' || s === 'TRƯỢT' || s === 'F' || s === 'FAILED') return 'text-red-600 font-bold';
        return 'text-gray-800 dark:text-gray-200 font-medium';
    };

    return (
        <div className="p-6 md:p-8 h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Tra cứu Hồ sơ Thí sinh</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Quản lý lịch sử thi theo Mã học viên và đối soát trùng lặp CCCD.</p>
                </div>
                <button onClick={onRefresh} className="px-4 py-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
                    <i className={`fa-solid fa-rotate ${isLoading ? 'animate-spin' : ''}`}></i> {isLoading ? 'Đang tải...' : 'Làm mới'}
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input 
                            type="text" 
                            className="w-full pl-11 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-gray-700 dark:text-white shadow-inner"
                            placeholder="Tìm kiếm: Tên, Mã HV, CCCD hoặc SBD..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-1 rounded-lg border dark:border-gray-600">
                        <input type="date" className="w-full bg-transparent border-none text-xs p-2 text-gray-600 dark:text-gray-300" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                        <span className="text-gray-400">→</span>
                        <input type="date" className="w-full bg-transparent border-none text-xs p-2 text-gray-600 dark:text-gray-300" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                    </div>
                    <select className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white outline-none cursor-pointer" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                        <option value="all">Tất cả Hạng GPLX</option>
                        {uniqueClasses.map(cls => <option key={cls} value={cls}>Hạng {cls}</option>)}
                    </select>
                    <select className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white outline-none cursor-pointer" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)}>
                        <option value="all">Mọi trạng thái Đạt/Trượt</option>
                        <option value="passed">Đạt sát hạch</option>
                        <option value="failed">Trượt sát hạch</option>
                        <option value="absent">Vắng thi</option>
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-24 flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">Đang truy vấn database...</p>
                </div>
            ) : searchResults.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-750 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fa-solid fa-user-slash text-4xl text-gray-300"></i>
                    </div>
                    <p className="text-gray-500 font-medium">Không tìm thấy thí sinh nào khớp với điều kiện lọc.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {searchResults.map((profile, index) => {
                        const latest = profile.attempts[0].data;
                        const hasConflict = profile.otherIdsWithSameCCCD.length > 0;
                        
                        return (
                            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:border-blue-400 dark:hover:border-blue-500 transition-all group relative overflow-hidden">
                                {hasConflict && (
                                    <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg shadow-sm z-10 flex items-center gap-1">
                                        <i className="fa-solid fa-triangle-exclamation"></i> TRÙNG CCCD
                                    </div>
                                )}
                                
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-bold text-gray-800 dark:text-white group-hover:text-blue-600 transition-colors uppercase">{profile.studentName}</h3>
                                            <span className="text-[10px] font-black px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800">Hạng {profile.licenseClass}</span>
                                        </div>
                                        <div className="text-sm text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                                            <span className="font-mono text-gray-600 dark:text-gray-400 text-xs flex items-center gap-1">
                                                <i className="fa-solid fa-id-card-clip"></i> ID: <span className="font-bold">{profile.studentId}</span>
                                            </span>
                                            {profile.cccd && (
                                                <span className="font-mono text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1">
                                                    <i className="fa-solid fa-fingerprint"></i> CCCD: {profile.cccd}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right ml-4">
                                        <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-[10px] font-bold border dark:border-gray-600">
                                            {profile.attempts.length} Lần sát hạch
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-3 mb-4 grid grid-cols-4 gap-2 text-center text-[11px] border dark:border-gray-700">
                                    <div className="border-r dark:border-gray-700"><div className="text-gray-400 font-bold mb-1 uppercase text-[9px]">Lý thuyết</div><div className={getScoreColor(getStudentVal(latest, ['LÝ THUYẾT', 'LT']))}>{getStudentVal(latest, ['LÝ THUYẾT', 'LT']) || '-'}</div></div>
                                    <div className="border-r dark:border-gray-700"><div className="text-gray-400 font-bold mb-1 uppercase text-[9px]">Mô phỏng</div><div className={getScoreColor(getStudentVal(latest, ['MÔ PHỎNG', 'MP']))}>{getStudentVal(latest, ['MÔ PHỎNG', 'MP']) || '-'}</div></div>
                                    <div className="border-r dark:border-gray-700"><div className="text-gray-400 font-bold mb-1 uppercase text-[9px]">Sa hình</div><div className={getScoreColor(getStudentVal(latest, ['SA HÌNH', 'SH']))}>{getStudentVal(latest, ['SA HÌNH', 'SH']) || '-'}</div></div>
                                    <div><div className="text-gray-400 font-bold mb-1 uppercase text-[9px]">Đ.Trường</div><div className={getScoreColor(getStudentVal(latest, ['ĐƯỜNG TRƯỜNG', 'DT', 'ĐT']))}>{getStudentVal(latest, ['ĐƯỜNG TRƯỜNG', 'DT', 'ĐT']) || '-'}</div></div>
                                </div>

                                <button 
                                    onClick={() => setSelectedStudent(profile)}
                                    className="w-full py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <i className="fa-solid fa-clock-rotate-left"></i> Xem chi tiết lịch sử thi
                                </button>
                                
                                {hasConflict && (
                                    <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-md border border-orange-100 dark:border-orange-800 text-[10px] text-orange-700 dark:text-orange-400 flex items-start gap-2">
                                        <i className="fa-solid fa-circle-info mt-0.5"></i>
                                        <span>Cảnh báo: CCCD này xuất hiện với {profile.otherIdsWithSameCCCD.length} Mã HV khác: <span className="font-bold">{profile.otherIdsWithSameCCCD.join(', ')}</span>.</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {selectedStudent && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedStudent(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
                        <header className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-750">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase">{selectedStudent.studentName}</h2>
                                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                                    <span className="font-bold text-blue-600 dark:text-blue-400">ID: {selectedStudent.studentId}</span>
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
                            <div className="relative border-l-2 border-blue-200 dark:border-blue-900 ml-3 pl-8 space-y-8">
                                {selectedStudent.attempts.map((attempt, idx) => {
                                    const isPass = isStudentPassed(attempt.data);
                                    const isAbs = isStudentAbsent(attempt.data);
                                    return (
                                        <div key={idx} className="relative">
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
                                                            <span>SBD: <span className="text-blue-600 dark:text-blue-400 font-bold">{getStudentVal(attempt.data, ['SỐ BÁO DANH', 'SBD'])}</span></span>
                                                        </div>
                                                    </div>
                                                    <div className={`self-start px-3 py-1 rounded-full text-[10px] font-black border ${
                                                        isAbs ? 'bg-gray-200 text-gray-600 border-gray-300' : isPass ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
                                                    }`}>
                                                        {isAbs ? 'VẮNG' : isPass ? 'ĐẠT SÁT HẠCH' : 'KHÔNG ĐẠT'}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-600 text-center">
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Lý thuyết</div>
                                                        <div className={`text-sm ${getScoreColor(getStudentVal(attempt.data, ['LÝ THUYẾT', 'LT']))}`}>{getStudentVal(attempt.data, ['LÝ THUYẾT', 'LT']) || '-'}</div>
                                                    </div>
                                                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-600 text-center">
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Mô phỏng</div>
                                                        <div className={`text-sm ${getScoreColor(getStudentVal(attempt.data, ['MÔ PHỎNG', 'MP']))}`}>{getStudentVal(attempt.data, ['MÔ PHỎNG', 'MP']) || '-'}</div>
                                                    </div>
                                                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-600 text-center">
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Sa hình</div>
                                                        <div className={`text-sm ${getScoreColor(getStudentVal(attempt.data, ['SA HÌNH', 'SH']))}`}>{getStudentVal(attempt.data, ['SA HÌNH', 'SH']) || '-'}</div>
                                                    </div>
                                                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-600 text-center">
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Đường trường</div>
                                                        <div className={`text-sm ${getScoreColor(getStudentVal(attempt.data, ['ĐƯỜNG TRƯỜNG', 'DT', 'ĐT']))}`}>{getStudentVal(attempt.data, ['ĐƯỜNG TRƯỜNG', 'DT', 'ĐT']) || '-'}</div>
                                                    </div>
                                                </div>
                                                <div className="mt-4 pt-3 border-t dark:border-gray-700 text-[11px] text-gray-500">
                                                    <span className="font-bold">Nội dung đăng ký:</span> <span className="text-blue-600 dark:text-blue-400 font-bold">{getStudentVal(attempt.data, ['NỘI DUNG THI']) || '---'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        
                        <footer className="p-4 bg-gray-50 dark:bg-gray-750 border-t dark:border-gray-700 text-center">
                            <button onClick={() => setSelectedStudent(null)} className="px-12 py-3 bg-gray-800 dark:bg-gray-700 text-white rounded-xl font-bold hover:bg-gray-900 transition-all shadow-md">Đóng bảng lịch sử</button>
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
