import React from 'react';
import type { TestType } from '../types';

interface FileUploadProps {
    label: string;
    onFileSelect: (file: File) => void;
    id: string;
}

const FileInput: React.FC<FileUploadProps> = ({ label, onFileSelect, id }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };

    return (
        <div className="w-full">
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input 
                id={id} 
                type="file" 
                accept=".xml,text/xml"
                onChange={handleChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
            />
        </div>
    );
};


interface FileUploadSectionProps {
    onFileUpload: (file: File, testType: TestType, dataType: 'firstTime' | 'retake') => void;
    onSubmit: () => void;
    isLoading: boolean;
    error: string | null;
}

export const FileUploadSection: React.FC<FileUploadSectionProps> = ({ onFileUpload, onSubmit, isLoading, error }) => {
    const testTypes: { key: TestType; label: string }[] = [
        { key: 'theory', label: 'Thi lý thuyết' },
        { key: 'simulation', label: 'Mô phỏng' },
        { key: 'practicalCourse', label: 'Sa hình' },
        { key: 'onRoad', label: 'Thực hành trên đường' },
    ];

    return (
        <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <div className="text-center">
                <i className="fa-solid fa-cloud-arrow-up text-4xl text-gray-400"></i>
                <h3 className="mt-2 text-lg font-medium text-gray-900">Tải lên các file dữ liệu XML Tổng hợp</h3>
                <p className="mt-1 text-sm text-gray-600">
                    Vui lòng cung cấp file kết quả đã được tổng hợp cho từng phần thi.
                </p>
                <div className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded-md">
                    <strong>Lưu ý:</strong> File XML cần có định dạng: 
                    <code className="text-xs">{`<results><class id="B"><total>10</total><passed>8</passed><failed>2</failed></class>...</results>`}</code>
                </div>
            </div>

            {error && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div>
                    <h4 className="font-semibold text-gray-800 border-b pb-2 mb-4">a) Học viên dự thi lần đầu</h4>
                    <div className="space-y-4">
                    {testTypes.map(tt => (
                         <FileInput key={`firstTime-${tt.key}`} id={`firstTime-${tt.key}`} label={tt.label} onFileSelect={(file) => onFileUpload(file, tt.key, 'firstTime')} />
                    ))}
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold text-gray-800 border-b pb-2 mb-4">b) Thí sinh cấp lại & tự do</h4>
                    <div className="space-y-4">
                    {testTypes.map(tt => (
                         <FileInput key={`retake-${tt.key}`} id={`retake-${tt.key}`} label={tt.label} onFileSelect={(file) => onFileUpload(file, tt.key, 'retake')} />
                    ))}
                    </div>
                </div>
            </div>
             
            <div className="mt-8 flex justify-end">
                <button
                    onClick={onSubmit}
                    disabled={isLoading}
                    className="px-6 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:bg-gray-400"
                >
                    <i className="fa-solid fa-chart-pie"></i> Tạo Báo Cáo
                </button>
            </div>
            
            {isLoading && (
                <div className="mt-6 text-center">
                    <div className="flex items-center justify-center gap-2 text-blue-600">
                        <i className="fa-solid fa-spinner animate-spin"></i>
                        <span>Đang xử lý dữ liệu...</span>
                    </div>
                </div>
            )}
        </div>
    );
};