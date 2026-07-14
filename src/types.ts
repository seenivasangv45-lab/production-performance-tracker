export interface Employee {
  empId: string;
  name: string;
  status: 'Active' | 'Notice' | 'New Joiner' | 'Relieved' | 'Abscond';
  doj: string; // MM/DD/YYYY or YYYY-MM-DD
  designation: string;
  rm: string; // Reporting Manager
  lm: string; // Line Manager
  rcm: string; // RCM Manager
  shiftTiming?: string;
  dob?: string;
}

export interface TargetMap {
  pms: string;
  processName: string;
  subProcessName: string;
  target: number;
  dailyWorkHours?: number;
  hourlyTarget?: number;
}

export interface EmployeeProcess {
  empId: string;
  empName: string;
  pms: string;
  processName: string;
  subProcessName: string;
}

export interface ProductionRecord {
  id: string;
  empId: string;
  pms: string;
  processName: string;
  subProcessName: string;
  date: string; // YYYY-MM-DD
  target: number;
  achieved: number;
  accuracy: number; // Percentage 0 - 100
  auditedCount?: number;
  errorCategory?: string;
  dailyWorkHours?: number;
  hourlyTarget?: number;
  achievedHourly?: number;
  percentage?: number;
}

export interface AttendanceRecord {
  id: string;
  empId: string;
  date: string; // YYYY-MM-DD
  expectedHours: number;
  hoursWorked: number;
  hoursBreak: number;
  hoursOT: number;
  onLeave: boolean;
  
  // Custom CSV upload fields
  markings?: string;           // MARKINGS (e.g. 'X')
  inTime?: string;             // IN TIME (e.g. '14:14')
  totalWrkHrsStr?: string;     // TOTAL WRK HRS (e.g. '8:58')
  exactWrkHrsStr?: string;     // EXACT WRK HRS (e.g. '8:17')
  breakHrsStr?: string;        // BREAK HRS (e.g. '0:41')
  stipulatedTimeStr?: string;  // STIPULATED TIME (e.g. '8:00')
  designation?: string;        // DESIGNATION
  empName?: string;            // EMPLOYEES NAME
  extraWorkHrsStr?: string;    // EXTRA WORK HRS
  allowedBrkStr?: string;      // ALLOWED BRK
  excessBreakStr?: string;     // EXCESS BREAK
  shortfallStr?: string;       // SHORTFALL
}

export interface RampUpRule {
  empId: string;
  type: 'Trainee' | 'Cross-Training';
  startWeek: number; // 1 to 8
  weeklyTargets: number[]; // 8 target numbers (or percentages)
  standardTarget: number;
  createdAt: string;
}

export interface Ticket {
  id: string; // TKT-XXXX
  requestor: string;
  requestorRole?: string;
  ticketType?: string;
  empId: string;
  empName: string;
  productionDate: string; // YYYY-MM-DD
  fieldToChange: 'achieved' | 'target' | 'accuracy';
  oldValue: number;
  newValue: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string; // YYYY-MM-DD HH:MM
  reviewedAt?: string;
  
  // Advanced Ticketing Payloads
  newEmployeeDetails?: {
    empId: string;
    name: string;
    designation: string;
    doj: string;
    status: 'Active' | 'Notice' | 'New Joiner' | 'Relieved' | 'Abscond';
    rm: string;
    lm: string;
    rcm: string;
  };
  teamChangeDetails?: {
    empId: string;
    newRm: string;
    newLm: string;
    newRcm: string;
  };
  processDetails?: {
    pms: string;
    processName: string;
    subProcessName: string;
    target: number;
  };
}

export interface UploadedFileLog {
  id: string;
  filename: string;
  size: number; // Size in KB
  type: string; // e.g. employees, targets, production, processes, attendance
  uploadDate: string; // ISO String
  recordCount: number;
  status: 'Success' | 'Warning' | 'Error';
}

export interface ManualAdditionLog {
  id: string;
  type: string; // e.g. Employee, Target, Process, Production, Attendance
  key: string;  // e.g. Operator ID or PMS Code
  details: string; // Brief description
  timestamp: string; // ISO String
}

export interface QualityRollup {
  id: string;
  empId: string;
  name: string;
  process: string;
  primaryReportingName: string;
  production: number;
  auditedCount: number;
  errorCount: number;
  qualityScore: number;
}

export interface QualityAuditRecord {
  id: string;
  empId: string;
  empName: string;
  workedDate: string;
  clientName: string;
  pms: string; // PMS/Billing Software
  location: string;
  processName: string;
  subProcessName: string;
  productionCount: number;
  fileNameBatch: string;
  pg: string;
  checkNum: string;
  claimNum: string;
  dateOfService: string;
  cptAmount: string;
  comments: string;
  actionTaken: string;
  auditorEmpId: string;
  auditorName: string;
  auditDate: string;
  auditorComments: string;
  errorCount: number;
  auditedCount: number; // Total Transactions Audited
  status: 'ERROR' | 'NO ERROR' | 'FYI'; // ERROR/NO ERROR/FYI
  errorType: string;
  category: string; // Error Category/Pareto Category
  primaryReportingName: string;
  reworkStatus: string;
  feedbackComments: string;
}


