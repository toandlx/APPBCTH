import React from 'react';
import type { LicenseClassData, TestResult } from '../types';

interface LicenseClassFormRowProps {
    data: LicenseClassData;
    onChange: (field: string, value: string | number) => void;
    onRemove: () => void;
}

const NumberInput: React.FC<{ name: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder: string; readOnly?: boolean; }> = 
({ name, value, onChange, placeholder, readOnly = false }) => (
    <input
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        min="0"
        className={`w-full p-2 border rounded-md text-sm text-center ${readOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
    />
);

const TestResultInputGroup: React.FC<{ name: string; values: TestResult; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ name, values, onChange }) => (
    <div>
        <div className="grid grid-cols-3 gap-1 mb-1 text-xs text-center text-gray-500">
            <span>T.Số</span>
            <span>Đạt</span>
            <span>Trượt</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
            <NumberInput name={`${name}.total`} value={values.total} onChange={onChange} placeholder="T.Số" />
            <NumberInput name={`${name}.pass`} value={values.pass} onChange={onChange} placeholder="Đạt" />
            <NumberInput name={`${name}.fail`} value={values.fail} onChange={onChange} placeholder="Trượt" readOnly />
        </div>
    </div>
);


export const LicenseClassFormRow: React.FC<LicenseClassFormRowProps> = ({ data, onChange, onRemove }) => {
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.name, e.target.value);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-6 gap-y-4 items-start p-4 border bg-white rounded-lg mb-4 shadow-sm">
            {/* Column 1: Class & Actions */}
            <div className="lg:col-span-1 flex flex-col justify-between h-full">
                <label className="font-bold text-sm mb-1">Hạng</label>
                <input
                    type="text"
                    name="class"
                    value={data.class}
                    onChange={handleChange}
                    placeholder="B2"
                    className="w-full p-2 border rounded-md font-bold text-center"
                />
                 <button onClick={onRemove} className="mt-4 text-red-500 hover:text-red-700 transition-colors text-xs flex items-center justify-center gap-1">
                    <i className="fa-solid fa-trash-can"></i> Xóa
                </button>
            </div>
            
            {/* Column 2: Applications & Participants */}
             <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                 <div>
                    <label className="font-semibold text-sm mb-1 block">T.S Hồ sơ</label>
                    <NumberInput name="totalApplications" value={data.totalApplications} onChange={handleChange} placeholder="0" />
                </div>
                <div>
                    <label className="font-semibold text-sm mb-1 block">T.S Dự thi</label>
                    <NumberInput name="totalParticipants" value={data.totalParticipants} onChange={handleChange} placeholder="0" />
                </div>
            </div>

            {/* Column 3-6: Test Results */}
            <div className="lg:col-span-2">
                <label className="font-semibold text-sm mb-1 block text-center">Lý thuyết</label>
                <TestResultInputGroup name="theory" values={data.theory} onChange={handleChange} />
            </div>
            <div className="lg:col-span-2">
                <label className="font-semibold text-sm mb-1 block text-center">Mô phỏng</label>
                <TestResultInputGroup name="simulation" values={data.simulation} onChange={handleChange} />
            </div>
            <div className="lg:col-span-2">
                <label className="font-semibold text-sm mb-1 block text-center">Sa hình</label>
                <TestResultInputGroup name="practicalCourse" values={data.practicalCourse} onChange={handleChange} />
            </div>
            <div className="lg:col-span-2">
                 <label className="font-semibold text-sm mb-1 block text-center">Đường trường</label>
                <TestResultInputGroup name="onRoad" values={data.onRoad} onChange={handleChange} />
            </div>

            {/* Column 7: Final Pass */}
            <div className="lg:col-span-1">
                <label className="font-semibold text-sm mb-1 block text-center">KQ Đạt</label>
                <NumberInput name="finalPass" value={data.finalPass} onChange={handleChange} placeholder="0" />
            </div>
        </div>
    );
};