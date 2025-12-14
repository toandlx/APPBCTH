
import React, { useState, useEffect, useMemo } from 'react';
import { storageService } from '../../services/storageService';
import type { SavedSession } from '../../types';
import { exportAggregateReportToExcel } from '../../services/excelGenerator';

type TimeFilter = 'month' | 'quarter' | 'year' | 'custom';

export const AggregateReportPage: React.FC = () => {
    const [sessions, setSessions] = useState<SavedSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Filter States
    const [filterType, setFilterType] = useState<TimeFilter>('month');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

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

    const filteredData = useMemo(() => {
        let start: Date, end: Date;

        if (filterType === 'month') {
            start = new Date(selectedYear, selectedMonth - 1, 1);
            end = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);
        } else if (filterType === 'quarter') {
            const startMonth = (selectedQuarter - 1) * 3;
            start = new Date(selectedYear, startMonth, 1);
            end = new Date(selectedYear, startMonth + 3, 0, 23, 59, 59);
        } else if (filterType === 'year') {
            start = new Date(selectedYear, 0, 1);
            end = new Date(selectedYear, 11, 31, 23, 59, 59);
        } else { // custom
            if (!customStartDate || !customEndDate) return [];
            start = new Date(customStartDate);
            start.setHours(0,0,0,0);
            end = new Date(customEndDate);
            end.setHours(23,59,59,999);
        }

        const filteredSessions = sessions.filter(s => {
            const sDate = new Date(s.reportDate);
            return sDate >= start && sDate <= end;
        });

        // Sort by date ascending
        return filteredSessions.sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime());

    }, [sessions, filterType, selectedYear, selectedMonth, selectedQuarter, customStartDate, customEndDate]);

    const totals = useMemo(() => {
        return filteredData.reduce((acc, session) => {
            acc.theory += session.grandTotal.theory.total;
            acc.simulation += session.grandTotal.simulation.total;
            acc.practical += session.grandTotal.practicalCourse.total;
            acc.road += session.grandTotal.onRoad.total;
            acc.applications += session.grandTotal.totalApplications;
            acc.pass += session.grandTotal.finalPass;
            return acc;
        }, { theory: 0, simulation: 0, practical: 0, road: 0, applications: 0, pass: 0 });
    }, [filteredData]);

    const handleExport = () => {
        if (filteredData.length === 0) {
            alert('Không có dữ liệu để xuất!');
            return;
        }
        
        let title = '';
        if (filterType === 'month') title = `Tháng ${selectedMonth}/${selectedYear}`;
        else if (filterType === 'quarter') title = `Quý ${selectedQuarter}/${selectedYear}`;
        else if (filterType === 'year') title = `Năm ${selectedYear}`;
        else title = `Từ ${new Date(customStartDate).toLocaleDateString('vi-VN')} đến ${new Date(customEndDate).toLocaleDateString('vi-VN')}`;

        exportAggregateReportToExcel(filteredData, totals, title);
    };

    return (
        <div className="p-6 md:p-10 h-full overflow-y-auto bg-gray-100">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Báo cáo Tổng hợp Lượt thi</h2>
                <p className="text-gray-500 mt-1">Thống kê tổng số lượt thi các môn theo thời gian.</p>
            </div>

            {/* Filter Controls */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                <div className="flex flex-col md:flex-row gap-6 items-end">
                    
                    {/* Filter Type */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Loại báo cáo</label>
                        <select 
                            value={filterType} 
                            onChange={(e) => setFilterType(e.target.value as TimeFilter)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-40"
                        >
                            <option value="month">Theo Tháng</option>
                            <option value="quarter">Theo Quý</option>
                            <option value="year">Theo Năm</option>
                            <option value="custom">Tùy chỉnh</option>
                        </select>
                    </div>

                    {/* Dynamic Inputs */}
                    {filterType === 'month' && (
                        <>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Tháng</label>
                                <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg w-24">
                                    {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Năm</label>
                                <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg w-28" />
                            </div>
                        </>
                    )}

                    {filterType === 'quarter' && (
                        <>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Quý</label>
                                <select value={selectedQuarter} onChange={(e) => setSelectedQuarter(Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg w-32">
                                    <option value={1}>Quý I</option>
                                    <option value={2}>Quý II</option>
                                    <option value={3}>Quý III</option>
                                    <option value={4}>Quý IV</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Năm</label>
                                <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg w-28" />
                            </div>
                        </>
                    )}

                    {filterType === 'year' && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Năm báo cáo</label>
                            <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg w-32" />
                        </div>
                    )}

                    {filterType === 'custom' && (
                        <>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Từ ngày</label>
                                <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Đến ngày</label>
                                <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg" />
                            </div>
                        </>
                    )}

                    <div className="flex-1 text-right">
                        <button 
                            onClick={handleExport}
                            disabled={filteredData.length === 0}
                            className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm font-medium flex items-center gap-2 ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <i className="fa-solid fa-file-excel"></i> Xuất Excel
                        </button>
                    </div>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-gray-500 text-xs font-bold uppercase tracking-wide">Số hồ sơ</div>
                    <div className="text-2xl font-bold text-gray-800 mt-1">{totals.applications.toLocaleString()}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-blue-500">
                    <div className="text-gray-500 text-xs font-bold uppercase tracking-wide">Lượt Lý Thuyết</div>
                    <div className="text-2xl font-bold text-blue-600 mt-1">{totals.theory.toLocaleString()}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-purple-500">
                    <div className="text-gray-500 text-xs font-bold uppercase tracking-wide">Lượt Mô Phỏng</div>
                    <div className="text-2xl font-bold text-purple-600 mt-1">{totals.simulation.toLocaleString()}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-orange-500">
                    <div className="text-gray-500 text-xs font-bold uppercase tracking-wide">Lượt Sa Hình</div>
                    <div className="text-2xl font-bold text-orange-600 mt-1">{totals.practical.toLocaleString()}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-green-500">
                    <div className="text-gray-500 text-xs font-bold uppercase tracking-wide">Lượt Đường Trường</div>
                    <div className="text-2xl font-bold text-green-600 mt-1">{totals.road.toLocaleString()}</div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 font-bold text-gray-700 flex justify-between">
                    <span>Chi tiết các Kỳ Sát Hạch ({filteredData.length})</span>
                </div>
                
                {isLoading ? (
                    <div className="p-10 text-center"><i className="fa-solid fa-spinner animate-spin text-blue-500 text-2xl"></i></div>
                ) : filteredData.length === 0 ? (
                    <div className="p-10 text-center text-gray-500 italic">Không tìm thấy kỳ sát hạch nào trong khoảng thời gian này.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                                <tr>
                                    <th className="px-4 py-3 w-12 text-center">STT</th>
                                    <th className="px-4 py-3">Tên Kỳ Sát Hạch</th>
                                    <th className="px-4 py-3 w-32">Ngày</th>
                                    <th className="px-4 py-3 text-center bg-blue-50 w-28">Lý Thuyết</th>
                                    <th className="px-4 py-3 text-center bg-purple-50 w-28">Mô Phỏng</th>
                                    <th className="px-4 py-3 text-center bg-orange-50 w-28">Sa Hình</th>
                                    <th className="px-4 py-3 text-center bg-green-50 w-28">Đường Trường</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredData.map((s, idx) => (
                                    <tr key={s.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-center">{idx + 1}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                                        <td className="px-4 py-3">{new Date(s.reportDate).toLocaleDateString('vi-VN')}</td>
                                        <td className="px-4 py-3 text-center bg-blue-50/30 font-semibold">{s.grandTotal.theory.total}</td>
                                        <td className="px-4 py-3 text-center bg-purple-50/30 font-semibold">{s.grandTotal.simulation.total}</td>
                                        <td className="px-4 py-3 text-center bg-orange-50/30 font-semibold">{s.grandTotal.practicalCourse.total}</td>
                                        <td className="px-4 py-3 text-center bg-green-50/30 font-semibold">{s.grandTotal.onRoad.total}</td>
                                    </tr>
                                ))}
                                <tr className="bg-gray-100 font-bold text-gray-800 border-t-2 border-gray-300">
                                    <td colSpan={3} className="px-4 py-4 text-center uppercase">Tổng Cộng</td>
                                    <td className="px-4 py-4 text-center text-blue-700 bg-blue-100">{totals.theory.toLocaleString()}</td>
                                    <td className="px-4 py-4 text-center text-purple-700 bg-purple-100">{totals.simulation.toLocaleString()}</td>
                                    <td className="px-4 py-4 text-center text-orange-700 bg-orange-100">{totals.practical.toLocaleString()}</td>
                                    <td className="px-4 py-4 text-center text-green-700 bg-green-100">{totals.road.toLocaleString()}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
