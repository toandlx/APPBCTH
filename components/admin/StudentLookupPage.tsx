
import React, { useState, useMemo } from 'react';
import type { SavedSession, StudentRecord } from '../../types';
import { storageService } from '../../services/storageService';
import { getResultStatus, isStudentPassed, isStudentAbsent } from '../../services/reportUtils';

interface StudentHistoryItem {
    sessionName: string;
    reportDate: string;
    studentData: StudentRecord;
}

export const StudentLookupPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sessions, setSessions] = useState<SavedSession[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Load data once when component mounts
    React.useEffect(() => {
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

    const searchResults = useMemo(() => {
        if (!searchTerm.trim()) return [];

        const term = searchTerm.toLowerCase().trim();
        const results: StudentHistoryItem[] = [];

        sessions.forEach(session => {
            if (!session.studentRecords) return;

            session.studentRecords.forEach(student => {
                const name = (student['HỌ VÀ TÊN'] || '').toLowerCase();
                const studentId = (student['MÃ HỌC VIÊN'] || '').toString().toLowerCase();
                const cccd = (student['SỐ CHỨNG MINH'] || '').toString().toLowerCase();
                const sbd = (student['SỐ BÁO DANH'] || '').toString().toLowerCase();

                // Check match
                if (name.includes(term) || studentId.includes(term) || cccd.includes(term) || sbd === term) {
                    results.push({
                        sessionName: session.name,
                        reportDate: session.reportDate,
                        studentData: student
                    });
                }
            });
        });

        // Sort by date descending (latest exam first)
        return results.sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
    }, [sessions, searchTerm]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setHasSearched(true);
    };

    const getStatusBadge = (pass: boolean, absent: boolean) => {
        if (absent) return <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded">VẮNG</span>;
        return pass 
            ? <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">ĐẠT</span>
            : <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">TRƯỢT</span>;
    };

    const getScoreColor = (score: string | undefined) => {
        if (!score) return 'text-gray-400';
        const s = score.trim().toUpperCase();
        if (s === 'ĐẠT') return 'text-green-600 font-bold';
        if (s === 'KHÔNG ĐẠT' || s === 'TRƯỢT') return 'text-red-600 font-bold';
        return 'text-gray-800';
    };

    return (
        <div className="p-6 md:p-10 h-full overflow-y-auto bg-gray-100">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Tra cứu Hồ sơ Thí sinh</h2>
                <p className="text-gray-500 mt-1">Xem lịch sử thi, kết quả chi tiết của thí sinh qua các kỳ sát hạch.</p>
            </div>

            {/* Search Box */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                <form onSubmit={handleSearch} className="flex gap-4">
                    <div className="flex-1 relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input 
                            type="text" 
                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="Nhập tên, mã học viên, SBD hoặc số CCCD..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {/* Only show search button on mobile or if explicit action needed, though useMemo handles it live */}
                </form>
                <div className="mt-2 text-xs text-gray-500">
                    <i className="fa-solid fa-circle-info mr-1"></i>
                    Hệ thống sẽ tìm kiếm trong toàn bộ dữ liệu lịch sử đã lưu.
                </div>
            </div>

            {/* Results */}
            {isLoading ? (
                <div className="text-center py-10">
                    <i className="fa-solid fa-spinner animate-spin text-3xl text-blue-500"></i>
                    <p className="mt-2 text-gray-500">Đang tải dữ liệu...</p>
                </div>
            ) : (
                <>
                    {searchResults.length > 0 ? (
                        <div className="space-y-6">
                            <h3 className="font-bold text-gray-700">
                                Tìm thấy {searchResults.length} lượt thi phù hợp:
                            </h3>
                            
                            {searchResults.map((item, index) => {
                                const s = item.studentData;
                                const isPass = isStudentPassed(s);
                                const isAbsent = isStudentAbsent(s);

                                return (
                                    <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                                        {/* Header Card */}
                                        <div className={`p-4 border-b flex justify-between items-center ${isPass ? 'bg-green-50 border-green-100' : (isAbsent ? 'bg-gray-50' : 'bg-red-50 border-red-100')}`}>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-lg text-gray-800">{s['HỌ VÀ TÊN']}</span>
                                                    {getStatusBadge(isPass, isAbsent)}
                                                </div>
                                                <div className="text-sm text-gray-600 mt-1 flex gap-4">
                                                    <span><i className="fa-regular fa-id-card mr-1"></i> {s['SỐ CHỨNG MINH'] || 'Chưa cập nhật'}</span>
                                                    <span><i className="fa-solid fa-fingerprint mr-1"></i> Mã HV: {s['MÃ HỌC VIÊN']}</span>
                                                    <span><i className="fa-solid fa-cake-candles mr-1"></i> {new Date(s['NGÀY SINH'] || '').toLocaleDateString('vi-VN') === 'Invalid Date' ? s['NGÀY SINH'] : new Date(s['NGÀY SINH'] || '').toLocaleDateString('vi-VN')}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-semibold text-blue-600">{item.sessionName}</div>
                                                <div className="text-xs text-gray-500">{new Date(item.reportDate).toLocaleDateString('vi-VN')}</div>
                                            </div>
                                        </div>

                                        {/* Details Grid */}
                                        <div className="p-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                                            <div className="flex flex-col border-r last:border-r-0">
                                                <span className="text-gray-500 text-xs uppercase mb-1">Hạng GPLX</span>
                                                <span className="font-bold">{s['HẠNG GPLX']}</span>
                                            </div>
                                            <div className="flex flex-col border-r last:border-r-0">
                                                <span className="text-gray-500 text-xs uppercase mb-1">Lý Thuyết</span>
                                                <span className={getScoreColor(s['LÝ THUYẾT'])}>{s['LÝ THUYẾT'] || '-'}</span>
                                            </div>
                                            <div className="flex flex-col border-r last:border-r-0">
                                                <span className="text-gray-500 text-xs uppercase mb-1">Mô Phỏng</span>
                                                <span className={getScoreColor(s['MÔ PHỎNG'])}>{s['MÔ PHỎNG'] || '-'}</span>
                                            </div>
                                            <div className="flex flex-col border-r last:border-r-0">
                                                <span className="text-gray-500 text-xs uppercase mb-1">Sa Hình</span>
                                                <span className={getScoreColor(s['SA HÌNH'])}>{s['SA HÌNH'] || '-'}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-500 text-xs uppercase mb-1">Đường Trường</span>
                                                <span className={getScoreColor(s['ĐƯỜNG TRƯỜNG'])}>{s['ĐƯỜNG TRƯỜNG'] || '-'}</span>
                                            </div>
                                        </div>
                                        
                                        {/* Footer Info */}
                                        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex justify-between">
                                            <span>SBD: <strong>{s['SỐ BÁO DANH']}</strong></span>
                                            <span>Nơi cư trú: {s['NƠI CƯ TRÚ']}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        searchTerm && (
                            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                                <i className="fa-solid fa-user-slash text-4xl text-gray-300 mb-3"></i>
                                <p className="text-gray-500">Không tìm thấy thí sinh nào phù hợp với từ khóa "{searchTerm}".</p>
                            </div>
                        )
                    )}
                    
                    {!searchTerm && (
                        <div className="text-center py-20 opacity-50">
                            <i className="fa-solid fa-magnifying-glass text-6xl text-gray-300 mb-4"></i>
                            <p className="text-xl text-gray-400">Nhập thông tin để bắt đầu tìm kiếm</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
