import React, { useState } from 'react';
import { ExcelUploadSection } from './ExcelUploadSection';
import type { StudentRecord, ReportMetadata, ConflictWarning } from '../types';
import { ReportMetadataModal } from './ReportMetadataModal';

interface DataInputPageProps {
    onExcelSubmit: (studentRecords: StudentRecord[]) => void;
    onClearData: () => void;
    isLoading: boolean;
    error: string | null;
    reportMetadata: ReportMetadata;
    onMetadataChange: (metadata: ReportMetadata) => void;
    conflicts?: ConflictWarning[]; // New prop for conflicts
}

export const DataInputPage: React.FC<DataInputPageProps> = ({ 
    onExcelSubmit, 
    onClearData,
    isLoading, 
    error,
    reportMetadata,
    onMetadataChange,
    conflicts = []
}) => {
    const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800">
            <header className="p-4 border-b dark:border-gray-700 space-y-3">
                 <div className="flex justify-between items-start">
                    <div>
                         <h1 className="text-xl font-bold text-gray-800 dark:text-white">Bảng Điều Khiển</h1>
                         <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Nhập dữ liệu Excel học viên để tạo báo cáo.</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={() => setIsMetadataModalOpen(true)}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 font-semibold text-sm"
                            aria-label="Thiết lập biên bản"
                        >
                            <i className="fa-solid fa-file-invoice"></i> Biên bản
                        </button>
                        <button
                            onClick={onClearData}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 font-semibold text-sm"
                            aria-label="Tạo báo cáo mới"
                        >
                            <i className="fa-solid fa-plus"></i> Tạo Mới
                        </button>
                    </div>
                 </div>
            </header>
            <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6 space-y-6">
                
                {/* Section: Warnings / Conflicts */}
                {conflicts.length > 0 && (
                    <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-md shadow-sm animate-fade-in">
                        <div className="flex items-center gap-3 mb-3">
                            <i className="fa-solid fa-triangle-exclamation text-orange-600 text-xl"></i>
                            <h3 className="font-bold text-orange-800">Cảnh báo: Phát hiện thí sinh đã có kết quả "ĐẠT" trước đó</h3>
                        </div>
                        <p className="text-sm text-orange-700 mb-4">Hệ thống phát hiện các thí sinh sau đây đang đăng ký thi những môn mà họ đã thi đạt trong quá khứ. Vui lòng kiểm tra lại file Excel hoặc nội dung thi của thí sinh:</p>
                        
                        <div className="max-h-60 overflow-y-auto border border-orange-200 rounded">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-orange-100 text-orange-800 sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2">Học viên</th>
                                        <th className="px-3 py-2 text-center">Môn bị trùng</th>
                                        <th className="px-3 py-2">Đã đạt tại kỳ</th>
                                        <th className="px-3 py-2 text-center">Ngày đạt</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-orange-200 bg-white">
                                    {conflicts.map((c, i) => (
                                        <tr key={i} className="hover:bg-orange-50">
                                            <td className="px-3 py-2">
                                                <div className="font-bold text-gray-800">{c.studentName}</div>
                                                <div className="text-[10px] text-gray-500">Mã: {c.studentId}</div>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <span className="px-2 py-0.5 bg-orange-200 text-orange-800 rounded-full text-[10px] font-bold">
                                                    {c.conflictPart}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-gray-600 text-xs">{c.previousSessionName}</td>
                                            <td className="px-3 py-2 text-center text-gray-500 text-xs">{c.previousDate}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Section: Upload Student Data */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                     <ExcelUploadSection onSubmit={onExcelSubmit} isLoading={isLoading} error={error} />
                </div>

            </main>
            {isMetadataModalOpen && (
                <ReportMetadataModal
                    initialMetadata={reportMetadata}
                    onSave={onMetadataChange}
                    onClose={() => setIsMetadataModalOpen(false)}
                />
            )}
        </div>
    );
};
