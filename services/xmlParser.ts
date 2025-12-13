
import type { TestResult } from '../types';

interface ParsedClassData {
    [className: string]: TestResult;
}

/**
 * Parses an XML string representing test results into a structured object.
 * 
 * The expected XML format is:
 * <results>
 *   <class id="B">
 *     <total>206</total>
 *     <passed>153</passed>
 *     <failed>53</failed>
 *   </class>
 *   <class id="C1">
 *     ...
 *   </class>
 * </results>
 */
export const parseXMLData = (xmlString: string): ParsedClassData => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");

    const errorNode = xmlDoc.querySelector("parsererror");
    if (errorNode) {
        throw new Error("Lỗi phân tích cú pháp XML: " + errorNode.textContent);
    }
    
    const classNodes = xmlDoc.getElementsByTagName("class");
    const results: ParsedClassData = {};

    for (let i = 0; i < classNodes.length; i++) {
        const classNode = classNodes[i];
        const className = classNode.getAttribute("id");

        if (className) {
            const total = parseInt(classNode.getElementsByTagName("total")[0]?.textContent || '0', 10);
            const pass = parseInt(classNode.getElementsByTagName("passed")[0]?.textContent || '0', 10);
            const fail = parseInt(classNode.getElementsByTagName("failed")[0]?.textContent || '0', 10);
            
            results[className] = { total, pass, fail };
        }
    }

    if (Object.keys(results).length === 0) {
        throw new Error("Không tìm thấy dữ liệu hợp lệ trong file XML. Vui lòng kiểm tra định dạng.");
    }

    return results;
};
