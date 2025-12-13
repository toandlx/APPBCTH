
import React from 'react';

interface SummaryProps {
    totalApplications: number;
    totalParticipants: number;
}

export const Summary: React.FC<SummaryProps> = ({ totalApplications, totalParticipants }) => {
    const absent = totalApplications - totalParticipants;

    return (
        <section className="mt-8 text-sm sm:text-base">
            <h3 className="text-lg font-bold">I. Thông qua kết quả kỳ sát hạch:</h3>
            <div className="mt-2 space-y-1 pl-4">
                <p><strong>1. Tổng số hồ sơ đăng ký dự thi:</strong> {totalApplications} hồ sơ</p>
                <p>
                    <strong>Tổng số thí sinh dự thi:</strong> {totalParticipants} thí sinh; 
                    <strong> Vắng không dự thi:</strong> {absent > 0 ? absent : 0} thí sinh 
                    <em>(có danh sách kèm theo)</em>
                </p>
                <p><strong>2. Kết quả:</strong></p>
            </div>
        </section>
    );
};
