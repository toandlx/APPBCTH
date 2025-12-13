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
        <div className="p-6 md:p-10 h-full overflow-y-auto bg-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Danh sách Kỳ sát hạch</h2>
                    <p className="text-gray-500 mt-1">Quản lý và tra cứu kết quả các kỳ thi sát hạch lái xe.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleManualRefresh}
                        disabled={isRefreshing}
                        className="px-4 py-2.5 bg-white text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-all flex items-center gap-2 font-medium"
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

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center gap-4 bg-gray-50">
                    <div className="relative flex-1 max-w-md">
                        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm theo tên kỳ thi, ngày thi..." 
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {filteredSessions.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <div className="mb-4 text-gray-300">
                            <i className="fa-solid fa-folder-open text-6xl"></i>
                        </div>
                        <p className="text-lg font-medium">Chưa có dữ liệu kỳ sát hạch</p>
                        <p className="text-sm mt-1">Nhấn "Tạo Kỳ Mới" để bắt đầu nhập liệu.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-100 text-gray-700 uppercase font-semibold text-xs">
                                <tr>
                                    <th className="px-4 py-4 min-w-[180px]">Tên Kỳ Sát Hạch</th>
                                    <th className="px-2 py-4 text-center">Ngày</th>
                                    <th className="px-2 py-4 text-center bg-blue-50">Hồ sơ / Dự thi</th>
                                    
                                    <th className="px-2 py-4 text-center hidden xl:table-cell">Lý thuyết<br/><span className="text-[10px] font-normal text-gray-500">(Đạt/Tổng)</span></th>
                                    <th className="px-2 py-4 text-center hidden xl:table-cell">Mô phỏng<br/><span className="text-[10px] font-normal text-gray-500">(Đạt/Tổng)</span></th>
                                    <th className="px-2 py-4 text-center hidden xl:table-cell">Sa hình<br/><span className="text-[10px] font-normal text-gray-500">(Đạt/Tổng)</span></th>
                                    <th className="px-2 py-4 text-center hidden xl:table-cell">Đường trường<br/><span className="text-[10px] font-normal text-gray-500">(Đạt/Tổng)</span></th>
                                    <th className="px-4 py-4 text-center bg-green-50">Tổng Đạt</th>
                                    <th className="px-4 py-4 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredSessions.map((session) => {
                                    return (
                                    <tr key={session.id} className="hover:bg-blue-50 transition-colors group">
                                        <td className="px-4 py-4 font-medium text-gray-900">
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
                                        <td className="px-2 py-4 text-center bg-blue-50/50">
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold text-gray-800">{session.grandTotal.totalApplications}</span>
                                                <span className="text-[11px] text-gray-500 border-t border-gray-300 w-8 mt-0.5 pt-0.5">{session.grandTotal.totalParticipants} thi</span>
                                            </div>
                                        </td>

                                        {/* Lý Thuyết */}
                                        <td className="px-2 py-4 text-center hidden xl:table-cell">
                                             <span className="text-green-700 font-semibold">{session.grandTotal.theory.pass}</span>
                                             <span className="text-gray-400 mx-1">/</span>
                                             <span className="text-gray-600">{session.grandTotal.theory.total}</span>
                                        </td>
                                        
                                        {/* Mô Phỏng */}
                                        <td className="px-2 py-4 text-center hidden xl:table-cell">
                                             <span className="text-green-700 font-semibold">{session.grandTotal.simulation.pass}</span>
                                             <span className="text-gray-400 mx-1">/</span>
                                             <span className="text-gray-600">{session.grandTotal.simulation.total}</span>
                                        </td>

                                        {/* Sa Hình */}
                                        <td className="px-2 py-4 text-center hidden xl:table-cell">
                                             <span className="text-green-700 font-semibold">{session.grandTotal.practicalCourse.pass}</span>
                                             <span className="text-gray-400 mx-1">/</span>
                                             <span className="text-gray-600">{session.grandTotal.practicalCourse.total}</span>
                                        </td>

                                        {/* Đường Trường */}
                                        <td className="px-2 py-4 text-center hidden xl:table-cell">
                                             <span className="text-green-700 font-semibold">{session.grandTotal.onRoad.pass}</span>
                                             <span className="text-gray-400 mx-1">/</span>
                                             <span className="text-gray-600">{session.grandTotal.onRoad.total}</span>
                                        </td>

                                        {/* Kết Quả Cuối */}
                                        <td className="px-4 py-4 text-center bg-green-50/50">
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold text-green-700 text-lg">{session.grandTotal.finalPass}</span>
                                                <span className="text-[10px] text-gray-500 bg-white px-1.5 py-0.5 rounded-full border border-gray-200 mt-1">
                                                    {((session.grandTotal.finalPass / session.grandTotal.totalParticipants * 100) || 0).toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                        
                                        <td className="px-4 py-4 text-right whitespace-nowrap">
                                            <button 
                                                onClick={() => onSelectSession(session)}
                                                className="text-blue-600 hover:text-blue-800 font-medium mr-3 px-2 py-1 hover:bg-blue-100 rounded transition-colors"
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
                                                className="text-red-400 hover:text-red-600 px-2 py-1 hover:bg-red-50 rounded transition-colors"
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