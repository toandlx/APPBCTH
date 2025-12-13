import React, { useState, useMemo, useEffect } from 'react';
import { DataInputPage } from './components/DataInputPage';
import { ReportDashboardPage } from './components/reports/ReportDashboardPage';
import { AdminSidebar } from './components/admin/AdminSidebar';
import { SessionList } from './components/admin/SessionList';
import { SettingsPage } from './components/admin/SettingsPage';
import { storageService } from './services/storageService';
import type { AppData, LicenseClassData, StudentRecord, ReportMetadata, SavedSession } from './types';
import { processExcelData } from './services/excelProcessor';

type AppView = 'dashboard' | 'create' | 'detail' | 'settings';

const App: React.FC = () => {
    // Navigation State
    const [currentView, setCurrentView] = useState<AppView>('dashboard');
    
    // Data State
    const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
    
    // Working State (New or Selected Session)
    const [appData, setAppData] = useState<AppData | null>(null);
    const [studentRecords, setStudentRecords] = useState<StudentRecord[] | null>(null);
    const [selectedSession, setSelectedSession] = useState<SavedSession | null>(null);
    
    // UI State
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

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

    // Load sessions on mount
    const loadSessions = async () => {
        const sessions = await storageService.getAllSessions();
        setSavedSessions(sessions);
    };

    useEffect(() => {
        loadSessions();
    }, []);

    const handleExcelSubmit = (records: StudentRecord[]) => {
        setIsLoading(true);
        setError(null);
        try {
            const processedData = processExcelData(records);
            setStudentRecords(records);
            setAppData(processedData);
        } catch (e) {
             setError(`Lỗi xử lý file Excel: ${(e as Error).message}`);
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
    };

    const handleSaveSession = async (name: string, reportDate: Date) => {
        if (!appData || !grandTotal || !studentRecords) return;
        setIsLoading(true);

        const newSession: SavedSession = {
            id: Date.now().toString(),
            name: name,
            createdAt: Date.now(),
            reportDate: reportDate.toISOString(),
            studentRecords: studentRecords,
            appData: appData,
            grandTotal: grandTotal,
            reportMetadata: reportMetadata
        };

        await storageService.saveSession(newSession);
        await loadSessions();
        
        // Reset and go to dashboard
        handleClearData();
        setCurrentView('dashboard');
        setIsLoading(false);
        alert('Đã lưu kỳ sát hạch thành công!');
    };

    const handleUpdateSession = async (name: string, reportDate: Date, metadata: ReportMetadata) => {
        if (!selectedSession) return;
        setIsLoading(true);

        const updatedSession: SavedSession = {
            ...selectedSession,
            name: name,
            reportDate: reportDate.toISOString(),
            reportMetadata: metadata
        };

        await storageService.saveSession(updatedSession);
        await loadSessions();
        
        // Update local selected session state so the view refreshes immediately
        setSelectedSession(updatedSession);
        setReportMetadata(metadata);
        
        setIsLoading(false);
        alert('Đã cập nhật kỳ sát hạch!');
    };

    const handleDeleteSession = async (id: string) => {
        await storageService.deleteSession(id);
        await loadSessions();
        if (selectedSession?.id === id) {
            setSelectedSession(null);
            setCurrentView('dashboard');
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
        setCurrentView('detail');
        setIsLoading(false);
    };

    const handleNavChange = (view: AppView) => {
        if (view === 'create') {
            handleClearData();
            setSelectedSession(null);
        }
        if (view === 'dashboard') {
            loadSessions();
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
                    onRefresh={async () => { await loadSessions(); }}
                />
            );
        }

        // 2. Create View (Input -> Preview)
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
                            />
                         </div>
                    </div>
                );
            }

            // Else show Input Form
            return (
                <div className="h-full bg-gray-50 flex justify-center p-6 overflow-y-auto">
                    <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg h-fit min-h-[600px] flex flex-col">
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

        // 3. Detail View (View Only/Edit)
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
                            />
                         )}
                     </div>
                </div>
            );
        }

        // 4. Settings View
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
        </div>
    );
};

export default App;