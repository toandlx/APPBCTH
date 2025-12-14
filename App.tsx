import React, { useState, useMemo, useEffect } from 'react';
import { DataInputPage } from './components/DataInputPage';
import { ReportDashboardPage } from './components/reports/ReportDashboardPage';
import { AdminSidebar } from './components/admin/AdminSidebar';
import { SessionList } from './components/admin/SessionList';
import { SettingsPage } from './components/admin/SettingsPage';
import { TrainingUnitManager } from './components/admin/TrainingUnitManager';
import { AggregateReportPage } from './components/admin/AggregateReportPage';
import { StudentLookupPage } from './components/admin/StudentLookupPage';
import { storageService } from './services/storageService';
import type { AppData, LicenseClassData, StudentRecord, ReportMetadata, SavedSession, TrainingUnit } from './types';
import { processExcelData, normalizeData } from './services/excelProcessor';
import { Toast } from './components/ui/Toast';

type AppView = 'dashboard' | 'create' | 'detail' | 'settings' | 'training-units' | 'aggregate-report' | 'student-lookup';

const App: React.FC = () => {
    // Navigation State
    const [currentView, setCurrentView] = useState<AppView>('dashboard');
    
    // Data State
    const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
    
    // Working State (New or Selected Session)
    const [appData, setAppData] = useState<AppData | null>(null);
    const [studentRecords, setStudentRecords] = useState<StudentRecord[] | null>(null);
    const [selectedSession, setSelectedSession] = useState<SavedSession | null>(null);
    const [trainingUnits, setTrainingUnits] = useState<TrainingUnit[]>([]);
    
    // UI State
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Initial Metadata Template
    const [reportMetadata, setReportMetadata] = useState<ReportMetadata>({
        meetingTime: '18 giờ 00 phút',
        meetingLocation: 'Trung tâm dạy nghề và Sát hạch lái xe Đông Đô',
        organizer: 'Giám đốc Công an tỉnh',
        attendees: [
            { id: '1', name: 'Đồng chí: Trung tá Dương Kim Giang', role: 'Chức vụ: Phó Trưởng phòng, Chủ tịch Hội đồng' },
            { id: '2', name: 'Đồng chí: Trung tá Trần Duy Giang', role: 'Chức vụ: Đội trưởng, Phó Chủ tịch Hội đồng' },
            { id: '3', name: 'Ông: Vũ Tiến Tuế', role: 'Chức vụ: Giám đốc Trung tâm sát hạch, Ủy viên' },
            { id: '4', name: 'Đồng chí: Vương Mai Phương', role: 'Thư ký' },
        ],
        technicalErrorSBD: '02,153,369',
    });

    // Load sessions & units on mount
    const loadData = async () => {
        const sessions = await storageService.getAllSessions();
        const units = await storageService.getAllTrainingUnits();
        setSavedSessions(sessions);
        setTrainingUnits(units);
    };

    useEffect(() => {
        const init = async () => {
             // 1. Check Server Connection
             try {
                const res = await fetch('/api/server-status');
                if (res.ok) {
                    const data = await res.json();
                    if (data.dbConnected) {
                        showToast('Đã kết nối Cloud SQL thành công!', 'success');
                    } else {
                        showToast('Không thể kết nối Cloud SQL. Đang dùng chế độ Offline.', 'info');
                    }
                }
             } catch (e) {
                 showToast('Mất kết nối Server. Đang dùng chế độ Offline.', 'info');
             }

             // 2. Load Data
             await loadData();
        };
        init();
    }, []);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
    };

    const handleExcelSubmit = (rawRecords: StudentRecord[]) => {
        setIsLoading(true);
        setError(null);
        try {
            // Normalize data FIRST to ensure consistent keys and auto-generated fields
            const cleanRecords = normalizeData(rawRecords);
            const processedData = processExcelData(cleanRecords);
            
            setStudentRecords(cleanRecords); // Store CLEAN data
            setAppData(processedData);
            
            showToast('Xử lý dữ liệu thành công! Vui lòng kiểm tra và lưu báo cáo.', 'info');
        } catch (e) {
             setError(`Lỗi xử lý file Excel: ${(e as Error).message}`);
             showToast('Lỗi xử lý file Excel', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    // Calculated Grand Total for the currently active data
    const grandTotal = useMemo<LicenseClassData | null>(() => {
        if (!appData) return null;
        
        const allRows = [...appData.firstTime.rows, ...appData.retake.rows];
        if (allRows.length === 0) return null;

        return allRows.reduce((acc, row) => {
            acc.totalApplications += row.totalApplications;
            acc.totalParticipants += row.totalParticipants;
            acc.theory.total += row.theory.total;
            acc.theory.pass += row.theory.pass;
            acc.theory.fail += row.theory.fail;
            acc.simulation.total += row.simulation.total;
            acc.simulation.pass += row.simulation.pass;
            acc.simulation.fail += row.simulation.fail;
            acc.practicalCourse.total += row.practicalCourse.total;
            acc.practicalCourse.pass += row.practicalCourse.pass;
            acc.practicalCourse.fail += row.practicalCourse.fail;
            acc.onRoad.total += row.onRoad.total;
            acc.onRoad.pass += row.onRoad.pass;
            acc.onRoad.fail += row.onRoad.fail;
            acc.finalPass += row.finalPass;
            return acc;
        }, {
            class: 'a+b',
            totalApplications: 0,
            totalParticipants: 0,
            theory: { total: 0, pass: 0, fail: 0 },
            simulation: { total: 0, pass: 0, fail: 0 },
            practicalCourse: { total: 0, pass: 0, fail: 0 },
            onRoad: { total: 0, pass: 0, fail: 0 },
            finalPass: 0,
        });
    }, [appData]);

    const handleClearData = () => {
        setAppData(null);
        setStudentRecords(null);
        setError(null);
        // trainingUnits are global config, do not clear them when clearing session data
    };

    const handleSaveSession = async (name: string, reportDate: Date) => {
        if (!appData || !grandTotal || !studentRecords) return;
        setIsLoading(true);

        try {
            const newSession: SavedSession = {
                id: Date.now().toString(),
                name: name,
                createdAt: Date.now(),
                reportDate: reportDate.toISOString(),
                studentRecords: studentRecords,
                appData: appData,
                grandTotal: grandTotal,
                reportMetadata: reportMetadata,
                trainingUnits: trainingUnits // Save units
            };

            await storageService.saveSession(newSession);
            await loadData(); // Refresh sessions
            
            // Reset and go to dashboard
            handleClearData();
            setCurrentView('dashboard');
            showToast('Đã lưu kỳ sát hạch thành công!', 'success');
        } catch (err) {
            showToast('Lỗi khi lưu dữ liệu!', 'error');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateSession = async (name: string, reportDate: Date, metadata: ReportMetadata) => {
        if (!selectedSession) return;
        setIsLoading(true);

        try {
            const updatedSession: SavedSession = {
                ...selectedSession,
                name: name,
                reportDate: reportDate.toISOString(),
                reportMetadata: metadata,
                // trainingUnits usually don't change in this edit mode, 
                // but if we added unit editing in view mode, we would update it here.
                // For now, keep existing.
                trainingUnits: selectedSession.trainingUnits || []
            };

            await storageService.saveSession(updatedSession);
            await loadData();
            
            // Update local selected session state so the view refreshes immediately
            setSelectedSession(updatedSession);
            setReportMetadata(metadata);
            
            showToast('Đã cập nhật kỳ sát hạch!', 'success');
        } catch (err) {
            showToast('Lỗi khi cập nhật dữ liệu!', 'error');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteSession = async (id: string) => {
        try {
            await storageService.deleteSession(id);
            await loadData();
            if (selectedSession?.id === id) {
                setSelectedSession(null);
                setCurrentView('dashboard');
            }
            showToast('Đã xóa kỳ sát hạch.', 'info');
        } catch (err) {
            showToast('Lỗi khi xóa dữ liệu!', 'error');
        }
    };

    const handleSelectSession = async (session: SavedSession) => {
        setIsLoading(true);
        
        // In local mode, session usually has full data, but getSessionById ensures it
        let fullSession = session;
        if (!session.appData || !session.studentRecords) {
             const loaded = await storageService.getSessionById(session.id);
             if (loaded) fullSession = loaded;
        }

        setSelectedSession(fullSession);
        setAppData(fullSession.appData);
        setStudentRecords(fullSession.studentRecords);
        setReportMetadata(fullSession.reportMetadata);
        setTrainingUnits(fullSession.trainingUnits || []); // Load units
        setCurrentView('detail');
        setIsLoading(false);
    };

    const handleNavChange = (view: AppView) => {
        if (view === 'create') {
            handleClearData();
            setSelectedSession(null);
        }
        if (view === 'dashboard') {
            loadData();
        }
        setCurrentView(view);
    };

    const renderMainContent = () => {
        if (isLoading && !appData && currentView === 'dashboard') {
             return <div className="flex h-full items-center justify-center"><i className="fa-solid fa-spinner animate-spin text-4xl text-blue-500"></i></div>;
        }

        // 1. Dashboard View
        if (currentView === 'dashboard') {
            return (
                <SessionList 
                    sessions={savedSessions} 
                    onSelectSession={handleSelectSession} 
                    onDeleteSession={handleDeleteSession}
                    onCreateNew={() => handleNavChange('create')}
                    onRefresh={async () => { await loadData(); }}
                />
            );
        }

        // 2. Aggregate Report (NEW)
        if (currentView === 'aggregate-report') {
            return <AggregateReportPage />;
        }

        // 3. Student Lookup (NEW PHASE 3)
        if (currentView === 'student-lookup') {
            return <StudentLookupPage />;
        }

        // 4. Training Units Management
        if (currentView === 'training-units') {
            return (
                <TrainingUnitManager 
                    trainingUnits={trainingUnits}
                    onUnitsImport={(units) => {
                        setTrainingUnits(units);
                        showToast(`Cập nhật thành công ${units.length} đơn vị đào tạo!`, 'success');
                    }}
                />
            );
        }

        // 5. Create View (Input -> Preview)
        if (currentView === 'create') {
            // If we have calculated data, show Preview Report
            if (appData) {
                 return (
                    <div className="h-full bg-gray-200">
                         {/* Header helper for "Back to input" */}
                         <div className="bg-white border-b px-4 py-2 flex justify-between items-center print:hidden">
                            <h2 className="font-bold text-gray-700">Tạo kỳ sát hạch mới - Xem trước</h2>
                            <button 
                                onClick={handleClearData} 
                                className="text-sm text-red-600 hover:text-red-800"
                            >
                                <i className="fa-solid fa-arrow-left"></i> Quay lại nhập liệu
                            </button>
                         </div>
                         <div className="h-[calc(100%-45px)] overflow-hidden">
                            <ReportDashboardPage 
                                summaryData={appData} 
                                studentRecords={studentRecords}
                                grandTotal={grandTotal} 
                                reportMetadata={reportMetadata}
                                mode="preview"
                                onSaveSession={handleSaveSession}
                                trainingUnits={trainingUnits} // Pass units from global state
                            />
                         </div>
                    </div>
                );
            }

            // Else show Input Form
            return (
                <div className="h-full bg-gray-50 flex justify-center overflow-y-auto">
                    <div className="w-full max-w-5xl bg-white shadow-lg h-full flex flex-col">
                         <DataInputPage 
                            onExcelSubmit={handleExcelSubmit}
                            isLoading={isLoading}
                            error={error}
                            onClearData={handleClearData}
                            reportMetadata={reportMetadata}
                            onMetadataChange={setReportMetadata}
                        />
                    </div>
                </div>
            );
        }

        // 6. Detail View (View Only/Edit)
        if (currentView === 'detail' && selectedSession && appData) {
             return (
                 <div className="h-full bg-gray-200 flex flex-col">
                     <div className="bg-white border-b px-6 py-3 flex justify-between items-center print:hidden shadow-sm z-20">
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setCurrentView('dashboard')} 
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                            >
                                <i className="fa-solid fa-arrow-left"></i>
                            </button>
                            <div>
                                <h2 className="font-bold text-lg text-gray-800">Chi tiết Kỳ Sát Hạch</h2>
                                <p className="text-xs text-gray-500">Đã lưu: {new Date(selectedSession.createdAt).toLocaleString('vi-VN')}</p>
                            </div>
                        </div>
                     </div>
                     <div className="flex-1 overflow-hidden relative z-0">
                         {isLoading ? (
                             <div className="flex h-full items-center justify-center">Loading full details...</div>
                         ) : (
                            <ReportDashboardPage 
                                summaryData={appData} 
                                studentRecords={studentRecords}
                                grandTotal={grandTotal} 
                                reportMetadata={reportMetadata}
                                mode="view"
                                initialReportDate={selectedSession.reportDate}
                                sessionName={selectedSession.name}
                                onUpdateSession={handleUpdateSession}
                                trainingUnits={trainingUnits} // Pass units
                            />
                         )}
                     </div>
                </div>
            );
        }

        // 7. Settings View
        if (currentView === 'settings') {
            return <SettingsPage />;
        }

        return null;
    };

    return (
         <div className="flex h-screen bg-gray-100 text-gray-800 font-sans overflow-hidden">
            {/* Sidebar Navigation */}
            <AdminSidebar currentView={currentView === 'detail' ? 'dashboard' : currentView} onChangeView={handleNavChange} />
            
            {/* Main Content Area */}
            <main className="flex-1 h-full relative flex flex-col min-w-0">
                {renderMainContent()}
            </main>

            {/* Global Toast */}
            {toast && (
                <Toast 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={() => setToast(null)} 
                />
            )}
        </div>
    );
};

export default App;