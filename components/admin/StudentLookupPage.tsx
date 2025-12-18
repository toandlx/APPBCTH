
import React, { useState, useMemo, useEffect } from 'react';
import type { SavedSession, StudentRecord } from '../../types';
import { storageService } from '../../services/storageService';
import { isStudentPassed, isStudentAbsent } from '../../services/reportUtils';

interface StudentHistoryItem {
    sessionName: string;
    reportDate: string;
    studentData: StudentRecord;
    // Pre-calculated fields for faster filtering
    normalizedName: string;
    normalizedId: string;
    normalizedSbd: string;
    normalizedCccd: string;
    timestamp: number;
}

const ITEMS_PER_PAGE = 20;

export const StudentLookupPage: React.FC = () => {
    const [sessions, setSessions] = useState<SavedSession[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(''); // New: Debounce state
    
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedClass, setSelectedClass] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'passed' | 'failed' | 'absent'>('all');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);

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

    // Debounce Logic: Update debouncedSearchTerm 300ms after searchTerm stops changing
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, dateFrom, dateTo, selectedClass, selectedStatus]);

    // OPTIMIZATION 1: Flatten and normalize data ONCE when sessions change.
    // This removes the O(N^2) loop from the render/filter cycle.
    const allStudentItems = useMemo(() => {
        if (sessions.length === 0) return [];
        
        const flattened: StudentHistoryItem[] = [];
        
        sessions.forEach(session => {
            if (!session.studentRecords) return;
            
            // Pre-calculate timestamp for date filtering
            const sessionTime = new Date(session.reportDate).getTime();

            session.studentRecords.forEach(student => {
                flattened.push({
                    sessionName: session.name,
                    reportDate: session.reportDate,
                    studentData: student,
                    timestamp: sessionTime,
                    // Pre-normalize strings for faster search
                    normalizedName: (student['HỌ VÀ TÊN'] || '').toLowerCase(),
                    normalizedId: (student['MÃ HỌC VIÊN'] || '').toString().toLowerCase(),
                    normalizedSbd: (student['SỐ BÁO DANH'] || '').toString().toLowerCase(),
                    normalizedCccd: (student['SỐ CHỨNG MINH'] || '').toString().toLowerCase(),
                });
            });
        });

        // Sort by date descending (latest exam first)
        return flattened.sort((a, b) => b.timestamp - a.timestamp);
    }, [sessions]);

    // Extract unique license classes for filter dropdown from the pre-calculated list
    const uniqueClasses = useMemo(() => {
        const classes = new Set<string>();
        allStudentItems.forEach(item => {
            if (item.studentData['HẠNG GPLX']) {
                classes.add(item.studentData['HẠNG GPLX'].toString().trim());
            }
        });
        return Array.from(classes).sort();
    }, [allStudentItems]);

    // OPTIMIZATION 2: Efficient Filtering on the flat list
    const filteredResults = useMemo(() => {
        // Prepare filter values
        const term = debouncedSearchTerm.toLowerCase().trim();
        const fromDate = dateFrom ? new Date(dateFrom).getTime() : 0;
        const toDate = dateTo ? new Date(dateTo).getTime() + (86400000 - 1) : Infinity;

        return allStudentItems.filter(item => {
            // 1. Date Filter (Fastest check)
            if (item.timestamp < fromDate || item.timestamp > toDate) return false;

            // 2. Class Filter
            if (selectedClass !== 'all' && item.studentData['HẠNG GPLX'] !== selectedClass) return false;

            // 3. Status Filter
            if (selectedStatus !== 'all') {
                const isAbsent = isStudentAbsent(item.studentData);
                const isPass = isStudentPassed(item.studentData);
                
                if (selectedStatus === 'passed' && !isPass) return false;
                if (selectedStatus === 'absent' && !isAbsent) return false;
                if (selectedStatus === 'failed' && (isPass || isAbsent)) return false; 
            }

            // 4. Search Term (Using pre-normalized fields)
            if (term) {
                if (
                    !item.normalizedName.includes(term) && 
                    !item.normalizedId.includes(term) && 
                    !item.normalizedCccd.includes(term) && 
                    item.normalizedSbd !== term
                ) {
                    return false;
                }
            }

            return true;
        });
    }, [allStudentItems, debouncedSearchTerm, dateFrom, dateTo, selectedClass, selectedStatus]);

    // OPTIMIZATION 3: Pagination Logic
    const totalPages = Math.ceil(filteredResults.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredResults.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredResults, currentPage]);

    // Quick Stats Calculation
    const stats = useMemo(() => {
        let pass = 0, fail = 0, absent = 0;
        // Calculate stats based on FULL filtered results, not just the current page
        filteredResults.forEach(item => {
            if (isStudentAbsent(item.studentData)) absent++;
            else if (isStudentPassed(item.studentData)) pass++;
            else fail++;
        });
        return { total: filteredResults.length, pass, fail, absent };
    }, [filteredResults]);

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
        return 'text-gray-800 font-medium';
    };

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto bg-gray-50/50">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Tra cứu Hồ sơ Thí sinh</h2>
                <p className="text-gray-500 mt-1 text-sm">Tìm kiếm và lọc kết quả thi sát hạch từ cơ sở dữ liệu.</p>
            </div>

            {/* Filter Panel */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-6 space-y-4">
                {/* Top Row: Search & Reset */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input 
                            type="text" 
                            className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                            placeholder="Tìm tên, mã học viên, SBD hoặc CCCD..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {/* Loading indicator for debounce */}
                        {searchTerm !== debouncedSearchTerm && (
                            <i className="fa-solid fa-spinner animate-spin absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        )}
                    </div>
                    {(searchTerm || dateFrom || dateTo || selectedClass !== 'all' || selectedStatus !== 'all') && (
                        <button 
                            onClick={handleResetFilters}
                            className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            <i className="fa-solid fa-filter-circle-xmark"></i> Xóa bộ lọc
                        </button>
                    )}
                </div>

                {/* Bottom Row: Detailed Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Date Range */}
                    <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                        <div className="flex-1">
                            <input 
                                type="date" 
                                className="w-full bg-transparent border-none text-xs focus:ring-0 p-2 text-gray-600"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                title="Từ ngày"
                            />
                        </div>
                        <span className="text-gray-400 text-xs"><i className="fa-solid fa-arrow-right"></i></span>
                        <div className="flex-1">
                            <input 
                                type="date" 
                                className="w-full bg-transparent border-none text-xs focus:ring-0 p-2 text-gray-600"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                title="Đến ngày"
                            />
                        </div>
                    </div>

                    {/* Class Filter */}
                    <div className="relative">
                        <select 
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white appearance-none"
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                        >
                            <option value="all">Tất cả Hạng GPLX</option>
                            {uniqueClasses.map(cls => (
                                <option key={cls} value={cls}>Hạng {cls}</option>
                            ))}
                        </select>
                        <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <select 
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white appearance-none"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value as any)}
                        >
                            <option value="all">Tất cả Trạng thái</option>
                            <option value="passed">Đạt</option>
                            <option value="failed">Trượt</option>
                            <option value="absent">Vắng thi</option>
                        </select>
                        <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                    </div>
                </div>
            </div>

            {/* Quick Stats & Results */}
            {isLoading ? (
                <div className="text-center py-20">
                    <i className="fa-solid fa-spinner animate-spin text-3xl text-blue-500"></i>
                    <p className="mt-3 text-gray-500">Đang tải dữ liệu...</p>
                </div>
            ) : (
                <>
                    {/* Stats Bar */}
                    {filteredResults.length > 0 && (
                        <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
                            <span className="font-bold text-gray-700">Kết quả: {stats.total} thí sinh</span>
                            <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
                            <span className="text-green-600"><i className="fa-solid fa-check-circle mr-1"></i>Đạt: {stats.pass}</span>
                            <span className="text-red-600"><i className="fa-solid fa-circle-xmark mr-1"></i>Trượt: {stats.fail}</span>
                            <span className="text-gray-500"><i className="fa-solid fa-user-slash mr-1"></i>Vắng: {stats.absent}</span>
                        </div>
                    )}

                    {filteredResults.length > 0 ? (
                        <>
                        <div className="space-y-4">
                            {paginatedData.map((item, index) => {
                                const s = item.studentData;
                                const isPass = isStudentPassed(s);
                                const isAbsent = isStudentAbsent(s);

                                // Use a stable key if possible (SBD + Session Report Date + Index) to prevent re-render glitches
                                const uniqueKey = `${s['SỐ BÁO DANH']}_${item.reportDate}_${index}`;

                                return (
                                    <div key={uniqueKey} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200">
                                        <div className="flex flex-col md:flex-row">
                                            {/* Left: Basic Info */}
                                            <div className="p-4 md:w-1/3 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/30">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Họ và tên</span>
                                                    {getStatusBadge(isPass, isAbsent)}
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-800 mb-1">{s['HỌ VÀ TÊN']}</h3>
                                                <div className="space-y-1 text-sm text-gray-600">
                                                    <div className="flex items-center gap-2" title="Ngày sinh">
                                                        <i className="fa-solid fa-cake-candles w-4 text-center text-gray-400"></i>
                                                        <span>{new Date(s['NGÀY SINH'] || '').toLocaleDateString('vi-VN') === 'Invalid Date' ? s['NGÀY SINH'] : new Date(s['NGÀY SINH'] || '').toLocaleDateString('vi-VN')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2" title="Số CCCD">
                                                        <i className="fa-regular fa-id-card w-4 text-center text-gray-400"></i>
                                                        <span className="font-mono">{s['SỐ CHỨNG MINH'] || '---'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2" title="Mã Học Viên">
                                                        <i className="fa-solid fa-fingerprint w-4 text-center text-gray-400"></i>
                                                        <span className="font-mono">{s['MÃ HỌC VIÊN']}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Middle: Exam Scores */}
                                            <div className="p-4 md:w-1/2 grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
                                                <div className="text-center">
                                                    <div className="text-[10px] uppercase text-gray-400 font-bold mb-1">Lý Thuyết</div>
                                                    <div className={getScoreColor(s['LÝ THUYẾT'])}>{s['LÝ THUYẾT'] || '-'}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-[10px] uppercase text-gray-400 font-bold mb-1">Mô Phỏng</div>
                                                    <div className={getScoreColor(s['MÔ PHỎNG'])}>{s['MÔ PHỎNG'] || '-'}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-[10px] uppercase text-gray-400 font-bold mb-1">Sa Hình</div>
                                                    <div className={getScoreColor(s['SA HÌNH'])}>{s['SA HÌNH'] || '-'}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-[10px] uppercase text-gray-400 font-bold mb-1">Đ.Trường</div>
                                                    <div className={getScoreColor(s['ĐƯỜNG TRƯỜNG'])}>{s['ĐƯỜNG TRƯỜNG'] || '-'}</div>
                                                </div>
                                                
                                                {/* Extra Details Row in Grid */}
                                                <div className="col-span-2 sm:col-span-4 mt-2 pt-2 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
                                                     <div className="flex flex-col">
                                                        <span className="uppercase text-[10px] font-bold text-gray-400">Hạng</span>
                                                        <span className="font-bold text-gray-700">{s['HẠNG GPLX']}</span>
                                                     </div>
                                                     <div className="flex flex-col">
                                                        <span className="uppercase text-[10px] font-bold text-gray-400">Nội dung thi</span>
                                                        <span className="font-bold text-blue-600">{s['NỘI DUNG THI'] || '-'}</span>
                                                     </div>
                                                     <div className="flex flex-col">
                                                        <span className="uppercase text-[10px] font-bold text-gray-400">SBD</span>
                                                        <span className="font-bold text-gray-700">{s['SỐ BÁO DANH']}</span>
                                                     </div>
                                                </div>
                                            </div>

                                            {/* Right: Session Info */}
                                            <div className="p-4 md:w-1/6 bg-blue-50/30 border-t md:border-t-0 md:border-l border-gray-100 flex flex-col justify-center text-right">
                                                <div className="text-[10px] uppercase text-gray-400 font-bold mb-1">Kỳ Sát Hạch</div>
                                                <div className="text-sm font-semibold text-blue-700 line-clamp-2" title={item.sessionName}>{item.sessionName}</div>
                                                <div className="text-xs text-gray-500 mt-1">{new Date(item.reportDate).toLocaleDateString('vi-VN')}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="mt-8 flex justify-center items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <i className="fa-solid fa-chevron-left"></i>
                                </button>
                                
                                <span className="text-sm text-gray-600 px-2">
                                    Trang <strong>{currentPage}</strong> / {totalPages}
                                </span>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <i className="fa-solid fa-chevron-right"></i>
                                </button>
                            </div>
                        )}
                        </>
                    ) : (
                        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                <i className="fa-solid fa-filter"></i>
                            </div>
                            <h3 className="text-gray-600 font-medium">Không tìm thấy kết quả</h3>
                            <p className="text-gray-400 text-sm mt-1">Vui lòng thử thay đổi từ khóa hoặc điều chỉnh bộ lọc.</p>
                            <button 
                                onClick={handleResetFilters}
                                className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                            >
                                Xóa bộ lọc
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
