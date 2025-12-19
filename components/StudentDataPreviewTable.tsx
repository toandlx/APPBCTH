
import React, { useMemo, useState } from 'react';
import type { StudentRecord } from '../types';
import { isStudentPassed, isStudentAbsent } from '../services/reportUtils';
import { StudentHistoryModal } from './ui/StudentHistoryModal';

interface StudentDataPreviewTableProps {
    data: StudentRecord[];
    onConfirm: () => void;
    onCancel: () => void;
}

export const StudentDataPreviewTable: React.FC<StudentDataPreviewTableProps> = ({ data, onConfirm, onCancel }) => {
    
    // Modal State
    const [selectedHistoryStudent, setSelectedHistoryStudent] = useState<{ id: string, name: string } | null>(null);

    // Total warnings count
    const warningCount = useMemo(() => {
        return data.reduce((count, s) => count + (s._historyWarnings ? 1 : 0), 0);
    }, [data]);

    // Quick stats for preview
    const stats = useMemo(() => {
        let passed = 0;
        let failed = 0;
        let absent = 0;
        
        data.forEach(s => {
            if (isStudentAbsent(s)) absent++;
            else if (isStudentPassed(s)) passed++;
            else failed++;
        });

        return { total: data.length, passed, failed, absent };
    }, [data]);

    return (
        <div className="space-y-4 animate-fade-in-up">
            {/* Header / Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <i className="fa-solid fa-table-list text-blue-600"></i>
                                Xem trước dữ liệu
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Kiểm tra lại dữ liệu và các cảnh báo nội dung thi.</p>
                        </div>
                        {warningCount > 0 && (
                            <div className="bg-red-100 text-red-700 px-3 py-1.5 rounded-full border border-red-200 flex items-center gap-2 animate-bounce">
                                <i className="fa-solid fa-triangle-exclamation"></i>
                                <span className="font-bold text-sm">Phát hiện {warningCount} học viên sai nội dung thi!</span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3 text-sm">
                        <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md border border-blue-100 dark:border-blue-800">
                            <strong>Tổng:</strong> {stats.total}
                        </div>
                        <div className="px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md border border-green-100 dark:border-green-800">
                            <strong>Đạt:</strong> {stats.passed}
                        </div>
                        <div className="px-3 py-1 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md border border-red-100 dark:border-red-800">
                            <strong>Trượt:</strong> {stats.failed}
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrollable Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[600px]">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300 relative">
                        <thead className="text-xs text-gray-700 dark:text-gray-200 uppercase bg-gray-50 dark:bg-gray-700 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 text-center w-12">STT</th>
                                <th className="px-4 py-3">Mã Học Viên</th>
                                <th className="px-4 py-3">Họ và Tên</th>
                                <th className="px-4 py-3">Nội dung đăng ký</th>
                                <th className="px-4 py-3 text-center">Kết quả</th>
                                <th className="px-4 py-3">Cảnh báo / Lịch sử</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {data.map((row, index) => {
                                let status = 'TRƯỢT';
                                let statusClass = 'text-red-600 bg-red-50 dark:bg-red-900/20';
                                if (isStudentAbsent(row)) {
                                    status = 'VẮNG';
                                    statusClass = 'text-gray-500 bg-gray-100 dark:bg-gray-700/50';
                                } else if (isStudentPassed(row)) {
                                    status = 'ĐẠT';
                                    statusClass = 'text-green-700 bg-green-50 dark:bg-green-900/20';
                                }

                                const hasWarning = !!row._historyWarnings;

                                return (
                                    <tr key={index} className={`hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors ${hasWarning ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                                        <td className="px-4 py-3 text-center text-gray-400">{index + 1}</td>
                                        <td className="px-4 py-3 font-mono text-xs">{row['MÃ HỌC VIÊN']}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-gray-800 dark:text-gray-100">{row['HỌ VÀ TÊN']}</div>
                                            <div className="text-[10px] text-gray-400">SBD: {row['SỐ BÁO DANH']} | Hạng: {row['HẠNG GPLX']}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded font-bold text-xs border border-blue-200 dark:border-blue-800">
                                                {row['NỘI DUNG THI']}
                                            </span>
                                        </td>
                                        
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold border ${statusClass} border-opacity-20`}>
                                                {status}
                                            </span>
                                        </td>

                                        <td className="px-4 py-3">
                                            {hasWarning ? (
                                                <div className="space-y-1">
                                                    {row._historyWarnings!.map((w, idx) => (
                                                        <div key={idx} className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-xs font-semibold">
                                                            <i className="fa-solid fa-circle-exclamation"></i>
                                                            <span>{w}</span>
                                                        </div>
                                                    ))}
                                                    <button 
                                                        onClick={() => setSelectedHistoryStudent({ id: String(row['MÃ HỌC VIÊN']), name: row['HỌ VÀ TÊN'] })}
                                                        className="text-blue-600 dark:text-blue-400 text-[10px] font-bold underline mt-1"
                                                    >
                                                        Xem chi tiết lịch sử
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-green-500 text-xs flex items-center gap-1">
                                                        <i className="fa-solid fa-check"></i> Hợp lệ
                                                    </span>
                                                    <button 
                                                        onClick={() => setSelectedHistoryStudent({ id: String(row['MÃ HỌC VIÊN']), name: row['HỌ VÀ TÊN'] })}
                                                        className="text-gray-400 hover:text-blue-500 transition-colors"
                                                    >
                                                        <i className="fa-solid fa-clock-rotate-left"></i>
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                
                {/* Actions Footer */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 flex justify-between items-center sticky bottom-0 z-20">
                    <div className="text-sm">
                        {warningCount > 0 ? (
                            <span className="text-red-600 dark:text-red-400 font-bold">
                                <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                                Lưu ý: Phát hiện trùng lặp lịch sử cho {warningCount} học viên. 
                            </span>
                        ) : (
                            <span className="text-green-600 dark:text-green-400 font-bold">
                                <i className="fa-solid fa-circle-check mr-1"></i>
                                Tất cả dữ liệu hợp lệ với lịch sử.
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={onCancel}
                            className="px-5 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors shadow-sm"
                        >
                            <i className="fa-solid fa-arrow-rotate-left mr-2"></i> Nhập lại file
                        </button>
                        <button 
                            onClick={onConfirm}
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md transition-all hover:scale-105"
                        >
                            <i className="fa-solid fa-check mr-2"></i> Tiếp tục tạo Báo cáo
                        </button>
                    </div>
                </div>
            </div>

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
