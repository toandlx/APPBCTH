import React from 'react';
import type { AppData, LicenseClassData } from '../types';
import { Header } from './Header';
import { Summary } from './Summary';
import { ResultsTable } from './ResultsTable';

interface ReportPageProps {
    appData: AppData;
    grandTotal: LicenseClassData | null;
    onNewReport: () => void;
}

export const ReportPage: React.FC<ReportPageProps> = ({ appData, grandTotal, onNewReport }) => {
    return (
        <>
            <Header />
            <Summary 
                totalApplications={grandTotal?.totalApplications || 0}
                totalParticipants={grandTotal?.totalParticipants || 0}
            />
            <main className="mt-8">
                <div className="flex justify-end mb-4 space-x-2 print:hidden">
                    <button
                        onClick={onNewReport}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 font-semibold"
                        aria-label="Tạo báo cáo mới"
                    >
                        <i className="fa-solid fa-plus"></i> Tạo Báo Cáo Mới
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors flex items-center gap-2"
                        aria-label="In báo cáo"
                    >
                        <i className="fa-solid fa-print"></i> In Báo Cáo
                    </button>
                </div>
                <ResultsTable data={appData.firstTime.rows} title={appData.firstTime.title} />
                <div className="mt-8">
                    <ResultsTable data={appData.retake.rows} title={appData.retake.title} isRetakeTable={true} grandTotal={grandTotal}/>
                </div>
            </main>
        </>
    );
};
