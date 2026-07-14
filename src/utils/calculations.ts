import { Employee, AttendanceRecord, ProductionRecord, TargetMap } from '../types';

/**
 * Normalizes an employee ID to its integer string representation.
 * For example: "RMCB 1208", "rmcb1208", " 1208 " all normalize to "1208".
 */
export function normalizeEmpId(empId: string | null | undefined): string {
  if (empId == null) return '';
  const s = empId.toString().trim();
  const withoutPrefix = s.replace(/^RMCB\s*/i, '').trim();
  const parsed = parseInt(withoutPrefix, 10);
  if (!isNaN(parsed)) {
    return parsed.toString();
  }
  return withoutPrefix.toLowerCase();
}

/**
 * Safely compares two strings after trimming whitespace, converting to lowercase,
 * and handling undefined/null values. Returns true if they match cleanly.
 */
export function matchesClean(val1: string | null | undefined, val2: string | null | undefined): boolean {
  const s1 = (val1 || '').trim().toLowerCase();
  const s2 = (val2 || '').trim().toLowerCase();
  return s1 === s2;
}

/**
 * Checks if a manager name matches any of the RM, LM, or RCM Manager fields of an employee.
 * Matches are cleaned of whitespace, empty strings, and capitalization.
 */
export function matchesManager(
  emp: { rm?: string; lm?: string; rcm?: string },
  managerName: string | null | undefined
): boolean {
  if (!managerName) return true;
  const mClean = managerName.trim().toLowerCase();
  if (mClean === '') return true;

  const rm = (emp.rm || '').trim().toLowerCase();
  const lm = (emp.lm || '').trim().toLowerCase();
  const rcm = (emp.rcm || '').trim().toLowerCase();

  return rm === mClean || lm === mClean || rcm === mClean;
}

/**
 * Resolves the operational target entry for a given PMS, Process, and Sub-Process from a list of TargetMaps.
 * Fallback sequence:
 * 1. Exact match on (pms, processName, subProcessName)
 * 2. Fallback to PMS = "All" with exact match on (processName, subProcessName)
 * 3. Fallback to PMS = "All", Process = "All", Sub Process = "All"
 */
export function resolveTargetEntry(
  pms: string,
  processName: string,
  subProcessName: string,
  targets: TargetMap[]
): TargetMap | null {
  if (!targets || targets.length === 0) return null;

  const clean = (s: string) => (s || '').trim().toLowerCase();
  
  const pmsClean = clean(pms);
  const procClean = clean(processName);
  const subClean = clean(subProcessName);

  // 1. Exact Match
  const exactMatch = targets.find(
    (t) => clean(t.pms) === pmsClean && clean(t.processName) === procClean && clean(t.subProcessName) === subClean
  );
  if (exactMatch) return exactMatch;

  // 2. Fallback to PMS = "All"
  const pmsAllMatch = targets.find(
    (t) => clean(t.pms) === 'all' && clean(t.processName) === procClean && clean(t.subProcessName) === subClean
  );
  if (pmsAllMatch) return pmsAllMatch;

  // 3. Fallback to PMS = "All", Process = "All", Sub Process = "All"
  const allAllMatch = targets.find(
    (t) => clean(t.pms) === 'all' && clean(t.processName) === 'all' && clean(t.subProcessName) === 'all'
  );
  if (allAllMatch) return allAllMatch;

  return null;
}

/**
 * Resolves the operational target for a given PMS, Process, and Sub-Process from a list of TargetMaps.
 */
export function resolveTarget(
  pms: string,
  processName: string,
  subProcessName: string,
  targets: TargetMap[]
): number {
  const entry = resolveTargetEntry(pms, processName, subProcessName, targets);
  return entry ? entry.target : 100;
}

/**
 * Calculates hourly target for a production record.
 * hourlyTarget = Target / Daily Work Hours (default to 8)
 */
export function calculateHourlyTarget(target: number, dailyWorkHours: number = 8): number {
  const hrs = dailyWorkHours > 0 ? dailyWorkHours : 8;
  return Number((target / hrs).toFixed(2));
}

/**
 * Calculates hourly achieved for a production record.
 * Achieved(hourly) = Achieved / Hourly Target
 */
export function calculateHourlyAchieved(achieved: number, hourlyTarget: number): number {
  if (hourlyTarget <= 0) return 0;
  return Number((achieved / hourlyTarget).toFixed(4));
}

/**
 * Shared percentage formatter: every percentage in the UI must render
 * with exactly 2 digits after the decimal point.
 */
export const formatPercent = (value: number | null | undefined): string => {
  const n = Number(value);
  return `${(Number.isFinite(n) ? n : 0).toFixed(2)}%`;
};

/**
 * Scales a daily target proportionally to the hours actually worked that day.
 * scaledTarget = (hoursWorked / standardHours) * standardTarget
 * Applies to ANY partial-worked day (not just Saturdays). Full or unknown
 * hours return the standard target unchanged.
 */
export const getScaledTarget = (
  standardTarget: number,
  hoursWorked: number | null | undefined,
  standardHours: number = 8
): number => {
  if (hoursWorked == null || hoursWorked <= 0) return standardTarget;
  if (standardHours <= 0 || hoursWorked >= standardHours) return standardTarget;
  return Math.round((hoursWorked / standardHours) * standardTarget * 10) / 10;
};

/**
 * Parses a DOJ string (MM/DD/YYYY or YYYY-MM-DD) into a Date, or null.
 */
export const parseDojDate = (dojStr: string): Date | null => {
  if (!dojStr) return null;
  let dateObj: Date;
  if (dojStr.includes('-')) {
    dateObj = new Date(dojStr);
  } else {
    const parts = dojStr.split('/');
    if (parts.length === 3) {
      dateObj = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    } else {
      dateObj = new Date(dojStr);
    }
  }
  return isNaN(dateObj.getTime()) ? null : dateObj;
};

/**
 * Whole months of tenure between DOJ and the app reference date.
 */
export const getTenureMonths = (
  dojStr: string,
  refDate: Date = new Date('2026-06-30')
): number | null => {
  const doj = parseDojDate(dojStr);
  if (!doj) return null;
  let months = (refDate.getFullYear() - doj.getFullYear()) * 12 + (refDate.getMonth() - doj.getMonth());
  if (refDate.getDate() < doj.getDate()) months--;
  return Math.max(0, months);
};

/**
 * Calculates DOJ to current date tenure precisely in Years, Months, and Days
 */
export function calculateTenure(dojStr: string): string {
  if (!dojStr) return '0 Days';
  
  // Format MM/DD/YYYY or YYYY-MM-DD
  let dateObj: Date;
  if (dojStr.includes('-')) {
    dateObj = new Date(dojStr);
  } else {
    const parts = dojStr.split('/');
    if (parts.length === 3) {
      dateObj = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    } else {
      dateObj = new Date(dojStr);
    }
  }

  if (isNaN(dateObj.getTime())) return 'Invalid Date';

  const today = new Date('2026-06-30'); // Fixed reference date as per our app metadata time
  
  let years = today.getFullYear() - dateObj.getFullYear();
  let months = today.getMonth() - dateObj.getMonth();
  let days = today.getDate() - dateObj.getDate();

  if (days < 0) {
    months--;
    // Get last day of previous month
    const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    days += prevMonthEnd;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years}years`);
  if (months > 0) parts.push(`${months}months`);
  if (days >= 0) parts.push(`${days}Days`);

  return parts.join(', ') || '0 Days';
}

/**
 * Automatically converts "New Joiner" to "Standard Employee" if DOJ is > 3 months ago
 */
export function getModifiedStatus(emp: Employee): string {
  if (emp.status !== 'New Joiner') return emp.status;

  let dateObj: Date;
  if (emp.doj.includes('-')) {
    dateObj = new Date(emp.doj);
  } else {
    const parts = emp.doj.split('/');
    if (parts.length === 3) {
      dateObj = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    } else {
      dateObj = new Date(emp.doj);
    }
  }

  if (isNaN(dateObj.getTime())) return emp.status;

  const today = new Date('2026-06-30'); // Fixed reference date
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  if (dateObj <= threeMonthsAgo) {
    return 'Active'; // Converted to Standard
  }

  return 'New Joiner';
}

/**
 * Evaluates working day expected periods, break excess, shortfall, and OT for an employee in a month
 */
export function calculateAttendanceMetrics(
  empId: string,
  records: AttendanceRecord[]
) {
  const normId = normalizeEmpId(empId);
  const empRecords = records.filter((r) => normalizeEmpId(r.empId) === normId);
  const totalExpectedDays = empRecords.length;
  const leaves = empRecords.filter((r) => r.onLeave).length;
  const workedDays = totalExpectedDays - leaves;

  let totalHoursWorked = 0;
  let totalHoursBreak = 0;
  let totalHoursOT = 0;
  let totalShortfall = 0;
  let breakExcessCount = 0;
  let breakExcessHours = 0;

  empRecords.forEach((r) => {
    if (r.onLeave) return; // If on leave, do not count shortfall, breaks or OT for that day!

    totalHoursWorked += r.hoursWorked;
    totalHoursBreak += r.hoursBreak;
    totalHoursOT += r.hoursOT;

    // Standard expected shift hours is 8 hours
    const shortfall = Math.max(0, 8 - r.hoursWorked);
    totalShortfall += shortfall;

    // Break excess: standard break allowed is 1.0 hour per day (60 minutes)
    if (r.hoursBreak > 1.0) {
      breakExcessCount++;
      breakExcessHours += (r.hoursBreak - 1.0);
    }
  });

  const attendanceRate = totalExpectedDays > 0 
    ? Number(((workedDays / totalExpectedDays) * 100).toFixed(1)) 
    : 100;

  return {
    expectedDays: totalExpectedDays,
    workedDays,
    leaves,
    attendanceRate,
    totalHoursWorked: Number(totalHoursWorked.toFixed(1)),
    totalHoursBreak: Number(totalHoursBreak.toFixed(1)),
    totalHoursOT: Number(totalHoursOT.toFixed(1)),
    totalShortfall: Number(totalShortfall.toFixed(1)),
    breakExcessCount,
    breakExcessHours: Number(breakExcessHours.toFixed(1))
  };
}

/**
 * Aggregates production volumes, achievements, efficiencies, and outgoing accuracies
 */
export function calculateProductionMetrics(
  empId: string,
  prodRecords: ProductionRecord[]
) {
  const normId = normalizeEmpId(empId);
  const empProds = prodRecords.filter((r) => normalizeEmpId(r.empId) === normId);
  if (empProds.length === 0) {
    return {
      achievedVolume: 0,
      targetVolume: 0,
      efficiency: 0,
      accuracy: 100,
      attainment: 0,
      daysLogged: 0,
      totalAudited: 0,
      totalErrors: 0
    };
  }

  let achievedVolume = 0;
  let targetVolume = 0;
  let totalAudited = 0;
  let totalErrors = 0;
  let hasAudits = false;
  let accuracySum = 0;
  let accuracyCount = 0;

  empProds.forEach((r) => {
    achievedVolume += r.achieved;
    targetVolume += r.target;
    
    if (r.auditedCount !== undefined && r.auditedCount !== null) {
      totalAudited += r.auditedCount;
      hasAudits = true;
      if (r.errorCategory) {
        const cat = r.errorCategory.trim().toUpperCase();
        if (cat !== 'FYI' && cat !== 'NO ERROR' && cat !== '') {
          totalErrors += 1; // Default to 1 error if errorCategory exists and is not FYI/NO ERROR
        }
      }
    }
    
    if (r.accuracy !== undefined && r.accuracy !== null) {
      accuracySum += r.accuracy;
      accuracyCount++;
    }
  });

  const efficiency = targetVolume > 0 
    ? Number(((achievedVolume / targetVolume) * 100).toFixed(1)) 
    : 100;

  // Weighted accuracy calculation: Quality Score = ((Total Audited - Total Errors) / Total Audited) * 100
  let accuracy = 100;
  if (hasAudits && totalAudited > 0) {
    accuracy = Number((((totalAudited - totalErrors) / totalAudited) * 100).toFixed(1));
  } else if (accuracyCount > 0) {
    accuracy = Number((accuracySum / accuracyCount).toFixed(1));
  }

  const attainment = targetVolume > 0 ? Number(((achievedVolume / targetVolume) * 100).toFixed(1)) : 100;

  return {
    achievedVolume,
    targetVolume,
    efficiency,
    accuracy,
    attainment,
    daysLogged: empProds.length,
    totalAudited,
    totalErrors
  };
}

export interface BillingCycle {
  id: string; // "2026-02"
  label: string; // "Jan 26 - Feb 25 (Feb 2026)"
  startDate: string; // "2026-01-26"
  endDate: string; // "2026-02-25"
}

/**
 * Returns available work cycles (from Jan 2026 to Dec 2026, starting on 26th of previous month)
 */
export function getBillingCycles(): BillingCycle[] {
  const cycles: BillingCycle[] = [];
  
  const cycleConfigs = [
    { label: 'Nov 26, 2025 - Dec 25, 2025 (Dec 2025)', start: '2025-11-26', end: '2025-12-25', id: '2025-12' },
    { label: 'Dec 26, 2025 - Jan 25, 2026 (Jan 2026)', start: '2025-12-26', end: '2026-01-25', id: '2026-01' },
    { label: 'Jan 26 - Feb 25 (Feb 2026)', start: '2026-01-26', end: '2026-02-25', id: '2026-02' },
    { label: 'Feb 26 - Mar 25 (Mar 2026)', start: '2026-02-26', end: '2026-03-25', id: '2026-03' },
    { label: 'Mar 26 - Apr 25 (Apr 2026)', start: '2026-03-26', end: '2026-04-25', id: '2026-04' },
    { label: 'Apr 26 - May 25 (May 2026)', start: '2026-04-26', end: '2026-05-25', id: '2026-05' },
    { label: 'May 26 - Jun 25 (Jun 2026)', start: '2026-05-26', end: '2026-06-25', id: '2026-06' },
    { label: 'Jun 26 - Jul 25 (Jul 2026)', start: '2026-06-26', end: '2026-07-25', id: '2026-07' },
    { label: 'Jul 26 - Aug 25 (Aug 2026)', start: '2026-07-26', end: '2026-08-25', id: '2026-08' },
    { label: 'Aug 26 - Sep 25 (Sep 2026)', start: '2026-08-26', end: '2026-09-25', id: '2026-09' },
    { label: 'Sep 26 - Oct 25 (Oct 2026)', start: '2026-09-26', end: '2026-10-25', id: '2026-10' },
    { label: 'Oct 26 - Nov 25 (Nov 2026)', start: '2026-10-26', end: '2026-11-25', id: '2026-11' },
    { label: 'Nov 26 - Dec 25 (Dec 2026)', start: '2026-11-26', end: '2026-12-25', id: '2026-12' },
  ];

  return cycleConfigs.map(c => ({
    id: c.id,
    label: c.label,
    startDate: c.start,
    endDate: c.end
  }));
}

/**
 * Finds the last Saturday of a cycle date range
 */
export function getLastSaturdayOfCycle(startDateStr: string, endDateStr: string): string {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  let current = new Date(end);
  while (current >= start) {
    if (current.getDay() === 6) { // 6 is Saturday
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    current.setDate(current.getDate() - 1);
  }
  return '';
}

/**
 * Gets the Mon-Fri preceding a Saturday date
 */
export function getWeekdaysPrecedingSaturday(saturdayDateStr: string): string[] {
  if (!saturdayDateStr) return [];
  const sat = new Date(saturdayDateStr);
  const dates: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const d = new Date(sat);
    d.setDate(sat.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates.reverse(); // Mon, Tue, Wed, Thu, Fri
}

export interface SaturdayRuleEvaluation {
  lastSaturdayDate: string;
  weekdays: string[];
  weekdayWorkedHours: { [date: string]: number };
  weekdayExpectedHours: { [date: string]: number };
  extraHoursWorked: number; // total overall extra hours worked during weekdays
  extendedOneHourDaily: boolean; // extended daily by 1 hour
  overallExtraFiveHours: boolean; // overall worked extra 5 hours during weekdays
  isExcusedFromSaturday: boolean; // true if met Saturday off requirements
  saturdayRecord: AttendanceRecord | null;
  status: 'Excused (Met Weekday Extra Hours)' | 'Attended' | 'Absent (Marked Leave)' | 'No Record';
}

/**
 * Evaluates the Saturday work criteria for an employee
 */
export function evaluateSaturdayRuleForEmployee(
  empId: string,
  attendance: AttendanceRecord[],
  startDateStr: string,
  endDateStr: string
): SaturdayRuleEvaluation {
  const lastSaturday = getLastSaturdayOfCycle(startDateStr, endDateStr);
  const weekdays = getWeekdaysPrecedingSaturday(lastSaturday);
  
  const weekdayWorkedHours: { [date: string]: number } = {};
  const weekdayExpectedHours: { [date: string]: number } = {};
  let extraHoursWorked = 0;
  
  // Track weekdays worked
  let weekdaysCount = 0;
  let dailyExtensionMetCount = 0;

  const normId = normalizeEmpId(empId);
  weekdays.forEach((dateStr) => {
    const rec = attendance.find((a) => normalizeEmpId(a.empId) === normId && a.date === dateStr);
    const hrs = rec && !rec.onLeave ? rec.hoursWorked : 0;
    const exp = rec ? rec.expectedHours : 8; // default to 8 expected hours
    
    weekdayWorkedHours[dateStr] = hrs;
    weekdayExpectedHours[dateStr] = exp;
    
    if (hrs > 0) {
      weekdaysCount++;
      const extra = hrs - exp;
      if (extra > 0) {
        extraHoursWorked += extra;
      }
      if (extra >= 1.0) {
        dailyExtensionMetCount++;
      }
    }
  });

  // Met daily 1 hour extension: they met it for all days they actually worked (or at least 4 of 5 standard workdays)
  const extendedOneHourDaily = dailyExtensionMetCount >= Math.min(4, weekdaysCount) && weekdaysCount > 0;
  const overallExtraFiveHours = extraHoursWorked >= 5.0;
  const isExcusedFromSaturday = extendedOneHourDaily || overallExtraFiveHours;

  const saturdayRecord = attendance.find((a) => normalizeEmpId(a.empId) === normId && a.date === lastSaturday) || null;
  
  let status: SaturdayRuleEvaluation['status'] = 'No Record';
  if (isExcusedFromSaturday) {
    status = 'Excused (Met Weekday Extra Hours)';
  } else if (saturdayRecord) {
    if (saturdayRecord.onLeave) {
      status = 'Absent (Marked Leave)';
    } else if (saturdayRecord.hoursWorked > 0) {
      status = 'Attended';
    } else {
      status = 'Absent (Marked Leave)';
    }
  } else {
    // If no Saturday record exists and they were not excused, it default-flags as Absent if they did not attend
    status = 'Absent (Marked Leave)';
  }

  return {
    lastSaturdayDate: lastSaturday,
    weekdays,
    weekdayWorkedHours,
    weekdayExpectedHours,
    extraHoursWorked: Number(extraHoursWorked.toFixed(2)),
    extendedOneHourDaily,
    overallExtraFiveHours,
    isExcusedFromSaturday,
    saturdayRecord,
    status
  };
}

/**
 * Enhanced calculation that filters by billing cycle range
 */
export function calculateAttendanceMetricsForCycle(
  empId: string,
  records: AttendanceRecord[],
  startDateStr: string,
  endDateStr: string
) {
  const normId = normalizeEmpId(empId);
  const cycleRecords = records.filter(
    (r) => normalizeEmpId(r.empId) === normId && r.date >= startDateStr && r.date <= endDateStr
  );
  
  const totalExpectedDays = cycleRecords.length;
  const leaves = cycleRecords.filter((r) => r.onLeave).length;
  const workedDays = totalExpectedDays - leaves;

  let totalHoursWorked = 0;
  let totalHoursBreak = 0;
  let totalHoursOT = 0;
  let totalShortfall = 0;

  cycleRecords.forEach((r) => {
    if (r.onLeave) return;

    totalHoursWorked += r.hoursWorked;
    totalHoursBreak += r.hoursBreak;
    totalHoursOT += r.hoursOT;

    const shortfall = Math.max(0, (r.expectedHours || 8) - r.hoursWorked);
    totalShortfall += shortfall;
  });

  // Evaluate Saturday rules
  const satEval = evaluateSaturdayRuleForEmployee(empId, records, startDateStr, endDateStr);
  
  // If they were absent on Saturday and not excused, add 1 to leave count (if it wasn't already marked as onLeave)
  let adjustedLeaves = leaves;
  let adjustedShortfall = totalShortfall;

  if (!satEval.isExcusedFromSaturday && satEval.status === 'Absent (Marked Leave)') {
    // Check if Saturday record already existed as a leave record in cycleRecords
    const alreadyCountedAsLeave = cycleRecords.some(r => r.date === satEval.lastSaturdayDate && r.onLeave);
    if (!alreadyCountedAsLeave) {
      adjustedLeaves += 1;
      adjustedShortfall += 8.0; // default 8 hours shortfall for absent Saturday
    }
  }

  const attendanceRate = totalExpectedDays > 0 
    ? Number(((workedDays / totalExpectedDays) * 100).toFixed(1)) 
    : 100;

  return {
    expectedDays: totalExpectedDays,
    workedDays,
    leaves: adjustedLeaves,
    attendanceRate,
    totalHoursWorked: Number(totalHoursWorked.toFixed(1)),
    totalHoursBreak: Number(totalHoursBreak.toFixed(1)),
    totalHoursOT: Number(totalHoursOT.toFixed(1)),
    totalShortfall: Number(adjustedShortfall.toFixed(1)),
    saturdayStatus: satEval
  };
}
