
import React, { useState, useMemo, useRef } from 'react';
import type { SavedSession, StudentRecord, LicenseClassData } from '../../types';
import { storageService } from '../../services/storageService';
import { isStudentPassed, isStudentAbsent } from '../../services/reportUtils';
import { normalizeData, processExcelData } from '../../services/excelProcessor';

declare const XLSX: any;

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

const getStudentVal = (s: any, keys: string[]) => {
    if (!s) return '';
    const objKeys = Object.keys(s);
    for (const targetKey of keys) {
        const foundKey = objKeys.find(k => k.trim().toUpperCase() === targetKey.toUpperCase());
        if (foundKey && s[foundKey] !== undefined && s[foundKey] !== null) {
            return String(s[foundKey]).trim();
        }
    }
    return '';
};

const removeAccents = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
};

export const StudentLookupPage: React.FC<StudentLookupPageProps> = ({ sessions, isLoading, onRefresh }) => {
    const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedClass, setSelectedClass] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'passed' | 'failed' | 'absent'>('all');

    const uniqueClasses = useMemo(() => {
        const classes = new Set<string>();
        sessions.forEach(s => {
            s.studentRecords?.forEach(r => {
                const cls = getStudentVal(r, ['HẠNG GPLX', 'HẠNG']);
                if (cls) classes.add(cls);
            });
        });
        return Array.from(classes).sort();
    }, [sessions]);

    const downloadHistorySample = () => {
        const sampleData = [
            { 
                'SBD': '101', 
                'MÃ HỌC VIÊN': '27210001', 
                'HỌ VÀ TÊN': 'Nguyễn Văn Mẫu Lịch Sử', 
                'SỐ CHỨNG MINH': '037190001234',
                'NGÀY SINH': '15/05/1990',
                'NGÀY THI': '28/10/2024',
                'HẠNG GPLX': 'B2', 
                'NỘI DUNG THI': 'L+M+H+Đ',
                'LÝ THUYẾT': 'ĐẠT', 
                'MÔ PHỎNG': 'ĐẠT', 
                'SA HÌNH': 'ĐẠT', 
                'ĐƯỜNG TRƯỜNG': 'ĐẠT'
            },
            { 
                'SBD': '102', 
                'MÃ HỌC VIÊN': '27225588', 
                'HỌ VÀ TÊN': 'Trần Thị Dữ Liệu Cũ', 
                'SỐ CHỨNG MINH': '037190005678',
                'NGÀY SINH': '20/10/1995',
                'NGÀY THI': '15/09/2024',
                'HẠNG GPLX': 'C', 
                'NỘI DUNG THI': 'L+M+H+Đ',
                'LÝ THUYẾT': 'ĐẠT', 
                'MÔ PHỎNG': 'ĐẠT', 
                'SA HÌNH': 'KHÔNG ĐẠT', 
                'ĐƯỜNG TRƯỜNG': ''
            }
        ];
        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "LichSuThi");
        XLSX.writeFile(workbook, "Mau_Nap_Du_Lieu_Lich_Su.xlsx");
    };

    const handleImportHistory = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsImporting(true);
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const dataArr = new Uint8Array(event.target!.result as ArrayBuffer);
                    const workbook = XLSX.read(dataArr, { type: 'array' });
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const json: any[] = XLSX.utils.sheet_to_json(worksheet);
                    
                    const cleanRecords = normalizeData(json);
                    
                    // PHÂN NHÓM THÔNG MINH
                    const groups: Record<string, StudentRecord[]> = {};
                    cleanRecords.forEach(r => {
                        // CHỈ DÙNG NGÀY THI ĐỂ PHÂN NHÓM. 
                        // NẾU KHÔNG CÓ THÌ GOM TẤT CẢ VÀO 1 NHÓM 'CHƯA XÁC ĐỊNH'
                        const dateStr = r['NGÀY THI'] ? String(r['NGÀY THI']) : 'Khac';
                        const key = `Imported_${dateStr}`;
                        if (!groups[key]) groups[key] = [];
                        groups[key].push(r);
                    });

                    const newSessions: SavedSession[] = Object.entries(groups).map(([key, records]) => {
                        const appData = processExcelData(records);
                        const allRows = [...appData.firstTime.rows, ...appData.retake.rows];
                        const gt: LicenseClassData = allRows.reduce((acc, row) => {
                            acc.totalApplications += row.totalApplications;
                            acc.totalParticipants += row.totalParticipants;
                            acc.finalPass += row.finalPass;
                            return acc;
                        }, { class: 'a+b', totalApplications: 0, totalParticipants: 0, theory: {total:0,pass:0,fail:0}, simulation: {total:0,pass:0,fail:0}, practicalCourse: {total:0,pass:0,fail:0}, onRoad: {total:0,pass:0,fail:0}, finalPass: 0 });

                        const actualDateStr = key.replace('Imported_', '');
                        let reportDateISO = new Date().toISOString();
                        let displayName = `Lịch sử sát hạch ngày ${actualDateStr}`;

                        if (actualDateStr === 'Khac') {
                            displayName = "Dữ liệu lịch sử (Không rõ ngày thi)";
                        } else {
                            try {
                                const parsed = new Date(actualDateStr);
                                if (!isNaN(parsed.getTime())) reportDateISO = parsed.toISOString();
                            } catch (e) {}
                        }

                        return {
                            id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            name: displayName,
                            createdAt: Date.now(),
                            reportDate: reportDateISO,
                            studentRecords: records,
                            appData,
                            grandTotal: gt,
                            reportMetadata: { meetingTime: '', meetingLocation: '', organizer: '', attendees: [] },
                            trainingUnits: []
                        };
                    });

                    if (newSessions.length === 0) throw new Error("Không tìm thấy dữ liệu hợp lệ trong file.");

                    await storageService.bulkSaveSessions(newSessions);
                    alert(`Thành công! Đã nạp ${cleanRecords.length} hồ sơ, phân bổ vào ${newSessions.length} kỳ sát hạch.`);
                    onRefresh();
                } catch (err) {
                    alert("Lỗi nạp dữ liệu: " + (err as Error).message);
                } finally {
                    setIsImporting(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const searchResults = useMemo(() => {
        if (!sessions || sessions.length === 0) return [];
        const studentMap = new Map<string, StudentProfile>();
        const cccdToIdsMap = new Map<string, Set<string>>();
        const term = removeAccents(searchTerm.toLowerCase().trim());
        const fromDateStr = dateFrom ? new Date(dateFrom).getTime() : 0;
        const toDateStr = dateTo ? new Date(dateTo).getTime() + 86399999 : Infinity;

        sessions.forEach(session => {
            session.studentRecords?.forEach(student => {
                const sid = getStudentVal(student, ['MÃ HỌC VIÊN', 'MAHV', 'MADK']);
                const cccd = getStudentVal(student, ['SỐ CHỨNG MINH', 'CCCD', 'CMND']);
                if (cccd && sid) {
                    if (!cccdToIdsMap.has(cccd)) cccdToIdsMap.set(cccd, new Set());
                    cccdToIdsMap.get(cccd)!.add(sid);
                }
            });
        });

        sessions.forEach(session => {
            const sessionTime = new Date(session.reportDate).getTime();
            if (sessionTime < fromDateStr || sessionTime > toDateStr) return;

            session.studentRecords?.forEach(student => {
                const sid = getStudentVal(student, ['MÃ HỌC VIÊN', 'MAHV']);
                if (!sid) return;

                const sClass = getStudentVal(student, ['HẠNG GPLX', 'HẠNG']);
                if (selectedClass !== 'all' && sClass !== selectedClass) return;
                
                const isPass = isStudentPassed(student);
                const isAbs = isStudentAbsent(student);
                if (selectedStatus === 'passed' && !isPass) return;
                if (selectedStatus === 'absent' && !isAbs) return;
                if (selectedStatus === 'failed' && (isPass || isAbs)) return;

                const nameRaw = getStudentVal(student, ['HỌ VÀ TÊN', 'HOTEN']);
                const name = removeAccents(nameRaw.toLowerCase());
                const cccd = getStudentVal(student, ['SỐ CHỨNG MINH', 'CCCD']).toLowerCase();
                const sbd = getStudentVal(student, ['SỐ BÁO DANH', 'SBD']).toLowerCase();

                if (term && !name.includes(term) && !sid.toLowerCase().includes(term) && !cccd.includes(term) && !sbd.includes(term)) return;

                if (!studentMap.has(sid)) {
                    const studentCccd = getStudentVal(student, ['SỐ CHỨNG MINH', 'CCCD']);
                    studentMap.set(sid, {
                        studentId: sid,
                        studentName: nameRaw,
                        cccd: studentCccd,
                        licenseClass: sClass,
                        attempts: [],
                        otherIdsWithSameCCCD: Array.from(cccdToIdsMap.get(studentCccd) || []).filter(id => id !== sid)
                    });
                }
                studentMap.get(sid)!.attempts.push({ sessionName: session.name, reportDate: session.reportDate, data: student });
            });
        });

        const list = Array.from(studentMap.values());
        list.forEach(s => s.attempts.sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()));
        return list.sort((a, b) => {
            const dateA = a.attempts[0] ? new Date(a.attempts[0].reportDate).getTime() : 0;
            const dateB = b.attempts[0] ? new Date(b.attempts[0].reportDate).getTime() : 0;
            return dateB - dateA;
        });
    }, [sessions, searchTerm, dateFrom, dateTo, selectedClass, selectedStatus]);

    return (
        <div className="p-6 md:p-8 h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Tra cứu & Đối soát Thí sinh</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Quản lý lịch sử thi toàn hệ thống và kiểm tra trùng lặp hồ sơ.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button 
                        onClick={downloadHistorySample}
                        className="px-4 py-2 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex items-center gap-2 shadow-sm transition-all"
                    >
                        <i className="fa-solid fa-download"></i> Tải file mẫu
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleImportHistory} className="hidden" accept=".xlsx, .xls" />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-md disabled:opacity-50 transition-all"
                    >
                        {isImporting ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-file-import"></i>}
                        {isImporting ? 'Đang nạp...' : 'Nạp dữ liệu lịch sử'}
                    </button>
                    <button onClick={onRefresh} className="px-4 py-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm font-medium">
                        <i className={`fa-solid fa-rotate ${isLoading ? 'animate-spin' : ''}`}></i> {isLoading ? 'Đang tải...' : 'Làm mới'}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 space-y-4">
                <div className="relative">
                    <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input 
                        type="text" 
                        className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-gray-700 dark:text-white shadow-inner"
                        placeholder="Tìm theo Tên học viên (có/không dấu), Mã hồ sơ, CCCD hoặc SBD..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-1 rounded-lg border dark:border-gray-600">
                        <input type="date" className="w-full bg-transparent border-none text-xs p-2 text-gray-600 dark:text-gray-300" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                        <span className="text-gray-400">→</span>
                        <input type="date" className="w-full bg-transparent border-none text-xs p-2 text-gray-600 dark:text-gray-300" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                    </div>
                    <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                        <option value="all">Tất cả Hạng</option>
                        {uniqueClasses.map(cls => <option key={cls} value={cls}>Hạng {cls}</option>)}
                    </select>
                    <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)}>
                        <option value="all">Mọi kết quả</option>
                        <option value="passed">Đạt</option>
                        <option value="failed">Trượt</option>
                        <option value="absent">Vắng</option>
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-24 flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">Đang truy vấn kho dữ liệu lịch sử...</p>
                </div>
            ) : searchResults.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                    <i className="fa-solid fa-user-slash text-5xl text-gray-200 mb-4"></i>
                    <p className="text-gray-500 font-medium">Không tìm thấy thí sinh nào khớp với yêu cầu của bạn.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {searchResults.map((profile, index) => {
                        const latest = profile.attempts[0].data;
                        const isPass = isStudentPassed(latest);
                        const isAbs = isStudentAbsent(latest);
                        const examContent = getStudentVal(latest, ['NỘI DUNG THI', 'NDTHI']);
                        
                        return (
                            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:border-blue-400 dark:hover:border-blue-500 transition-all group relative overflow-hidden">
                                {profile.otherIdsWithSameCCCD.length > 0 && (
                                    <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg z-10">TRÙNG CCCD</div>
                                )}
                                
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-bold text-gray-800 dark:text-white group-hover:text-blue-600 uppercase transition-colors">{profile.studentName}</h3>
                                            <span className="text-[10px] font-black px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">Hạng {profile.licenseClass}</span>
                                            {examContent && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded border border-teal-100 dark:border-teal-800">
                                                    {examContent}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 font-mono text-xs">
                                            <span className="flex items-center gap-1"><i className="fa-solid fa-hashtag"></i> ID: {profile.studentId}</span>
                                            {profile.cccd && <span className="flex items-center gap-1"><i className="fa-solid fa-id-card"></i> CCCD: {profile.cccd}</span>}
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black border ${isAbs ? 'bg-gray-100 text-gray-600 border-gray-200' : isPass ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                        {isAbs ? 'VẮNG' : isPass ? 'ĐẠT' : 'TRƯỢT'}
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-3 mb-4 grid grid-cols-4 gap-2 text-center text-[10px] border dark:border-gray-700">
                                    <div><div className="text-gray-400 font-bold uppercase mb-1">LT</div><div className="font-bold">{getStudentVal(latest, ['LÝ THUYẾT']) || '-'}</div></div>
                                    <div><div className="text-gray-400 font-bold uppercase mb-1">MP</div><div className="font-bold">{getStudentVal(latest, ['MÔ PHỎNG']) || '-'}</div></div>
                                    <div><div className="text-gray-400 font-bold uppercase mb-1">SH</div><div className="font-bold">{getStudentVal(latest, ['SA HÌNH']) || '-'}</div></div>
                                    <div><div className="text-gray-400 font-bold uppercase mb-1">ĐT</div><div className="font-bold">{getStudentVal(latest, ['ĐƯỜNG TRƯỜNG']) || '-'}</div></div>
                                </div>

                                <button onClick={() => setSelectedStudent(profile)} className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-blue-600 hover:text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2">
                                    <i className="fa-solid fa-clock-rotate-left"></i> Xem lịch sử ({profile.attempts.length} lần thi)
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {selectedStudent && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedStudent(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <header className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-750">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase">{selectedStudent.studentName}</h2>
                                <p className="text-sm text-gray-500 mt-1">ID: {selectedStudent.studentId} | Hạng {selectedStudent.licenseClass}</p>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white">
                                <i className="fa-solid fa-xmark text-2xl"></i>
                            </button>
                        </header>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {selectedStudent.attempts.map((attempt, idx) => {
                                const pass = isStudentPassed(attempt.data);
                                const abs = isStudentAbsent(attempt.data);
                                const attemptContent = getStudentVal(attempt.data, ['NỘI DUNG THI', 'NDTHI']);

                                return (
                                    <div key={idx} className="bg-gray-50 dark:bg-gray-750 p-4 rounded-xl border dark:border-gray-700">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="font-bold text-gray-800 dark:text-white">{attempt.sessionName}</h4>
                                                <p className="text-xs text-gray-500 flex flex-wrap items-center gap-2 mt-1">
                                                    <span className="flex items-center gap-1"><i className="fa-regular fa-calendar"></i> {new Date(attempt.reportDate).toLocaleDateString('vi-VN')}</span>
                                                    <span className="w-1.5 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                                                    <span className="font-mono bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border dark:border-gray-700">SBD: {getStudentVal(attempt.data, ['SỐ BÁO DANH'])}</span>
                                                    {attemptContent && (
                                                        <>
                                                            <span className="w-1.5 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                                                            <span className="text-blue-600 dark:text-blue-400 font-bold">Nội dung: {attemptContent}</span>
                                                        </>
                                                    )}
                                                </p>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-[10px] font-black border ${abs ? 'bg-gray-200 text-gray-600 border-gray-300' : pass ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                                {abs ? 'VẮNG' : pass ? 'ĐẠT' : 'TRƯỢT'}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 gap-4 text-center">
                                            <div className="bg-white dark:bg-gray-800 p-2 rounded border dark:border-gray-700 text-xs">
                                                <div className="text-gray-400 uppercase text-[9px] mb-1">LT</div>
                                                <div className="font-bold">{getStudentVal(attempt.data, ['LÝ THUYẾT']) || '-'}</div>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 p-2 rounded border dark:border-gray-700 text-xs">
                                                <div className="text-gray-400 uppercase text-[9px] mb-1">MP</div>
                                                <div className="font-bold">{getStudentVal(attempt.data, ['MÔ PHỎNG']) || '-'}</div>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 p-2 rounded border dark:border-gray-700 text-xs">
                                                <div className="text-gray-400 uppercase text-[9px] mb-1">SH</div>
                                                <div className="font-bold">{getStudentVal(attempt.data, ['SA HÌNH']) || '-'}</div>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 p-2 rounded border dark:border-gray-700 text-xs">
                                                <div className="text-gray-400 uppercase text-[9px] mb-1">ĐT</div>
                                                <div className="font-bold">{getStudentVal(attempt.data, ['ĐƯỜNG TRƯỜNG']) || '-'}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
