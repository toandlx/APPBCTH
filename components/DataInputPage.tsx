
import React, { useState, useEffect } from 'react';
import { ExcelUploadSection } from './ExcelUploadSection';
import { StudentDataPreviewTable } from './StudentDataPreviewTable';
import type { StudentRecord, ReportMetadata, SavedSession } from '../types';
import { ReportMetadataModal } from './ReportMetadataModal';
import { storageService } from '../services/storageService';

interface PassDetail {
    date: string;
    session: string;
    isImplicit: boolean; // True if assumed passed because it was missing in first registration
}

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
    isLoading: parentIsLoading, 
    error,
    reportMetadata,
    onMetadataChange
}) => {
    const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
    const [previewData, setPreviewData] = useState<StudentRecord[] | null>(null);
    const [isValidating, setIsValidating] = useState(false);

    const validateWithHistory = async (newRecords: StudentRecord[]) => {
        setIsValidating(true);
        try {
            const pastSessions = await storageService.getAllSessions();
            
            // Map<StudentId, Map<SubjectCode, PassDetail>>
            const passMap = new Map<string, Map<string, PassDetail>>();

            // 1. Group records by student and sort sessions by date to find the "First Appearance"
            const studentHistory = new Map<string, { record: StudentRecord, sessionName: string, date: Date }[]>();
            
            pastSessions.forEach(session => {
                const date = new Date(session.reportDate);
                session.studentRecords.forEach(record => {
                    const studentId = String(record['MÃ HỌC VIÊN']).trim();
                    if (!studentId) return;
                    if (!studentHistory.has(studentId)) studentHistory.set(studentId, []);
                    studentHistory.get(studentId)!.push({ record, sessionName: session.name, date });
                });
            });

            // 2. Process each student's history chronologically
            studentHistory.forEach((history, studentId) => {
                // Sort by date ascending
                history.sort((a, b) => a.date.getTime() - b.date.getTime());
                
                const studentPasses = new Map<string, PassDetail>();
                const firstEntry = history[0];
                const firstContent = (firstEntry.record['NỘI DUNG THI'] || '').toUpperCase().replace(/Đ/g, 'D');
                const firstDateStr = firstEntry.date.toLocaleDateString('vi-VN');

                // A. Implicit Pass Logic: 
                // In the first appearance, any subject NOT in NỘI DUNG THI is assumed "Already Passed"
                const allSubjectCodes = ['L', 'M', 'H', 'D'];
                allSubjectCodes.forEach(code => {
                    if (!firstContent.includes(code)) {
                        studentPasses.set(code, { 
                            date: firstDateStr, 
                            session: firstEntry.sessionName, 
                            isImplicit: true 
                        });
                    }
                });

                // B. Explicit Pass Logic:
                // Scan all history (including the first one) for 'ĐẠT' scores
                history.forEach(h => {
                    const dStr = h.date.toLocaleDateString('vi-VN');
                    if (h.record['LÝ THUYẾT']?.toUpperCase().trim() === 'ĐẠT') 
                        studentPasses.set('L', { date: dStr, session: h.sessionName, isImplicit: false });
                    if (h.record['MÔ PHỎNG']?.toUpperCase().trim() === 'ĐẠT') 
                        studentPasses.set('M', { date: dStr, session: h.sessionName, isImplicit: false });
                    if (h.record['SA HÌNH']?.toUpperCase().trim() === 'ĐẠT') 
                        studentPasses.set('H', { date: dStr, session: h.sessionName, isImplicit: false });
                    if (h.record['ĐƯỜNG TRƯỜNG']?.toUpperCase().trim() === 'ĐẠT') 
                        studentPasses.set('D', { date: dStr, session: h.sessionName, isImplicit: false });
                });

                passMap.set(studentId, studentPasses);
            });

            // 3. Enrich new records with warnings based on the passMap
            const subjectLabels: Record<string, string> = { 'L': 'Lý thuyết', 'M': 'Mô phỏng', 'H': 'Sa hình', 'D': 'Đường trường' };
            
            const enrichedRecords = newRecords.map(record => {
                const studentId = String(record['MÃ HỌC VIÊN']).trim();
                const content = (record['NỘI DUNG THI'] || '').toUpperCase().replace(/Đ/g, 'D');
                const warnings: string[] = [];

                if (passMap.has(studentId)) {
                    const history = passMap.get(studentId)!;
                    
                    ['L', 'M', 'H', 'D'].forEach(code => {
                        if (content.includes(code) && history.has(code)) {
                            const h = history.get(code)!;
                            const label = subjectLabels[code];
                            if (h.isImplicit) {
                                warnings.push(`Sai nội dung: Mặc định đạt ${label} từ kỳ đầu (${h.date})`);
                            } else {
                                warnings.push(`Sai nội dung: Đã đạt ${label} tại kỳ (${h.session} - ${h.date})`);
                            }
                        }
                    });
                }

                return { ...record, _historyWarnings: warnings.length > 0 ? warnings : undefined };
            });

            setPreviewData(enrichedRecords);
        } catch (err) {
            console.error("Validation error:", err);
            setPreviewData(newRecords);
        } finally {
            setIsValidating(false);
        }
    };

    const handleUpload = (data: StudentRecord[]) => {
        validateWithHistory(data);
    };

    const handleConfirm = () => {
        if (previewData) {
            onExcelSubmit(previewData);
            setPreviewData(null);
        }
    };

    const handleCancelPreview = () => {
        setPreviewData(null);
        onClearData();
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800">
            <header className="p-4 border-b dark:border-gray-700 space-y-3">
                 <div className="flex justify-between items-start">
                    <div>
                         <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                             {previewData ? 'Xác nhận Dữ liệu' : 'Bảng Điều Khiển'}
                         </h1>
                         <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                             {previewData 
                                ? (isValidating ? 'Đang đối chiếu lịch sử sát hạch...' : 'Vui lòng kiểm tra kỹ nội dung thi và cảnh báo lịch sử.') 
                                : 'Nhập dữ liệu Excel học viên để tạo báo cáo.'}
                         </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={() => setIsMetadataModalOpen(true)}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 font-semibold text-sm"
                        >
                            <i className="fa-solid fa-file-invoice"></i> Biên bản
                        </button>
                        {!previewData && (
                            <button
                                onClick={onClearData}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 font-semibold text-sm"
                            >
                                <i className="fa-solid fa-rotate"></i> Làm mới
                            </button>
                        )}
                    </div>
                 </div>
            </header>
            <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6 space-y-6">
                
                {!previewData ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 animate-fade-in">
                         <ExcelUploadSection onSubmit={handleUpload} isLoading={parentIsLoading || isValidating} error={error} />
                    </div>
                ) : (
                    <div className="relative">
                        {isValidating && (
                            <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 z-30 flex items-center justify-center backdrop-blur-sm rounded-lg">
                                <div className="flex flex-col items-center gap-2">
                                    <i className="fa-solid fa-spinner animate-spin text-3xl text-blue-600"></i>
                                    <span className="font-bold text-gray-700 dark:text-gray-200">Đang đối soát lịch sử...</span>
                                </div>
                            </div>
                        )}
                        <StudentDataPreviewTable 
                            data={previewData} 
                            onConfirm={handleConfirm} 
                            onCancel={handleCancelPreview} 
                        />
                    </div>
                )}

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
