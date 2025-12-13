import React, { useMemo } from 'react';
import type { LicenseClassData } from '../types';

interface ResultsTableProps {
    title: string;
    data: LicenseClassData[];
    isRetakeTable?: boolean;
    grandTotal?: LicenseClassData | null;
}

const tableHeaderCellStyle = "p-2 border border-gray-400 font-bold bg-gray-200";
const tableCellStyle = "p-2 border border-gray-400 text-center";
const subHeaderCellStyle = "p-1 border border-gray-400 font-semibold bg-gray-100";
const totalRowCellStyle = "p-2 border border-gray-400 text-center font-bold bg-gray-200";

const renderTestResultCells = (result: { total: number; pass: number; fail: number; }) => (
    <>
        <td className={tableCellStyle}>{result.total}</td>
        <td className={`${tableCellStyle} text-green-600`}>{result.pass}</td>
        <td className={`${tableCellStyle} text-red-600`}>{result.fail}</td>
    </>
);

const renderTotalTestResultCells = (result: { total: number; pass: number; fail: number; }) => (
    <>
        <td className={totalRowCellStyle}>{result.total}</td>
        <td className={`${totalRowCellStyle} text-green-700`}>{result.pass}</td>
        <td className={`${totalRowCellStyle} text-red-700`}>{result.fail}</td>
    </>
);

export const ResultsTable: React.FC<ResultsTableProps> = ({ title, data, isRetakeTable = false, grandTotal }) => {
    
    const totalRow = useMemo<LicenseClassData>(() => {
        return data.reduce((acc, row) => {
            acc.totalApplications += row.totalApplications;
            acc.totalParticipants += row.totalParticipants;
            acc.theory.total += row.theory.total;
            acc.theory.pass += row.theory.pass;
            acc.theory.fail += row.theory.fail;
            acc.simulation.total += row.simulation.total;
            acc.simulation.pass += row.simulation.pass;
            acc.simulation.fail += row.simulation.fail;
            acc.practicalCourse.total += row.practicalCourse.total;
            acc.practicalCourse.pass += row.practicalCourse.pass;
            acc.practicalCourse.fail += row.practicalCourse.fail;
            acc.onRoad.total += row.onRoad.total;
            acc.onRoad.pass += row.onRoad.pass;
            acc.onRoad.fail += row.onRoad.fail;
            acc.finalPass += row.finalPass;
            return acc;
        }, {
            class: isRetakeTable ? 'Cộng' : 'Cộng',
            totalApplications: 0,
            totalParticipants: 0,
            theory: { total: 0, pass: 0, fail: 0 },
            simulation: { total: 0, pass: 0, fail: 0 },
            practicalCourse: { total: 0, pass: 0, fail: 0 },
            onRoad: { total: 0, pass: 0, fail: 0 },
            finalPass: 0,
        });
    }, [data, isRetakeTable]);

    return (
        <div className="overflow-x-auto text-sm">
            <h4 className="font-bold pl-4 mb-2">{title}</h4>
            <table className="w-full border-collapse border border-gray-400 bg-white">
                <thead>
                    <tr>
                        <th rowSpan={2} className={tableHeaderCellStyle}>Hạng GPLX</th>
                        <th rowSpan={2} className={tableHeaderCellStyle}>Tổng số hồ sơ</th>
                        <th rowSpan={2} className={tableHeaderCellStyle}>Tổng số dự thi</th>
                        <th colSpan={3} className={tableHeaderCellStyle}>Thi lý thuyết</th>
                        <th colSpan={3} className={tableHeaderCellStyle}>Mô phỏng các tình huống giao thông</th>
                        <th colSpan={3} className={tableHeaderCellStyle}>Sa hình</th>
                        <th colSpan={3} className={tableHeaderCellStyle}>Thực hành trên đường giao thông</th>
                        <th rowSpan={2} className={tableHeaderCellStyle}>Kết quả đạt</th>
                    </tr>
                    <tr>
                        <th className={subHeaderCellStyle}>T.số</th>
                        <th className={subHeaderCellStyle}>Đạt</th>
                        <th className={subHeaderCellStyle}>Trượt</th>
                        <th className={subHeaderCellStyle}>T.số</th>
                        <th className={subHeaderCellStyle}>Đạt</th>
                        <th className={subHeaderCellStyle}>Trượt</th>
                        <th className={subHeaderCellStyle}>T.số</th>
                        <th className={subHeaderCellStyle}>Đạt</th>
                        <th className={subHeaderCellStyle}>Trượt</th>
                        <th className={subHeaderCellStyle}>T.số</th>
                        <th className={subHeaderCellStyle}>Đạt</th>
                        <th className={subHeaderCellStyle}>Trượt</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map(row => (
                        <tr key={row.class}>
                            <td className={`${tableCellStyle} font-bold`}>{row.class}</td>
                            <td className={tableCellStyle}>{row.totalApplications}</td>
                            <td className={tableCellStyle}>{row.totalParticipants}</td>
                            {renderTestResultCells(row.theory)}
                            {renderTestResultCells(row.simulation)}
                            {renderTestResultCells(row.practicalCourse)}
                            {renderTestResultCells(row.onRoad)}
                            <td className={`${tableCellStyle} font-bold`}>{row.finalPass}</td>
                        </tr>
                    ))}
                    <tr className="bg-gray-100">
                        <td className={totalRowCellStyle}>Cộng</td>
                        <td className={totalRowCellStyle}>{totalRow.totalApplications}</td>
                        <td className={totalRowCellStyle}>{totalRow.totalParticipants}</td>
                        {renderTotalTestResultCells(totalRow.theory)}
                        {renderTotalTestResultCells(totalRow.simulation)}
                        {renderTotalTestResultCells(totalRow.practicalCourse)}
                        {renderTotalTestResultCells(totalRow.onRoad)}
                        <td className={totalRowCellStyle}>{totalRow.finalPass}</td>
                    </tr>
                    {isRetakeTable && grandTotal && (
                         <tr className="bg-yellow-100">
                            <td className={totalRowCellStyle}>Cộng a+b</td>
                            <td className={totalRowCellStyle}>{grandTotal.totalApplications}</td>
                            <td className={totalRowCellStyle}>{grandTotal.totalParticipants}</td>
                            {renderTotalTestResultCells(grandTotal.theory)}
                            {renderTotalTestResultCells(grandTotal.simulation)}
                            {renderTotalTestResultCells(grandTotal.practicalCourse)}
                            {renderTotalTestResultCells(grandTotal.onRoad)}
                            <td className={totalRowCellStyle}>{grandTotal.finalPass}</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};