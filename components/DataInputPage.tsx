
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
        <div className="flex flex-col h-full">
            <header className="p-4 border-b space-y-3">
                 <div className="flex justify-between items-start">
                    <div>
                         <h1 className="text-xl font-bold text-gray-800">Bảng Điều Khiển</h1>
                         <p className="mt-1 text-sm text-gray-600">Nhập dữ liệu Excel để tạo báo cáo.</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={() => setIsMetadataModalOpen(true)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors flex items-center gap-2 font-semibold text-sm"
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
            <main className="flex-1 overflow-y-auto bg-gray-50">
                <ExcelUploadSection onSubmit={onExcelSubmit} isLoading={isLoading} error={error} />
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
