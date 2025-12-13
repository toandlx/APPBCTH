
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
                'SỐ BÁO DANH': 'BN001', 
                'MÃ HỌC VIÊN': '01234', 
                'HỌ VÀ TÊN': 'Nguyễn Văn A', 
                'SỐ CHỨNG MINH': '012345678901',
                'NGÀY SINH': '01/01/1990',
                'NƠI CƯ TRÚ': 'Thành phố Bắc Ninh, Bắc Ninh',
                'HẠNG GPLX': 'B2', 
                'NỘI DUNG THI': 'LMHD',
                'LÝ THUYẾT': 'ĐẠT', 
                'MÔ PHỎNG': 'ĐẠT', 
                'SA HÌNH': 'ĐẠT', 
                'ĐƯỜNG TRƯỜNG': 'ĐẠT'
            },
            { 
                'SỐ BÁO DANH': 'BN002', 
                'MÃ HỌC VIÊN': '2722001', 
                'HỌ VÀ TÊN': 'Trần Thị B', 
                'SỐ CHỨNG MINH': '012345678902',
                'NGÀY SINH': '15/05/1995',
                'NƠI CƯ TRÚ': 'Huyện Yên Phong, Bắc Ninh',
                'HẠNG GPLX': 'B2', 
                'NỘI DUNG THI': 'L+M+H+Đ',
                'LÝ THUYẾT': 'ĐẠT', 
                'MÔ PHỎNG': 'ĐẠT', 
                'SA HÌNH': 'ĐẠT', 
                'ĐƯỜNG TRƯỜNG': 'KHÔNG ĐẠT'
            },
            { 
                'SỐ BÁO DANH': 'BN003', 
                'MÃ HỌC VIÊN': '11111', 
                'HỌ VÀ TÊN': 'Lê Văn C', 
                'SỐ CHỨNG MINH': '012345678903',
                'NGÀY SINH': '20/11/2000',
                'NƠI CƯ TRÚ': 'Huyện Quế Võ, Bắc Ninh',
                'HẠNG GPLX': 'C', 
                'NỘI DUNG THI': 'L',
                'LÝ THUYẾT': 'KHÔNG ĐẠT', 
                'MÔ PHỎNG': '', 
                'SA HÌNH': '', 
                'ĐƯỜNG TRƯỜNG': ''
            },
             { 
                'SỐ BÁO DANH': 'BN004', 
                'MÃ HỌC VIÊN': '2721005', 
                'HỌ VÀ TÊN': 'Phạm Thị D', 
                'SỐ CHỨNG MINH': '012345678904',
                'NGÀY SINH': '10/02/1988',
                'NƠI CƯ TRÚ': 'Thị xã Từ Sơn, Bắc Ninh',
                'HẠNG GPLX': 'B2', 
                'NỘI DUNG THI': 'H',
                'LÝ THUYẾT': '', 
                'MÔ PHỎNG': '', 
                'SA HÌNH': 'KHÔNG ĐẠT', 
                'ĐƯỜNG TRƯỜNG': ''
            },
            { 
                'SỐ BÁO DANH': 'BN005', 
                'MÃ HỌC VIÊN': '2722099', 
                'HỌ VÀ TÊN': 'Mai Văn E', 
                'SỐ CHỨNG MINH': '012345678905',
                'NGÀY SINH': '30/07/1992',
                'NƠI CƯ TRÚ': 'Huyện Lương Tài, Bắc Ninh',
                'HẠNG GPLX': 'C', 
                'NỘI DUNG THI': 'D',
                'LÝ THUYẾT': '', 
                'MÔ PHỎNG': '', 
                'SA HÌNH': '', 
                'ĐƯỜNG TRƯỜNG': 'ĐẠT'
            },
        ];
        // Ensure column order is respected by json_to_sheet when array of objects is passed.
        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachHocVien");
        XLSX.writeFile(workbook, "Mau_Nhap_Lieu.xlsx");
    };

    return (
        <div className="p-6 space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-gray-800">Tải lên File Excel chi tiết</h3>
                <p className="mt-1 text-sm text-gray-600">
                    Cung cấp file Excel chứa danh sách và kết quả của tất cả học viên.
                </p>
                <div className="mt-2 text-xs text-blue-700 bg-blue-50 p-3 rounded-md">
                     <p className="font-bold mb-1"><i className="fa-solid fa-circle-info"></i> Lưu ý quy tắc nhập liệu:</p>
                     <ul className="list-disc pl-5 space-y-2">
                         <li>
                             <strong>Thứ tự cột:</strong> SỐ BÁO DANH, MÃ HỌC VIÊN, HỌ VÀ TÊN, SỐ CHỨNG MINH, NGÀY SINH, NƠI CƯ TRÚ, HẠNG GPLX, NỘI DUNG THI, LÝ THUYẾT, MÔ PHỎNG, SA HÌNH, ĐƯỜNG TRƯỜNG.
                         </li>
                        <li>
                            <strong>Cột "NỘI DUNG THI":</strong>
                            <ul className="list-circle pl-4 mt-0.5 text-blue-800">
                                <li>Chấp nhận viết liền (VD: <strong>LMHD</strong>) hoặc có ký tự ngăn cách (VD: <strong>L+M+H+D</strong>).</li>
                                <li>Không phân biệt chữ <strong>D</strong> và <strong>Đ</strong>.</li>
                            </ul>
                        </li>
                        <li>
                             <strong>Cột "MÃ HỌC VIÊN":</strong>
                             <ul className="list-circle pl-4 mt-0.5 text-blue-800">
                                <li>Nếu mã bắt đầu bằng <strong>2721</strong> hoặc <strong>2722</strong>: Tính là <strong>"Thi lại"</strong>.</li>
                                <li>Các trường hợp còn lại: Tính là <strong>"Lần đầu"</strong>.</li>
                             </ul>
                        </li>
                     </ul>
                </div>
            </div>
            
            <div>
                 <label htmlFor="excel-upload" className="sr-only">Chọn file</label>
                 <input 
                    id="excel-upload" 
                    type="file" 
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                />
            </div>
            
            <div className="text-left">
                <button 
                    onClick={downloadSampleFile}
                    className="text-sm text-blue-600 hover:underline hover:text-blue-800 transition-colors"
                >
                    <i className="fa-solid fa-download mr-1"></i> Tải File Mẫu (.xlsx)
                </button>
            </div>
            
            {error && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}

            {isLoading && (
                <div className="mt-4">
                    <div className="flex items-center justify-start gap-2 text-blue-600">
                        <i className="fa-solid fa-spinner animate-spin"></i>
                        <span>Đang xử lý dữ liệu...</span>
                    </div>
                </div>
            )}
        </div>
    );
};
