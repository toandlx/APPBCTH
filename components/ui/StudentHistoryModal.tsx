
import React, { useState, useEffect, useMemo } from 'react';
import type { SavedSession, StudentRecord } from '../../types';
import { storageService } from '../../services/storageService';

interface StudentHistoryModalProps {
    studentId: string;
    studentName: string;
    onClose: () => void;
}

export const StudentHistoryModal: React.FC<StudentHistoryModalProps> = ({ studentId, studentName, onClose }) => {
    const [history, setHistory] = useState<{ sessionName: string, date: string, record: StudentRecord }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            const sessions = await storageService.getAllSessions();
            const found: { sessionName: string, date: string, record: StudentRecord }[] = [];
            
            sessions.forEach(session => {
                const record = session.studentRecords.find(r => String(r['MÃ HỌC VIÊN']).trim() === studentId.trim());
                if (record) {
                    found.push({
                        sessionName: session.name,
                        date: session.reportDate,
                        record
                    });
                }
            });

            // Sắp xếp ngày giảm dần
            found.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setHistory(found);
            setIsLoading(false);
        };
        loadHistory();
    }, [studentId]);

    const getStatusBadge = (record: StudentRecord) => {
        const results = [
            record['LÝ THUYẾT'], record['MÔ PHỎNG'], record['SA HÌNH'], record['ĐƯỜNG TRƯỜNG']
        ].map(v => String(v || '').trim().toUpperCase());

        const isAbsent = results.every(v => v === '' || v === 'VẮNG');
        if (isAbsent) return <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold">VẮNG</span>;

        // Logic "Đạt" đơn giản cho hiển thị lịch sử: Nếu có bất kỳ môn nào trượt thì coi như trượt lần đó
        // (Hoặc có thể dùng lại isStudentPassed từ reportUtils)
        const hasFail = results.some(v => v === 'TRƯỢT' || v === 'KHÔNG ĐẠT');
        if (hasFail) return <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">TRƯỢT</span>;
        
        return <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-bold">ĐẠT</span>;
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-750">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Lịch sử sát hạch chi tiết</h3>
                        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{studentName} - MS: {studentId}</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                        <i className="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="py-20 text-center">
                            <i className="fa-solid fa-circle-notch animate-spin text-3xl text-blue-500"></i>
                            <p className="mt-2 text-gray-500">Đang truy xuất dữ liệu...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="py-20 text-center text-gray-500">
                            <i className="fa-solid fa-clock-rotate-left text-5xl mb-4 opacity-20"></i>
                            <p>Không tìm thấy dữ liệu lịch sử cho học viên này.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs uppercase font-bold text-gray-400 border-b dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3">Ngày & Kỳ sát hạch</th>
                                        <th className="px-4 py-3 text-center">Nội dung</th>
                                        <th className="px-4 py-3 text-center">Lý thuyết</th>
                                        <th className="px-4 py-3 text-center">Mô phỏng</th>
                                        <th className="px-4 py-3 text-center">Sa hình</th>
                                        <th className="px-4 py-3 text-center">Đường trường</th>
                                        <th className="px-4 py-3 text-center">Kết quả</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-gray-700">
                                    {history.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                            <td className="px-4 py-4">
                                                <div className="font-bold text-gray-700 dark:text-gray-200">{new Date(item.date).toLocaleDateString('vi-VN')}</div>
                                                <div className="text-xs text-gray-500 line-clamp-1">{item.sessionName}</div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                                                    {item.record['NỘI DUNG THI']}
                                                </span>
                                            </td>
                                            <td className={`px-4 py-4 text-center font-medium ${String(item.record['LÝ THUYẾT']).toUpperCase() === 'ĐẠT' ? 'text-green-600' : 'text-red-400'}`}>
                                                {item.record['LÝ THUYẾT'] || '-'}
                                            </td>
                                            <td className={`px-4 py-4 text-center font-medium ${String(item.record['MÔ PHỎNG']).toUpperCase() === 'ĐẠT' ? 'text-green-600' : 'text-red-400'}`}>
                                                {item.record['MÔ PHỎNG'] || '-'}
                                            </td>
                                            <td className={`px-4 py-4 text-center font-medium ${String(item.record['SA HÌNH']).toUpperCase() === 'ĐẠT' ? 'text-green-600' : 'text-red-400'}`}>
                                                {item.record['SA HÌNH'] || '-'}
                                            </td>
                                            <td className={`px-4 py-4 text-center font-medium ${String(item.record['ĐƯỜNG TRƯỜNG']).toUpperCase() === 'ĐẠT' ? 'text-green-600' : 'text-red-400'}`}>
                                                {item.record['ĐƯỜNG TRƯỜNG'] || '-'}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {getStatusBadge(item.record)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
                                <p className="font-bold flex items-center gap-2 mb-1">
                                    <i className="fa-solid fa-circle-info"></i> Ghi chú hệ thống:
                                </p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Lịch sử được tổng hợp từ tất cả các kỳ sát hạch đã lưu trong cơ sở dữ liệu.</li>
                                    <li>Môn thi trống hoặc ghi "Vắng" có nghĩa là thí sinh không đăng ký hoặc không dự thi môn đó trong kỳ.</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="p-4 border-t dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-750">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg font-bold hover:bg-gray-300 transition-colors">
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};
