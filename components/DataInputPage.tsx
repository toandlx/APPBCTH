
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
            if (pastSessions.length === 0) {
                setPreviewData(newRecords);
                return;
            }
            
            const passMap = new Map<string, Map<string, PassDetail>>();
            const studentHistory = new Map<string, { record: StudentRecord, sessionName: string, date: Date }[]>();
            
            pastSessions.forEach(session => {
                const date = new Date(session.reportDate);
                session.studentRecords.forEach(record => {
                    const studentId = String(record['MÃ HỌC VIÊN'] || '').trim();
                    if (!studentId) return;
                    if (!studentHistory.has(studentId)) studentHistory.set(studentId, []);
                    studentHistory.get(studentId)!.push({ record, sessionName: session.name, date });
                });
            });

            studentHistory.forEach((history, studentId) => {
                history.sort((a, b) => a.date.getTime() - b.date.getTime());
                
                const studentPasses = new Map<string, PassDetail>();
                const firstEntry = history[0];
                const firstContent = (firstEntry.record['NỘI DUNG THI'] || '').toUpperCase().replace(/Đ/g, 'D');
                const firstDateStr = firstEntry.date.toLocaleDateString('vi-VN');

                // Logic Mặc định đạt
                ['L', 'M', 'H', 'D'].forEach(code => {
                    if (!firstContent.includes(code)) {
                        studentPasses.set(code, { 
                            date: firstDateStr, 
                            session: firstEntry.sessionName, 
                            isImplicit: true 
                        });
                    }
                });

                // Logic Đạt thực tế
                history.forEach(h => {
                    const dStr = h.date.toLocaleDateString('vi-VN');
                    if (String(h.record['LÝ THUYẾT']).toUpperCase().trim() === 'ĐẠT') 
                        studentPasses.set('L', { date: dStr, session: h.sessionName, isImplicit: false });
                    if (String(h.record['MÔ PHỎNG']).toUpperCase().trim() === 'ĐẠT') 
                        studentPasses.set('M', { date: dStr, session: h.sessionName, isImplicit: false });
                    if (String(h.record['SA HÌNH']).toUpperCase().trim() === 'ĐẠT') 
                        studentPasses.set('H', { date: dStr, session: h.sessionName, isImplicit: false });
                    if (String(h.record['ĐƯỜNG TRƯỜNG']).toUpperCase().trim() === 'ĐẠT') 
                        studentPasses.set('D', { date: dStr, session: h.sessionName, isImplicit: false });
                });

                passMap.set(studentId, studentPasses);
            });

            const subjectLabels: Record<string, string> = { 'L': 'Lý thuyết', 'M': 'Mô phỏng', 'H': 'Sa hình', 'D': 'Đường trường' };
            
            const enrichedRecords = newRecords.map(record => {
                const studentId = String(record['MÃ HỌC VIÊN'] || '').trim();
                const content = (record['NỘI DUNG THI'] || '').toUpperCase().replace(/Đ/g, 'D');
                const warnings: string[] = [];

                if (studentId && passMap.has(studentId)) {
                    const history = passMap.get(studentId)!;
                    ['L', 'M', 'H', 'D'].forEach(code => {
                        if (content.includes(code) && history.has(code)) {
                            const h = history.get(code)!;
                            const label = subjectLabels[code];
                            if (h.isImplicit) {
                                warnings.push(`Môn ${label} mặc định đã đạt (không đăng ký ở kỳ đầu ${h.date})`);
                            } else {
                                warnings.push(`Môn ${label} đã có kết quả ĐẠT ngày ${h.date} (${h.session})`);
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
            <header className="p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-20 shadow-sm">
                 <div className="flex justify-between items-start">
                    <div>
                         <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                             {previewData ? 'Bước 2: Xác nhận & Đối soát' : 'Bước 1: Tải dữ liệu'}
                         </h1>
                         <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                             {previewData 
                                ? (isValidating ? 'Đang phân tích lịch sử...' : 'Vui lòng kiểm tra các cảnh báo (nếu có) trước khi tạo báo cáo.') 
                                : 'Nhập file Excel chi tiết để bắt đầu.'}
                         </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={() => setIsMetadataModalOpen(true)}
                            className="px-4 py-2 bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-200 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2 font-bold text-sm border border-slate-200 dark:border-gray-600"
                        >
                            <i className="fa-solid fa-file-contract"></i> Thông tin biên bản
                        </button>
                        {!previewData && (
                            <button
                                onClick={onClearData}
                                className="px-4 py-2 bg-slate-800 dark:bg-blue-600 text-white rounded-lg hover:bg-black transition-colors flex items-center gap-2 font-bold text-sm shadow-sm"
                            >
                                <i className="fa-solid fa-rotate-left"></i> Làm mới
                            </button>
                        )}
                    </div>
                 </div>
            </header>
            <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-gray-900 p-6">
                {!previewData ? (
                    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-slate-200 dark:border-gray-700 p-2 animate-fade-in-up">
                         <ExcelUploadSection onSubmit={handleUpload} isLoading={parentIsLoading || isValidating} error={error} />
                    </div>
                ) : (
                    <div className="max-w-6xl mx-auto relative animate-fade-in">
                        {isValidating && (
                            <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 z-30 flex items-center justify-center backdrop-blur-md rounded-2xl">
                                <div className="flex flex-col items-center gap-4 p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-slate-200">
                                    <i className="fa-solid fa-shield-halved animate-pulse text-5xl text-blue-600"></i>
                                    <div className="text-center">
                                        <div className="font-black text-slate-800 dark:text-white text-lg">ĐANG ĐỐI SOÁT CHUYÊN SÂU</div>
                                        <div className="text-slate-500 text-sm">Vui lòng đợi trong giây lát...</div>
                                    </div>
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
