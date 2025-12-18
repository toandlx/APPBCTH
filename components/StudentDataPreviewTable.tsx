
import React, { useMemo } from 'react';
import type { StudentRecord } from '../types';
import { isStudentPassed, isStudentAbsent } from '../services/reportUtils';

interface StudentDataPreviewTableProps {
    data: StudentRecord[];
    onConfirm: () => void;
    onCancel: () => void;
}

export const StudentDataPreviewTable: React.FC<StudentDataPreviewTableProps> = ({ data, onConfirm, onCancel }) => {
    
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
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-700">
                    <div className="text-[10px] text-slate-400 font-black uppercase mb-1">Tổng học viên</div>
                    <div className="text-2xl font-black text-slate-800 dark:text-white">{stats.total}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-green-100 dark:border-green-900/30 border-l-4 border-l-green-500">
                    <div className="text-[10px] text-green-500 font-black uppercase mb-1">Sẽ Đạt</div>
                    <div className="text-2xl font-black text-green-600">{stats.passed}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30 border-l-4 border-l-red-500">
                    <div className="text-[10px] text-red-500 font-black uppercase mb-1">Sẽ Trượt/Vắng</div>
                    <div className="text-2xl font-black text-red-600">{stats.failed + stats.absent}</div>
                </div>
                <div className={`p-5 rounded-2xl shadow-sm border transition-all ${warningCount > 0 ? 'bg-orange-50 border-orange-200 border-l-4 border-l-orange-500' : 'bg-blue-50 border-blue-200 border-l-4 border-l-blue-500'}`}>
                    <div className={`text-[10px] font-black uppercase mb-1 ${warningCount > 0 ? 'text-orange-500' : 'text-blue-500'}`}>Phát hiện sai nội dung</div>
                    <div className={`text-2xl font-black ${warningCount > 0 ? 'text-orange-600' : 'text-blue-600'}`}>{warningCount}</div>
                </div>
            </div>

            {/* Warning Alert Banner */}
            {warningCount > 0 && (
                <div className="bg-red-600 text-white px-6 py-4 rounded-2xl shadow-lg flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-4">
                        <i className="fa-solid fa-triangle-exclamation text-3xl"></i>
                        <div>
                            <div className="font-black text-lg">CẢNH BÁO NỘI DUNG THI TRÙNG LẶP!</div>
                            <div className="text-sm opacity-90 font-medium">Có {warningCount} học viên đang đăng ký thi môn mà lịch sử ghi nhận đã đạt. Vui lòng kiểm tra cột màu đỏ bên dưới.</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-slate-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[calc(100vh-420px)]">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm text-left text-slate-600 dark:text-gray-300 relative">
                        <thead className="text-xs text-slate-700 dark:text-gray-200 uppercase bg-slate-100 dark:bg-gray-700 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4 text-center w-16">STT</th>
                                <th className="px-6 py-4">Học viên</th>
                                <th className="px-6 py-4 text-center w-32">Nội dung</th>
                                <th className="px-6 py-4">Cảnh báo Đối soát Lịch sử</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                            {data.map((row, index) => {
                                const hasWarning = !!row._historyWarnings;

                                return (
                                    <tr key={index} className={`transition-colors ${hasWarning ? 'bg-red-50 dark:bg-red-900/10' : 'hover:bg-slate-50 dark:hover:bg-gray-750'}`}>
                                        <td className="px-6 py-4 text-center text-slate-400 font-medium">{index + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800 dark:text-white leading-tight">{row['HỌ VÀ TÊN']}</div>
                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-tighter">
                                                MS: {row['MÃ HỌC VIÊN']} | SBD: {row['SỐ BÁO DANH']} | Hạng: {row['HẠNG GPLX']}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-block px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded font-black text-[11px] border border-blue-200 dark:border-blue-800">
                                                {row['NỘI DUNG THI']}
                                            </span>
                                        </td>
                                        
                                        <td className="px-6 py-4">
                                            {hasWarning ? (
                                                <div className="space-y-1.5 py-1">
                                                    {row._historyWarnings!.map((w, idx) => (
                                                        <div key={idx} className="flex items-start gap-2 text-red-600 dark:text-red-400 text-xs font-bold leading-tight bg-red-100/50 dark:bg-red-900/20 p-2 rounded-lg border border-red-200 dark:border-red-800/30">
                                                            <i className="fa-solid fa-circle-exclamation mt-0.5 flex-shrink-0"></i>
                                                            <span>{w}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-green-600 dark:text-green-400 text-xs flex items-center gap-2 font-bold py-2">
                                                    <i className="fa-solid fa-circle-check"></i>
                                                    <span>Nội dung hợp lệ</span>
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
                <div className="p-5 bg-slate-100 dark:bg-gray-900 border-t dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 sticky bottom-0 z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                    <div className="text-sm font-medium">
                        {warningCount > 0 ? (
                            <span className="text-red-600 dark:text-red-400 flex items-center gap-2 font-black italic">
                                <i className="fa-solid fa-hand"></i>
                                Lưu ý: Vẫn có thể tiếp tục nếu bạn chắc chắn file nhập liệu là đúng.
                            </span>
                        ) : (
                            <span className="text-green-600 dark:text-green-400 flex items-center gap-2 font-black">
                                <i className="fa-solid fa-circle-check"></i>
                                Dữ liệu an toàn để tạo báo cáo.
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button 
                            onClick={onCancel}
                            className="flex-1 sm:flex-none px-6 py-3 bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-300 border border-slate-300 dark:border-gray-600 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-700 font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                            <i className="fa-solid fa-arrow-left"></i> Sửa file Excel
                        </button>
                        <button 
                            onClick={onConfirm}
                            className="flex-1 sm:flex-none px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-black shadow-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
                        >
                            Xác nhận & Tạo Báo cáo <i className="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
