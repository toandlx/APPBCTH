import React from 'react';
import type { ReportMetadata } from '../../types';

interface MeetingMinutesProps {
    reportDate: Date;
    totalApplications: number;
    metadata: ReportMetadata;
}

export const MeetingMinutes: React.FC<MeetingMinutesProps> = ({ reportDate, totalApplications, metadata }) => {
    const formattedDate = `Ngày ${reportDate.getDate()} tháng ${reportDate.getMonth() + 1} năm ${reportDate.getFullYear()}`;

    return (
        <section className="mt-8 text-sm sm:text-base leading-relaxed">
            <p>
                {formattedDate}, vào hồi {metadata.meetingTime}, tại {metadata.meetingLocation}. 
                Hội đồng sát hạch lái xe cho {totalApplications} học viên của {metadata.organizer},
                đã họp toàn thể để xét công nhận kết quả kỳ sát hạch.
            </p>
            <p className="mt-2">
                <strong>Thành phần gồm có:</strong>
            </p>
             <div className="mt-2 space-y-1 pl-4">
                {metadata.attendees.map((attendee, index) => (
                    <div key={attendee.id} className="flex items-start">
                        <div className="w-8">{index + 1}.</div>
                        <div className="flex-1">
                            <div className="grid grid-cols-[minmax(0,_2fr)_auto_minmax(0,_3fr)] gap-x-4">
                                <span>{attendee.name}</span>
                                <span className="text-center">-</span>
                                <span>{attendee.role}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
