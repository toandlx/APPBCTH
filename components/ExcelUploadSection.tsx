
import React from 'react';
import type { StudentRecord } from '../types';

declare const XLSX: any;

interface ExcelUploadSectionProps {
    onSubmit: (data: StudentRecord[]) => void;
    isLoading: boolean;
    error: string | null;
}

export const ExcelUploadSection: React.FC<ExcelUploadSectionProps> = ({ onSubmit, isLoading, error }) => {
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = new Uint8Array(event.target!.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const json: StudentRecord[] = XLSX.utils.sheet_to_json(worksheet);
                    onSubmit(json);
                } catch (err) {
                    console.error("Error processing Excel file:", err);
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const downloadSampleFile = () => {
        // Updated keys and order as requested
        const sampleData = [
            { 
                'SBD': 'BN001', 
                'MÃ HỌC VIÊN': '01234', 
                'HỌ VÀ TÊN': 'Nguyễn Văn A', 
                'SỐ CHỨNG MINH': '012345678901',
                'NGÀY SINH': '01/01/1990',
                'NƠI CƯ TRÚ': 'Thành phố Bắc Ninh, Bắc Ninh',
                'HẠNG': 'B2', 
                'NỘI DUNG THI': 'LMHD',
                'LT': 'ĐẠT', 
                'MP': 'ĐẠT', 
                'SH': 'ĐẠT', 
                'DT': 'ĐẠT'
            },
            { 
                'SBD': 'BN002', 
                'MÃ HỌC VIÊN': '2722001', 
                'HỌ VÀ TÊN': 'Trần Thị B', 
                'SỐ CHỨNG MINH': '012345678902',
                'NGÀY SINH': '15/05/1995',
                'NƠI CƯ TRÚ': 'Huyện Yên Phong, Bắc Ninh',
                'HẠNG': 'B2', 
                'NỘI DUNG THI': 'L+M+H+Đ',
                'LT': 'ĐẠT', 
                'MP': 'ĐẠT', 
                'SH': 'ĐẠT', 
                'DT': 'KHÔNG ĐẠT'
            },
            { 
                'SBD': 'BN003', 
                'MÃ HỌC VIÊN': '11111', 
                'HỌ VÀ TÊN': 'Lê Văn C', 
                'SỐ CHỨNG MINH': '012345678903',
                'NGÀY SINH': '20/11/2000',
                'NƠI CƯ TRÚ': 'Huyện Quế Võ, Bắc Ninh',
                'HẠNG': 'C', 
                'NỘI DUNG THI': '',
                'LT': 'KHÔNG ĐẠT', 
                'MP': '', 
                'SH': '', 
                'DT': ''
            }
        ];
        // Ensure column order is respected by json_to_sheet when array of objects is passed.
        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachHocVien");
        XLSX.writeFile(workbook, "Mau_Nhap_Lieu_Linh_Hoat.xlsx");
    };

    return (
        <div className="p-6 space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-gray-800">Tải lên File Excel chi tiết</h3>
                <p className="mt-1 text-sm text-gray-600">
                    Hệ thống hỗ trợ file Excel (.xlsx, .xls) chứa danh sách học viên và kết quả thi.
                </p>
                <div className="mt-2 text-xs text-blue-800 bg-blue-50 p-4 rounded-md border border-blue-100">
                     <p className="font-bold mb-2 text-base"><i className="fa-solid fa-wand-magic-sparkles"></i> Tính năng nhập liệu thông minh:</p>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="font-semibold mb-1">1. Tự động nhận diện cột:</p>
                            <ul className="list-disc pl-5 space-y-1 text-blue-700">
                                <li><strong>Họ tên:</strong> Chấp nhận 'HỌ VÀ TÊN', 'HỌ TÊN', 'HOTEN'...</li>
                                <li><strong>Hạng:</strong> Chấp nhận 'HẠNG GPLX', 'HẠNG', 'HẠNG XE'...</li>
                                <li><strong>Kết quả Lý thuyết:</strong> Chấp nhận 'LÝ THUYẾT', 'LT', 'ĐIỂM LT', 'KQ LT'...</li>
                                <li><strong>Kết quả Mô phỏng:</strong> Chấp nhận 'MÔ PHỎNG', 'MP', 'ĐIỂM MP', 'KQ MP'...</li>
                                <li><strong>Kết quả Sa hình:</strong> Chấp nhận 'SA HÌNH', 'SH', 'TH TRONG HÌNH'...</li>
                                <li><strong>Kết quả Đường trường:</strong> Chấp nhận 'ĐƯỜNG TRƯỜNG', 'ĐT', 'DT'...</li>
                            </ul>
                        </div>
                        <div>
                            <p className="font-semibold mb-1">2. Tự động điền nội dung thi:</p>
                            <p className="text-blue-700 mb-2">
                                Nếu file không có cột <strong>'NỘI DUNG THI'</strong>, hệ thống sẽ tự động xác định dựa trên các cột điểm có dữ liệu.
                            </p>
                            
                            <p className="font-semibold mb-1">3. Phân loại Học viên:</p>
                            <ul className="list-disc pl-5 space-y-1 text-blue-700">
                                <li>Mã HV bắt đầu <strong>2721...</strong>, <strong>2722...</strong> hoặc <strong>2411...</strong>: Tính là <strong>Thi lại</strong>.</li>
                                <li>Các trường hợp còn lại: Tính là <strong>Lần đầu</strong>.</li>
                            </ul>
                        </div>
                     </div>
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-center border-t pt-4">
                 <div className="flex-1 w-full">
                    <label htmlFor="excel-upload" className="sr-only">Chọn file</label>
                    <input 
                        id="excel-upload" 
                        type="file" 
                        accept=".xlsx, .xls"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" 
                    />
                 </div>
                 
                 <div className="flex-shrink-0">
                    <button 
                        onClick={downloadSampleFile}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 px-3 py-2 rounded-md hover:bg-blue-50"
                    >
                        <i className="fa-solid fa-download"></i> Tải File Mẫu
                    </button>
                </div>
            </div>
            
            {error && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm border border-red-200 flex items-start gap-2">
                <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
                <span>{error}</span>
            </div>}

            {isLoading && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                    <div className="flex items-center justify-center gap-3 text-blue-600">
                        <i className="fa-solid fa-circle-notch animate-spin text-xl"></i>
                        <span className="font-medium">Đang xử lý dữ liệu, vui lòng đợi...</span>
                    </div>
                </div>
            )}
        </div>
    );
};
