
import React, { useState } from 'react';
import { ExcelUploadSection } from './ExcelUploadSection';
import type { StudentRecord, ReportMetadata } from '../types';
import { ReportMetadataModal } from './ReportMetadataModal';

interface DataInputPageProps {
    onExcelSubmit: (studentRecords: StudentRecord[]) => void;
    onClearData: () => void;
    isLoading: boolean;
    error: string | null;
    reportMetadata: ReportMetadata;
    onMetadataChange: (metadata: ReportMetadata) => void;
}

export const DataInputPage: React.FC<DataInputPageProps> = ({ 
    onExcelSubmit, 
    onClearData,
    isLoading, 
    error,
    reportMetadata,
    onMetadataChange
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
