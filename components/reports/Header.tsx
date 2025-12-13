
import React from 'react';

// FIX: Add reportDate to props to allow dynamic date rendering.
interface HeaderProps {
    reportDate: Date;
}

export const Header: React.FC<HeaderProps> = ({ reportDate }) => {
    // FIX: Format the date from props to be displayed in the report.
    const formattedDate = `ngày ${reportDate.getDate()} tháng ${reportDate.getMonth() + 1} năm ${reportDate.getFullYear()}`;

    return (
        <header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center font-semibold">
                <div>
                    <h2 className="text-sm sm:text-base">CÔNG AN TỈNH BẮC NINH</h2>
                    <h3 className="text-sm sm:text-base">PHÒNG CSGT</h3>
                    <div className="w-24 h-0.5 bg-black mx-auto mt-1"></div>
                </div>
                <div>
                    <h2 className="text-sm sm:text-base">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h2>
                    <h3 className="text-sm sm:text-base">Độc lập - Tự do - Hạnh phúc</h3>
                    <div className="w-48 h-0.5 bg-black mx-auto mt-1"></div>
                </div>
            </div>
            <div className="text-right text-sm italic mt-2 pr-4 sm:pr-8">
                {/* FIX: Use the formatted dynamic date. */}
                <p>Bắc Ninh, {formattedDate}</p>
            </div>
            <div className="text-center mt-8">
                <h1 className="text-xl sm:text-2xl font-bold">BIÊN BẢN</h1>
                <h2 className="text-lg sm:text-xl font-bold mt-1">TỔNG HỢP KẾT QUẢ KỲ SÁT HẠCH LÁI XE Ô TÔ</h2>
            </div>
        </header>
    );
};
