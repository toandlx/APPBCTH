
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { SavedSession, StudentRecord } from '../../types';
import { storageService } from '../../services/storageService';
import { isStudentPassed, isStudentAbsent } from '../../services/reportUtils';
import { StudentHistoryModal } from '../ui/StudentHistoryModal';

interface StudentHistoryItem {
    sessionName: string;
    reportDate: string;
    studentData: StudentRecord;
    normalizedName: string;
    normalizedId: string;
    normalizedSbd: string;
    normalizedCccd: string;
    timestamp: number;
}

export const StudentLookupPage: React.FC = () => {
    const [sessions, setSessions] = useState<SavedSession[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Modal State
    const [selectedHistoryStudent, setSelectedHistoryStudent] = useState<{ id: string, name: string } | null>(null);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedClass, setSelectedClass] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'passed' | 'failed' | 'absent'>('all');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // Load data once
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

    // Debounce Logic
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Reset pagination when filters or page size change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, dateFrom, dateTo, selectedClass, selectedStatus, itemsPerPage]);

    // Scroll to top on page change
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [currentPage]);

    // Flatten and normalize data
    const allStudentItems = useMemo(() => {
        if (sessions.length === 0) return [];
        const flattened: StudentHistoryItem[] = [];
        sessions.forEach(session => {
            if (!session.studentRecords) return;
            const sessionTime = new Date(session.reportDate).getTime();
            session.studentRecords.forEach(student => {
                flattened.push({
                    sessionName: session.name,
                    reportDate: session.reportDate,
                    studentData: student,
                    timestamp: sessionTime,
                    normalizedName: (student['HỌ VÀ TÊN'] || '').toLowerCase(),
                    normalizedId: (student['MÃ HỌC VIÊN'] || '').toString().toLowerCase(),
                    normalizedSbd: (student['SỐ BÁO DANH'] || '').toString().toLowerCase(),
                    normalizedCccd: (student['SỐ CHỨNG MINH'] || '').toString().toLowerCase(),
                });
            });
        });
        return flattened.sort((a, b) => b.timestamp - a.timestamp);
    }, [sessions]);

    const uniqueClasses = useMemo(() => {
        const classes = new Set<string>();
        allStudentItems.forEach(item => {
            if (item.studentData['HẠNG GPLX']) classes.add(item.studentData['HẠNG GPLX'].toString().trim());
        });
        return Array.from(classes).sort();
    }, [allStudentItems]);

    // Filtering
    const filteredResults = useMemo(() => {
        const term = debouncedSearchTerm.toLowerCase().trim();
        const fromDate = dateFrom ? new Date(dateFrom).getTime() : 0;
        const toDate = dateTo ? new Date(dateTo).getTime() + (86400000 - 1) : Infinity;

        return allStudentItems.filter(item => {
            if (item.timestamp < fromDate || item.timestamp > toDate) return false;
            if (selectedClass !== 'all' && item.studentData['HẠNG GPLX'] !== selectedClass) return false;
            if (selectedStatus !== 'all') {
                const isAbsent = isStudentAbsent(item.studentData);
                const isPass = isStudentPassed(item.studentData);
                if (selectedStatus === 'passed' && !isPass) return false;
                if (selectedStatus === 'absent' && !isAbsent) return false;
                if (selectedStatus === 'failed' && (isPass || isAbsent)) return false; 
            }
            if (term) {
                if (!item.normalizedName.includes(term) && !item.normalizedId.includes(term) && 
                    !item.normalizedCccd.includes(term) && item.normalizedSbd !== term) {
                    return false;
                }
            }
            return true;
        });
    }, [allStudentItems, debouncedSearchTerm, dateFrom, dateTo, selectedClass, selectedStatus]);

    // Pagination Calcs
    const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredResults.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredResults, currentPage, itemsPerPage]);

    const stats = useMemo(() => {
        let pass = 0, fail = 0, absent = 0;
        filteredResults.forEach(item => {
            if (isStudentAbsent(item.studentData)) absent++;
            else if (isStudentPassed(item.studentData)) pass++;
            else fail++;
        });
        return { total: filteredResults.length, pass, fail, absent };
    }, [filteredResults]);

    // Page number generation logic
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;
        if (totalPages <= maxVisible + 2) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }
        return pages;
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setDateFrom('');
        setDateTo('');
        setSelectedClass('all');
        setSelectedStatus('all');
    };

    const getStatusBadge = (pass: boolean, absent: boolean) => {
        if (absent) return <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-full border border-gray-200 uppercase tracking-wider">Vắng</span>;
        return pass 
            ? <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200 uppercase tracking-wider">Đạt</span>
            : <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-200 uppercase tracking-wider">Trượt</span>;
    };

    const getScoreColor = (score: string | undefined) => {
        if (!score) return 'text-gray-300';
        const s = score.trim().toUpperCase();
        if (s === 'ĐẠT') return 'text-green-600 font-bold';
        if (s === 'KHÔNG ĐẠT' || s === 'TRƯỢT') return 'text-red-600 font-bold';
        return 'text-gray-800 dark:text-gray-200 font-medium';
    };

    return (
        <div ref={scrollContainerRef} className="p-4 md:p-8 h-full overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50 transition-colors">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Tra cứu Hồ sơ Thí sinh</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Tìm kiếm và lọc kết quả thi sát hạch từ cơ sở dữ liệu.</p>
            </div>

            {/* Filter Panel */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 space-y-4 transition-colors">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input 
                            type="text" 
                            className="w-full pl-11 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm dark:bg-gray-700 dark:text-white"
                            placeholder="Tìm tên, mã học viên, SBD hoặc CCCD..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm !== debouncedSearchTerm && (
                            <i className="fa-solid fa-spinner animate-spin absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        )}
                    </div>
                    {(searchTerm || dateFrom || dateTo || selectedClass !== 'all' || selectedStatus !== 'all') && (
                        <button 
                            onClick={handleResetFilters}
                            className="px-4 py-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            <i className="fa-solid fa-filter-circle-xmark"></i> Xóa bộ lọc
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-1 rounded-lg border border-gray-200 dark:border-gray-600">
                        <input type="date" className="w-full bg-transparent border-none text-xs focus:ring-0 p-2 text-gray-600 dark:text-gray-200" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="Từ ngày" />
                        <span className="text-gray-400 text-xs"><i className="fa-solid fa-arrow-right"></i></span>
                        <input type="date" className="w-full bg-transparent border-none text-xs focus:ring-0 p-2 text-gray-600 dark:text-gray-200" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="Đến ngày" />
                    </div>

                    <div className="relative">
                        <select className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white dark:bg-gray-700 dark:text-white appearance-none" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                            <option value="all">Tất cả Hạng GPLX</option>
                            {uniqueClasses.map(cls => <option key={cls} value={cls}>Hạng {cls}</option>)}
                        </select>
                        <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                    </div>

                    <div className="relative">
                        <select className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white dark:bg-gray-700 dark:text-white appearance-none" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)}>
                            <option value="all">Tất cả Trạng thái</option>
                            <option value="passed">Đạt</option>
                            <option value="failed">Trượt</option>
                            <option value="absent">Vắng thi</option>
                        </select>
                        <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                    </div>

                    <div className="flex items-center gap-3">
                         <span className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Hiển thị</span>
                         <select className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white dark:bg-gray-700 dark:text-white appearance-none w-20" value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-20">
                    <i className="fa-solid fa-spinner animate-spin text-3xl text-blue-500"></i>
                    <p className="mt-3 text-gray-500 dark:text-gray-400">Đang tải dữ liệu...</p>
                </div>
            ) : (
                <>
                    {filteredResults.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 text-sm">
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-gray-700 dark:text-gray-200">Kết quả: {stats.total} thí sinh</span>
                                <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>
                                <span className="text-green-600 dark:text-green-400"><i className="fa-solid fa-check-circle mr-1"></i>Đạt: {stats.pass}</span>
                                <span className="text-red-600 dark:text-red-400"><i className="fa-solid fa-circle-xmark mr-1"></i>Trượt: {stats.fail}</span>
                                <span className="text-gray-500 dark:text-gray-400"><i className="fa-solid fa-user-slash mr-1"></i>Vắng: {stats.absent}</span>
                            </div>
                            <div className="text-gray-500 dark:text-gray-400 italic text-xs">
                                Đang hiển thị {((currentPage-1)*itemsPerPage)+1} đến {Math.min(currentPage*itemsPerPage, stats.total)}
                            </div>
                        </div>
                    )}

                    {filteredResults.length > 0 ? (
                        <>
                        <div className="space-y-4">
                            {paginatedData.map((item, index) => {
                                const s = item.studentData;
                                const isPass = isStudentPassed(s);
                                const isAbsent = isStudentAbsent(s);
                                const uniqueKey = `${s['SỐ BÁO DANH']}_${item.reportDate}_${index}`;

                                return (
                                    <div key={uniqueKey} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all duration-200">
                                        <div className="flex flex-col md:flex-row">
                                            <div className="p-4 md:w-1/3 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-700/30">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Họ và tên</span>
                                                    {getStatusBadge(isPass, isAbsent)}
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">{s['HỌ VÀ TÊN']}</h3>
                                                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                                    <div className="flex items-center gap-2"><i className="fa-solid fa-cake-candles w-4 text-center text-gray-400"></i><span>{s['NGÀY SINH']}</span></div>
                                                    <div className="flex items-center gap-2"><i className="fa-regular fa-id-card w-4 text-center text-gray-400"></i><span className="font-mono">{s['SỐ CHỨNG MINH'] || '---'}</span></div>
                                                    <div className="flex items-center gap-2"><i className="fa-solid fa-fingerprint w-4 text-center text-gray-400"></i><span className="font-mono">{s['MÃ HỌC VIÊN']}</span></div>
                                                </div>
                                            </div>

                                            <div className="p-4 md:w-1/2 grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
                                                {[
                                                    { label: 'Lý Thuyết', score: s['LÝ THUYẾT'] },
                                                    { label: 'Mô Phỏng', score: s['MÔ PHỎNG'] },
                                                    { label: 'Sa Hình', score: s['SA HÌNH'] },
                                                    { label: 'Đ.Trường', score: s['ĐƯỜNG TRƯỜNG'] }
                                                ].map((exam, i) => (
                                                    <div key={i} className="text-center">
                                                        <div className="text-[10px] uppercase text-gray-400 font-bold mb-1">{exam.label}</div>
                                                        <div className={getScoreColor(exam.score)}>{exam.score || '-'}</div>
                                                    </div>
                                                ))}
                                                <div className="col-span-2 sm:col-span-4 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                                                     <div className="flex gap-4">
                                                        <div className="flex flex-col"><span className="uppercase text-[10px] font-bold text-gray-400">Hạng</span><span className="font-bold text-gray-700 dark:text-gray-200">{s['HẠNG GPLX']}</span></div>
                                                        <div className="flex flex-col"><span className="uppercase text-[10px] font-bold text-gray-400">Nội dung thi</span><span className="font-bold text-blue-600 dark:text-blue-400">{s['NỘI DUNG THI'] || '-'}</span></div>
                                                        <div className="flex flex-col"><span className="uppercase text-[10px] font-bold text-gray-400">SBD</span><span className="font-bold text-gray-700 dark:text-gray-200">{s['SỐ BÁO DANH']}</span></div>
                                                     </div>
                                                     <button 
                                                        onClick={() => setSelectedHistoryStudent({ id: String(s['MÃ HỌC VIÊN']), name: s['HỌ VÀ TÊN'] })}
                                                        className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 transition-colors font-bold flex items-center gap-1.5 shadow-sm"
                                                     >
                                                        <i className="fa-solid fa-clock-rotate-left"></i> Xem lịch sử
                                                     </button>
                                                </div>
                                            </div>

                                            <div className="p-4 md:w-1/6 bg-blue-50/30 dark:bg-blue-900/10 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-700 flex flex-col justify-center text-right">
                                                <div className="text-[10px] uppercase text-gray-400 font-bold mb-1">Kỳ Sát Hạch</div>
                                                <div className="text-sm font-semibold text-blue-700 dark:text-blue-300 line-clamp-2">{item.sessionName}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(item.reportDate).toLocaleDateString('vi-VN')}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Advanced Pagination Navigation */}
                        {totalPages > 1 && (
                            <div className="mt-10 mb-20 flex flex-wrap justify-center items-center gap-2">
                                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="Trang đầu">
                                    <i className="fa-solid fa-angles-left"></i>
                                </button>
                                <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                    <i className="fa-solid fa-chevron-left"></i>
                                </button>
                                
                                {getPageNumbers().map((p, i) => (
                                    typeof p === 'number' ? (
                                        <button key={i} onClick={() => setCurrentPage(p)} className={`w-10 h-10 flex items-center justify-center rounded-md font-bold text-sm transition-all ${currentPage === p ? 'bg-blue-600 text-white shadow-md scale-110' : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                            {p}
                                        </button>
                                    ) : (
                                        <span key={i} className="px-2 text-gray-400 font-bold">...</span>
                                    )
                                ))}

                                <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                    <i className="fa-solid fa-chevron-right"></i>
                                </button>
                                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="Trang cuối">
                                    <i className="fa-solid fa-angles-right"></i>
                                </button>
                            </div>
                        )}
                        </>
                    ) : (
                        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 transition-colors">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                <i className="fa-solid fa-filter"></i>
                            </div>
                            <h3 className="text-gray-600 dark:text-gray-300 font-medium">Không tìm thấy kết quả</h3>
                            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Vui lòng thử thay đổi từ khóa hoặc điều chỉnh bộ lọc.</p>
                            <button onClick={handleResetFilters} className="mt-4 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                                Xóa bộ lọc
                            </button>
                        </div>
                    )}
                </>
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
