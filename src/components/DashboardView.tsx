import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatPercent, getScaledTarget, getTenureMonths, normalizeEmpId, matchesClean } from '../utils/calculations';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import {
  Users,
  Target,
  Trophy,
  Zap,
  TrendingUp,
  Percent,
  TrendingDown,
  Activity,
  Filter,
  Search,
  X,
  UserCheck,
  Building,
  Layers,
  HelpCircle,
  Eye,
  Briefcase,
  Calendar,
  RefreshCw,
  Maximize2,
  Clock,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { employees, targets, employeeProcesses, production, attendance, rampUpRules } = useApp();

  // ─── FILTER STATES ────────────────────────────────────────────────────────
  const [filterPms, setFilterPms] = useState('');
  const [filterEmpName, setFilterEmpName] = useState('');
  const [filterEmpId, setFilterEmpId] = useState('');
  const [filterProcess, setFilterProcess] = useState('');
  const [filterSubProcess, setFilterSubProcess] = useState('');
  const [filterReporting, setFilterReporting] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  // Date range and Month are mutually exclusive: setting one disables the other
  const isMonthDisabled = Boolean(filterStartDate || filterEndDate);
  const isDateRangeDisabled = Boolean(filterMonth);

  // ─── DRILL DOWN MODAL STATUS ──────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [selectedFormulaMetric, setSelectedFormulaMetric] = useState<string | null>(null);
  const [selectedChartExplanation, setSelectedChartExplanation] = useState<string | null>(null);
  const [chartModalTab, setChartModalTab] = useState<'breakdown' | 'formula'>('breakdown');

  const openChartExplanation = (chartName: string) => {
    setSelectedChartExplanation(chartName);
    setChartModalTab('breakdown');
  };

  // ─── GRAPHICAL CHART TOGGLE ────────────────────────────────────────────────
  const [chartType, setChartType] = useState<'bar' | 'radar'>('bar');

  // ─── EXPANDED FULL-SIZE CHART VIEW ──────────────────────────────────────────
  const [expandedChart, setExpandedChart] = useState<'trend' | 'process' | null>(null);

  // Helper: parse date components + handle year clamping (e.g. 2526 to 2026)
  const parseDateComponents = (dateStr: string) => {
    if (!dateStr) return null;
    
    const cleanStr = dateStr.trim();
    
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
    
    // Check if it is already in ISO YYYY-MM-DD format
    const isoReg = /^\d{4}-\d{2}-\d{2}$/;
    if (isoReg.test(cleanStr)) {
      const parts = cleanStr.split('-');
      year = parts[0];
      month = parts[1];
      day = parts[2];
    } else {
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
      
      if (parts.length === 3) {
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
            // Numeric month
            const n0 = parseInt(parts[0], 10);
            const n1 = parseInt(parts[1], 10);
            if (n0 > 12) {
              day = parts[0];
              month = parts[1];
            } else if (n1 > 12) {
              month = parts[0];
              day = parts[1];
            } else {
              month = parts[0];
              day = parts[1];
            }
            year = parts[2];
          }
        }
      } else if (parts.length === 2) {
        // e.g., "08-05" or "May-26"
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
          // Default to MM/DD/2026
          month = parts[0];
          day = parts[1];
          year = '2026';
        }
      } else {
        // Fallback to standard JS parsing
        const d = new Date(cleanStr);
        if (!isNaN(d.getTime())) {
          year = String(d.getFullYear());
          month = String(d.getMonth() + 1).padStart(2, '0');
          day = String(d.getDate()).padStart(2, '0');
        } else {
          // Last resort fallback
          year = '2026';
          month = '06';
          day = '01';
        }
      }
    }
    
    // Normalize year to 4-digit YYYY
    if (!year) year = '2026';
    if (year.length === 1 || year.length === 2) {
      const yrNum = parseInt(year, 10);
      if (yrNum >= 0 && yrNum <= 99) {
        year = '20' + year.padStart(2, '0');
      }
    }
    
    if (year.startsWith('25')) {
      year = '20' + year.substring(2);
    }
    
    // Normalize month and day
    if (!month) month = '06';
    if (!day) day = '01';
    month = month.padStart(2, '0');
    day = day.padStart(2, '0');
    
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    let monthIdx = parseInt(month, 10) - 1;
    if (isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) {
      monthIdx = 5; // Default to June
    }
    const monthName = months[monthIdx];
    
    const dateObj = new Date(parseInt(year, 10), monthIdx, parseInt(day, 10));
    const oneJan = new Date(dateObj.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((dateObj.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
    const weekMath = Math.ceil((dateObj.getDay() + 1 + numberOfDays) / 7);
    
    return {
      year,
      month,
      monthName,
      day,
      weekMath,
    };
  };

  // ─── EXCLUSION RULE ───────────────────────────────────────────────────────
  // "Relieved" and "Abscond" statuses must never count toward analytics or logs!
  const activeEmployees = useMemo(() => {
    return employees.filter(
      emp => emp && emp.empId && emp.status !== 'Relieved' && emp.status !== 'Abscond'
    );
  }, [employees]);

  const activeEmpIdSet = useMemo(() => {
    return new Set(
      activeEmployees
        .map(e => e.empId ? e.empId.toString().toUpperCase().trim() : '')
        .filter(Boolean)
    );
  }, [activeEmployees]);

  const employeeProcessMap = useMemo(() => {
    const map = new Map<string, typeof employeeProcesses[0]>();
    employeeProcesses.forEach(ep => {
      if (ep && ep.empId) {
        map.set(ep.empId.toUpperCase().trim(), ep);
      }
    });
    return map;
  }, [employeeProcesses]);

  const activeEmployeesMap = useMemo(() => {
    const map = new Map<string, typeof activeEmployees[0]>();
    activeEmployees.forEach(e => {
      if (e && e.empId) {
        map.set(e.empId.toUpperCase().trim(), e);
      }
    });
    return map;
  }, [activeEmployees]);

  // Every PMS an employee is mapped to (employees can hold multiple process mappings)
  const employeePmsMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    employeeProcesses.forEach(ep => {
      if (ep && ep.empId && ep.pms) {
        const key = ep.empId.toUpperCase().trim();
        if (!map.has(key)) map.set(key, new Set());
        map.get(key)!.add(ep.pms.trim());
      }
    });
    return map;
  }, [employeeProcesses]);

  // The Reporting Manager filter must match ANY manager role (RM, LM, RCM Manager)
  const matchesManager = (emp: { rm?: string; lm?: string; rcm?: string }, name: string) => {
    const n = name.trim().toLowerCase();
    if (n === '') return true;
    const rm = (emp.rm || '').trim().toLowerCase();
    const lm = (emp.lm || '').trim().toLowerCase();
    const rcm = (emp.rcm || '').trim().toLowerCase();
    return rm === n || lm === n || rcm === n;
  };

  // Base roster scoped by the independent PMS filter
  const pmsScopedEmployees = useMemo(() => {
    if (!filterPms) return activeEmployees;
    return activeEmployees.filter(e => {
      const set = employeePmsMap.get(e.empId.toUpperCase().trim());
      return !!set && set.has(filterPms);
    });
  }, [activeEmployees, employeePmsMap, filterPms]);

  const uniquePmsValues = useMemo(() => {
    const vals = employeeProcesses.map(ep => ep.pms ? ep.pms.trim() : '').filter(Boolean);
    return [...new Set(vals)].sort();
  }, [employeeProcesses]);

  // Combine production and attendance into active logs
  const activeLogs = useMemo(() => {
    const attMap = new Map<string, typeof attendance[0]>();
    attendance.forEach(att => {
      if (att && att.empId) {
        attMap.set(`${att.empId.toString().toUpperCase().trim()}_${att.date || ''}`, att);
      }
    });

    const activeEmpsMap = new Map<string, typeof activeEmployees[0]>();
    activeEmployees.forEach(e => {
      if (e && e.empId) {
        activeEmpsMap.set(e.empId.toString().toUpperCase().trim(), e);
      }
    });

    const epMap = new Map<string, typeof employeeProcesses[0]>();
    employeeProcesses.forEach(ep => {
      if (ep && ep.empId) {
        epMap.set(ep.empId.toString().toUpperCase().trim(), ep);
      }
    });

    const rampSet = new Set(
      (rampUpRules || [])
        .map(r => r.empId ? r.empId.toString().toUpperCase().trim() : '')
        .filter(Boolean)
    );

    const logs: any[] = [];
    const visitedKeys = new Set<string>();

    production.forEach(prod => {
      if (!prod || !prod.empId) return;
      const prodEmpId = prod.empId.toString().toUpperCase().trim();
      const key = `${prodEmpId}_${prod.date || ''}`;
      if (!activeEmpIdSet.has(prodEmpId)) return;
      visitedKeys.add(key);

      const att = attMap.get(key);
      const isRampUp = rampSet.has(prodEmpId);

      logs.push({
        id: prod.id,
        empId: prod.empId,
        date: prod.date,
        pms: prod.pms,
        process: prod.processName,
        subProcess: prod.subProcessName,
        target: prod.target,
        achieved: prod.achieved,
        accuracy: prod.accuracy,
        hoursWorked: att ? att.hoursWorked : 8,
        onLeave: att ? att.onLeave : false,
        isRampUp,
      });
    });

    // Add attendance-only records
    attendance.forEach(att => {
      if (!att || !att.empId) return;
      const attEmpId = att.empId.toString().toUpperCase().trim();
      if (!activeEmpIdSet.has(attEmpId)) return;
      const key = `${attEmpId}_${att.date || ''}`;
      if (!visitedKeys.has(key)) {
        const emp = activeEmpsMap.get(attEmpId);
        const ep = epMap.get(attEmpId);
        const isRampUp = rampSet.has(attEmpId);

        logs.push({
          id: att.id,
          empId: att.empId,
          date: att.date,
          pms: ep?.pms || '',
          process: ep?.processName || emp?.designation || 'Leave/Support',
          subProcess: ep?.subProcessName || 'N/A',
          target: 0,
          achieved: 0,
          accuracy: 100,
          hoursWorked: att.hoursWorked,
          onLeave: att.onLeave,
          isRampUp,
        });
      }
    });

    return logs;
  }, [production, attendance, activeEmployees, activeEmpIdSet, employeeProcesses, rampUpRules]);

  // ─── DYNAMIC UNIQUE OPTIONS FOR FILTERS ────────────────────────────────────
  const uniqueNames = useMemo(() => {
    const filtered = pmsScopedEmployees.filter(emp => {
      if (filterEmpId && emp.empId !== filterEmpId) return false;
      const ep = employeeProcessMap.get(emp.empId.toUpperCase().trim());
      const empProcess = ep?.processName || emp.designation;
      const empSubProcess = ep?.subProcessName || '';
      if (filterProcess && empProcess?.trim() !== filterProcess.trim() && emp.designation?.trim() !== filterProcess.trim()) return false;
      if (filterSubProcess && empSubProcess?.trim() !== filterSubProcess.trim()) return false;
      if (filterReporting && !matchesManager(emp, filterReporting)) return false;
      return true;
    });
    const names = filtered.map(e => e.name).filter(Boolean);
    return [...new Set(names)].sort();
  }, [pmsScopedEmployees, employeeProcessMap, filterEmpId, filterProcess, filterSubProcess, filterReporting]);

  const uniqueEmpIds = useMemo(() => {
    const filtered = pmsScopedEmployees.filter(emp => {
      if (filterEmpName && emp.name !== filterEmpName) return false;
      const ep = employeeProcessMap.get(emp.empId.toUpperCase().trim());
      const empProcess = ep?.processName || emp.designation;
      const empSubProcess = ep?.subProcessName || '';
      if (filterProcess && empProcess?.trim() !== filterProcess.trim() && emp.designation?.trim() !== filterProcess.trim()) return false;
      if (filterSubProcess && empSubProcess?.trim() !== filterSubProcess.trim()) return false;
      if (filterReporting && !matchesManager(emp, filterReporting)) return false;
      return true;
    });
    const ids = filtered.map(e => e.empId).filter(Boolean);
    return [...new Set(ids)].sort();
  }, [pmsScopedEmployees, employeeProcessMap, filterEmpName, filterProcess, filterSubProcess, filterReporting]);

  const uniqueProcessNames = useMemo(() => {
    const filtered = pmsScopedEmployees.filter(emp => {
      if (filterEmpName && emp.name !== filterEmpName) return false;
      if (filterEmpId && emp.empId !== filterEmpId) return false;
      const ep = employeeProcessMap.get(emp.empId.toUpperCase().trim());
      const empSubProcess = ep?.subProcessName || '';
      if (filterSubProcess && empSubProcess?.trim() !== filterSubProcess.trim()) return false;
      if (filterReporting && !matchesManager(emp, filterReporting)) return false;
      return true;
    });
    const filteredEmpIds = new Set(filtered.map(e => e.empId.toUpperCase().trim()));
    const depts = employeeProcesses
      .filter(ep => filteredEmpIds.has(ep.empId.toUpperCase().trim()))
      .map(ep => ep.processName)
      .filter(Boolean);
    const designations = filtered.map(e => e.designation).filter(Boolean);
    return [...new Set([...depts, ...designations])].sort();
  }, [pmsScopedEmployees, employeeProcesses, employeeProcessMap, filterEmpName, filterEmpId, filterSubProcess, filterReporting]);

  const uniqueSubProcessNames = useMemo(() => {
    const filtered = pmsScopedEmployees.filter(emp => {
      if (filterEmpName && emp.name !== filterEmpName) return false;
      if (filterEmpId && emp.empId !== filterEmpId) return false;
      const ep = employeeProcessMap.get(emp.empId.toUpperCase().trim());
      const empProcess = ep?.processName || emp.designation;
      if (filterProcess && empProcess?.trim() !== filterProcess.trim() && emp.designation?.trim() !== filterProcess.trim()) return false;
      if (filterReporting && !matchesManager(emp, filterReporting)) return false;
      return true;
    });
    const filteredEmpIds = new Set(filtered.map(e => e.empId.toUpperCase().trim()));
    const platforms = employeeProcesses
      .filter(ep => filteredEmpIds.has(ep.empId.toUpperCase().trim()))
      .map(ep => ep.subProcessName)
      .filter(Boolean);
    return [...new Set(platforms)].sort();
  }, [pmsScopedEmployees, employeeProcesses, employeeProcessMap, filterEmpName, filterEmpId, filterProcess, filterReporting]);

  const uniqueReportingManagers = useMemo(() => {
    const filtered = pmsScopedEmployees.filter(emp => {
      if (filterEmpName && emp.name !== filterEmpName) return false;
      if (filterEmpId && emp.empId !== filterEmpId) return false;
      const ep = employeeProcessMap.get(emp.empId.toUpperCase().trim());
      const empProcess = ep?.processName || emp.designation;
      const empSubProcess = ep?.subProcessName || '';
      if (filterProcess && empProcess?.trim() !== filterProcess.trim() && emp.designation?.trim() !== filterProcess.trim()) return false;
      if (filterSubProcess && empSubProcess?.trim() !== filterSubProcess.trim()) return false;
      return true;
    });
    // Include ALL manager role types in the option list: RM, LM and RCM Manager
    const managers = filtered
      .flatMap(e => [e.rm, e.lm, e.rcm])
      .map(m => (m || '').trim())
      .filter(Boolean);
    return [...new Set(managers)].sort();
  }, [pmsScopedEmployees, employeeProcessMap, filterEmpName, filterEmpId, filterProcess, filterSubProcess]);

  const uniqueMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    activeLogs.forEach(l => {
      const dc = parseDateComponents(l.date);
      if (dc) {
        monthsSet.add(dc.monthName);
      }
    });
    const monthOrder = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return [...monthsSet].sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
  }, [activeLogs]);


  // ─── AUTO-DEPENDENCY FILTER EVENT HANDLERS ─────────────────────────────────
  const handleEmpNameChange = (val: string) => {
    setFilterEmpName(val);
    if (!val) {
      setFilterEmpId('');
      setFilterProcess('');
      setFilterSubProcess('');
      setFilterReporting('');
      setFilterMonth('');
      return;
    }
    const emp = activeEmployees.find(e => e.name === val);
    if (emp) {
      setFilterEmpId(emp.empId);
      setFilterReporting(emp.rm || '');
      
      const proc = employeeProcessMap.get(emp.empId.toUpperCase().trim());
      if (proc) {
        setFilterProcess(proc.processName);
        setFilterSubProcess(proc.subProcessName);
      }
      
      // Only auto-suggest a month when the (mutually exclusive) date range is unused
      if (!filterStartDate && !filterEndDate) {
        const firstLog = activeLogs.find(l => l.empId.toUpperCase().trim() === emp.empId.toUpperCase().trim());
        if (firstLog) {
          const dc = parseDateComponents(firstLog.date);
          if (dc) {
            setFilterMonth(dc.monthName);
          }
        }
      }
    }
  };

  const handleEmpIdChange = (val: string) => {
    setFilterEmpId(val);
    if (!val) {
      setFilterEmpName('');
      setFilterProcess('');
      setFilterSubProcess('');
      setFilterReporting('');
      setFilterMonth('');
      return;
    }
    const emp = activeEmployeesMap.get(val.toUpperCase().trim());
    if (emp) {
      setFilterEmpName(emp.name);
      setFilterReporting(emp.rm || '');
      
      const proc = employeeProcessMap.get(emp.empId.toUpperCase().trim());
      if (proc) {
        setFilterProcess(proc.processName);
        setFilterSubProcess(proc.subProcessName);
      }
      
      // Only auto-suggest a month when the (mutually exclusive) date range is unused
      if (!filterStartDate && !filterEndDate) {
        const firstLog = activeLogs.find(l => l.empId.toUpperCase().trim() === emp.empId.toUpperCase().trim());
        if (firstLog) {
          const dc = parseDateComponents(firstLog.date);
          if (dc) {
            setFilterMonth(dc.monthName);
          }
        }
      }
    }
  };

  const handleProcessChange = (val: string) => {
    setFilterProcess(val);
    if (!val) return;
    const filtered = pmsScopedEmployees.filter(emp => {
      const ep = employeeProcessMap.get(emp.empId.toUpperCase().trim());
      const empProcess = ep?.processName || emp.designation;
      return empProcess?.trim() === val.trim() || emp.designation?.trim() === val.trim();
    });
    if (filtered.length === 1) {
      const emp = filtered[0];
      setFilterEmpName(emp.name);
      setFilterEmpId(emp.empId);
      setFilterReporting(emp.rm || '');
      const ep = employeeProcessMap.get(emp.empId.toUpperCase().trim());
      if (ep) {
        setFilterSubProcess(ep.subProcessName);
      }
    }
  };

  const handleSubProcessChange = (val: string) => {
    setFilterSubProcess(val);
    if (!val) return;
    const filtered = pmsScopedEmployees.filter(emp => {
      const ep = employeeProcessMap.get(emp.empId.toUpperCase().trim());
      return ep?.subProcessName?.trim() === val.trim();
    });
    if (filtered.length === 1) {
      const emp = filtered[0];
      setFilterEmpName(emp.name);
      setFilterEmpId(emp.empId);
      setFilterReporting(emp.rm || '');
      const ep = employeeProcessMap.get(emp.empId.toUpperCase().trim());
      if (ep) {
        setFilterProcess(ep.processName);
      }
    }
  };

  const handleReportingChange = (val: string) => {
    setFilterReporting(val);
    if (!val) return;
    const filtered = activeEmployees.filter(emp => emp.rm?.trim() === val.trim());
    if (filtered.length === 1) {
      const emp = filtered[0];
      setFilterEmpName(emp.name);
      setFilterEmpId(emp.empId);
      const ep = employeeProcessMap.get(emp.empId.toUpperCase().trim());
      if (ep) {
        setFilterProcess(ep.processName);
        setFilterSubProcess(ep.subProcessName);
      }
    }
  };

  // ─── FILTER MATCHING ENGINE ───────────────────────────────────────────────
  const filteredEmployees = useMemo(() => {
    return pmsScopedEmployees.filter(emp => {
      if (filterEmpName && emp.name !== filterEmpName) return false;
      if (filterEmpId && emp.empId !== filterEmpId) return false;

      const ep = employeeProcessMap.get(emp.empId.toUpperCase().trim());
      const empProcess = ep?.processName || emp.designation;
      const empSubProcess = ep?.subProcessName || '';

      if (filterProcess && empProcess?.trim() !== filterProcess.trim() && emp.designation?.trim() !== filterProcess.trim()) return false;
      if (filterSubProcess && empSubProcess?.trim() !== filterSubProcess.trim()) return false;
      if (filterReporting && !matchesManager(emp, filterReporting)) return false;
      return true;
    });
  }, [pmsScopedEmployees, employeeProcessMap, filterEmpName, filterEmpId, filterProcess, filterSubProcess, filterReporting]);

  const filteredEmpIdSet = useMemo(() => {
    return new Set(filteredEmployees.map(e => e.empId.toUpperCase().trim()));
  }, [filteredEmployees]);

  const filteredLogs = useMemo(() => {
    return activeLogs.filter(log => {
      if (!filteredEmpIdSet.has(log.empId.toUpperCase().trim())) return false;
      if (filterPms && (log.pms || '').trim() !== filterPms) return false;

      const dc = parseDateComponents(log.date);
      if (!dc) return false;

      if (filterMonth && dc.monthName !== filterMonth) return false;
      if (filterStartDate && log.date < filterStartDate) return false;
      if (filterEndDate && log.date > filterEndDate) return false;

      return true;
    });
  }, [activeLogs, filteredEmpIdSet, filterPms, filterMonth, filterStartDate, filterEndDate]);

  // Reset helper
  const handleResetFilters = () => {
    setFilterPms('');
    setFilterEmpName('');
    setFilterEmpId('');
    setFilterProcess('');
    setFilterSubProcess('');
    setFilterReporting('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterMonth('');
  };

  // ─── STATISTICS RE-CALCULATION ENGINE ───────────────────────────────────────
  const calculatedStats = useMemo(() => {
    const isMgrOrSup = (designation?: string, process?: string) => {
      const des = (designation || '').toLowerCase();
      const pr = (process || '').toLowerCase();
      return (
        des.includes('lead') ||
        des.includes('manager') ||
        des.includes('supervisor') ||
        des.includes('coordinator') ||
        des.includes('co-ordinator') ||
        des.includes('sme') ||
        des.includes('trainer') ||
        pr.includes('lead') ||
        pr.includes('supervisor') ||
        pr.includes('manager')
      );
    };

    const fEmpMap = new Map<string, typeof filteredEmployees[0]>();
    filteredEmployees.forEach(e => {
      if (e && e.empId) {
        fEmpMap.set(e.empId.toUpperCase().trim(), e);
      }
    });

    const epMap = new Map<string, typeof employeeProcesses[0]>();
    employeeProcesses.forEach(ep => {
      if (ep && ep.empId) {
        epMap.set(ep.empId.toUpperCase().trim(), ep);
      }
    });

    let totalAchieved = 0;
    let totalTarget = 0;
    let logsCount = filteredLogs.length;

    let totalAuditedAll = 0;
    let totalErrorsAll = 0;
    let hasAuditsAll = false;
    let accuracySumAll = 0;
    let accuracyCountAll = 0;

    let agentTotalAchieved = 0;
    let agentTotalAdjustedTarget = 0;
    let agentDaysLogged = 0;

    let agentTotalAudited = 0;
    let agentTotalErrors = 0;
    let agentHasAudits = false;
    let agentAccuracySum = 0;
    let agentAccuracyCount = 0;

    filteredLogs.forEach(l => {
      totalAchieved += l.achieved;
      totalTarget += l.target;

      // Track all accuracy
      if (l.auditedCount !== undefined && l.auditedCount !== null) {
        totalAuditedAll += l.auditedCount;
        hasAuditsAll = true;
        if (l.errorCategory) {
          const cat = l.errorCategory.trim().toUpperCase();
          if (cat !== 'FYI' && cat !== 'NO ERROR' && cat !== '') {
            totalErrorsAll += 1;
          }
        }
      }
      if (l.accuracy !== undefined && l.accuracy !== null) {
        accuracySumAll += l.accuracy;
        accuracyCountAll++;
      }

      const emp = fEmpMap.get(l.empId.toUpperCase().trim());
      const isAgent = !isMgrOrSup(emp?.designation, emp?.designation);

      if (isAgent) {
        if (l.hoursWorked <= 0) {
          return; // Exclude leaves
        }

        agentTotalAchieved += l.achieved;
        // Target scales proportionally to hours actually worked (Saturdays and any partial day)
        const adjTarget = getScaledTarget(l.target, l.hoursWorked);
        agentTotalAdjustedTarget += adjTarget;

        if (l.auditedCount !== undefined && l.auditedCount !== null) {
          agentTotalAudited += l.auditedCount;
          agentHasAudits = true;
          if (l.errorCategory) {
            const cat = l.errorCategory.trim().toUpperCase();
            if (cat !== 'FYI' && cat !== 'NO ERROR' && cat !== '') {
              agentTotalErrors += 1;
            }
          }
        }

        if (l.accuracy !== undefined && l.accuracy !== null) {
          agentAccuracySum += l.accuracy;
          agentAccuracyCount++;
        }

        agentDaysLogged++;
      }
    });

    const overallAttainment = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 10000) / 100 : 0;
    
    let avgAccuracy = 100;
    if (hasAuditsAll && totalAuditedAll > 0) {
      avgAccuracy = Number((((totalAuditedAll - totalErrorsAll) / totalAuditedAll) * 100).toFixed(2));
    } else if (accuracyCountAll > 0) {
      avgAccuracy = Number((accuracySumAll / accuracyCountAll).toFixed(2));
    }

    const avgDailyProduction = agentDaysLogged > 0 ? Math.round((agentTotalAchieved / agentDaysLogged) * 10) / 10 : 0;
    const avgWeeklyProduction = Math.round(avgDailyProduction * 6 * 10) / 10; 
    
    const agentProductivityPct = agentTotalAdjustedTarget > 0 
      ? Number(((agentTotalAchieved / agentTotalAdjustedTarget) * 100).toFixed(2)) 
      : 100;

    let agentQualityPct = 100;
    if (agentHasAudits && agentTotalAudited > 0) {
      agentQualityPct = Number((((agentTotalAudited - agentTotalErrors) / agentTotalAudited) * 100).toFixed(2));
    } else if (agentAccuracyCount > 0) {
      agentQualityPct = Number((agentAccuracySum / agentAccuracyCount).toFixed(2));
    }

    const activeAgents = filteredEmployees.filter(e => !isMgrOrSup(e.designation, e.designation));
    const activeAgentCount = activeAgents.length || 1;

    const uniqueDatesCount = new Set(filteredLogs.map(l => l.date)).size || 10;
    const totalExpectedHours = uniqueDatesCount * 8 * activeAgentCount;
    
    let totalAgentHoursWorked = 0;
    filteredLogs.forEach(l => {
      const emp = fEmpMap.get(l.empId.toUpperCase().trim());
      if (emp && !isMgrOrSup(emp.designation, emp.designation)) {
        totalAgentHoursWorked += l.hoursWorked;
      }
    });

    const hoursShortfall = Math.max(0, totalExpectedHours - totalAgentHoursWorked);
    const shrinkagePct = totalExpectedHours > 0 ? Math.round((hoursShortfall / totalExpectedHours) * 10000) / 100 : 0;

    const empLogsMap: {
      [key: string]: {
        name: string;
        process: string;
        subProcess: string;
        designation: string;
        reporting: string;
        status: string;
        achieved: number;
        target: number;
        sumAcc: number;
        logsCount: number;
        totalAudited: number;
        totalErrors: number;
        hasAudits: boolean;
        accuracyCount: number;
      }
    } = {};

    filteredEmployees.forEach(e => {
      const key = e.empId.toUpperCase().trim();
      const ep = epMap.get(key);
      empLogsMap[key] = {
        name: e.name,
        process: ep?.processName || e.designation || 'N/A',
        subProcess: ep?.subProcessName || 'N/A',
        designation: e.designation || 'N/A',
        reporting: e.rm || 'N/A',
        status: e.status || 'Active',
        achieved: 0,
        target: 0,
        sumAcc: 0,
        logsCount: 0,
        totalAudited: 0,
        totalErrors: 0,
        hasAudits: false,
        accuracyCount: 0,
      };
    });

    filteredLogs.forEach(l => {
      const key = l.empId.toUpperCase().trim();
      if (empLogsMap[key]) {
        empLogsMap[key].achieved += l.achieved;
        empLogsMap[key].target += l.target;
        empLogsMap[key].logsCount += 1;
        if (l.auditedCount !== undefined && l.auditedCount !== null) {
          empLogsMap[key].totalAudited += l.auditedCount;
          empLogsMap[key].hasAudits = true;
          if (l.errorCategory) {
            const cat = l.errorCategory.trim().toUpperCase();
            if (cat !== 'FYI' && cat !== 'NO ERROR' && cat !== '') {
              empLogsMap[key].totalErrors += 1;
            }
          }
        }
        if (l.accuracy !== undefined && l.accuracy !== null) {
          empLogsMap[key].sumAcc += l.accuracy;
          empLogsMap[key].accuracyCount += 1;
        }
      }
    });

    let sumEffList = 0;
    let effCount = 0;

    const dynamicEmpMetrics = Object.keys(empLogsMap).map(eId => {
      const data = empLogsMap[eId];
      const efficiency = data.target > 0 ? Math.round((data.achieved / data.target) * 10000) / 100 : 0;
      if (data.target > 0) {
        sumEffList += efficiency;
        effCount++;
      }

      let empAvgAccuracy = 100;
      if (data.hasAudits && data.totalAudited > 0) {
        empAvgAccuracy = Number((((data.totalAudited - data.totalErrors) / data.totalAudited) * 100).toFixed(2));
      } else if (data.accuracyCount > 0) {
        empAvgAccuracy = Number((data.sumAcc / data.accuracyCount).toFixed(2));
      }

      return {
        empId: eId,
        name: data.name,
        process: data.process,
        subProcess: data.subProcess,
        designation: data.designation,
        reporting: data.reporting,
        status: data.status,
        avgEfficiency: efficiency,
        avgAccuracy: empAvgAccuracy,
        totalAchieved: data.achieved,
        totalTarget: data.target,
        daysWorked: data.logsCount,
      };
    });

    const avgEfficiency = effCount > 0 ? Math.round((sumEffList / effCount) * 100) / 100 : 0;

    const productiveEmps = dynamicEmpMetrics.filter(e => e.totalAchieved > 0);
    const nonProductiveEmps = dynamicEmpMetrics.filter(e => e.totalAchieved === 0);

    const supportEmps = filteredEmployees.filter(emp => {
      const d = (emp.designation || '').toLowerCase();
      const ep = epMap.get(emp.empId.toUpperCase().trim());
      const pr = (ep?.processName || '').toLowerCase();
      return (
        d.includes('quality') ||
        d.includes('hr') ||
        d.includes('software') ||
        d.includes('analyst') ||
        d.includes('cctv') ||
        d.includes('system admin') ||
        pr.includes('quality') ||
        pr.includes('hr') ||
        pr.includes('software') ||
        pr.includes('analyst') ||
        pr.includes('cctv') ||
        pr.includes('system admin')
      );
    });

    const opsMgmtEmps = filteredEmployees.filter(emp => isMgrOrSup(emp.designation, emp.designation));

    return {
      totalEmployees: filteredEmployees.length,
      avgEfficiency,
      avgAccuracy,
      totalAchieved,
      totalTarget,
      overallAttainment,
      productiveEmps,
      nonProductiveEmps,
      supportEmps,
      opsMgmtEmps,
      empMetrics: dynamicEmpMetrics,
      avgDailyProduction,
      avgWeeklyProduction,
      agentProductivityPct,
      agentQualityPct,
      shrinkagePct,
      hoursShortfall,
      agentTotalAchieved,
      agentDaysLogged,
      agentSumEff: agentTotalAchieved,
      agentEffCount: agentTotalAdjustedTarget,
      agentSumAcc: agentHasAudits ? (agentTotalAudited - agentTotalErrors) : agentAccuracySum,
      agentEffCountQuality: agentHasAudits ? agentTotalAudited : agentAccuracyCount,
      activeAgentCount,
      uniqueDatesCount,
      totalExpectedHours,
      totalAgentHoursWorked,
    };
  }, [filteredEmployees, filteredLogs, employeeProcesses]);

  // ─── TEAM-RELATIVE PERFORMER RANKING (no employee may appear in both lists) ──
  // Employees are ranked within their own team (process group). Top 3 of a team
  // qualify for "Top 5 Star Performers" only; everyone else is eligible only for
  // the Bottom Quartile list if they fall in their team's bottom 25% band.
  const performerRanking = useMemo(() => {
    const ranked = [...calculatedStats.empMetrics].filter(e => e.totalTarget > 0);

    const byTeam = new Map<string, typeof ranked>();
    ranked.forEach(e => {
      const team = (e.process || 'N/A').trim() || 'N/A';
      if (!byTeam.has(team)) byTeam.set(team, []);
      byTeam.get(team)!.push(e);
    });

    const topEligible: typeof ranked = [];
    const bottomEligible: typeof ranked = [];

    byTeam.forEach(members => {
      const sorted = [...members].sort((a, b) => b.avgEfficiency - a.avgEfficiency);
      const bottomBandSize = Math.max(1, Math.ceil(sorted.length * 0.25));
      sorted.forEach((emp, idx) => {
        if (idx < 3) {
          // Top 3 of their team: star list only, never the bottom list
          topEligible.push(emp);
        } else if (idx >= sorted.length - bottomBandSize) {
          bottomEligible.push(emp);
        }
      });
    });

    return { topEligible, bottomEligible };
  }, [calculatedStats.empMetrics]);

  const top5 = useMemo(() => {
    return [...performerRanking.topEligible]
      .sort((a, b) => b.avgEfficiency - a.avgEfficiency)
      .slice(0, 5);
  }, [performerRanking]);

  const bottomQuartile = useMemo(() => {
    return [...performerRanking.bottomEligible]
      .sort((a, b) => a.avgEfficiency - b.avgEfficiency)
      .slice(0, 5);
  }, [performerRanking]);

  // Daily Trend calculation sorted chronologically
  const dynamicDailyTrend = useMemo(() => {
    const logsByDateMap: { [key: string]: { totalAchieved: number; totalTarget: number } } = {};
    filteredLogs.forEach(l => {
      const dateStr = l.date;
      if (!logsByDateMap[dateStr]) {
        logsByDateMap[dateStr] = { totalAchieved: 0, totalTarget: 0 };
      }
      logsByDateMap[dateStr].totalAchieved += l.achieved;
      logsByDateMap[dateStr].totalTarget += l.target;
    });

    return Object.keys(logsByDateMap)
      // Zero-activity dates (no achieved AND no target: holidays, unscheduled days)
      // are omitted from the trend series entirely
      .filter(dateStr => logsByDateMap[dateStr].totalAchieved > 0 || logsByDateMap[dateStr].totalTarget > 0)
      .sort()
      .map(dateStr => {
        let label = dateStr;
        try {
          const parts = dateStr.split('-');
          if (parts.length === 3) {
            const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const mShort = shortMonths[parseInt(parts[1], 10) - 1] || parts[1];
            label = `${mShort} ${parseInt(parts[2], 10)}`;
          }
        } catch {
          label = dateStr;
        }
        return {
          dateStr: label,
          rawDate: dateStr,
          totalAchieved: logsByDateMap[dateStr].totalAchieved,
          totalTarget: logsByDateMap[dateStr].totalTarget,
        };
      });
  }, [filteredLogs]);

  // Process Stats (Department grouping) for Radar and Bar charts
  const dynamicProcessStats = useMemo(() => {
    const processGroupMap: { [key: string]: { achieved: number; target: number; sumAcc: number; count: number } } = {};
    
    const ALLOWED_PROCESSES = [
      "Quality",
      "Team Production",
      "SB",
      "Payment Posting",
      "Extraction",
      "Denial Management",
      "AR Calling",
      "Others",
      "Iclaim EOB"
    ];

    const normalizeProcessName = (proc: string): string => {
      if (!proc) return 'Others';
      const pLower = proc.toLowerCase().trim();
      
      if (pLower === 'sb') return 'SB';
      if (pLower === 'payment posting' || pLower.includes('payment') || pLower.includes('posting')) return 'Payment Posting';
      if (pLower === 'extraction' || pLower.includes('extraction')) return 'Extraction';
      if (pLower === 'denial management' || pLower.includes('denial') || pLower.includes('aging')) return 'Denial Management';
      if (pLower === 'ar calling' || pLower.includes('ar calling') || pLower.includes('calling')) return 'AR Calling';
      if (pLower === 'iclaim eob' || pLower.includes('iclaim') || pLower.includes('eob')) return 'Iclaim EOB';
      if (pLower === 'quality' || pLower.includes('quality')) return 'Quality';
      if (pLower === 'team production' || pLower.includes('production')) return 'Team Production';
      
      return 'Others';
    };

    filteredLogs.forEach(l => {
      const p = normalizeProcessName(l.process);
      if (!processGroupMap[p]) {
        processGroupMap[p] = { achieved: 0, target: 0, sumAcc: 0, count: 0 };
      }
      processGroupMap[p].achieved += l.achieved;
      processGroupMap[p].target += l.target;
      processGroupMap[p].sumAcc += l.accuracy;
      processGroupMap[p].count += 1;
    });

    return ALLOWED_PROCESSES.map(procName => {
      const item = processGroupMap[procName] || { achieved: 0, target: 0, sumAcc: 0, count: 0 };
      const eff = item.target > 0 ? Math.round((item.achieved / item.target) * 10000) / 100 : 0;
      const acc = item.count > 0 ? Math.round((item.sumAcc / item.count) * 100) / 100 : 0;
      return {
        processName: procName,
        avgEfficiency: Math.min(eff, 150), 
        avgAccuracy: item.count > 0 ? acc : 0,
        rawEff: eff,
        totalAchieved: item.achieved,
        totalTarget: item.target,
        logCount: item.count,
      };
    }).filter(item => {
      // Suppress segments with no activity at all; in particular the "Others"
      // bucket must never appear when its accuracy AND efficiency are both zero
      if (item.totalTarget === 0 && item.totalAchieved === 0 && item.avgAccuracy === 0 && item.rawEff === 0) return false;
      return item.logCount > 0 || item.totalTarget > 0 || item.totalAchieved > 0;
    });
  }, [filteredLogs]);

  // ─── TENURE-BASED ANALYSIS (average metrics per tenure band) ───────────────
  const tenureAnalysis = useMemo(() => {
    const BANDS = [
      { label: '0-3 Months', min: 0, max: 3 },
      { label: '3-6 Months', min: 3, max: 6 },
      { label: '6-12 Months', min: 6, max: 12 },
      { label: '1+ Years', min: 12, max: Infinity },
    ];

    const bandData = BANDS.map(b => ({
      band: b.label,
      min: b.min,
      max: b.max,
      achieved: 0,
      target: 0,
      sumEff: 0,
      sumAcc: 0,
      count: 0,
    }));

    calculatedStats.empMetrics.forEach(m => {
      if (m.totalTarget <= 0) return; // only employees with real production scope
      const emp = activeEmployeesMap.get(m.empId.toUpperCase().trim());
      if (!emp) return;
      const months = getTenureMonths(emp.doj);
      if (months == null) return;
      const band = bandData.find(b => months >= b.min && months < b.max);
      if (!band) return;
      band.achieved += m.totalAchieved;
      band.target += m.totalTarget;
      band.sumEff += m.avgEfficiency;
      band.sumAcc += m.avgAccuracy;
      band.count += 1;
    });

    return bandData
      .filter(b => b.count > 0)
      .map(b => ({
        band: b.band,
        headcount: b.count,
        avgProductivity: Math.round((b.sumEff / b.count) * 100) / 100,
        avgQuality: Math.round((b.sumAcc / b.count) * 100) / 100,
        attainment: b.target > 0 ? Math.round((b.achieved / b.target) * 10000) / 100 : 0,
      }));
  }, [calculatedStats.empMetrics, activeEmployeesMap]);

  // ─── MODAL DETAIL SELECTION DRILL DOWN LIST ────────────────────────────────
  const modalList = useMemo(() => {
    switch (selectedCategory) {
      case 'HR Roster':
        return calculatedStats.empMetrics;
      case 'Support Staff':
        return calculatedStats.supportEmps.map(emp => {
          const m = calculatedStats.empMetrics.find(e => e.empId.toUpperCase().trim() === emp.empId.toUpperCase().trim());
          return m || {
            empId: emp.empId,
            name: emp.name,
            process: employeeProcesses.find(item => item.empId === emp.empId)?.processName || emp.designation || 'N/A',
            subProcess: employeeProcesses.find(item => item.empId === emp.empId)?.subProcessName || 'N/A',
            designation: emp.designation || 'N/A',
            reporting: emp.rm || 'N/A',
            status: emp.status || 'Active',
            avgEfficiency: 0,
            avgAccuracy: 0,
            totalAchieved: 0,
            totalTarget: 0,
            daysWorked: 0,
          };
        });
      case 'Supervisors & Managers':
        return calculatedStats.opsMgmtEmps.map(emp => {
          const m = calculatedStats.empMetrics.find(e => e.empId.toUpperCase().trim() === emp.empId.toUpperCase().trim());
          return m || {
            empId: emp.empId,
            name: emp.name,
            process: employeeProcesses.find(item => item.empId === emp.empId)?.processName || emp.designation || 'N/A',
            subProcess: employeeProcesses.find(item => item.empId === emp.empId)?.subProcessName || 'N/A',
            designation: emp.designation || 'N/A',
            reporting: emp.rm || 'N/A',
            status: emp.status || 'Active',
            avgEfficiency: 0,
            avgAccuracy: 0,
            totalAchieved: 0,
            totalTarget: 0,
            daysWorked: 0,
          };
        });
      case 'Productive Users':
        return calculatedStats.productiveEmps;
      case 'Non-productive Users':
        return calculatedStats.nonProductiveEmps;
      default:
        return [];
    }
  }, [selectedCategory, calculatedStats, employeeProcesses]);

  const filteredModalList = useMemo(() => {
    if (!modalSearch) return modalList;
    const s = modalSearch.toLowerCase().trim();
    return modalList.filter(e => {
      return (
        e.name.toLowerCase().includes(s) ||
        e.empId.toLowerCase().includes(s) ||
        (e.process || '').toLowerCase().includes(s) ||
        (e.subProcess || '').toLowerCase().includes(s) ||
        (e.designation || '').toLowerCase().includes(s) ||
        (e.reporting || '').toLowerCase().includes(s)
      );
    });
  }, [modalList, modalSearch]);

  const getEffColor = (v: number) => {
    if (v >= 100) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (v >= 80) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-rose-600 bg-rose-50 border-rose-100';
  };

  return (
    <div className="space-y-6" id="dashboard_view">
      
      {/* ─── BANNER CARD (DESIGN MATRICED FROM ATTACHED IMAGE SPECIFICATION) ───── */}
      <div 
        style={{ backgroundImage: 'linear-gradient(to right, #f2ab35 0%, #ec6b1e 50%, #cf5114 100%)' }}
        className="p-6 md:p-8 rounded-[28px] text-[#0f0701] shadow-lg border border-amber-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden transition-all duration-300"
      >
        <div className="absolute inset-0 bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:12px_12px] opacity-[0.07] pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 text-[#4e2504] font-black uppercase tracking-widest text-[9.5px] font-mono select-none">
            secured calculations engine
          </div>
          <h2 className="text-2xl md:text-[27px] font-black mt-2.5 tracking-tight text-[#0a0400]">
            Welcome, Administrator! 👋
          </h2>
          <div className="text-[11.5px] md:text-[12px] text-[#351904]/90 mt-2 md:mt-2.5 max-w-xl font-medium leading-relaxed font-sans">
           Here is today's company-wide production overview for Rusan. All calculations automatically exclude relieved and absconded users to ensure reporting accuracy.
          </div>
        </div>

        <div className="flex gap-4 relative shrink-0 w-full md:w-auto mt-2 md:mt-0 select-none">
          {/* Box 1: Overall Attainment */}
          <div className="border border-white/20 bg-white/10 backdrop-blur-sm px-5 py-4 rounded-2xl flex-1 md:flex-none min-w-[150px] shadow-sm flex flex-col justify-between">
            <div className="text-[9px] text-[#4d2303] font-extrabold uppercase tracking-wide font-mono">
              Overall Attainment
            </div>
            <div className="text-2xl font-black text-[#0f0701] mt-1.5 leading-none">
              {formatPercent(calculatedStats.overallAttainment)}
            </div>
          </div>

          {/* Box 2: Active Roster Quality */}
          <div className="border border-white/20 bg-white/10 backdrop-blur-sm px-5 py-4 rounded-2xl flex-1 md:flex-none min-w-[150px] shadow-sm flex flex-col justify-between">
            <div className="text-[9px] text-[#4d2303] font-extrabold uppercase tracking-wide font-mono">
              Active Roster Quality
            </div>
            <div className="text-2xl font-black text-[#0f0701] mt-1.5 leading-none">
              {formatPercent(calculatedStats.agentQualityPct || calculatedStats.avgAccuracy)}
            </div>
          </div>
        </div>
      </div>

      {/* ─── OPERATIONS CONTROL FILTERS PANEL ─────────────────────────────────── */}
      <div
        style={{ boxShadow: 'inset 0 0 40px rgba(0,0,0,0.08)' }}
        className="bg-white border border-slate-200 rounded-2xl p-5 relative"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-800">Operations Filters Panel</h3>
          </div>
          <button
            onClick={handleResetFilters}
            className="text-xs font-bold text-blue-600 hover:text-blue-850 flex items-center gap-1 cursor-pointer transition-all bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-100"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* 1. PMS */}
          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-mono">
              PMS
            </label>
            <select
              value={filterPms}
              onChange={e => setFilterPms(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-2 text-xs font-semibold outline-none text-slate-700 transition"
            >
              <option value="">All PMS</option>
              {uniquePmsValues.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* 2. Reporting Manager (includes RM, LM and RCM Manager roles) */}
          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-mono">
              Reporting Manager
            </label>
            <select
              value={filterReporting}
              onChange={e => handleReportingChange(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-2 text-xs font-semibold outline-none text-slate-700 transition"
            >
              <option value="">All Managers (RM / LM / RCM)</option>
              {uniqueReportingManagers.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* 3. Process Name */}
          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-mono">
              Process Name
            </label>
            <select
              value={filterProcess}
              onChange={e => handleProcessChange(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-2 text-xs font-semibold outline-none text-slate-700 transition"
            >
              <option value="">All Processes</option>
              {uniqueProcessNames.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* 4. Subprocess Name */}
          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-mono">
              Subprocess Name
            </label>
            <select
              value={filterSubProcess}
              onChange={e => handleSubProcessChange(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-2 text-xs font-semibold outline-none text-slate-700 transition"
            >
              <option value="">All Subprocesses</option>
              {uniqueSubProcessNames.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* 5. Employee Name */}
          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-mono">
              Employee Name
            </label>
            <select
              value={filterEmpName}
              onChange={e => handleEmpNameChange(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-2 text-xs font-semibold outline-none text-slate-700 transition"
            >
              <option value="">All Employees</option>
              {uniqueNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* 6. Employee ID */}
          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-mono">
              Employee ID
            </label>
            <select
              value={filterEmpId}
              onChange={e => handleEmpIdChange(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-2 text-xs font-semibold outline-none text-slate-700 transition"
            >
              <option value="">All IDs</option>
              {uniqueEmpIds.map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>

          {/* 7. Start Date (disabled while a Month is selected) */}
          <div className="flex flex-col gap-1">
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-mono">
              Start Date
            </label>
            <input
              type="date"
              value={filterStartDate}
              disabled={isDateRangeDisabled}
              title={isDateRangeDisabled ? 'Clear the Month filter to use a date range' : undefined}
              onChange={e => setFilterStartDate(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none text-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* 8. End Date (disabled while a Month is selected) */}
          <div className="flex flex-col gap-1">
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-mono">
              End Date
            </label>
            <input
              type="date"
              value={filterEndDate}
              disabled={isDateRangeDisabled}
              title={isDateRangeDisabled ? 'Clear the Month filter to use a date range' : undefined}
              onChange={e => setFilterEndDate(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none text-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* 9. Month (disabled while a Start/End date is entered) */}
          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-mono">
              Month
            </label>
            <select
              value={filterMonth}
              disabled={isMonthDisabled}
              title={isMonthDisabled ? 'Clear the date range to use the Month filter' : undefined}
              onChange={e => setFilterMonth(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-2 text-xs font-semibold outline-none text-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">All Months</option>
              {uniqueMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── DYNAMIC OVERVIEW CARDS (CLICKABLE COUPLING TO DIALOG) ───────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="overview_drill_cards">
        
        {/* Card 1: Total Employees as per HR */}
        <button
          onClick={() => { setSelectedCategory('HR Roster'); setModalSearch(''); }}
          className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md hover:border-indigo-300 hover:ring-2 hover:ring-indigo-100 text-left transition-all group select-none cursor-pointer"
        >
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition">
            <Users size={24} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase font-mono">Total Employees (HR)</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{calculatedStats.totalEmployees}</div>
            <div className="text-[9px] text-indigo-600 mt-1 font-bold flex items-center gap-1 uppercase tracking-wide">
              <Eye size={10} /> Click to drill-down
            </div>
          </div>
        </button>

        {/* Card 2: Support Staff */}
        <button
          onClick={() => { setSelectedCategory('Support Staff'); setModalSearch(''); }}
          className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md hover:border-teal-300 hover:ring-2 hover:ring-teal-100 text-left transition-all group select-none cursor-pointer"
        >
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl border border-teal-100 group-hover:bg-teal-600 group-hover:text-white transition">
            <Building size={24} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase font-mono">Support Staff</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{calculatedStats.supportEmps.length}</div>
            <div className="text-[9px] text-teal-600 mt-1 font-bold flex items-center gap-1 uppercase tracking-wide">
              <Eye size={10} /> View breakdown
            </div>
          </div>
        </button>

        {/* Card 3: Operation Supervisors & Managers */}
        <button
          onClick={() => { setSelectedCategory('Supervisors & Managers'); setModalSearch(''); }}
          className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md hover:border-purple-300 hover:ring-2 hover:ring-purple-100 text-left transition-all group select-none cursor-pointer"
        >
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl border border-purple-100 group-hover:bg-purple-600 group-hover:text-white transition">
            <Briefcase size={24} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase font-mono">Sup / Managers</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{calculatedStats.opsMgmtEmps.length}</div>
            <div className="text-[9px] text-purple-600 mt-1 font-bold flex items-center gap-1 uppercase tracking-wide">
              <Eye size={10} /> View details
            </div>
          </div>
        </button>

        {/* Card 4: Productive Users */}
        <button
          onClick={() => { setSelectedCategory('Productive Users'); setModalSearch(''); }}
          className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md hover:border-emerald-300 hover:ring-2 hover:ring-emerald-100 text-left transition-all group select-none cursor-pointer"
         >
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition">
            <Zap size={24} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase font-mono">Productive Users</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{calculatedStats.productiveEmps.length}</div>
            <div className="text-[9px] text-emerald-600 mt-1 font-bold flex items-center gap-1 uppercase tracking-wide">
              <Eye size={10} /> Active logged
            </div>
          </div>
        </button>

        {/* Card 5: Non-productive Users */}
        <button
          onClick={() => { setSelectedCategory('Non-productive Users'); setModalSearch(''); }}
          className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md hover:border-rose-300 hover:ring-2 hover:ring-rose-100 text-left transition-all group select-none cursor-pointer"
        >
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 group-hover:bg-rose-600 group-hover:text-white transition">
            <HelpCircle size={24} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase font-mono">Non-Productive</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{calculatedStats.nonProductiveEmps.length}</div>
            <div className="text-[9px] text-rose-600 mt-1 font-bold flex items-center gap-1 uppercase tracking-wide">
              <Eye size={10} /> View list
            </div>
          </div>
        </button>

      </div>

      {/* ─── GENERAL METRIC CARDS OVERVIEW (REQUIRED CUSTOM AGENT KPIs) ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4" id="kpi_metric_cards">
        {/* KPI 1: Avg Daily Production */}
        <button
          onClick={() => setSelectedFormulaMetric('Avg Daily Prod')}
          className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col justify-between shadow-sm hover:border-indigo-300 hover:ring-2 hover:ring-indigo-100 transition-all text-left cursor-pointer group select-none outline-none"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide font-mono">Avg Daily Prod</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition">
              <Activity size={14} />
            </div>
          </div>
          <div className="mt-2 w-full">
            <div className="text-lg font-black text-slate-900">{calculatedStats.avgDailyProduction}</div>
            <div className="text-[9px] text-slate-400 mt-1 font-semibold">Units / day (Agents only)</div>
            <div className="text-[8px] text-indigo-600 mt-1.5 font-bold uppercase tracking-wider flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition duration-150">
              <Eye size={10} /> View Breakdown
            </div>
          </div>
        </button>

        {/* KPI 2: Avg Weekly Production */}
        <button
          onClick={() => setSelectedFormulaMetric('Avg Weekly Prod')}
          className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col justify-between shadow-sm hover:border-teal-300 hover:ring-2 hover:ring-teal-100 transition-all text-left cursor-pointer group select-none outline-none"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide font-mono">Avg Weekly Prod</span>
            <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg group-hover:bg-teal-600 group-hover:text-white transition">
              <Calendar size={14} />
            </div>
          </div>
          <div className="mt-2 w-full">
            <div className="text-lg font-black text-slate-900">{calculatedStats.avgWeeklyProduction}</div>
            <div className="text-[9px] text-slate-400 mt-1 font-semibold">6-day cycle projection</div>
            <div className="text-[8px] text-teal-600 mt-1.5 font-bold uppercase tracking-wider flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition duration-150">
              <Eye size={10} /> View Breakdown
            </div>
          </div>
        </button>

        {/* KPI 3: Productivity % */}
        <button
          onClick={() => setSelectedFormulaMetric('Productivity %')}
          className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col justify-between shadow-sm hover:border-amber-300 hover:ring-2 hover:ring-amber-100 transition-all text-left cursor-pointer group select-none outline-none"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide font-mono">Productivity %</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition">
              <Zap size={14} />
            </div>
          </div>
          <div className="mt-2 w-full">
            <div className="text-lg font-black text-slate-900">{formatPercent(calculatedStats.agentProductivityPct)}</div>
            <div className="text-[9px] text-amber-600 mt-1 font-extrabold font-mono uppercase tracking-wide">Scaled to hours worked</div>
            <div className="text-[8px] text-amber-600 mt-1.5 font-bold uppercase tracking-wider flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition duration-150">
              <Eye size={10} /> View Breakdown
            </div>
          </div>
        </button>

        {/* KPI 4: Quality % */}
        <button
          onClick={() => setSelectedFormulaMetric('Quality %')}
          className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col justify-between shadow-sm hover:border-emerald-300 hover:ring-2 hover:ring-emerald-100 transition-all text-left cursor-pointer group select-none outline-none"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide font-mono">Quality %</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition">
              <Percent size={14} />
            </div>
          </div>
          <div className="mt-2 w-full">
            <div className="text-lg font-black text-emerald-600">{formatPercent(calculatedStats.agentQualityPct)}</div>
            <div className="text-[9px] text-slate-400 mt-1 font-semibold">Accuracy threshold: 95%</div>
            <div className="text-[8px] text-emerald-600 mt-1.5 font-bold uppercase tracking-wider flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition duration-150">
              <Eye size={10} /> View Breakdown
            </div>
          </div>
        </button>

        {/* KPI 5: Shrinkage % */}
        <button
          onClick={() => setSelectedFormulaMetric('Shrinkage %')}
          className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col justify-between shadow-sm hover:border-rose-300 hover:ring-2 hover:ring-rose-100 transition-all text-left cursor-pointer group select-none outline-none"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide font-mono">Shrinkage %</span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-rose-600 group-hover:text-white transition">
              <TrendingDown size={14} />
            </div>
          </div>
          <div className="mt-2 w-full">
            <div className="text-lg font-black text-rose-600">{formatPercent(calculatedStats.shrinkagePct)}</div>
            <div className="text-[9px] text-slate-400 mt-1 font-semibold">Lost vs Scheduled time</div>
            <div className="text-[8px] text-rose-600 mt-1.5 font-bold uppercase tracking-wider flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition duration-150">
              <Eye size={10} /> View Breakdown
            </div>
          </div>
        </button>

        {/* KPI 6: Hours Shortfall */}
        <button
          onClick={() => setSelectedFormulaMetric('Hours Shortfall')}
          className="bg-white border border-slate-200/80 p-4 rounded-2xl flex flex-col justify-between shadow-sm hover:border-slate-400 hover:ring-2 hover:ring-slate-100 transition-all text-left cursor-pointer group select-none outline-none"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide font-mono">Hours Shortfall</span>
            <div className="p-1.5 bg-slate-50 text-slate-600 rounded-lg group-hover:bg-slate-600 group-hover:text-white transition">
              <Target size={14} />
            </div>
          </div>
          <div className="mt-2 w-full">
            <div className="text-lg font-black text-indigo-950">{calculatedStats.hoursShortfall.toLocaleString()} hrs</div>
            <div className="text-[9px] text-slate-400 mt-1 font-semibold">Deficit capacity (total)</div>
            <div className="text-[8px] text-slate-600 mt-1.5 font-bold uppercase tracking-wider flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition duration-150">
              <Eye size={10} /> View Breakdown
            </div>
          </div>
        </button>
      </div>

      {/* ─── CHARTS AREA (CHRONOLOGICAL/toggle) ─────────────────────────────── */}
      {/* Charts are omitted entirely (no empty shells) when there is no achieved/target activity in scope */}
      {(dynamicDailyTrend.length > 0 || dynamicProcessStats.length > 0) && (
      <div className="grid grid-cols-1 gap-6" id="dashboard_visual_charts">

        {/* Daily Production Trend Chart (Understandable Line Trend) */}
        {dynamicDailyTrend.length > 0 && (
        <div
          onClick={() => openChartExplanation("Daily Production Trend")}
          className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm cursor-pointer transition-all hover:border-indigo-400 hover:shadow-md hover:ring-2 hover:ring-indigo-50"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-600" /> Daily Production Trend
                <button
                  onClick={(e) => { e.stopPropagation(); openChartExplanation("Daily Production Trend"); }}
                  className="text-slate-400 hover:text-indigo-600 p-1 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition flex items-center gap-1 text-[10px] font-bold"
                  title="Explain Calculation"
                >
                  <HelpCircle size={12} />
                  <span className="sr-only sm:not-sr-only">Explain Math</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setExpandedChart('trend'); }}
                  className="text-slate-400 hover:text-indigo-600 p-1 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition flex items-center gap-1 text-[10px] font-bold"
                  title="Expand to full-size view"
                >
                  <Maximize2 size={12} />
                  <span className="sr-only sm:not-sr-only">Expand</span>
                </button>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Chronologically ordered volume tracking against daily base targets</p>
            </div>
            <span className="text-[9px] font-mono px-2 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-750 font-bold">
              {dynamicDailyTrend.length} Days Tracked
            </span>
          </div>

          <div className="h-[260px] w-full">
            {dynamicDailyTrend.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 font-medium text-xs border border-dashed border-slate-200 rounded-xl">
                No logs recorded inside target filtered criteria.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dynamicDailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendColorAchieved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="trendColorTarget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" />
                  <XAxis dataKey="dateStr" stroke="#64748b" fontSize={9} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#1e293b',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    }}
                  />
                  <Legend iconSize={8} style={{ fontSize: '10px' }} />
                  <Area
                    name="Achieved Volume"
                    type="monotone"
                    dataKey="totalAchieved"
                    stroke="#4f46e5"
                    fillOpacity={1}
                    fill="url(#trendColorAchieved)"
                    strokeWidth={2}
                  />
                  <Area
                    name="Target Goal"
                    type="monotone"
                    dataKey="totalTarget"
                    stroke="#94a3b8"
                    fillOpacity={1}
                    fill="url(#trendColorTarget)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        )}

        {/* Process Performance Profile (Grouped Bar Chart toggle) */}
        {dynamicProcessStats.length > 0 && (
        <div
          onClick={() => openChartExplanation("Process Performance Profile")}
          className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm cursor-pointer transition-all hover:border-emerald-400 hover:shadow-md hover:ring-2 hover:ring-emerald-50"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers size={16} className="text-emerald-600" /> Process Performance Profile
                <button
                  onClick={(e) => { e.stopPropagation(); openChartExplanation("Process Performance Profile"); }}
                  className="text-slate-400 hover:text-emerald-600 p-1 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition flex items-center gap-1 text-[10px] font-bold"
                  title="Explain Calculation"
                >
                  <HelpCircle size={12} />
                  <span className="sr-only sm:not-sr-only">Explain Math</span>
                </button>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Comparative analytics of departments/processes</p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={(e) => { e.stopPropagation(); setChartType('bar'); }}
                  className={`px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-md transition-all cursor-pointer ${
                    chartType === 'bar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Bar view
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setChartType('radar'); }}
                  className={`px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-md transition-all cursor-pointer ${
                    chartType === 'radar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Radar
                </button>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setExpandedChart('process'); }}
                className="text-slate-400 hover:text-emerald-600 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition"
                title="Expand to full-size view"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          </div>

          <div className="h-[260px] w-full flex items-center justify-center">
            {dynamicProcessStats.length === 0 ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 font-medium text-xs border border-dashed border-slate-200 rounded-xl">
                No process logs matched filter query.
              </div>
            ) : chartType === 'bar' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dynamicProcessStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" />
                  <XAxis dataKey="processName" stroke="#64748b" fontSize={9} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={9} tickLine={false} domain={[0, 150]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#1e293b',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    }}
                  />
                  <Legend iconSize={8} style={{ fontSize: '10px' }} />
                  <Bar dataKey="avgEfficiency" name="Efficiency %" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar dataKey="avgAccuracy" name="Accuracy %" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={dynamicProcessStats}>
                  <PolarGrid stroke="rgba(0,0,0,0.04)" />
                  <PolarAngleAxis dataKey="processName" stroke="#475569" fontSize={8} />
                  <PolarRadiusAxis stroke="#64748b" fontSize={8} angle={30} domain={[0, 150]} />
                  <Radar
                    name="Efficiency %"
                    dataKey="avgEfficiency"
                    stroke="#4f46e5"
                    fill="#4f46e5"
                    fillOpacity={0.15}
                  />
                  <Radar
                    name="Accuracy %"
                    dataKey="avgAccuracy"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.1}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#1e293b',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    }}
                  />
                  <Legend iconSize={8} style={{ fontSize: '10px' }} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        )}

      </div>
      )}

      {/* ─── DYNAMIC RANKED STAR & COACHING PATHWAY LISTS ─────────────────────── */}
      {/* An employee never appears in both lists; when a single-employee filter is
          active only the ONE list relevant to that employee's team rank renders. */}
      {(top5.length > 0 || bottomQuartile.length > 0) && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="ranked_perf_lists">

        {/* Top 5 Star Performers */}
        {top5.length > 0 && (
        <div
          onClick={() => openChartExplanation("Top 5 Star Performers")}
          className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm cursor-pointer transition-all hover:border-amber-400 hover:shadow-md hover:ring-2 hover:ring-amber-50"
        >
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Trophy size={16} className="text-amber-500" /> Top 5 Star Performers
              <button
                onClick={(e) => { e.stopPropagation(); openChartExplanation("Top 5 Star Performers"); }}
                className="text-slate-400 hover:text-amber-600 p-1 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition flex items-center gap-1 text-[10px] font-bold"
                title="Explain Calculation"
              >
                <HelpCircle size={12} />
                <span className="sr-only sm:not-sr-only">Explain Math</span>
              </button>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Employees displaying elite average efficiency ratios</p>
          </div>
          <div className="h-[200px] w-full">
            {top5.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                No high performers captured in current range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top5} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={9} tickLine={false} domain={[0, 130]} />
                  <YAxis dataKey="name" type="category" stroke="#475569" fontSize={9} tickLine={false} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#1e293b',
                    }}
                  />
                  <Bar dataKey="avgEfficiency" name="Efficiency %" radius={[0, 4, 4, 0]} barSize={16}>
                    {top5.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#10b981" fillOpacity={0.8 - index * 0.12} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        )}

        {/* Bottom Quartile Performers */}
        {bottomQuartile.length > 0 && (
        <div
          onClick={() => openChartExplanation("Bottom Quartile Performers (Bottom 25%) - Top 5 Only")}
          className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm cursor-pointer transition-all hover:border-rose-400 hover:shadow-md hover:ring-2 hover:ring-rose-50"
        >
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingDown size={16} className="text-rose-655" /> Bottom Quartile Performers (Bottom 25%) - Top 5 Only
              <button
                onClick={(e) => { e.stopPropagation(); openChartExplanation("Bottom Quartile Performers (Bottom 25%) - Top 5 Only"); }}
                className="text-slate-400 hover:text-rose-600 p-1 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition flex items-center gap-1 text-[10px] font-bold"
                title="Explain Calculation"
              >
                <HelpCircle size={12} />
                <span className="sr-only sm:not-sr-only">Explain Math</span>
              </button>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Top 5 lowest-efficiency employees in bottom 25% band</p>
          </div>
          <div className="h-[200px] w-full">
            {bottomQuartile.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                No performance shortfall captured. All users at optimal levels.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bottomQuartile} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={9} tickLine={false} domain={[0, 130]} />
                  <YAxis dataKey="name" type="category" stroke="#475569" fontSize={9} tickLine={false} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#1e293b',
                    }}
                  />
                  <Bar dataKey="avgEfficiency" name="Efficiency %" radius={[0, 4, 4, 0]} barSize={16}>
                    {bottomQuartile.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#f43f5e" fillOpacity={0.8 - (index % 5) * 0.11} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        )}

      </div>
      )}

      {/* ─── TENURE-BASED ANALYSIS (average metrics per tenure band) ──────────── */}
      {tenureAnalysis.length > 0 && (
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm" id="tenure_analysis_panel">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock size={16} className="text-purple-600" /> Tenure Analysis
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Average productivity, quality and attainment grouped by employee tenure band
            </p>
          </div>
          <span className="text-[9px] font-mono px-2 py-1 bg-purple-50 border border-purple-100 rounded-lg text-purple-700 font-bold">
            {tenureAnalysis.reduce((s, b) => s + b.headcount, 0)} Employees Banded
          </span>
        </div>

        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tenureAnalysis} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" />
              <XAxis dataKey="band" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
              <Tooltip
                formatter={(value: number) => `${Number(value).toFixed(2)}%`}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderRadius: '12px',
                  fontSize: '11px',
                  color: '#1e293b',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                }}
              />
              <Legend iconSize={8} style={{ fontSize: '10px' }} />
              <Bar dataKey="avgProductivity" name="Avg Productivity %" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={18} />
              <Bar dataKey="avgQuality" name="Avg Quality %" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />
              <Bar dataKey="attainment" name="Attainment %" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {tenureAnalysis.map(b => (
            <div key={b.band} className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
              <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide font-mono">{b.band}</div>
              <div className="text-sm font-black text-slate-800 mt-1">{b.headcount} staff</div>
              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                Attainment: <span className="font-mono font-bold text-indigo-600">{formatPercent(b.attainment)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* ─── EXPANDED LARGE BOX VIEW MODAL ────────────────────────────────────── */}
      {selectedCategory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                  <Eye className="text-indigo-600" size={20} />
                  <span>{selectedCategory} Breakdown</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed roster of employees belonging to {selectedCategory} category (Filtered matching: {filteredModalList.length} of {modalList.length})
                </p>
              </div>
              <button
                onClick={() => setSelectedCategory(null)}
                className="w-10 h-10 rounded-full hover:bg-slate-200 border border-slate-200/60 flex items-center justify-center text-slate-500 hover:text-slate-900 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Search Section */}
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Query specific employee by name, ID, platform or designation..."
                  value={modalSearch}
                  onChange={e => setModalSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold outline-none text-slate-700 transition"
                />
                {modalSearch && (
                  <button
                    onClick={() => setModalSearch('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="text-[10px] text-slate-500 font-bold uppercase font-mono tracking-wider flex items-center gap-1.5 select-none">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
                <span>Showing {filteredModalList.length} Results</span>
              </div>
            </div>

            {/* Modal Table Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {filteredModalList.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                  <Users className="mx-auto text-slate-200 mb-3" size={48} />
                  <p className="text-sm font-semibold text-slate-600">No matching employees found</p>
                  <p className="text-xs text-slate-400 mt-1">Try relaxing your search phrase or dashboard filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm">
                  <table className="w-full text-left border-collapse bg-white">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-mono">
                        <th className="py-3.5 px-4 font-mono">EMP Code</th>
                        <th className="py-3.5 px-4">Name</th>
                        <th className="py-3.5 px-4">Department</th>
                        <th className="py-3.5 px-4">Platform</th>
                        <th className="py-3.5 px-4">Designation</th>
                        <th className="py-3.5 px-4">Reporting Manager</th>
                        {selectedCategory.includes('Productive') && (
                          <>
                            <th className="py-3.5 px-4 text-center">Volume Attained</th>
                            <th className="py-3.5 px-4 text-center">Avg Efficiency</th>
                          </>
                        )}
                        <th className="py-3.5 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-semibold">
                      {filteredModalList.map(e => (
                        <tr key={e.empId} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono text-slate-500 font-bold">{e.empId}</td>
                          <td className="py-3 px-4 font-bold text-slate-800">{e.name}</td>
                          <td className="py-3 px-3"><span className="px-2 py-0.5 bg-slate-100 rounded-md text-slate-600 font-medium uppercase font-mono text-[9px]">{e.process}</span></td>
                          <td className="py-3 px-4 text-slate-600">{e.subProcess}</td>
                          <td className="py-3 px-4 text-slate-500 font-medium">{e.designation}</td>
                          <td className="py-3 px-4 text-slate-600 font-medium">{e.reporting}</td>
                          {selectedCategory.includes('Productive') && (
                            <>
                              <td className="py-3 px-4 text-center font-bold text-indigo-700">{e.totalAchieved.toLocaleString()}</td>
                              <td className="py-3 px-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${getEffColor(e.avgEfficiency)}`}>
                                  {formatPercent(e.avgEfficiency)}
                                </span>
                              </td>
                            </>
                          )}
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              e.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              e.status === 'Notice' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                              'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            }`}>
                              {e.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-[10px] text-slate-400 font-bold uppercase font-mono tracking-wider">
                RMCB Operational Intelligence Console
              </span>
              <button
                onClick={() => setSelectedCategory(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ─── DYNAMIC FORMULA CALCULATION DRILLDOWN MODAL ────────────────────── */}
      {selectedFormulaMetric && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Percent className="text-indigo-600 animate-pulse" size={20} />
                <div>
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide font-mono">
                    Calculation Detail: {selectedFormulaMetric}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                    Dynamic proof derived from active filter parameters
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFormulaMetric(null)}
                className="text-slate-400 hover:text-slate-600 p-1 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              
              {/* Formula Panel */}
              <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl border border-slate-850 font-mono shadow-inner relative overflow-hidden">
                <div className="absolute right-3 top-3 text-[9px] uppercase tracking-wider font-black text-slate-750 select-none">
                  Mathematical Model
                </div>
                <div className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest mb-1">
                  Formula Applied
                </div>
                <div className="text-sm font-black text-white leading-relaxed">
                  {selectedFormulaMetric === 'Avg Daily Prod' && (
                    <span>Avg Daily Production = (Agent Total Achieved Claims) / (Agent Days Logged)</span>
                  )}
                  {selectedFormulaMetric === 'Avg Weekly Prod' && (
                    <span>Avg Weekly Production = (Avg Daily Prod) × 6-day cycle</span>
                  )}
                  {selectedFormulaMetric === 'Productivity %' && (
                    <span>Productivity % = Average of (Daily Achieved Claim Volume / Hours-Scaled Target) × 100</span>
                  )}
                  {selectedFormulaMetric === 'Quality %' && (
                    <span>Quality % = (Sum of Active Agent Quality Ratings) / (Total Evaluated Days Count)</span>
                  )}
                  {selectedFormulaMetric === 'Shrinkage %' && (
                    <span>Shrinkage % = (Hours Shortfall / Expected Scheduled Capacity) × 100</span>
                  )}
                  {selectedFormulaMetric === 'Hours Shortfall' && (
                    <span>Hours Shortfall = Max(0, Expected Capacity - Actual Hours Worked)</span>
                  )}
                </div>
                <div className="text-[9px] text-slate-500 mt-3 border-t border-slate-800/80 pt-2 font-sans italic">
                  * Note: Consistent with process policy, management, SMEs, and trainers are automatically filtered out from core agent-level productivity metrics. Daily targets scale proportionally to the hours actually worked: (hours worked ÷ standard hours) × standard target — applied to Saturdays and any other partial-worked day.
                </div>
              </div>

              {/* Step-by-Step Evaluation */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest font-mono border-b border-slate-100 pb-1.5">
                  Filtered Input Ledger & Proof
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  
                  {/* Left Column: Input Variables */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-2.5">
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider font-mono block mb-1">
                      Computed Subset Values
                    </span>
                    
                    {selectedFormulaMetric === 'Avg Daily Prod' && (
                      <>
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-500">Agent Total Achieved:</span>
                          <span className="font-mono font-bold text-slate-800">{(calculatedStats.agentTotalAchieved || 0).toLocaleString()} units</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-500">Agent Days Logged:</span>
                          <span className="font-mono font-bold text-slate-800">{calculatedStats.agentDaysLogged || 0} days</span>
                        </div>
                      </>
                    )}

                    {selectedFormulaMetric === 'Avg Weekly Prod' && (
                      <>
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-500">Avg Daily Prod:</span>
                          <span className="font-mono font-bold text-slate-800">{calculatedStats.avgDailyProduction || 0} units/day</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-500">Projected Cycle:</span>
                          <span className="font-mono font-bold text-slate-800">6 days</span>
                        </div>
                      </>
                    )}

                    {selectedFormulaMetric === 'Productivity %' && (
                      <>
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-500">Sum of Daily Efficiencies:</span>
                          <span className="font-mono font-bold text-slate-800">{Math.round(calculatedStats.agentSumEff || 0).toLocaleString()}%</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-500">Evaluated Days Count:</span>
                          <span className="font-mono font-bold text-slate-800">{calculatedStats.agentEffCount || 0} days</span>
                        </div>
                      </>
                    )}

                    {selectedFormulaMetric === 'Quality %' && (
                      <>
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-500">Sum of Quality Ratings:</span>
                          <span className="font-mono font-bold text-slate-800">{Math.round(calculatedStats.agentSumAcc || 0).toLocaleString()}%</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-500">Evaluated Days Count:</span>
                          <span className="font-mono font-bold text-slate-800">{calculatedStats.agentEffCount || 0} days</span>
                        </div>
                      </>
                    )}

                    {selectedFormulaMetric === 'Shrinkage %' && (
                      <>
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-500">Hours Shortfall Deficit:</span>
                          <span className="font-mono font-bold text-slate-800">{(calculatedStats.hoursShortfall || 0).toLocaleString()} hrs</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-500">Expected Scheduled Hours:</span>
                          <span className="font-mono font-bold text-slate-800">{(calculatedStats.totalExpectedHours || 0).toLocaleString()} hrs</span>
                        </div>
                        <div className="flex justify-between font-medium text-[10px] pt-1.5 border-t border-slate-200">
                          <span className="text-slate-400">Scheduled basis:</span>
                          <span className="text-slate-500 font-bold">{calculatedStats.activeAgentCount || 0} agents × {calculatedStats.uniqueDatesCount || 0} days × 8h</span>
                        </div>
                      </>
                    )}

                    {selectedFormulaMetric === 'Hours Shortfall' && (
                      <>
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-500">Expected Scheduled Hours:</span>
                          <span className="font-mono font-bold text-slate-800">{(calculatedStats.totalExpectedHours || 0).toLocaleString()} hrs</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-500">Actual Hours Worked:</span>
                          <span className="font-mono font-bold text-slate-800">{(calculatedStats.totalAgentHoursWorked || 0).toLocaleString()} hrs</span>
                        </div>
                        <div className="flex justify-between font-medium text-[10px] pt-1.5 border-t border-slate-200">
                          <span className="text-slate-400">Scheduled basis:</span>
                          <span className="text-slate-500 font-bold">{calculatedStats.activeAgentCount || 0} agents × {calculatedStats.uniqueDatesCount || 0} days × 8h</span>
                        </div>
                      </>
                    )}

                  </div>

                  {/* Right Column: Execution Proof */}
                  <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] text-indigo-500 font-black uppercase tracking-wider font-mono block mb-1">
                        Active Equation Resolve
                      </span>
                      
                      <div className="mt-3 space-y-2">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Resolve step:</span>
                        <div className="bg-white border border-indigo-100 px-3 py-2 rounded-lg font-mono font-bold text-slate-800 text-center shadow-xs">
                          {selectedFormulaMetric === 'Avg Daily Prod' && (
                            <span>{(calculatedStats.agentTotalAchieved || 0).toLocaleString()} ÷ {calculatedStats.agentDaysLogged || 0} = {calculatedStats.avgDailyProduction || 0}</span>
                          )}
                          {selectedFormulaMetric === 'Avg Weekly Prod' && (
                            <span>{calculatedStats.avgDailyProduction || 0} × 6 = {calculatedStats.avgWeeklyProduction || 0}</span>
                          )}
                          {selectedFormulaMetric === 'Productivity %' && (
                            <span>{Math.round(calculatedStats.agentSumEff || 0).toLocaleString()}% ÷ {calculatedStats.agentEffCount || 0} = {formatPercent(calculatedStats.agentProductivityPct)}</span>
                          )}
                          {selectedFormulaMetric === 'Quality %' && (
                            <span>{Math.round(calculatedStats.agentSumAcc || 0).toLocaleString()}% ÷ {calculatedStats.agentEffCount || 0} = {formatPercent(calculatedStats.agentQualityPct)}</span>
                          )}
                          {selectedFormulaMetric === 'Shrinkage %' && (
                            <span>({(calculatedStats.hoursShortfall || 0).toLocaleString()} ÷ {(calculatedStats.totalExpectedHours || 0).toLocaleString()}) × 100 = {formatPercent(calculatedStats.shrinkagePct)}</span>
                          )}
                          {selectedFormulaMetric === 'Hours Shortfall' && (
                            <span>Max(0, {(calculatedStats.totalExpectedHours || 0).toLocaleString()} - {(calculatedStats.totalAgentHoursWorked || 0).toLocaleString()}) = {calculatedStats.hoursShortfall || 0} hrs</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-indigo-100/50">
                      <div className="text-[11px] font-black text-indigo-950 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                        Proof Value Matches: {' '}
                        {selectedFormulaMetric === 'Avg Daily Prod' && <span>{calculatedStats.avgDailyProduction || 0} claims/day</span>}
                        {selectedFormulaMetric === 'Avg Weekly Prod' && <span>{calculatedStats.avgWeeklyProduction || 0} claims/week</span>}
                        {selectedFormulaMetric === 'Productivity %' && <span>{formatPercent(calculatedStats.agentProductivityPct)}</span>}
                        {selectedFormulaMetric === 'Quality %' && <span>{formatPercent(calculatedStats.agentQualityPct)}</span>}
                        {selectedFormulaMetric === 'Shrinkage %' && <span>{formatPercent(calculatedStats.shrinkagePct)}</span>}
                        {selectedFormulaMetric === 'Hours Shortfall' && <span>{(calculatedStats.hoursShortfall || 0).toLocaleString()} hrs</span>}
                      </div>
                    </div>

                  </div>

                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-[10px] text-slate-400 font-bold uppercase font-mono tracking-wider">
                Formula Transparency Proof Console
              </span>
              <button
                onClick={() => setSelectedFormulaMetric(null)}
                className="bg-slate-900 hover:bg-slate-850 text-white font-black text-xs px-4 py-2 rounded-xl cursor-pointer transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CHART EXPLANATION MODAL ─────────────────────────────────────── */}
      {selectedChartExplanation && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className={`bg-white rounded-3xl border border-slate-200 shadow-2xl w-full ${chartModalTab === 'breakdown' ? 'max-w-4xl' : 'max-w-2xl'} overflow-hidden animate-in fade-in zoom-in duration-150`}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <HelpCircle className="text-indigo-600 animate-pulse" size={20} />
                <div>
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide font-mono">
                    Chart Method: {selectedChartExplanation}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                    Underlying mathematical formula & current data aggregation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedChartExplanation(null)}
                className="text-slate-400 hover:text-slate-600 p-1 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Segmented Tab Bar */}
            <div className="px-6 py-2 border-b border-slate-100 bg-slate-50/50 flex gap-4">
              <button
                onClick={() => setChartModalTab('breakdown')}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer ${
                  chartModalTab === 'breakdown'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                📊 Detailed Data Breakdown
              </button>
              <button
                onClick={() => setChartModalTab('formula')}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer ${
                  chartModalTab === 'formula'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                🧮 Calculation Formula
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {chartModalTab === 'breakdown' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-400 font-black uppercase font-mono tracking-wider">
                      {selectedChartExplanation} Breakdown ({
                        selectedChartExplanation === 'Daily Production Trend' ? `${dynamicDailyTrend.length} Days` :
                        selectedChartExplanation === 'Process Performance Profile' ? `${dynamicProcessStats.length} Processes` :
                        selectedChartExplanation === 'Top 5 Star Performers' ? `${top5.length} Elite Staff` :
                        selectedChartExplanation === 'Bottom Quartile Performers (Bottom 25%) - Top 5 Only' ? `${bottomQuartile.length} Outlier Staff` : ''
                      })
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                    <table className="w-full text-left border-collapse bg-white text-xs">
                      {selectedChartExplanation === 'Daily Production Trend' && (
                        <>
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-mono">
                              <th className="py-3 px-4">Date</th>
                              <th className="py-3 px-4 text-right">Achieved Volume</th>
                              <th className="py-3 px-4 text-right">Target Goal</th>
                              <th className="py-3 px-4 text-center">Attainment %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                            {dynamicDailyTrend.map((e, idx) => {
                              const attainment = e.totalTarget > 0 ? (e.totalAchieved / e.totalTarget) * 100 : 100;
                              return (
                                <tr key={idx} className="hover:bg-slate-50/70 transition">
                                  <td className="py-2.5 px-4 font-mono font-bold text-slate-600">{e.dateStr}</td>
                                  <td className="py-2.5 px-4 text-right font-bold text-indigo-600">{e.totalAchieved.toLocaleString()}</td>
                                  <td className="py-2.5 px-4 text-right text-slate-500">{e.totalTarget.toLocaleString()}</td>
                                  <td className="py-2.5 px-4 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                                      attainment >= 100 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
                                      attainment >= 80 ? 'text-amber-600 bg-amber-50 border-amber-100' :
                                      'text-rose-600 bg-rose-50 border-rose-100'
                                    }`}>
                                      {formatPercent(attainment)}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </>
                      )}

                      {selectedChartExplanation === 'Process Performance Profile' && (
                        <>
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-mono">
                              <th className="py-3 px-4">Process Segment</th>
                              <th className="py-3 px-4 text-center">Efficiency %</th>
                              <th className="py-3 px-4 text-center">Accuracy %</th>
                              <th className="py-3 px-4 text-right">Total Achieved</th>
                              <th className="py-3 px-4 text-right">Total Target</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                            {dynamicProcessStats.map((e, idx) => {
                              return (
                                <tr key={idx} className="hover:bg-slate-50/70 transition">
                                  <td className="py-2.5 px-4">
                                    <span className="px-2 py-0.5 bg-slate-100 rounded-md text-slate-600 font-bold uppercase font-mono text-[9px]">
                                      {e.processName}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${getEffColor(e.avgEfficiency)}`}>
                                      {formatPercent(e.avgEfficiency)}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                                      e.avgAccuracy >= 95 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
                                      e.avgAccuracy >= 90 ? 'text-amber-600 bg-amber-50 border-amber-100' :
                                      'text-rose-600 bg-rose-50 border-rose-100'
                                    }`}>
                                      {formatPercent(e.avgAccuracy)}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-right text-indigo-600 font-bold">{e.totalAchieved.toLocaleString()}</td>
                                  <td className="py-2.5 px-4 text-right text-slate-500">{e.totalTarget.toLocaleString()}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </>
                      )}

                      {(selectedChartExplanation === 'Top 5 Star Performers' || selectedChartExplanation === 'Bottom Quartile Performers (Bottom 25%) - Top 5 Only') && (
                        <>
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-mono">
                              <th className="py-3 px-4">Rank</th>
                              <th className="py-3 px-4 font-mono">EMP Code</th>
                              <th className="py-3 px-4">Name</th>
                              <th className="py-3 px-4 text-center">Avg Efficiency</th>
                              <th className="py-3 px-4 text-center">Avg Accuracy</th>
                              <th className="py-3 px-4 text-right">Total Achieved</th>
                              <th className="py-3 px-4 text-right">Total Target</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                            {(selectedChartExplanation === 'Top 5 Star Performers' ? top5 : bottomQuartile).map((e, idx) => {
                              return (
                                <tr key={e.empId} className="hover:bg-slate-50/70 transition">
                                  <td className="py-2.5 px-4 font-bold text-slate-500">#{idx + 1}</td>
                                  <td className="py-2.5 px-4 font-mono font-bold text-slate-500">{e.empId}</td>
                                  <td className="py-2.5 px-4 font-bold text-slate-800">{e.name}</td>
                                  <td className="py-2.5 px-4 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${getEffColor(e.avgEfficiency)}`}>
                                      {formatPercent(e.avgEfficiency)}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                                      e.avgAccuracy >= 95 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
                                      e.avgAccuracy >= 90 ? 'text-amber-600 bg-amber-50 border-amber-100' :
                                      'text-rose-600 bg-rose-50 border-rose-100'
                                    }`}>
                                      {formatPercent(e.avgAccuracy)}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-right text-indigo-600 font-bold">{e.totalAchieved.toLocaleString()}</td>
                                  <td className="py-2.5 px-4 text-right text-slate-500">{e.totalTarget.toLocaleString()}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </>
                      )}
                    </table>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Formula Panel */}
                  <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl border border-slate-850 font-mono shadow-inner relative overflow-hidden">
                    <div className="absolute right-3 top-3 text-[9px] uppercase tracking-wider font-black text-slate-750 select-none">
                      Statistical Model
                    </div>
                    <div className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest mb-1">
                      How This View Is Formulated
                    </div>
                    <div className="text-sm font-black text-white leading-relaxed">
                      {selectedChartExplanation === 'Daily Production Trend' && (
                        <span>Y-Value (Day) = ∑ Achieved Claims for Day, grouped chronologically. Target line = ∑ Assigned Baseline Targets for that day.</span>
                      )}
                      {selectedChartExplanation === 'Process Performance Profile' && (
                        <span>Metrics plotted represent aggregated Process Streams. Accuracy is overall average QA %, and Attainment % = (∑ Achieved / ∑ Target) × 100.</span>
                      )}
                      {selectedChartExplanation === 'Top 5 Star Performers' && (
                        <span>Sorts all active operators descending by average efficiency. Elite cohort is limited to the Top 5. Efficiency = (Achieved / Target) × 100.</span>
                      )}
                      {selectedChartExplanation === 'Bottom Quartile Performers (Bottom 25%) - Top 5 Only' && (
                        <span>Filters team to bottom 25% by efficiency. From this cohort, the 5 lowest performers are selected for structured operational coaching paths.</span>
                      )}
                    </div>
                  </div>

                  {/* Step-by-Step Evaluation */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest font-mono border-b border-slate-100 pb-1.5">
                      Real-Time Scope Verification
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-750">
                      
                      {/* Left Column: Data points */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-2.5">
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider font-mono block mb-1">
                          Scope Variables
                        </span>
                        
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-500">Filtered Records Scanned:</span>
                          <span className="font-mono font-bold text-slate-800">{filteredLogs.length} production logs</span>
                        </div>

                        <div className="flex justify-between font-medium">
                          <span className="text-slate-500">Active Representatives:</span>
                          <span className="font-mono font-bold text-slate-800">{new Set(filteredLogs.map(p => p.empId)).size} staff</span>
                        </div>

                        {selectedChartExplanation === 'Daily Production Trend' && (
                          <div className="flex justify-between font-medium">
                            <span className="text-slate-500">Total Output Plotted:</span>
                            <span className="font-mono font-bold text-slate-800">{(calculatedStats.agentTotalAchieved || 0).toLocaleString()} units</span>
                          </div>
                        )}

                        {selectedChartExplanation === 'Process Performance Profile' && (
                          <div className="flex justify-between font-medium">
                            <span className="text-slate-500">Departments Found:</span>
                            <span className="font-mono font-bold text-slate-800">{new Set(filteredLogs.map(p => p.processName)).size} processes</span>
                          </div>
                        )}
                      </div>

                      {/* Right Column: Step by step logic */}
                      <div className="bg-indigo-50/45 p-4 rounded-xl border border-indigo-100/60 space-y-2.5">
                        <span className="text-[9px] text-indigo-950/60 font-black uppercase tracking-wider font-mono block mb-1">
                          Execution Trace
                        </span>
                        
                        {selectedChartExplanation === 'Daily Production Trend' && (
                          <p className="text-[11px] text-indigo-900 leading-normal font-medium">
                            1. System groups all production logs by date.<br />
                            2. Filters are applied to subset records.<br />
                            3. Summarizes target vs. achieved variables for each day sequence.<br />
                            4. Plots chronological coordinates.
                          </p>
                        )}

                        {selectedChartExplanation === 'Process Performance Profile' && (
                          <p className="text-[11px] text-indigo-900 leading-normal font-medium">
                            1. Scans filtered production arrays.<br />
                            2. Aggregates values into department bins (e.g. Charge Entry, Payment Posting).<br />
                            3. Evaluates (Achieved / Target) for each segment.
                          </p>
                        )}

                        {selectedChartExplanation === 'Top 5 Star Performers' && (
                          <p className="text-[11px] text-indigo-900 leading-normal font-medium">
                            1. Calculates unique average efficiency per agent.<br />
                            2. Sorts descending.<br />
                            3. Displays top 5 performing employees with high-contrast emerald visual styling.
                          </p>
                        )}

                        {selectedChartExplanation === 'Bottom Quartile Performers (Bottom 25%) - Top 5 Only' && (
                          <p className="text-[11px] text-indigo-900 leading-normal font-medium">
                            1. Calculates unique average efficiency per agent.<br />
                            2. Sorts ascending.<br />
                            3. Isolates bottom 25% of the sorted roster.<br />
                            4. Extracts the 5 lowest scores for coaching focus.
                          </p>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-[10px] text-slate-400 font-bold uppercase font-mono tracking-wider">
                Math Trace Verified
              </span>
              <button
                onClick={() => setSelectedChartExplanation(null)}
                className="bg-slate-900 hover:bg-slate-850 text-white font-black text-xs px-4 py-2 rounded-xl cursor-pointer transition"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── FULL-SIZE EXPANDED CHART MODAL ─────────────────────────────────── */}
      {expandedChart && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                {expandedChart === 'trend'
                  ? <TrendingUp size={18} className="text-indigo-600" />
                  : <Layers size={18} className="text-emerald-600" />}
                <div>
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide font-mono">
                    {expandedChart === 'trend' ? 'Daily Production Trend — Full View' : 'Process Performance Profile — Full View'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                    Enlarged one-at-a-time chart view for legible month-scale analysis
                  </p>
                </div>
              </div>
              <button
                onClick={() => setExpandedChart(null)}
                className="w-10 h-10 rounded-full hover:bg-slate-200 border border-slate-200/60 flex items-center justify-center text-slate-500 hover:text-slate-900 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <div className="h-[60vh] min-h-[380px] w-full">
                {expandedChart === 'trend' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dynamicDailyTrend} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <defs>
                        <linearGradient id="trendColorAchievedXL" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="trendColorTargetXL" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                      <XAxis dataKey="dateStr" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#e2e8f0',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#1e293b',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        }}
                      />
                      <Legend iconSize={10} style={{ fontSize: '12px' }} />
                      <Area
                        name="Achieved Volume"
                        type="monotone"
                        dataKey="totalAchieved"
                        stroke="#4f46e5"
                        fillOpacity={1}
                        fill="url(#trendColorAchievedXL)"
                        strokeWidth={2.5}
                      />
                      <Area
                        name="Target Goal"
                        type="monotone"
                        dataKey="totalTarget"
                        stroke="#94a3b8"
                        fillOpacity={1}
                        fill="url(#trendColorTargetXL)"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dynamicProcessStats} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                      <XAxis dataKey="processName" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 150]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#e2e8f0',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#1e293b',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        }}
                      />
                      <Legend iconSize={10} style={{ fontSize: '12px' }} />
                      <Bar dataKey="avgEfficiency" name="Efficiency %" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={22} />
                      <Bar dataKey="avgAccuracy" name="Accuracy %" fill="#10b981" radius={[4, 4, 0, 0]} barSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-[10px] text-slate-400 font-bold uppercase font-mono tracking-wider">
                Full-Size Chart Viewer
              </span>
              <button
                onClick={() => setExpandedChart(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-4 py-2 rounded-xl cursor-pointer transition"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
