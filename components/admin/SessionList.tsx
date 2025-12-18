
import React, { useMemo, useState } from 'react';
import type { SavedSession } from '../../types';

interface SessionListProps {
    sessions: SavedSession[];
    onSelectSession: (session: SavedSession) => void;
    onDeleteSession: (id: string) => void;
    onCreateNew: () => void;
    onRefresh?: () => Promise<void>;
}

export const SessionList: React.FC<SessionListProps> = ({ sessions, onSelectSession, onDeleteSession, onCreateNew, onRefresh }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        try {
            if (onRefresh) {
                await onRefresh();
            }
        } finally {
            setIsRefreshing(false);
        }
    };

    const filteredSessions = useMemo(() => {
        return sessions.filter(s => 
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            new Date(s.reportDate).toLocaleDateString('vi-VN').includes(searchTerm)
        );
    }, [sessions, searchTerm]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN', { 
            day: '2-digit', month: '2-digit', year: 'numeric' 
        });
    };

    return (
        <div className="p-6 md:p-10 h-full overflow-y-auto bg-gray-100 dark:bg-gray-900 transition-colors">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Danh sách Kỳ sát hạch</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Quản lý và tra cứu kết quả các kỳ thi sát hạch lái xe.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleManualRefresh}
                        disabled={isRefreshing}
                        className="px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-all flex items-center gap-2 font-medium"
                        title="Làm mới danh sách"
                    >
                        <i className={`fa-solid fa-rotate ${isRefreshing ? 'animate-spin' : ''}`}></i>
                    </button>
                    <button 
                        onClick={onCreateNew}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-all flex items-center gap-2 font-medium"
                    >
                        <i className="fa-solid fa-plus"></i> Tạo Kỳ Mới
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-4 bg-gray-50 dark:bg-gray-750">
                    <div className="relative flex-1 max-w-md">
                        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm theo tên kỳ thi, ngày thi..." 
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm dark:bg-gray-700 dark:text-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {filteredSessions.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                        <div className="mb-4 text-gray-300 dark:text-gray-600">
                            <i className="fa-solid fa-folder-open text-6xl"></i>
                        </div>
                        <p className="text-lg font-medium">Chưa có dữ liệu kỳ sát hạch</p>
                        <p className="text-sm mt-1">Nhấn "Tạo Kỳ Mới" để bắt đầu nhập liệu.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 uppercase font-semibold text-xs">
                                <tr>
                                    <th className="px-4 py-4 min-w-[180px]">Tên Kỳ Sát Hạch</th>
                                    <th className="px-2 py-4 text-center">Ngày</th>
                                    <th className="px-2 py-4 text-center bg-blue-50 dark:bg-blue-900/30">Hồ sơ / Dự thi</th>
                                    
                                    <th className="px-2 py-4 text-center hidden xl:table-cell">Lý thuyết<br/><span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">(Đạt/Tổng)</span></th>
                                    <th className="px-2 py-4 text-center hidden xl:table-cell">Mô phỏng<br/><span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">(Đạt/Tổng)</span></th>
                                    <th className="px-2 py-4 text-center hidden xl:table-cell">Sa hình<br/><span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">(Đạt/Tổng)</span></th>
                                    <th className="px-2 py-4 text-center hidden xl:table-cell">Đường trường<br/><span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">(Đạt/Tổng)</span></th>
                                    <th className="px-4 py-4 text-center bg-green-50 dark:bg-green-900/30">Tổng Đạt</th>
                                    <th className="px-4 py-4 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredSessions.map((session) => {
                                    return (
                                    <tr key={session.id} className="hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors group">
                                        <td className="px-4 py-4 font-medium text-gray-900 dark:text-white">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <i className="fa-solid fa-file-lines text-blue-500"></i>
                                                    <span>{session.name}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-2 py-4 text-center whitespace-nowrap text-xs">
                                            {formatDate(session.reportDate)}
                                        </td>
                                        {/* Tổng Hồ Sơ / Dự Thi */}
                                        <td className="px-2 py-4 text-center bg-blue-50/50 dark:bg-blue-900/20">
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold text-gray-800 dark:text-gray-200">{session.grandTotal.totalApplications}</span>
                                                <span className="text-[11px] text-gray-500 dark:text-gray-400 border-t border-gray-300 dark:border-gray-600 w-8 mt-0.5 pt-0.5">{session.grandTotal.totalParticipants} thi</span>
                                            </div>
                                        </td>

                                        {/* Lý Thuyết */}
                                        <td className="px-2 py-4 text-center hidden xl:table-cell">
                                             <span className="text-green-700 dark:text-green-400 font-semibold">{session.grandTotal.theory.pass}</span>
                                             <span className="text-gray-400 mx-1">/</span>
                                             <span className="text-gray-600 dark:text-gray-400">{session.grandTotal.theory.total}</span>
                                        </td>
                                        
                                        {/* Mô Phỏng */}
                                        <td className="px-2 py-4 text-center hidden xl:table-cell">
                                             <span className="text-green-700 dark:text-green-400 font-semibold">{session.grandTotal.simulation.pass}</span>
                                             <span className="text-gray-400 mx-1">/</span>
                                             <span className="text-gray-600 dark:text-gray-400">{session.grandTotal.simulation.total}</span>
                                        </td>

                                        {/* Sa Hình */}
                                        <td className="px-2 py-4 text-center hidden xl:table-cell">
                                             <span className="text-green-700 dark:text-green-400 font-semibold">{session.grandTotal.practicalCourse.pass}</span>
                                             <span className="text-gray-400 mx-1">/</span>
                                             <span className="text-gray-600 dark:text-gray-400">{session.grandTotal.practicalCourse.total}</span>
                                        </td>

                                        {/* Đường Trường */}
                                        <td className="px-2 py-4 text-center hidden xl:table-cell">
                                             <span className="text-green-700 dark:text-green-400 font-semibold">{session.grandTotal.onRoad.pass}</span>
                                             <span className="text-gray-400 mx-1">/</span>
                                             <span className="text-gray-600 dark:text-gray-400">{session.grandTotal.onRoad.total}</span>
                                        </td>

                                        {/* Kết Quả Cuối */}
                                        <td className="px-4 py-4 text-center bg-green-50/50 dark:bg-green-900/20">
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold text-green-700 dark:text-green-400 text-lg">{session.grandTotal.finalPass}</span>
                                                <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-1.5 py-0.5 rounded-full border border-gray-200 dark:border-gray-600 mt-1">
                                                    {((session.grandTotal.finalPass / session.grandTotal.totalParticipants * 100) || 0).toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                        
                                        <td className="px-4 py-4 text-right whitespace-nowrap">
                                            <button 
                                                onClick={() => onSelectSession(session)}
                                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium mr-3 px-2 py-1 hover:bg-blue-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                title="Xem chi tiết"
                                            >
                                                <i className="fa-solid fa-eye"></i>
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    if(window.confirm('Bạn có chắc chắn muốn xóa kỳ sát hạch này không?')) {
                                                        onDeleteSession(session.id);
                                                    }
                                                }}
                                                className="text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 px-2 py-1 hover:bg-red-50 dark:hover:bg-gray-700 rounded transition-colors"
                                                title="Xóa"
                                            >
                                                <i className="fa-solid fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
