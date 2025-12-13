
import React from 'react';

export const Header: React.FC = () => {
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
                <p>Bắc Ninh, ngày 28 tháng 10 năm 2025</p>
            </div>
            <div className="text-center mt-8">
                <h1 className="text-xl sm:text-2xl font-bold">BIÊN BẢN</h1>
                <h2 className="text-lg sm:text-xl font-bold mt-1">TỔNG HỢP KẾT QUẢ KỲ SÁT HẠCH LÁI XE Ô TÔ</h2>
            </div>
        </header>
    );
};
