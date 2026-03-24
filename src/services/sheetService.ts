
const SHEET_ID = '167-YuqtIFXnHct4JjQt4Rq7NHbLz9ICMaCeo09XhFjA';
export const FETCH_SHEET_NAME = 'query';
export const UPDATE_SHEET_NAME = 'Computername';

// URL สำหรับดึงข้อมูล (JSON format)
const JSON_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(FETCH_SHEET_NAME)}`;

/**
 * !!! สำคัญมาก !!!
 * ในหน้า Apps Script ของคุณ:
 * 1. ต้องกด "Deploy" (สีน้ำเงิน) -> "Manage Deployments"
 * 2. กดรูป "ดินสอ" (Edit)
 * 3. ตรงช่อง Version เลือก "New Version" (ห้ามใช้ Version เดิม)
 * 4. ตรวจสอบว่า Who has access เป็น "Anyone"
 * 5. กด "Deploy"
 */
/**
 * !!! สำคัญมาก !!!
 * ตัวอย่างโค้ด Apps Script (doPost) ที่รองรับการอัปเดตหลายฟิลด์และบันทึกเวลา
 * 
 * function doPost(e) {
 *   try {
 *     var data = JSON.parse(e.postData.contents);
 *     var action = data.action;
 *     var ss = SpreadsheetApp.getActiveSpreadsheet();
 *     var sheetName = "Computername"; 
 *     var sheet = ss.getSheetByName(sheetName);
 *     
 *     if (!sheet) return ContentService.createTextOutput("Error: Sheet not found").setMimeType(ContentService.MimeType.TEXT);
 *
 *     var rows = sheet.getDataRange().getDisplayValues();
 *     
 *     if (action === "update") {
 *       var key1 = String(data.key1).trim(); // สินทรัพย์ (Col A)
 *       var key2 = String(data.key2).trim(); // รหัสย่อย (Col B)
 *       var updates = data.updates; // Object ของฟิลด์ที่ต้องการอัปเดต
 *       
 *       var found = false;
 *       for (var i = 1; i < rows.length; i++) {
 *         if (String(rows[i][0]).trim() === key1 && String(rows[i][1]).trim() === key2) {
 *           // อัปเดตฟิลด์ที่ส่งมา
 *           if (updates.Computername !== undefined) {
 *             sheet.getRange(i + 1, 5).setValue(updates.Computername); // Col E
 *           }
 *           if (updates["ประวัติการซ่อม"] !== undefined) {
 *             sheet.getRange(i + 1, 6).setValue(updates["ประวัติการซ่อม"]); // Col F
 *           }
 *           
 *           // บันทึกวันเวลาทำรายการลงในคอลัมน์ G (หลักที่ 7)
 *           var now = new Date();
 *           var formattedDate = Utilities.formatDate(now, "GMT+7", "dd/MM/yyyy HH:mm:ss");
 *           sheet.getRange(i + 1, 7).setValue(formattedDate);
 *           
 *           found = true;
 *           break;
 *         }
 *       }
 *       return ContentService.createTextOutput(found ? "Success" : "Not Found").setMimeType(ContentService.MimeType.TEXT);
 *     }
 *     
 *     if (action === "add") {
 *       var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
 *       var newRow = headers.map(function(h) { return data[h] || ""; });
 *       sheet.appendRow(newRow);
 *       return ContentService.createTextOutput("Added").setMimeType(ContentService.MimeType.TEXT);
 *     }
 *   } catch (err) {
 *     return ContentService.createTextOutput("Error: " + err.toString()).setMimeType(ContentService.MimeType.TEXT);
 *   }
 * }
 */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyNg6wYKgHZj_n24F1c2ubu0_kqAWEVGJrkoS5Zs_d1Au6wA_2gASPGqPftJksceKE/exec';

export const fetchBusAMapping = async (): Promise<Record<string, string>> => {
  try {
    const BUSA_SHEET_ID = '1w9hpBSC_6SRvewq2HoslY7OW_HcngbdroV9UakJDWRM';
    const url = `https://docs.google.com/spreadsheets/d/${BUSA_SHEET_ID}/gviz/tq?tqx=out:json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const text = await response.text();
    const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const jsonObj = JSON.parse(jsonStr);
    
    const mapping: Record<string, string> = {};
    if (jsonObj.table && jsonObj.table.rows) {
      // Find column indices for "BusA" and "คำอธิบาย"
      let busAIdx = 0;
      let descIdx = 1;

      if (jsonObj.table.cols) {
        const cols = jsonObj.table.cols;
        const foundBusA = cols.findIndex((c: any) => (c.label || '').toLowerCase().includes('busa'));
        const foundDesc = cols.findIndex((c: any) => (c.label || '').toLowerCase().includes('อธิบาย') || (c.label || '').toLowerCase().includes('description'));
        if (foundBusA !== -1) busAIdx = foundBusA;
        if (foundDesc !== -1) descIdx = foundDesc;
      }

      jsonObj.table.rows.forEach((row: any) => {
        if (row.c && row.c.length > Math.max(busAIdx, descIdx)) {
          const codeCell = row.c[busAIdx];
          const descCell = row.c[descIdx];
          
          if (codeCell && descCell) {
            let code = String(codeCell.f !== undefined ? codeCell.f : (codeCell.v !== null ? codeCell.v : '')).trim();
            const desc = String(descCell.f !== undefined ? descCell.f : (descCell.v !== null ? descCell.v : '')).trim();
            
            code = code.replace(/\.0$/, '');
            
            // Skip header row if it's in the rows data
            if (code && 
                code.toLowerCase() !== 'busa' && 
                code.toLowerCase() !== 'code' && 
                !desc.toLowerCase().includes('อธิบาย') &&
                !desc.toLowerCase().includes('description')) {
              mapping[code] = desc;
            }
          }
        }
      });
    }
    console.log("✅ BusA Mapping loaded:", Object.keys(mapping).length, "entries from", BUSA_SHEET_ID);
    return mapping;
  } catch (error) {
    console.error("BusA Mapping Fetch Error:", error);
    return {};
  }
};

export const fetchSheetData = async (): Promise<{data: any[], headers: string[], rawHeaders: string[]}> => {
  try {
    const response = await fetch(JSON_URL);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const text = await response.text();
    const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const jsonObj = JSON.parse(jsonStr);
    
    if (!jsonObj.table || !jsonObj.table.cols || !jsonObj.table.rows) {
      return { data: [], headers: [], rawHeaders: [] };
    }

    const rawHeaders = jsonObj.table.cols.map((col: any) => col.label || col.id);
    const rows = jsonObj.table.rows;
    const mappedData = rows.map((row: any, i: number) => {
      const obj: any = { id: `row-${i}` };
      rawHeaders.forEach((header: string, j: number) => {
        const cell = row.c && row.c[j];
        // Use formatted value (cell.f) if available, otherwise use raw value (cell.v)
        if (cell) {
          if (cell.f !== undefined && cell.f !== null) {
            obj[header] = String(cell.f);
          } else if (cell.v !== null && cell.v !== undefined) {
            obj[header] = String(cell.v);
          } else {
            obj[header] = '';
          }
        } else {
          obj[header] = '';
        }
      });
      return obj;
    });

    return { data: mappedData, headers: rawHeaders, rawHeaders };
  } catch (error) {
    console.error("Fetch Error:", error);
    return { data: [], headers: [], rawHeaders: [] };
  }
};

export const updateAssetOnSheet = async (payload: { key1: string, key2: string, updates: Record<string, any> }): Promise<boolean> => {
  try {
    if (APPS_SCRIPT_URL.includes('Placeholder')) {
      console.error("APPS_SCRIPT_URL ยังไม่ได้ตั้งค่า");
      return false;
    }

    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', 
      cache: 'no-cache',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ ...payload, action: 'update' }),
    });
    
    console.log("📤 Update request sent to Apps Script successfully");
    return true; 
  } catch (error) {
    console.error("❌ Network error during update:", error);
    return false;
  }
};

export const deleteAssetOnSheet = async (payload: { key1: string, key2: string }): Promise<boolean> => {
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', 
      cache: 'no-cache',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ ...payload, action: 'delete' }),
    });
    
    console.log("📤 Delete request sent to Apps Script successfully");
    return true; 
  } catch (error) {
    console.error("❌ Network error during delete:", error);
    return false;
  }
};

export const addAssetOnSheet = async (assetData: any): Promise<boolean> => {
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', 
      cache: 'no-cache',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ ...assetData, action: 'add' }),
    });
    
    console.log("📤 Add request sent to Apps Script successfully");
    return true; 
  } catch (error) {
    console.error("❌ Network error during add:", error);
    return false;
  }
};
