
import React from 'react';
import type { AppData, LicenseClassData, ReportMetadata } from '../../types';
import { Header } from './Header';
import { Summary } from './Summary';
import { ResultsTable } from './ResultsTable';
import { FeeSummaryReport } from './FeeSummaryReport';
import { MeetingMinutes } from './MeetingMinutes';

interface GeneralReportProps {
    appData: AppData;
    grandTotal: LicenseClassData | null;
    reportDate: Date;
    reportMetadata: ReportMetadata;
}

export const GeneralReport: React.FC<GeneralReportProps> = ({ appData, grandTotal, reportDate, reportMetadata }) => {
    return (
        <>
            <Header reportDate={reportDate} />
            <MeetingMinutes 
                reportDate={reportDate}
                totalApplications={grandTotal?.totalApplications || 0}
                metadata={reportMetadata}
            />
            <Summary 
                totalApplications={grandTotal?.totalApplications || 0}
                totalParticipants={grandTotal?.totalParticipants || 0}
            />
            <main className="mt-4">
                <ResultsTable data={appData.firstTime.rows} title={appData.firstTime.title} />
                <div className="mt-8">
                    <ResultsTable data={appData.retake.rows} title={appData.retake.title} isRetakeTable={true} grandTotal={grandTotal}/>
                </div>
                <div className="mt-8">
                    <FeeSummaryReport grandTotal={grandTotal} reportMetadata={reportMetadata} />
                </div>
            </main>
        </>
    );
};
