import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Employee, TargetMap, EmployeeProcess, ProductionRecord, AttendanceRecord, QualityRollup, QualityAuditRecord } from '../types';
import { normalizeEmpId, resolveTargetEntry } from '../utils/calculations';
import Papa from 'papaparse';
import { 
  Upload, Trash2, Plus, Download, AlertCircle, CheckCircle, Database, HelpCircle, FileSpreadsheet, RefreshCw,
  Server, History, HardDrive, FileJson, FileUp, Check, AlertTriangle, Play
} from 'lucide-react';

// Helper to parse "H:MM" format (e.g. "8:58") to a decimal value (e.g. 8.97)
function parseTimeToDecimal(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim();
  if (clean.includes(':')) {
    const parts = clean.split(':');
    if (parts.length === 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (!isNaN(hours) && !isNaN(minutes)) {
        return Number((hours + minutes / 60).toFixed(2));
      }
    }
  }
  const floatVal = parseFloat(clean);
  return isNaN(floatVal) ? 0 : floatVal;
}

export const BulkUploadView: React.FC = () => {
  const { 
    employees, targets, employeeProcesses, production, attendance,
    addEmployee, removeEmployee, clearEmployees, bulkUploadEmployees,
    addTarget, removeTarget, clearTargets, bulkUploadTargets,
    addEmployeeProcess, removeEmployeeProcess, clearEmployeeProcesses, bulkUploadEmployeeProcesses,
    addProductionRecord, removeProductionRecord, clearProduction, bulkUploadProduction,
    addAttendanceRecord, removeAttendanceRecord, clearAttendance, bulkUploadAttendance,
    qualityRollups, qualityAudits, clearQualityRollups, bulkUploadQualityRollups, clearQualityAudits, bulkUploadQualityAudits,
    resetAllData, logUploadedFile, uploadedFiles, manualAdditions, clearDatabaseLogs, restoreDatabase,
    rampUpRules, tickets
  } = useApp();

  // Active Tab for upload and manual management
  const [activeTab, setActiveTab] = useState<'employees' | 'targets' | 'production' | 'processes' | 'attendance' | 'database' | 'quality_rollups' | 'quality_audits'>('employees');
  const [restoreStatus, setRestoreStatus] = useState<{ type: 'idle' | 'success' | 'error'; msg: string }>({ type: 'idle', msg: '' });

  // Interactive feedback states
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Drag and Drop State
  const [dragActive, setDragActive] = useState(false);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleDownloadTemplate = () => {
    let headers = '';
    let rows = '';
    let filename = '';

    if (activeTab === 'employees') {
      headers = 'EmpID,Emp Name,Status,DOJ,DESIGNATION,RM,LM,RCM Managers';
      rows = 'EMP101,John Doe,Active,2025-01-15,Senior Associate,RM Manager,LM Lead,RCM Director\nEMP102,Jane Smith,Active,2026-03-01,Associate,RM Manager,LM Lead,RCM Director';
      filename = 'employees_template.csv';
    } else if (activeTab === 'targets') {
      headers = 'PMS,Process Name,Sub Process Name,Target,Daily Work Hours,Hourly Target';
      rows = 'Advanced MD,Denial Management,Denial/Aging,65,8,8.125\nCerner,Payment Posting,Collection,350,8,43.75';
      filename = 'targets_template.csv';
    } else if (activeTab === 'processes') {
      headers = 'EmpID,Emp Name,PMS,Process Name,Sub Process Name';
      rows = 'EMP101,John Doe,PMS001,Charge Entry,Demographics\nEMP102,Jane Smith,PMS001,Payment Posting,Cash Posting';
      filename = 'processes_template.csv';
    } else if (activeTab === 'production') {
      headers = 'EmpID,PMS,Process Name,Sub Process Name,Date,Target,Achieved';
      rows = 'EMP101,PMS001,Charge Entry,Demographics,2026-06-15,80,85\nEMP102,PMS001,Payment Posting,Cash Posting,2026-06-15,120,118';
      filename = 'production_template.csv';
    } else if (activeTab === 'attendance') {
      headers = 'DATE,EMP NO,EMPLOYEES NAME,DESIGNATION,MARKINGS,IN TIME,TOTAL WRK HRS,EXACT WRK HRS,BREAK HRS,STIPULATED TIME,EXTRA WORK HRS,ALLOWED BRK,EXCESS BREAK';
      rows = '26-Mar-26,RMCB 8,ANBURAJ.G,SR. Team Leader,X,14:14,8:58,8:17,0:41,8:00,0:17,1:00,0:00\n26-Mar-26,RMCB 9,HITHAYATHULLAH.A,SR. Team Leader,X,15:03,9:34,8:41,0:53,8:00,0:41,1:00,0:00';
      filename = 'attendance_template.csv';
    } else if (activeTab === 'quality_rollups') {
      headers = 'EMP ID,Name,Process,Primary Reporting Name,Production,No. of Transaction Audited,No. of Errors';
      rows = 'RMCB 1167,SURENDRAN S,Payment Posting,VIJAY,202,50,5\nRMCB 1168,KALEESWARI,Payment Posting,VIJAY,1550,30,0';
      filename = 'quality_rollups_template.csv';
    } else if (activeTab === 'quality_audits') {
      headers = 'Emp Name,Worked Date,Client Name,PMS/Billing Software,Location,Process,Sub Process,Production Count,File Name/Batch# (Worked file details),PG# (Worked file details),Check# (Worked file details),Claim#/Account/PT# (Worked file details),Date Of Service (Worked file details),CPT/Check Amount (Worked file details),AR/Denial comments (Worked file details),Action Taken by the Associate,Auditor Checked EMP ID,Auditor Checked  Name,Audit Date,Auditor Review Comments,#Number of ERROR,Total Transactions Audited,ERROR/NO ERROR/FYI,ERROR Types,Category,Primary Reporting Name,Rework Status,Feedback comments';
      rows = 'SURENDRAN S,2026-04-01,SCMG,CERNER,CBE,PAYMENT POSTING,CORRESPONDANCE,0,HSSi LB(C) B3263974 03312026 PG#203,97*100,NO CHK,-,-,-,NEED TO POST DENIAL,CLAIM CLOSED,1167,THIYANESHWARAN,2026-04-02,User mentioned that claim closed but dos found in claim#si745667x116070 need to obtained denial as Itemized bill,1,1,ERROR,Denial Reason Not Obtained,VITAL INFORMATION MISSING,VIJAY,-,-\nKALEESWARI,2026-04-29,SCMG,CERNER,CBE,PAYMENT POSTING,ERA,1550,ERA(D)-04242026-CHK#801419369-N-69094-$24605.17-t(1550)  KALEESWARI 04292026.CSV,,801419369,SI724483X89017,2026-04-15,24605.17,,PAYMENT POSTED,941,GOKULAPRIYA,2026-04-30,"FYI - Incorrect balance",0,1,FYI,INCORRECTLY FLIPPED THE BALANCE,TRANSACTION INFO,VIJAY,,';
      filename = 'quality_raw_detailed_data_template.csv';
    }

    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showFeedback('success', `Downloaded ${filename} successfully.`);
  };

  // Helper to parse dates formatted as MM/DD/YYYY, D-MMM-YY, etc., to standard YYYY-MM-DD
  const formatDateToISO = (dateStr: string): string => {
    if (!dateStr) return '';
    const cleanStr = dateStr.trim();

    // Check if it is already in ISO YYYY-MM-DD format
    const isoReg = /^\d{4}-\d{2}-\d{2}$/;
    if (isoReg.test(cleanStr)) {
      return cleanStr;
    }

    // Try splitting by hyphen, slash, dot, or space
    let parts: string[] = [];
    if (cleanStr.includes('-')) {
      parts = cleanStr.split('-');
    } else if (cleanStr.includes('/')) {
      parts = cleanStr.split('/');
    } else if (cleanStr.includes('.')) {
      parts = cleanStr.split('.');
    } else if (cleanStr.includes(' ')) {
      parts = cleanStr.split(' ');
    }

    const monthMap: { [key: string]: string } = {
      jan: '01', january: '01',
      feb: '02', february: '02',
      mar: '03', march: '03',
      apr: '04', april: '04',
      may: '05',
      jun: '06', june: '06',
      jul: '07', july: '07',
      aug: '08', august: '08',
      sep: '09', september: '09',
      oct: '10', october: '10',
      nov: '11', november: '11',
      dec: '12', december: '12'
    };

    let year = '';
    let month = '';
    let day = '';

    if (parts.length === 3) {
      // If first part is 4 digits, treat as YYYY-MM-DD or YYYY/MM/DD
      if (parts[0].length === 4 && !isNaN(Number(parts[0]))) {
        year = parts[0];
        month = parts[1];
        day = parts[2];
      } else {
        const p0Lower = parts[0].toLowerCase();
        const p1Lower = parts[1].toLowerCase();

        if (monthMap[p1Lower]) {
          // e.g., "8-May-26" or "11-May-26"
          day = parts[0];
          month = monthMap[p1Lower];
          year = parts[2];
        } else if (monthMap[p0Lower]) {
          // e.g., "May-8-26"
          month = monthMap[p0Lower];
          day = parts[1];
          year = parts[2];
        } else {
          // e.g. "5/8/26" or "08/05/2026"
          const n0 = parseInt(parts[0], 10);
          const n1 = parseInt(parts[1], 10);
          if (n0 > 12) {
            day = parts[0];
            month = parts[1];
          } else if (n1 > 12) {
            month = parts[0];
            day = parts[1];
          } else {
            // Default to MM/DD
            month = parts[0];
            day = parts[1];
          }
          year = parts[2];
        }
      }
    } else if (parts.length === 2) {
      const p0Lower = parts[0].toLowerCase();
      const p1Lower = parts[1].toLowerCase();
      if (monthMap[p0Lower]) {
        month = monthMap[p0Lower];
        day = '01';
        year = parts[1].length === 2 || parts[1].length === 4 ? parts[1] : '2026';
      } else if (monthMap[p1Lower]) {
        month = monthMap[p1Lower];
        day = '01';
        year = parts[0].length === 2 || parts[0].length === 4 ? parts[0] : '2026';
      } else {
        month = parts[0];
        day = parts[1];
        year = '2026';
      }
    } else {
      // Fallback to JS Date if we can parse it
      const d = new Date(cleanStr);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
      return '2026-06-01'; // Safe default
    }

    // Normalize year to 4-digit YYYY
    if (!year) year = '2026';
    if (year.length === 1 || year.length === 2) {
      const yrNum = parseInt(year, 10);
      if (yrNum >= 0 && yrNum <= 99) {
        year = '20' + year.padStart(2, '0');
      }
    }

    // Pad month and day
    if (!month) month = '06';
    if (!day) day = '01';
    month = month.padStart(2, '0');
    day = day.padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  // CSV Drag and drop / select upload triggers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processCsvFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processCsvFile(e.target.files[0]);
    }
  };

  // CSV Parsing Router based on Active Tab
  const processCsvFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawRows = results.data as any[];
        if (rawRows.length === 0) {
          showFeedback('error', 'The uploaded file is empty.');
          return;
        }

        // Extremely robust normalization of row keys and values to protect against spacing, casing, and BOM issues
        const rows = rawRows.map(row => {
          const cleaned: any = {};
          for (const key of Object.keys(row)) {
            const cleanKey = key.replace(/^\uFEFF/i, '').trim().toUpperCase();
            const val = row[key];
            cleaned[cleanKey] = val !== undefined && val !== null ? val.toString().trim() : '';
          }
          return cleaned;
        });

        try {
          if (activeTab === 'employees') {
            // Template: EMP ID, Employee Name & DOB, Department, Designation Level, ONBOARDING & TENURE, Employment Status(Active, Notice, New Joiner, Relieved, Abscond)
            // Or: EmpID, Emp Name, Status, DOJ, DESIGNATION, RM, LM, RCM Managers
            const newEmps: Employee[] = [];
            let skippedEmpsCount = 0;
            rows.forEach((r, idx) => {
              const id = r['EMPID'] || r['EMP ID'] || r['EMP_ID'] || r['ID'] || '';
              const name = r['EMP NAME'] || r['EMPLOYEE NAME'] || r['NAME'] || r['EMPLOYEE NAME & DOB'] || '';
              const status = r['STATUS'] || r['EMPLOYMENT STATUS'] || r['EMPLOYMENT_STATUS'] || 'Active';
              const doj = r['DOJ'] || r['DATE OF JOIN'] || r['DATE OF JOINING'] || r['ONBOARDING & TENURE'] || r['DOJ (DATE OF JOINING)'] || '2026-06-01';
              const designation = r['DESIGNATION'] || r['DESIGNATION LEVEL'] || r['DEPARTMENT'] || r['ROLE'] || 'Process Associate';
              const rm = r['RM'] || r['REPORTING MANAGER'] || r['REPORTING_MANAGER'] || '';
              const lm = r['LM'] || r['LINE MANAGER'] || r['LINE MANAGERS'] || r['LINE_MANAGER'] || '';
              const rcm = r['RCM'] || r['RCM MANAGER'] || r['RCM MANAGERS'] || r['RCM_MANAGER'] || '';
              
              if (!id || !name) {
                skippedEmpsCount++;
                return;
              }

              newEmps.push({
                empId: id,
                name: name,
                status: status as any,
                doj: formatDateToISO(doj),
                designation: designation,
                rm: rm,
                lm: lm,
                rcm: rcm,
                dob: '1995-05-15',
                shiftTiming: '09:00 AM - 06:00 PM'
              });
            });

            bulkUploadEmployees(newEmps);
            logUploadedFile(file.name, 'Employees', file.size / 1024, newEmps.length, 'Success');
            showFeedback('success', `Successfully imported ${newEmps.length} Employees into database.${skippedEmpsCount > 0 ? ` Skipped ${skippedEmpsCount} incomplete/empty records.` : ''}`);
          } 
          else if (activeTab === 'targets') {
            // Template: PMS,Process Name,Sub Process Name,Target,Daily Work Hours,Hourly Target
            const newTargets: TargetMap[] = [];
            let skippedTargetsCount = 0;
            rows.forEach((r, idx) => {
              const pms = r['PMS'] || r['PLATFORM'] || '';
              const proc = r['PROCESS NAME'] || r['PROCESS_NAME'] || r['PROCESS'] || '';
              const sub = r['SUB PROCESS NAME'] || r['SUB_PROCESS_NAME'] || r['SUB PROCESS'] || r['SUB_PROCESS'] || '';
              const target = Number(r['TARGET'] || r['DAILY TARGET'] || r['DAILY_TARGET'] || 0);
              
              const dailyWorkHoursRaw = r['DAILY WORK HOURS'] || r['DAILY_WORK_HOURS'] || r['DAILY WORK_HRS'] || r['DAILY WORK HRS'] || r['HOURS'] || r['DAILY_HOURS'] || r['WORK HOURS'] || r['WORK_HOURS'] || '';
              const dailyWorkHours = dailyWorkHoursRaw !== '' ? Number(dailyWorkHoursRaw) : undefined;

              const hourlyTargetRaw = r['HOURLY TARGET'] || r['HOURLY_TARGET'] || r['HOURLY TARGET VOLUME'] || r['HOURLY_TARGET_VOLUME'] || '';
              const hourlyTarget = hourlyTargetRaw !== '' ? Number(hourlyTargetRaw) : undefined;

              if (!pms || !proc || !sub) {
                skippedTargetsCount++;
                return;
              }

              newTargets.push({
                pms: pms,
                processName: proc,
                subProcessName: sub,
                target,
                dailyWorkHours,
                hourlyTarget
              });
            });

            bulkUploadTargets(newTargets);
            logUploadedFile(file.name, 'Targets', file.size / 1024, newTargets.length, 'Success');
            showFeedback('success', `Successfully imported ${newTargets.length} operational targets.${skippedTargetsCount > 0 ? ` Skipped ${skippedTargetsCount} incomplete/empty records.` : ''}`);
          } 
          else if (activeTab === 'processes') {
            // Template: EmpID,Emp Name,PMS,Process Name,Sub Process Name
            const newProcs: EmployeeProcess[] = [];
            let skippedProcsCount = 0;
            rows.forEach((r, idx) => {
              const empId = r['EMPID'] || r['EMP ID'] || r['EMP_ID'] || r['ID'] || '';
              const empName = r['EMP NAME'] || r['EMPLOYEE NAME'] || r['NAME'] || '';
              const pms = r['PMS'] || r['PLATFORM'] || '';
              const procName = r['PROCESS NAME'] || r['PROCESS_NAME'] || r['PROCESS'] || '';
              const subProcName = r['SUB PROCESS NAME'] || r['SUB_PROCESS_NAME'] || r['SUB PROCESS'] || '';

              if (!empId || !pms || !procName || !subProcName) {
                skippedProcsCount++;
                return;
              }

              newProcs.push({
                empId: empId,
                empName: empName,
                pms: pms,
                processName: procName,
                subProcessName: subProcName
              });
            });

            bulkUploadEmployeeProcesses(newProcs);
            logUploadedFile(file.name, 'Org Tree Map', file.size / 1024, newProcs.length, 'Success');
            showFeedback('success', `Successfully loaded ${newProcs.length} process mappings.${skippedProcsCount > 0 ? ` Skipped ${skippedProcsCount} incomplete/empty records.` : ''}`);
          } 
          else if (activeTab === 'production') {
            // Template: EmpID, PMS, Process Name, Sub Process Name, Date, Target, Achieved
            const newProdRecs: ProductionRecord[] = [];
            let skippedProdCount = 0;
            rows.forEach((r, idx) => {
              const empId = r['EMPID'] || r['EMP ID'] || r['EMP_ID'] || r['ID'] || '';
              const pms = r['PMS'] || r['PLATFORM'] || '';
              const procName = r['PROCESS NAME'] || r['PROCESS_NAME'] || r['PROCESS'] || '';
              const subName = r['SUB PROCESS NAME'] || r['SUB_PROCESS_NAME'] || r['SUB PROCESS'] || '';
              const date = formatDateToISO(r['DATE'] || r['PRODUCTION DATE'] || r['PRODUCTION_DATE'] || '2026-06-01');
              const target = Number(r['TARGET'] || r['DAILY TARGET'] || r['DAILY_TARGET'] || 100);
              const achieved = Number(r['ACHIEVED'] || r['ACHIEVED VOLUME'] || r['ACHIEVED_VOLUME'] || r['ACHIEVED QTY'] || 0);

              if (!empId || !pms || !procName) {
                skippedProdCount++;
                return;
              }

              newProdRecs.push({
                id: `up_prod_${Date.now()}_${idx}`,
                empId: empId,
                pms: pms,
                processName: procName,
                subProcessName: subName,
                date,
                target,
                achieved,
                accuracy: 95.0 + Math.random() * 5.0 // automatic realistic accuracy buffer
              });
            });

            bulkUploadProduction(newProdRecs);
            logUploadedFile(file.name, 'Production Logs', file.size / 1024, newProdRecs.length, 'Success');
            showFeedback('success', `Successfully loaded ${newProdRecs.length} production timeline entries.${skippedProdCount > 0 ? ` Skipped ${skippedProdCount} incomplete/empty records.` : ''}`);
          }
          else if (activeTab === 'attendance') {
            // Template: DATE,EMP NO,EMPLOYEES NAME,DESIGNATION,MARKINGS,IN TIME,TOTAL WRK HRS,EXACT WRK HRS,BREAK HRS,STIPULATED TIME,EXTRA WORK HRS,ALLOWED BRK,EXCESS BREAK
            const newAttRecs: AttendanceRecord[] = [];
            let skippedAttCount = 0;
            rows.forEach((r, idx) => {
              const dateRaw = r['DATE'] || '';
              const empNoRaw = r['EMP NO'] || r['EMPNO'] || r['EMPID'] || r['EMP ID'] || r['OPERATOR ID'] || r['OPERATORID'] || '';
              const nameRaw = r['EMPLOYEES NAME'] || r['EMPLOYEE NAME'] || r['NAME'] || r['EMP NAME'] || r['OPERATOR NAME'] || '';
              const designationRaw = r['DESIGNATION'] || r['ROLE'] || r['DEPT'] || r['DEPARTMENT'] || '';
              const markingsRaw = r['MARKINGS'] || r['MARKING'] || r['STATUS'] || r['ATTENDANCE'] || '';
              const inTimeRaw = r['IN TIME'] || r['INTIME'] || r['IN_TIME'] || '';
              const totalWrkRaw = r['TOTAL WRK HRS'] || r['TOTALWORKHRS'] || r['TOTAL WORK HOURS'] || r['TOTAL HOURS'] || r['TOTAL_WRK_HRS'] || '';
              const exactWrkRaw = r['EXACT WRK HRS'] || r['EXACTWORKHRS'] || r['EXACT WORK HOURS'] || r['EXACT HOURS'] || r['EXACT_WRK_HRS'] || '';
              const breakHrsRaw = r['BREAK HRS'] || r['BREAKHRS'] || r['BREAK_HRS'] || r['BREAK HOURS'] || '';
              const stipulatedRaw = r['STIPULATED TIME'] || r['STIPULATED'] || r['EXPECTED HOURS'] || r['STIPULATED_TIME'] || '';
              const extraWrkHrsRaw = r['EXTRA WORK HRS'] || r['EXTRAWORKHRS'] || r['EXTRA_WORK_HRS'] || r['OT'] || r['OT HOURS'] || '';
              const allowedBrkRaw = r['ALLOWED BRK'] || r['ALLOWEDBREAK'] || r['ALLOWED_BRK'] || '';
              const excessBreakRaw = r['EXCESS BREAK'] || r['EXCESSBREAK'] || r['EXCESS_BREAK'] || '';
              const shortfallRaw = r['SHORTFALL'] || r['SHORTFALL HRS'] || r['SHORTFALL_HRS'] || r['SHORTFALL HOURS'] || '';

              if (!dateRaw || !empNoRaw) {
                skippedAttCount++;
                return;
              }

              const isoDate = formatDateToISO(dateRaw);
              const empId = empNoRaw;
              const empName = nameRaw;
              
              const markings = markingsRaw;
              // Standard presence logic: if marking is X, it is fully present. Otherwise if empty/A/L, onLeave.
              const onLeave = markings !== 'X' && markings !== 'P' && markings !== 'Present' && markings !== '';

              const hoursWorked = parseTimeToDecimal(exactWrkRaw || totalWrkRaw || '0');
              const hoursBreak = parseTimeToDecimal(breakHrsRaw || '0');
              const expectedHours = parseTimeToDecimal(stipulatedRaw || '8:00') || 8;
              const hoursOT = Math.max(0, hoursWorked - expectedHours);

              let calculatedShortfallStr = '0:00';
              if (shortfallRaw) {
                calculatedShortfallStr = shortfallRaw;
              } else {
                const shortfallDecimal = Math.max(0, expectedHours - hoursWorked);
                if (shortfallDecimal > 0) {
                  const hrs = Math.floor(shortfallDecimal);
                  const mins = Math.round((shortfallDecimal - hrs) * 60);
                  calculatedShortfallStr = `${hrs}:${String(mins).padStart(2, '0')}`;
                }
              }

              newAttRecs.push({
                id: `up_att_${Date.now()}_${idx}`,
                empId,
                date: isoDate,
                expectedHours,
                hoursWorked,
                hoursBreak,
                hoursOT,
                onLeave,
                
                markings,
                inTime: inTimeRaw,
                totalWrkHrsStr: totalWrkRaw,
                exactWrkHrsStr: exactWrkRaw,
                breakHrsStr: breakHrsRaw,
                stipulatedTimeStr: stipulatedRaw,
                designation: designationRaw,
                empName,
                extraWorkHrsStr: extraWrkHrsRaw,
                allowedBrkStr: allowedBrkRaw,
                excessBreakStr: excessBreakRaw,
                shortfallStr: calculatedShortfallStr
              });
            });

            // Auto register missing employees in registry to keep database integrated
            const uploadedEmpMap = new Map<string, { name: string; designation: string }>();
            newAttRecs.forEach(r => {
              if (r.empId && r.empName && !employees.some(e => e.empId === r.empId)) {
                uploadedEmpMap.set(r.empId, { name: r.empName, designation: r.designation || 'Process Associate' });
              }
            });

            if (uploadedEmpMap.size > 0) {
              const autoEmployees: Employee[] = [];
              uploadedEmpMap.forEach((val, key) => {
                autoEmployees.push({
                  empId: key,
                  name: val.name,
                  status: 'Active',
                  doj: '2026-01-01',
                  designation: val.designation,
                  rm: 'Direct Import', lm: 'Direct Import', rcm: 'Direct Import',
                  dob: '1995-05-15',
                  shiftTiming: '09:00 AM - 06:00 PM'
                });
              });
              bulkUploadEmployees(autoEmployees);
            }

            bulkUploadAttendance(newAttRecs);
            logUploadedFile(file.name, 'Attendance Logs', file.size / 1024, newAttRecs.length, 'Success');
            showFeedback('success', `Successfully imported ${newAttRecs.length} Daily Attendance records. Registered ${uploadedEmpMap.size} missing operators.${skippedAttCount > 0 ? ` Skipped ${skippedAttCount} incomplete/empty records.` : ''}`);
          }
          else if (activeTab === 'quality_rollups') {
            // Columns: EMP ID, Name, Process, Primary Reporting Name, Production, No. of Transaction Audited, No. of Errors
            const newRollups: QualityRollup[] = [];
            let skippedCount = 0;
            rows.forEach((r, idx) => {
              const empIdRaw = r['EMP ID'] || r['EMPID'] || r['EMP_ID'] || r['ID'] || '';
              const name = r['Name'] || r['EMP NAME'] || r['EMPLOYEE NAME'] || r['NAME'] || '';
              const process = r['Process'] || r['PROCESS'] || '';
              const primaryReportingName = r['Primary Reporting Name'] || r['PRIMARY REPORTING NAME'] || r['REPORTING MANAGER'] || r['RM'] || '';
              const production = Number(r['Production'] || r['PRODUCTION'] || 0);
              const auditedCount = Number(r['No. of Transaction Audited'] || r['NO. OF TRANSACTION AUDITED'] || r['AUDITED'] || 0);
              const errorCount = Number(r['No. of Errors'] || r['NO. OF ERRORS'] || r['ERRORS'] || 0);
              
              if (!empIdRaw || !name) {
                skippedCount++;
                return;
              }

              const empId = String(empIdRaw).trim();
              const qualityScore = auditedCount > 0 ? Number(((auditedCount - errorCount) / auditedCount * 100).toFixed(2)) : 100.0;

              newRollups.push({
                id: `rollup_${Date.now()}_${idx}`,
                empId,
                name: String(name).trim(),
                process: String(process).trim(),
                primaryReportingName: String(primaryReportingName).trim(),
                production,
                auditedCount,
                errorCount,
                qualityScore
              });
            });

            // Auto register missing employees if any
            const uploadedEmpMap = new Map<string, string>();
            newRollups.forEach(r => {
              if (r.empId && r.name && !employees.some(e => e.empId === r.empId)) {
                uploadedEmpMap.set(r.empId, r.name);
              }
            });
            if (uploadedEmpMap.size > 0) {
              const autoEmployees: Employee[] = [];
              uploadedEmpMap.forEach((name, empId) => {
                autoEmployees.push({
                  empId,
                  name,
                  status: 'Active',
                  doj: '2026-01-01',
                  designation: 'Process Associate',
                  rm: 'Direct Import', lm: 'Direct Import', rcm: 'Direct Import',
                  dob: '1995-05-15',
                  shiftTiming: '09:00 AM - 06:00 PM'
                });
              });
              bulkUploadEmployees(autoEmployees);
            }

            bulkUploadQualityRollups(newRollups);
            logUploadedFile(file.name, 'Quality Rollups', file.size / 1024, newRollups.length, 'Success');
            showFeedback('success', `Successfully imported ${newRollups.length} pre-aggregated Quality Rollup records. Registered ${uploadedEmpMap.size} missing operators.${skippedCount > 0 ? ` Skipped ${skippedCount} incomplete records.` : ''}`);
          }
          else if (activeTab === 'quality_audits') {
            // Raw Quality Detailed Columns:
            // Emp Name, Worked Date, Client Name, PMS/Billing Software, Location, Process, Sub Process, Production Count, File Name/Batch# (Worked file details), PG# (Worked file details), Check# (Worked file details), Claim#/Account/PT# (Worked file details), Date Of Service (Worked file details), CPT/Check Amount (Worked file details), AR/Denial comments (Worked file details), Action Taken by the Associate, Auditor Checked EMP ID, Auditor Checked  Name, Audit Date, Auditor Review Comments, #Number of ERROR, Total Transactions Audited, ERROR/NO ERROR/FYI, ERROR Types, Category, Primary Reporting Name, Rework Status, Feedback comments
            const newAudits: QualityAuditRecord[] = [];
            let skippedCount = 0;
            rows.forEach((r, idx) => {
              const empName = r['Emp Name'] || r['EMP NAME'] || r['EMPLOYEE NAME'] || r['NAME'] || '';
              const workedDate = r['Worked Date'] || r['WORKED DATE'] || r['DATE'] || '';
              const clientName = r['Client Name'] || r['CLIENT'] || '';
              const pms = r['PMS/Billing Software'] || r['PMS'] || r['BILLING SOFTWARE'] || '';
              const location = r['Location'] || r['LOCATION'] || '';
              const processName = r['Process'] || r['PROCESS'] || '';
              const subProcessName = r['Sub Process'] || r['SUB PROCESS'] || '';
              const productionCount = Number(r['Production Count'] || r['PRODUCTION'] || r['PRODUCTION COUNT'] || 0);
              const fileNameBatch = r['File Name/Batch# (Worked file details)'] || r['FILE NAME'] || r['BATCH'] || '';
              const pg = r['PG# (Worked file details)'] || r['PG#'] || '';
              const checkNum = r['Check# (Worked file details)'] || r['CHECK#'] || '';
              const claimNum = r['Claim#/Account/PT# (Worked file details)'] || r['CLAIM#'] || r['CLAIM NO'] || '';
              const dateOfService = r['Date Of Service (Worked file details)'] || r['DATE OF SERVICE'] || '';
              const cptAmount = r['CPT/Check Amount (Worked file details)'] || r['CPT AMOUNT'] || '';
              const comments = r['AR/Denial comments (Worked file details)'] || r['COMMENTS'] || '';
              const actionTaken = r['Action Taken by the Associate'] || r['ACTION TAKEN'] || '';
              const auditorEmpId = r['Auditor Checked EMP ID'] || r['AUDITOR EMP ID'] || '';
              const auditorName = r['Auditor Checked  Name'] || r['AUDITOR NAME'] || '';
              const auditDate = r['Audit Date'] || r['AUDIT DATE'] || '';
              const auditorComments = r['Auditor Review Comments'] || r['AUDITOR COMMENTS'] || '';
              const errorCount = Number(r['#Number of ERROR'] || r['NUMBER OF ERROR'] || r['ERRORS'] || 0);
              const auditedCount = Number(r['Total Transactions Audited'] || r['TOTAL TRANSACTIONS AUDITED'] || r['AUDITED'] || 0);
              const statusRaw = r['ERROR/NO ERROR/FYI'] || r['STATUS'] || 'NO ERROR';
              const errorType = r['ERROR Types'] || r['ERROR TYPE'] || '';
              const category = r['Category'] || r['CATEGORY'] || '';
              const primaryReportingName = r['Primary Reporting Name'] || r['RM'] || '';
              const reworkStatus = r['Rework Status'] || '';
              const feedbackComments = r['Feedback comments'] || '';

              if (!empName) {
                skippedCount++;
                return;
              }

              // Try to find the associate's employee ID
              let empId = '';
              const match = employees.find(e => e.name.toLowerCase().trim() === String(empName).toLowerCase().trim());
              if (match) {
                empId = match.empId;
              } else {
                // generate a deterministic ID if not found
                empId = 'RMCB ' + Math.floor(1000 + Math.random() * 9000);
              }

              // Standardize status to uppercase ERROR, NO ERROR, FYI
              let status: 'ERROR' | 'NO ERROR' | 'FYI' = 'NO ERROR';
              if (String(statusRaw).toUpperCase().includes('FYI')) {
                status = 'FYI';
              } else if (String(statusRaw).toUpperCase().includes('ERROR') && !String(statusRaw).toUpperCase().includes('NO ERROR')) {
                status = 'ERROR';
              }

              newAudits.push({
                id: `audit_detail_${Date.now()}_${idx}`,
                empId,
                empName: String(empName).trim(),
                workedDate: formatDateToISO(workedDate),
                clientName: String(clientName).trim(),
                pms: String(pms).trim(),
                location: String(location).trim(),
                processName: String(processName).trim(),
                subProcessName: String(subProcessName).trim(),
                productionCount,
                fileNameBatch: String(fileNameBatch).trim(),
                pg: String(pg).trim(),
                checkNum: String(checkNum).trim(),
                claimNum: String(claimNum).trim(),
                dateOfService: formatDateToISO(dateOfService),
                cptAmount: String(cptAmount).trim(),
                comments: String(comments).trim(),
                actionTaken: String(actionTaken).trim(),
                auditorEmpId: String(auditorEmpId).trim(),
                auditorName: String(auditorName).trim(),
                auditDate: formatDateToISO(auditDate),
                auditorComments: String(auditorComments).trim(),
                errorCount,
                auditedCount,
                status,
                errorType: String(errorType).trim(),
                category: String(category).trim(),
                primaryReportingName: String(primaryReportingName).trim(),
                reworkStatus: String(reworkStatus).trim(),
                feedbackComments: String(feedbackComments).trim()
              });
            });

            // Auto-register missing employees
            const uploadedEmpMap = new Map<string, { name: string; rm: string }>();
            newAudits.forEach(r => {
              if (r.empId && r.empName && !employees.some(e => e.empId === r.empId)) {
                uploadedEmpMap.set(r.empId, { name: r.empName, rm: r.primaryReportingName || 'Direct Import' });
              }
            });
            if (uploadedEmpMap.size > 0) {
              const autoEmployees: Employee[] = [];
              uploadedEmpMap.forEach((val, key) => {
                autoEmployees.push({
                  empId: key,
                  name: val.name,
                  status: 'Active',
                  doj: '2026-01-01',
                  designation: 'Process Associate',
                  rm: val.rm, lm: 'Direct Import', rcm: 'Direct Import',
                  dob: '1995-05-15',
                  shiftTiming: '09:00 AM - 06:00 PM'
                });
              });
              bulkUploadEmployees(autoEmployees);
            }

            bulkUploadQualityAudits(newAudits);
            logUploadedFile(file.name, 'Quality Audits', file.size / 1024, newAudits.length, 'Success');
            showFeedback('success', `Successfully imported ${newAudits.length} raw detailed Quality Audit rows. Registered ${uploadedEmpMap.size} missing operators.${skippedCount > 0 ? ` Skipped ${skippedCount} empty/incomplete records.` : ''}`);
          }
        } catch (err: any) {
          showFeedback('error', `Import Error: ${err.message || err}`);
        }
      },
      error: (error) => {
        showFeedback('error', `Parsing Error: ${error.message}`);
      }
    });
  };

  // Manual Add Form states
  const [manEmpId, setManEmpId] = useState('');
  const [manEmpName, setManEmpName] = useState('');
  const [manStatus, setManStatus] = useState<'Active' | 'Notice' | 'New Joiner' | 'Relieved' | 'Abscond'>('Active');
  const [manDOJ, setManDOJ] = useState('2026-06-01');

  const [manPMS, setManPMS] = useState('ECW');
  const [manProc, setManProc] = useState('');
  const [manSub, setManSub] = useState('');
  const [manTargetVal, setManTargetVal] = useState(100);

  const mappedProcessesForEmp = useMemo(() => {
    if (!manEmpId) return [];
    const normId = normalizeEmpId(manEmpId);
    return employeeProcesses.filter(ep => normalizeEmpId(ep.empId) === normId);
  }, [manEmpId, employeeProcesses]);

  const integrityAudits = useMemo(() => {
    const rosterIds = new Set(employees.map(e => normalizeEmpId(e.empId)));
    const processAllocations = new Set(employeeProcesses.map(ep => `${normalizeEmpId(ep.empId)}|${ep.pms.trim().toLowerCase()}|${ep.processName.trim().toLowerCase()}|${ep.subProcessName.trim().toLowerCase()}`));

    const mismatchesEmpId: Array<{ source: string; rawId: string; normalized: string }> = [];
    const missingTargets: Array<{ date: string; empId: string; pms: string; process: string; subProcess: string }> = [];
    const orphanProduction: Array<{ date: string; empId: string; pms: string; process: string; subProcess: string }> = [];

    // Check production rows
    production.forEach(p => {
      const normId = normalizeEmpId(p.empId);
      
      // 1. Employee ID Roster Match Check
      if (p.empId && !rosterIds.has(normId)) {
        mismatchesEmpId.push({ source: 'Production Logs', rawId: p.empId, normalized: normId });
      }

      // 2. Target lookup check
      const entry = resolveTargetEntry(p.pms, p.processName, p.subProcessName, targets);
      if (!entry) {
        missingTargets.push({
          date: p.date,
          empId: p.empId,
          pms: p.pms,
          process: p.processName,
          subProcess: p.subProcessName
        });
      }

      // 3. Process allocation map check
      const allocKey = `${normId}|${p.pms.trim().toLowerCase()}|${p.processName.trim().toLowerCase()}|${p.subProcessName.trim().toLowerCase()}`;
      if (employeeProcesses.length > 0 && p.empId && !processAllocations.has(allocKey)) {
        orphanProduction.push({
          date: p.date,
          empId: p.empId,
          pms: p.pms,
          process: p.processName,
          subProcess: p.subProcessName
        });
      }
    });

    // Check attendance rows
    attendance.forEach(a => {
      const normId = normalizeEmpId(a.empId);
      if (a.empId && !rosterIds.has(normId)) {
        mismatchesEmpId.push({ source: 'Attendance Logs', rawId: a.empId, normalized: normId });
      }
    });

    // Deduplicate mismatchesEmpId
    const dedupedMismatches: Array<{ source: string; rawId: string; normalized: string }> = [];
    const seenRaw = new Set<string>();
    mismatchesEmpId.forEach(m => {
      if (!seenRaw.has(m.rawId)) {
        seenRaw.add(m.rawId);
        dedupedMismatches.push(m);
      }
    });

    return {
      mismatchesEmpId: dedupedMismatches,
      missingTargets: missingTargets.slice(0, 10),
      missingTargetsCount: missingTargets.length,
      orphanProduction: orphanProduction.slice(0, 10),
      orphanProductionCount: orphanProduction.length
    };
  }, [employees, targets, employeeProcesses, production, attendance]);

  const [manProdDate, setManProdDate] = useState('2026-06-01');
  const [manProdAchieved, setManProdAchieved] = useState(100);

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'employees') {
      if (!manEmpId || !manEmpName) return;
      addEmployee({
        empId: manEmpId,
        name: manEmpName,
        status: manStatus,
        doj: manDOJ,
        designation: 'Process Associate',
        rm: 'Manual Entry', lm: 'Manual Entry', rcm: 'Manual Entry',
        dob: '1995-05-15',
        shiftTiming: '09:00 AM - 06:00 PM'
      });
      setManEmpId('');
      setManEmpName('');
      showFeedback('success', 'Employee roster entry registered successfully.');
    } 
    else if (activeTab === 'targets') {
      if (!manPMS || !manProc || !manSub) return;
      addTarget({
        pms: manPMS,
        processName: manProc,
        subProcessName: manSub,
        target: manTargetVal
      });
      setManProc('');
      setManSub('');
      showFeedback('success', 'Operational Target Mapping configured successfully.');
    } 
    else if (activeTab === 'processes') {
      if (!manEmpId || !manPMS || !manProc || !manSub) return;
      addEmployeeProcess({
        empId: manEmpId,
        empName: employees.find(e => e.empId === manEmpId)?.name || 'Unknown',
        pms: manPMS,
        processName: manProc,
        subProcessName: manSub
      });
      showFeedback('success', 'Process association generated successfully.');
    } 
    else if (activeTab === 'production') {
      if (!manEmpId || !manPMS || !manProc || !manSub) return;
      addProductionRecord({
        id: `man_prod_${Date.now()}`,
        empId: manEmpId,
        pms: manPMS,
        processName: manProc,
        subProcessName: manSub,
        date: manProdDate,
        target: manTargetVal,
        achieved: manProdAchieved,
        accuracy: 97.5
      });
      showFeedback('success', 'Production transaction logged successfully.');
    }
    else if (activeTab === 'attendance') {
      if (!manEmpId) return;
      const isLeave = manPMS !== 'X';
      const exactHrs = parseTimeToDecimal(manSub || '8:00');
      const totalHrs = parseTimeToDecimal(manProc || '8:00');
      const breakHrs = parseTimeToDecimal(manEmpName || '1:00');
      
      const sfDecimal = isLeave ? 0 : Math.max(0, 8 - exactHrs);
      const sfHrs = Math.floor(sfDecimal);
      const sfMins = Math.round((sfDecimal - sfHrs) * 60);
      const computedShortfallStr = `${sfHrs}:${String(sfMins).padStart(2, '0')}`;
      
      addAttendanceRecord({
        id: `man_att_${Date.now()}`,
        empId: manEmpId,
        date: manProdDate,
        expectedHours: 8,
        hoursWorked: isLeave ? 0 : exactHrs,
        hoursBreak: isLeave ? 0 : breakHrs,
        hoursOT: isLeave ? 0 : Math.max(0, exactHrs - 8),
        onLeave: isLeave,
        markings: manPMS,
        inTime: '09:00 AM',
        totalWrkHrsStr: manProc || '8:00',
        exactWrkHrsStr: manSub || '8:00',
        breakHrsStr: manEmpName || '1:00',
        stipulatedTimeStr: '8:00',
        designation: employees.find(e => e.empId === manEmpId)?.designation || 'Process Associate',
        empName: employees.find(e => e.empId === manEmpId)?.name || 'Operator',
        extraWorkHrsStr: isLeave ? '0:00' : '0:00',
        allowedBrkStr: isLeave ? '1:00' : '1:00',
        excessBreakStr: isLeave ? '0:00' : '0:00',
        shortfallStr: computedShortfallStr
      });
      showFeedback('success', 'Attendance record added successfully.');
    }
  };

  return (
    <div className="space-y-6" id="bulk_upload_view">
      {/* Visual Header Panel */}
      <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm flex justify-between items-center">
        <div>
          <div className="flex items-center gap-1.5">
            <Database className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Advanced Bulk Data Repository</h2>
          </div>
          <p className="text-xs text-slate-400">Manage organizational tables, targets, mappings and timeline transactions dynamically</p>
        </div>
        <button 
          onClick={resetAllData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-md text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer"
          title="Restores seed databases to original excel records"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Re-seed Default Excel Tables
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200">
        {(['employees', 'targets', 'processes', 'production', 'attendance', 'quality_rollups', 'quality_audits', 'database'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setFeedback(null); }}
            className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600 bg-blue-50/10'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab === 'processes' ? 'Org Tree Map' : tab === 'attendance' ? 'Attendance Logs' : tab === 'quality_rollups' ? 'Quality Rollups' : tab === 'quality_audits' ? 'Quality Raw Logs' : tab === 'database' ? 'Local Database Admin' : tab}
          </button>
        ))}
      </div>

      {/* Interactive feedback panel */}
      {feedback && (
        <div className={`p-4 rounded-xl border text-xs flex items-center gap-2 ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {activeTab !== 'database' && (
        <>
          {/* Drag & Drop Upload Zone */}
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`bg-white border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-all ${
              dragActive ? 'border-blue-600 bg-blue-50/5' : 'border-slate-200'
            }`}
          >
            <Upload className="w-8 h-8 text-slate-400 mb-3" />
            <p className="text-sm font-semibold text-slate-700">Drag and drop your spreadsheet (.csv) file here</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Format templates should correspond precisely with the selected sub-tab database</p>
            
            <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md cursor-pointer transition-colors shadow-xs">
              Select File From System
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileChange} 
                className="hidden" 
              />
            </label>
          </div>

          {/* Guide Card based on Active Tab */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/60 pb-2">
              <div>
                <span className="text-3xs uppercase font-bold text-blue-600 block">SPREADSHEET HEADER FORMAT GUIDE</span>
                <span className="text-4xs text-slate-400 font-medium">Use the format headers exactly as specified below</span>
              </div>
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center justify-center gap-1.5 px-3 py-1 text-[11px] font-bold text-blue-600 hover:text-white hover:bg-blue-600 bg-blue-50 border border-blue-200 rounded transition-all cursor-pointer shadow-3xs"
              >
                <Download className="w-3.5 h-3.5" />
                Download {activeTab === 'processes' ? 'Org Tree Map' : activeTab.toUpperCase()} CSV Template
              </button>
            </div>
             {activeTab === 'employees' && (
              <p className="text-gray-600 font-mono">EmpID, Emp Name, Status, DOJ, DESIGNATION, RM, LM, RCM Managers</p>
            )}
            {activeTab === 'targets' && (
              <p className="text-gray-600 font-mono">PMS, Process Name, Sub Process Name, Target, Daily Work Hours, Hourly Target</p>
            )}
            {activeTab === 'processes' && (
              <p className="text-gray-600 font-mono">EmpID, Emp Name, PMS, Process Name, Sub Process Name</p>
            )}
            {activeTab === 'production' && (
              <p className="text-gray-600 font-mono">EmpID, PMS, Process Name, Sub Process Name, Date, Target, Achieved</p>
            )}
            {activeTab === 'attendance' && (
              <p className="text-gray-600 font-mono">DATE, EMP NO, EMPLOYEES NAME, DESIGNATION, MARKINGS, IN TIME, TOTAL WRK HRS, EXACT WORK HRS, BREAK HRS, STIPULATED TIME, EXTRA WORK HRS, ALLOWED BRK, EXCESS BREAK</p>
            )}
            {activeTab === 'quality_rollups' && (
              <p className="text-gray-600 font-mono">EMP ID, Name, Process, Primary Reporting Name, Production, No. of Transaction Audited, No. of Errors</p>
            )}
            {activeTab === 'quality_audits' && (
              <p className="text-gray-600 font-mono text-4xs leading-relaxed max-h-12 overflow-y-auto">Emp Name, Worked Date, Client Name, PMS/Billing Software, Location, Process, Sub Process, Production Count, File Name/Batch# (Worked file details), PG#, Check#, Claim#, Date Of Service, CPT/Check Amount, #Number of ERROR, Total Transactions Audited, ERROR/NO ERROR/FYI, ERROR Types, Category, Primary Reporting Name</p>
            )}
          </div>

          {/* Manual ADD & DELETE Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Manual Addition Panel */}
            <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100">Manual Addition Entry</h3>
              
              <form onSubmit={handleManualAdd} className="space-y-3.5 text-xs">
                {activeTab === 'employees' && (
                  <>
                    <div>
                      <label className="block text-gray-500 mb-1">Employee ID</label>
                      <input type="text" value={manEmpId} onChange={e => setManEmpId(e.target.value)} placeholder="RMCB 1800" className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg" required />
                    </div>
                    <div>
                      <label className="block text-gray-500 mb-1">Employee Name</label>
                      <input type="text" value={manEmpName} onChange={e => setManEmpName(e.target.value)} placeholder="STEVE SMITH" className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg" required />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-gray-500 mb-1">Status</label>
                        <select value={manStatus} onChange={e => setManStatus(e.target.value as any)} className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg">
                          <option value="Active">Active</option>
                          <option value="New Joiner">New Joiner</option>
                          <option value="Notice">Notice</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-500 mb-1">DOJ</label>
                        <input type="date" value={manDOJ} onChange={e => setManDOJ(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg" />
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'targets' && (
                  <>
                    <div>
                      <label className="block text-gray-500 mb-1">PMS Platform</label>
                      <select value={manPMS} onChange={e => setManPMS(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg">
                        <option value="ECW">ECW</option>
                        <option value="EXPERITY">EXPERITY</option>
                        <option value="Cerner">Cerner</option>
                        <option value="Advanced MD">Advanced MD</option>
                        <option value="GMED">GMED</option>
                        <option value="Iclaim">Iclaim</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-500 mb-1">Process Name</label>
                      <input type="text" value={manProc} onChange={e => setManProc(e.target.value)} placeholder="e.g. Charge Entry" className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg" required />
                    </div>
                    <div>
                      <label className="block text-gray-500 mb-1">Sub Process Name</label>
                      <input type="text" value={manSub} onChange={e => setManSub(e.target.value)} placeholder="e.g. Worker's Comp" className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg" required />
                    </div>
                    <div>
                      <label className="block text-gray-500 mb-1">Daily Baseline Target</label>
                      <input type="number" value={manTargetVal} onChange={e => setManTargetVal(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg font-mono font-bold" required />
                    </div>
                  </>
                )}

                {activeTab === 'processes' && (
                  <>
                    <div>
                      <label className="block text-gray-500 mb-1">Operator ID</label>
                      <select value={manEmpId} onChange={e => setManEmpId(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg" required>
                        <option value="">-- Choose Operator --</option>
                        {employees.map(e => <option key={e.empId} value={e.empId}>{e.name} ({e.empId})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-500 mb-1">PMS Platform</label>
                      <select value={manPMS} onChange={e => setManPMS(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg">
                        <option value="ECW">ECW</option>
                        <option value="EXPERITY">EXPERITY</option>
                        <option value="Cerner">Cerner</option>
                        <option value="Advanced MD">Advanced MD</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-500 mb-1">Process Domain</label>
                      <input type="text" value={manProc} onChange={e => setManProc(e.target.value)} placeholder="e.g. SB" className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg" required />
                    </div>
                    <div>
                      <label className="block text-gray-500 mb-1">Sub Process Domain</label>
                      <input type="text" value={manSub} onChange={e => setManSub(e.target.value)} placeholder="e.g. WC Claims Worked" className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg" required />
                    </div>
                  </>
                )}

                {activeTab === 'production' && (
                  <>
                    <div>
                      <label className="block text-gray-500 mb-1">Operator ID</label>
                      <select value={manEmpId} onChange={e => setManEmpId(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg" required>
                        <option value="">-- Choose Operator --</option>
                        {employees.map(e => <option key={e.empId} value={e.empId}>{e.name} ({e.empId})</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-gray-500 mb-1">Date</label>
                        <input type="date" value={manProdDate} onChange={e => setManProdDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg text-xs" required />
                      </div>
                      <div>
                        <label className="block text-gray-500 mb-1">PMS Platform</label>
                        <select value={manPMS} onChange={e => setManPMS(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg">
                          <option value="ECW">ECW</option>
                          <option value="EXPERITY">EXPERITY</option>
                          <option value="Cerner">Cerner</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <div>
                        <label className="block text-gray-500 mb-1 font-sans">Target</label>
                        <input type="number" value={manTargetVal} onChange={e => setManTargetVal(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg font-bold text-center" required />
                      </div>
                      <div>
                        <label className="block text-gray-500 mb-1 font-sans">Achieved</label>
                        <input type="number" value={manProdAchieved} onChange={e => setManProdAchieved(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg font-bold text-center" required />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-500 mb-1">Process & Sub-Process Mapping (Authoritative)</label>
                      {mappedProcessesForEmp.length > 0 ? (
                        <select
                          className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg text-xs"
                          value={manProc && manSub ? `${manPMS}|${manProc}|${manSub}` : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              const [pmsVal, procVal, subVal] = val.split('|');
                              setManPMS(pmsVal);
                              setManProc(procVal);
                              setManSub(subVal);
                              
                              // Target lookup
                              const entry = resolveTargetEntry(pmsVal, procVal, subVal, targets);
                              if (entry) {
                                setManTargetVal(entry.target);
                              } else {
                                setManTargetVal(100);
                              }
                            } else {
                              setManProc('');
                              setManSub('');
                            }
                          }}
                          required
                        >
                          <option value="">-- Choose Assigned Mapping --</option>
                          {mappedProcessesForEmp.map((ep, idx) => {
                            const entry = resolveTargetEntry(ep.pms, ep.processName, ep.subProcessName, targets);
                            const tVal = entry ? entry.target : '100';
                            return (
                              <option key={idx} value={`${ep.pms}|${ep.processName}|${ep.subProcessName}`}>
                                {ep.pms} - {ep.processName} / {ep.subProcessName} (Target: {tVal})
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" value={manProc} onChange={e => setManProc(e.target.value)} placeholder="Process" className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg" required />
                          <input type="text" value={manSub} onChange={e => setManSub(e.target.value)} placeholder="Sub" className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg" required />
                        </div>
                      )}
                    </div>
                  </>
                )}

                {activeTab === 'attendance' && (
                  <>
                    <div>
                      <label className="block text-gray-500 mb-1">Operator ID</label>
                      <select value={manEmpId} onChange={e => setManEmpId(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg" required>
                        <option value="">-- Choose Operator --</option>
                        {employees.map(e => <option key={e.empId} value={e.empId}>{e.name} ({e.empId})</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-gray-500 mb-1">Date</label>
                        <input type="date" value={manProdDate} onChange={e => setManProdDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg text-xs" required />
                      </div>
                      <div>
                        <label className="block text-gray-500 mb-1">Marking</label>
                        <select value={manPMS} onChange={e => setManPMS(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg">
                          <option value="X">X (Present)</option>
                          <option value="L">L (Leave)</option>
                          <option value="A">A (Absent)</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 font-mono">
                      <div>
                        <label className="block text-gray-500 mb-1 font-sans">Total hrs</label>
                        <input type="text" placeholder="8:58" value={manProc} onChange={e => setManProc(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg text-center" />
                      </div>
                      <div>
                        <label className="block text-gray-500 mb-1 font-sans">Exact hrs</label>
                        <input type="text" placeholder="8:17" value={manSub} onChange={e => setManSub(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg text-center" />
                      </div>
                      <div>
                        <label className="block text-gray-500 mb-1 font-sans">Break hrs</label>
                        <input type="text" placeholder="0:41" value={manEmpName} onChange={e => setManEmpName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg text-center" />
                      </div>
                    </div>
                  </>
                )}

                <button 
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Registry Entry
                </button>
              </form>
            </div>

            {/* Database List / manual removal & delete all */}
            <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm lg:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Operational Database Registry</h3>
                  <button 
                    onClick={() => {
                      if (activeTab === 'employees') clearEmployees();
                      else if (activeTab === 'targets') clearTargets();
                      else if (activeTab === 'processes') clearEmployeeProcesses();
                      else if (activeTab === 'production') clearProduction();
                      else if (activeTab === 'attendance') clearAttendance();
                      else if (activeTab === 'quality_rollups') clearQualityRollups();
                      else if (activeTab === 'quality_audits') clearQualityAudits();
                      showFeedback('success', 'Cleared all table records.');
                    }}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Wipe current database table records"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Wipe Table Records
                  </button>
                </div>

                {/* List entries for deletion/inspection */}
                <div className="overflow-y-auto max-h-80 border border-slate-100 rounded-lg text-xs divide-y divide-slate-100">
                  {activeTab === 'employees' && employees.map(emp => (
                    <div key={emp.empId} className="p-2.5 flex justify-between items-center hover:bg-slate-50">
                      <div>
                        <span className="font-bold text-slate-800">{emp.name}</span>
                        <span className="block text-4xs font-mono text-slate-400">{emp.empId} • Status: {emp.status} • DOJ: {emp.doj}</span>
                      </div>
                      <button onClick={() => removeEmployee(emp.empId)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {activeTab === 'targets' && targets.map((t, idx) => (
                    <div key={idx} className="p-2.5 flex justify-between items-center hover:bg-slate-50">
                      <div>
                        <span className="font-semibold text-slate-800">{t.processName} • {t.subProcessName}</span>
                        <span className="block text-4xs font-mono text-indigo-600">PMS: {t.pms} • Daily Target: {t.target}</span>
                      </div>
                      <button onClick={() => removeTarget(t.pms, t.processName, t.subProcessName)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {activeTab === 'processes' && employeeProcesses.map((ep, idx) => (
                    <div key={idx} className="p-2.5 flex justify-between items-center hover:bg-slate-50">
                      <div>
                        <span className="font-semibold text-slate-800">{ep.empName} ({ep.empId})</span>
                        <span className="block text-4xs font-mono text-indigo-600">Assigned: {ep.pms} • {ep.processName} / {ep.subProcessName}</span>
                      </div>
                      <button onClick={() => removeEmployeeProcess(ep.empId, ep.pms, ep.processName, ep.subProcessName)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {activeTab === 'production' && production.slice(0, 50).map(rec => (
                    <div key={rec.id} className="p-2.5 flex justify-between items-center hover:bg-slate-50">
                      <div>
                        <span className="font-semibold text-slate-800">Operator: {rec.empId} • Vol: {rec.achieved}/{rec.target}</span>
                        <span className="block text-4xs font-mono text-slate-400">Date: {rec.date} • {rec.pms} • {rec.processName} ({rec.subProcessName})</span>
                      </div>
                      <button onClick={() => removeProductionRecord(rec.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {activeTab === 'attendance' && attendance.slice(0, 50).map(rec => (
                    <div key={rec.id} className="p-2.5 flex justify-between items-center hover:bg-slate-50">
                      <div>
                        <span className="font-semibold text-slate-800">Operator: {rec.empId} • Markings: {rec.markings || (rec.onLeave ? 'L' : 'X')} • Exact worked: {rec.exactWrkHrsStr || `${rec.hoursWorked}h`}</span>
                        <span className="block text-4xs font-mono text-slate-400">Date: {rec.date} • In-Time: {rec.inTime || 'N/A'} • Breaks: {rec.breakHrsStr || `${rec.hoursBreak}h`} • Stipulated: {rec.stipulatedTimeStr || `${rec.expectedHours}h`}</span>
                        {(rec.extraWorkHrsStr || rec.allowedBrkStr || rec.excessBreakStr) && (
                          <span className="block text-4xs font-mono text-indigo-500">Extra work: {rec.extraWorkHrsStr || '0:00'} • Allowed Break: {rec.allowedBrkStr || '1:00'} • Excess Break: {rec.excessBreakStr || '0:00'}</span>
                        )}
                      </div>
                      <button onClick={() => removeAttendanceRecord(rec.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {activeTab === 'quality_rollups' && qualityRollups.slice(0, 50).map(rec => (
                    <div key={rec.id} className="p-2.5 flex justify-between items-center hover:bg-slate-50">
                      <div>
                        <span className="font-semibold text-slate-800">{rec.name} ({rec.empId}) • Quality Score: {rec.qualityScore}%</span>
                        <span className="block text-4xs font-mono text-slate-400">Process: {rec.process} • Audited: {rec.auditedCount} • Errors: {rec.errorCount} • Prod: {rec.production} • RM: {rec.primaryReportingName}</span>
                      </div>
                      <button onClick={() => {
                        const next = qualityRollups.filter(qr => qr.id !== rec.id);
                        bulkUploadQualityRollups(next);
                      }} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {activeTab === 'quality_audits' && qualityAudits.slice(0, 50).map(rec => (
                    <div key={rec.id} className="p-2.5 flex justify-between items-center hover:bg-slate-50">
                      <div>
                        <span className="font-semibold text-slate-800">{rec.empName} ({rec.empId}) • Worked Date: {rec.workedDate}</span>
                        <span className="block text-4xs font-mono text-slate-400">Process: {rec.processName} • SubProcess: {rec.subProcessName} • Audited: {rec.auditedCount} • Errors: {rec.errorCount} • Status: <span className={rec.status === 'ERROR' ? 'text-rose-600 font-bold' : rec.status === 'FYI' ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>{rec.status}</span></span>
                      </div>
                      <button onClick={() => {
                        const next = qualityAudits.filter(qa => qa.id !== rec.id);
                        bulkUploadQualityAudits(next);
                      }} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 text-3xs text-slate-400 leading-normal">
                {activeTab === 'production' && (
                  <p>* For performance, only the top 50 transactions are listed in this immediate inspection view. Clears or imports apply to all database logs.</p>
                )}
                {activeTab === 'attendance' && (
                  <p>* Daily attendance logs represent standard operator working metrics. Uploading automatically updates roster databases and recalculates shortfalls, leaves, and Saturday requirements.</p>
                )}
                {activeTab === 'quality_rollups' && (
                  <p>* Rollups provide summary quality metrics matching the pre-aggregated Accuracy Calculation. Uploads recalculate aggregate scores.</p>
                )}
                {activeTab === 'quality_audits' && (
                  <p>* Raw quality checked logs track individual audited transactions, categories, and auditor reviews. Automatically builds Pareto distributions and Operator registries.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'database' && (
        <div className="space-y-6">
          {/* Top Info Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-lg text-white">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Active Database: JSON Store</h4>
                <p className="text-xs text-slate-500">Persistent file-system storage running at <code className="bg-white/75 px-1 py-0.5 border border-slate-200/50 rounded font-mono text-3xs font-bold text-blue-700">/data.json</code></p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-3xs font-extrabold text-emerald-700 uppercase tracking-widest bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md">DATABASE STABLE & ONLINE</span>
            </div>
          </div>

          {/* Database Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Employees Registry', count: employees.length, bg: 'from-blue-500 to-sky-500', tag: 'Roster' },
              { label: 'Daily Targets Map', count: targets.length, bg: 'from-violet-500 to-purple-500', tag: 'Targets' },
              { label: 'Process Allocations', count: employeeProcesses.length, bg: 'from-indigo-500 to-blue-500', tag: 'Org Mappings' },
              { label: 'Production Records', count: production.length, bg: 'from-amber-500 to-orange-500', tag: 'Transactions' },
              { label: 'Attendance Records', count: attendance.length, bg: 'from-emerald-500 to-teal-500', tag: 'Work Logs' },
            ].map((m, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between shadow-3xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 rounded-bl-full -mr-4 -mt-4 opacity-50"></div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{m.label}</span>
                  <span className="text-2xl font-black text-slate-800 font-mono tracking-tight">{m.count}</span>
                </div>
                <div className="mt-3">
                  <span className="text-[9px] font-bold bg-slate-50 border border-slate-200/60 text-slate-500 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">{m.tag}</span>
                </div>
              </div>
            ))}
          </div>

          {/* DATABASE INTEGRITY & ALIGNMENT DIAGNOSTICS (SECTION 4) */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-3xs space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Operational Database Integrity Suite</h3>
                <p className="text-4xs text-slate-400 font-medium">Automatic row-level data alignment, join safety, and target resolution audit</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Check 1: RMCB vs Bare Numeric Mismatches */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ID Format Alignments</span>
                  {integrityAudits.mismatchesEmpId.length === 0 ? (
                    <span className="text-4xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">✓ Healthy</span>
                  ) : (
                    <span className="text-4xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">⚠ Mismatch ({integrityAudits.mismatchesEmpId.length})</span>
                  )}
                </div>
                <p className="text-4xs text-slate-400 leading-normal">
                  Verifies if there are any orphaned raw logs with mismatched employee keys compared to the master roster (e.g. `RMCB 1165` vs integer `1165`). Our internal system automatically normalizes all join lookups.
                </p>
                {integrityAudits.mismatchesEmpId.length > 0 && (
                  <div className="max-h-24 overflow-y-auto text-4xs font-mono text-slate-500 border border-slate-100 rounded p-1 bg-white space-y-1">
                    {integrityAudits.mismatchesEmpId.map((m, idx) => (
                      <div key={idx} className="flex justify-between border-b border-slate-50 pb-0.5 last:border-0 font-sans text-3xs">
                        <span>Raw ID: <strong className="text-slate-700">{m.rawId}</strong></span>
                        <span className="text-slate-400">({m.source})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Check 2: Missing Target Category Definitions */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Target Resolution Audit</span>
                  {integrityAudits.missingTargetsCount === 0 ? (
                    <span className="text-4xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">✓ Healthy</span>
                  ) : (
                    <span className="text-4xs font-bold bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded">⚠ Unresolved ({integrityAudits.missingTargetsCount})</span>
                  )}
                </div>
                <p className="text-4xs text-slate-400 leading-normal">
                  Identifies log entries where the combined PMS, Process, and Sub-Process combo does not have an active mapping configured in `Target_Category.csv` (resulting in standard fallback values).
                </p>
                {integrityAudits.missingTargetsCount > 0 && (
                  <div className="max-h-24 overflow-y-auto text-4xs font-mono text-slate-500 border border-slate-100 rounded p-1 bg-white space-y-1">
                    {integrityAudits.missingTargets.map((t, idx) => (
                      <div key={idx} className="border-b border-slate-50 pb-0.5 last:border-0">
                        <span className="text-rose-600 block font-bold font-sans text-3xs">No Target configured:</span>
                        <span className="text-slate-500 block truncate text-3xs">{t.pms} - {t.process} / {t.subProcess}</span>
                        <span className="text-slate-400 block mt-0.5 text-4xs">Op: {t.empId} • Date: {t.date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Check 3: Orphan Production Rows (Not mapped to process) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Org Allocation Check</span>
                  {integrityAudits.orphanProductionCount === 0 ? (
                    <span className="text-4xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">✓ Clean</span>
                  ) : (
                    <span className="text-4xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">⚠ Unmapped ({integrityAudits.orphanProductionCount})</span>
                  )}
                </div>
                <p className="text-4xs text-slate-400 leading-normal">
                  Detects transaction logs filed against process/sub-process streams that the operator is not explicitly registered to work under `Employee_wise_Process_category.csv`.
                </p>
                {integrityAudits.orphanProductionCount > 0 && (
                  <div className="max-h-24 overflow-y-auto text-4xs font-mono text-slate-500 border border-slate-100 rounded p-1 bg-white space-y-1">
                    {integrityAudits.orphanProduction.map((t, idx) => (
                      <div key={idx} className="border-b border-slate-50 pb-0.5 last:border-0">
                        <span className="text-amber-600 block font-bold font-sans text-3xs">Operator not mapped to stream:</span>
                        <span className="text-slate-500 block truncate text-3xs">{t.pms} - {t.process} / {t.subProcess}</span>
                        <span className="text-slate-400 block mt-0.5 text-4xs">Op: {t.empId} • Date: {t.date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Database Actions: Backup & Restore */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Backup Panel */}
            <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileJson className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Export Database Backup</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Download a complete structured snapshot of your operational database including all rosters, target matrixes, process maps, and history logs. Backups are formatted as a unified JSON payload.
                </p>
              </div>
              <button
                onClick={() => {
                  try {
                    const backupObj = {
                      tracker_employees: employees,
                      tracker_targets: targets,
                      tracker_employee_processes: employeeProcesses,
                      tracker_production: production,
                      tracker_attendance: attendance,
                      tracker_ramp_rules: rampUpRules,
                      tracker_tickets: tickets,
                      tracker_uploaded_files: uploadedFiles,
                      tracker_manual_additions: manualAdditions
                    };
                    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupObj, null, 2))}`;
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute('href', jsonString);
                    downloadAnchor.setAttribute('download', `performance_tracker_db_backup_${new Date().toISOString().slice(0,10)}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                    showFeedback('success', 'Database backup JSON file generated and downloaded.');
                  } catch (e: any) {
                    showFeedback('error', `Backup failed: ${e.message}`);
                  }
                }}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 animate-duration-300"
              >
                <Download className="w-4 h-4" /> Download Unified JSON Backup
              </button>
            </div>

            {/* Restore Panel */}
            <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileUp className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Import & Restore Database</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Select a previously exported performance tracker JSON backup file to overwrite current local storage and backend tables. This action executes instant schema-validation.
                </p>
                {restoreStatus.type !== 'idle' && (
                  <div className={`p-2.5 border text-xs rounded mb-3 flex items-center gap-1.5 ${
                    restoreStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    {restoreStatus.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    <span>{restoreStatus.msg}</span>
                  </div>
                )}
              </div>
              <label className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-center">
                <Upload className="w-4 h-4" /> Select Backup file (.json)
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                      try {
                        const parsed = JSON.parse(event.target?.result as string);
                        // Validation
                        if (!parsed.tracker_employees || !parsed.tracker_targets || !parsed.tracker_attendance) {
                          setRestoreStatus({ type: 'error', msg: 'Invalid backup file: Missing key registries.' });
                          return;
                        }
                        const ok = await restoreDatabase(parsed);
                        if (ok) {
                          setRestoreStatus({ type: 'success', msg: 'Local file database successfully restored!' });
                          showFeedback('success', 'Database restored successfully!');
                        } else {
                          setRestoreStatus({ type: 'error', msg: 'Failed to write backup to local JSON file.' });
                        }
                      } catch (err: any) {
                        setRestoreStatus({ type: 'error', msg: `Validation error: ${err.message || 'Malformed JSON'}` });
                      }
                    };
                    reader.readAsText(file);
                  }}
                />
              </label>
            </div>
          </div>

          {/* Logs Split Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Log history */}
            <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Spreadsheet Upload History</h3>
                  </div>
                  {uploadedFiles.length > 0 && (
                    <button onClick={clearDatabaseLogs} className="text-4xs uppercase tracking-wider text-rose-600 font-extrabold hover:text-rose-800 transition-colors cursor-pointer">
                      Clear Logs
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto max-h-60 border border-slate-100 rounded-lg text-xs divide-y divide-slate-100">
                  {uploadedFiles.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <FileSpreadsheet className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p className="font-semibold text-slate-500">No spreadsheets uploaded yet</p>
                      <p className="text-3xs text-slate-400">CSV bulk uploads will be recorded here for auditing</p>
                    </div>
                  ) : (
                    uploadedFiles.map((log) => (
                      <div key={log.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 block truncate" title={log.filename}>{log.filename}</span>
                          <span className="text-4xs text-slate-400 block mt-0.5">
                            Type: <strong className="text-slate-600 font-medium">{log.type}</strong> • Size: {log.size} KB • Records: {log.recordCount}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-4xs text-slate-400 block">{new Date(log.uploadDate).toLocaleString()}</span>
                          <span className="inline-block mt-1 text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-sm">Success</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Manual Entries Log */}
            <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Manual Transactions Audit Logs</h3>
                  </div>
                  {manualAdditions.length > 0 && (
                    <button onClick={clearDatabaseLogs} className="text-4xs uppercase tracking-wider text-rose-600 font-extrabold hover:text-rose-800 transition-colors cursor-pointer">
                      Clear Logs
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto max-h-60 border border-slate-100 rounded-lg text-xs divide-y divide-slate-100">
                  {manualAdditions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Database className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p className="font-semibold text-slate-500">No manual additions logged yet</p>
                      <p className="text-3xs text-slate-400">Manual registry submissions are automatically tracked here</p>
                    </div>
                  ) : (
                    manualAdditions.map((log) => (
                      <div key={log.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-bold text-slate-700 block truncate">{log.details}</span>
                          <span className="text-4xs text-slate-400 block mt-0.5">
                            Target Model: <strong className="text-indigo-600 font-medium">{log.type}</strong> • Reference Key: <code className="font-mono bg-slate-50 border border-slate-100 px-1 py-0.2 rounded text-3xs font-bold">{log.key}</code>
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-4xs text-slate-400 block">{new Date(log.timestamp).toLocaleString()}</span>
                          <span className="inline-block mt-1 text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded-sm">Logged</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
