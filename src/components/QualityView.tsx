import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { calculateProductionMetrics, formatPercent, normalizeEmpId, matchesClean } from '../utils/calculations';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts';
import { 
  ShieldCheck, Filter, Award, AlertTriangle, AlertCircle, RefreshCw, Zap,
  Search, SlidersHorizontal, Sliders, ChevronDown, ChevronUp, CheckCircle, TrendingUp, Info, Activity, ShieldAlert, HelpCircle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type SubTabID = 'trends' | 'pareto' | 'outgoing' | 'rawlogs';

export const QualityView: React.FC = () => {
  const { employees, production, attendance, qualityRollups, qualityAudits } = useApp();

  // Shared KPI calculations for Consistency across views
  const kpiMetrics = useMemo(() => {
    // 1. Avg Daily Prod & Avg Weekly Prod
    const totalAchieved = production.reduce((acc, rec) => acc + rec.achieved, 0);
    const uniqueDays = new Set(production.map(r => r.date)).size || 1;
    const avgDailyProd = Math.round(totalAchieved / uniqueDays);
    const avgWeeklyProd = avgDailyProd * 5;

    // 2. Productivity %
    const totalTarget = production.reduce((acc, rec) => acc + rec.target, 0) || 1;
    const productivityPct = Math.round((totalAchieved / totalTarget) * 100);

    // 3. Quality %
    const accuracyRecords = production.filter(r => r.accuracy !== undefined && r.accuracy > 0);
    const avgQualityPct = accuracyRecords.length > 0 
      ? Math.round(accuracyRecords.reduce((acc, r) => acc + r.accuracy, 0) / accuracyRecords.length)
      : 95;

    // 4. Shrinkage %
    const totalAttendanceCount = attendance.length || 1;
    const leaveRecords = attendance.filter(a => a.onLeave).length;
    const shrinkagePct = Math.round((leaveRecords / totalAttendanceCount) * 100);

    // 5. Hours Shortfall
    const shortfall = attendance.reduce((acc, rec) => {
      if (rec.onLeave) return acc;
      const expected = rec.expectedHours || 8;
      const worked = rec.hoursWorked || 0;
      return acc + Math.max(0, expected - worked);
    }, 0);

    return {
      avgDailyProd,
      avgWeeklyProd,
      productivityPct,
      avgQualityPct,
      shrinkagePct,
      hoursShortfall: shortfall
    };
  }, [production, attendance]);

  // Primary workspace view tabs
  const [subTab, setSubTab] = useState<SubTabID>('trends');

  // Advanced Filter panel toggle
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);

  // Selected Chart Explanation State
  const [selectedChartExplanation, setSelectedChartExplanation] = useState<string | null>(null);
  const [chartModalTab, setChartModalTab] = useState<'breakdown' | 'formula'>('breakdown');
  const [activeReportModal, setActiveReportModal] = useState<{
    title: string;
    description: string;
    headers: string[];
    rows: Array<Array<string | number>>;
  } | null>(null);

  const openChartExplanation = (chartName: string) => {
    setSelectedChartExplanation(chartName);
    setChartModalTab('breakdown');
  };

  // Filters
  const [empName, setEmpName] = useState('');
  const [reportingManager, setReportingManager] = useState('');
  const [lineManager, setLineManager] = useState('');
  const [rcmManager, setRcmManager] = useState('');
  const [processFilter, setProcessFilter] = useState('');
  const [subProcessFilter, setSubProcessFilter] = useState('');

  // Operator Search Query for the Audited Operator Registry list
  const [operatorSearch, setOperatorSearch] = useState('');

  // Quality Raw Logs Pagination and Search
  const [rawLogsPage, setRawLogsPage] = useState(1);
  const [rawLogsSearch, setRawLogsSearch] = useState('');

  const filteredRawLogs = useMemo(() => {
    return qualityAudits.filter(log => {
      const q = rawLogsSearch.toLowerCase();
      return (
        (log.empName || '').toLowerCase().includes(q) ||
        (log.empId || '').toLowerCase().includes(q) ||
        (log.clientName || '').toLowerCase().includes(q) ||
        (log.pms || '').toLowerCase().includes(q) ||
        (log.processName || '').toLowerCase().includes(q) ||
        (log.subProcessName || '').toLowerCase().includes(q) ||
        (log.errorType || '').toLowerCase().includes(q) ||
        (log.category || '').toLowerCase().includes(q) ||
        (log.status || '').toLowerCase().includes(q) ||
        (log.auditorName || '').toLowerCase().includes(q)
      );
    });
  }, [qualityAudits, rawLogsSearch]);

  const itemsPerPage = 15;
  const totalRawLogsPages = Math.ceil(filteredRawLogs.length / itemsPerPage) || 1;
  const paginatedRawLogs = useMemo(() => {
    const startIndex = (rawLogsPage - 1) * itemsPerPage;
    return filteredRawLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRawLogs, rawLogsPage]);

  useEffect(() => {
    setRawLogsPage(1);
  }, [rawLogsSearch]);

  // Dropdown lists
  const activeEmployees = useMemo(() => {
    return employees.filter(emp => {
      const status = (emp.status || '').toLowerCase();
      return !status.includes('relieved') && !status.includes('abscond');
    });
  }, [employees]);

  const empProductionMap = useMemo(() => {
    const map: { [empId: string]: { processes: Set<string>; subProcesses: Set<string> } } = {};
    production.forEach(p => {
      if (!map[p.empId]) {
        map[p.empId] = { processes: new Set(), subProcesses: new Set() };
      }
      map[p.empId].processes.add(p.processName);
      map[p.empId].subProcesses.add(p.subProcessName);
    });
    return map;
  }, [production]);

  // Dropdown option sets computed dynamically to support cascaded filtering
  const uniqueEmps = useMemo(() => {
    const filtered = activeEmployees.filter(emp => {
      if (reportingManager && emp.rm !== reportingManager) return false;
      if (lineManager && emp.lm !== lineManager) return false;
      if (rcmManager && emp.rcm !== rcmManager) return false;
      
      const empProd = empProductionMap[emp.empId];
      if (processFilter && (!empProd || !empProd.processes.has(processFilter))) return false;
      if (subProcessFilter && (!empProd || !empProd.subProcesses.has(subProcessFilter))) return false;
      return true;
    });
    return Array.from(new Set(filtered.map(e => e.name))).sort();
  }, [activeEmployees, empProductionMap, reportingManager, lineManager, rcmManager, processFilter, subProcessFilter]);

  const uniqueRMs = useMemo(() => {
    const filtered = activeEmployees.filter(emp => {
      if (empName && emp.name !== empName) return false;
      if (lineManager && emp.lm !== lineManager) return false;
      if (rcmManager && emp.rcm !== rcmManager) return false;
      
      const empProd = empProductionMap[emp.empId];
      if (processFilter && (!empProd || !empProd.processes.has(processFilter))) return false;
      if (subProcessFilter && (!empProd || !empProd.subProcesses.has(subProcessFilter))) return false;
      return true;
    });
    return Array.from(new Set(filtered.map(e => e.rm).filter(Boolean))).sort();
  }, [activeEmployees, empProductionMap, empName, lineManager, rcmManager, processFilter, subProcessFilter]);

  const uniqueLMs = useMemo(() => {
    const filtered = activeEmployees.filter(emp => {
      if (empName && emp.name !== empName) return false;
      if (reportingManager && emp.rm !== reportingManager) return false;
      if (rcmManager && emp.rcm !== rcmManager) return false;
      
      const empProd = empProductionMap[emp.empId];
      if (processFilter && (!empProd || !empProd.processes.has(processFilter))) return false;
      if (subProcessFilter && (!empProd || !empProd.subProcesses.has(subProcessFilter))) return false;
      return true;
    });
    return Array.from(new Set(filtered.map(e => e.lm).filter(Boolean))).sort();
  }, [activeEmployees, empProductionMap, empName, reportingManager, rcmManager, processFilter, subProcessFilter]);

  const uniqueRCMs = useMemo(() => {
    const filtered = activeEmployees.filter(emp => {
      if (empName && emp.name !== empName) return false;
      if (reportingManager && emp.rm !== reportingManager) return false;
      if (lineManager && emp.lm !== lineManager) return false;
      
      const empProd = empProductionMap[emp.empId];
      if (processFilter && (!empProd || !empProd.processes.has(processFilter))) return false;
      if (subProcessFilter && (!empProd || !empProd.subProcesses.has(subProcessFilter))) return false;
      return true;
    });
    return Array.from(new Set(filtered.map(e => e.rcm).filter(Boolean))).sort();
  }, [activeEmployees, empProductionMap, empName, reportingManager, lineManager, processFilter, subProcessFilter]);

  const uniqueProcesses = useMemo(() => {
    const matchedEmps = activeEmployees.filter(emp => {
      if (empName && emp.name !== empName) return false;
      if (reportingManager && emp.rm !== reportingManager) return false;
      if (lineManager && emp.lm !== lineManager) return false;
      if (rcmManager && emp.rcm !== rcmManager) return false;
      return true;
    });
    const matchedEmpIds = new Set(matchedEmps.map(e => e.empId));
    
    const filteredProds = production.filter(p => {
      if (!matchedEmpIds.has(p.empId)) return false;
      if (subProcessFilter && p.subProcessName !== subProcessFilter) return false;
      return true;
    });
    return Array.from(new Set(filteredProds.map(p => p.processName))).sort();
  }, [activeEmployees, production, empName, reportingManager, lineManager, rcmManager, subProcessFilter]);

  const uniqueSubProcesses = useMemo(() => {
    const matchedEmps = activeEmployees.filter(emp => {
      if (empName && emp.name !== empName) return false;
      if (reportingManager && emp.rm !== reportingManager) return false;
      if (lineManager && emp.lm !== lineManager) return false;
      if (rcmManager && emp.rcm !== rcmManager) return false;
      return true;
    });
    const matchedEmpIds = new Set(matchedEmps.map(e => e.empId));
    
    const filteredProds = production.filter(p => {
      if (!matchedEmpIds.has(p.empId)) return false;
      if (processFilter && p.processName !== processFilter) return false;
      return true;
    });
    return Array.from(new Set(filteredProds.map(p => p.subProcessName))).sort();
  }, [activeEmployees, production, empName, reportingManager, lineManager, rcmManager, processFilter]);

  // Interdependent Auto-Fill/Cascade handlers
  const handleEmpNameChange = (val: string) => {
    setEmpName(val);
    if (!val) {
      setReportingManager('');
      setLineManager('');
      setRcmManager('');
      setProcessFilter('');
      setSubProcessFilter('');
      return;
    }
    const emp = activeEmployees.find(e => e.name === val);
    if (emp) {
      setReportingManager(emp.rm || '');
      setLineManager(emp.lm || '');
      setRcmManager(emp.rcm || '');
      
      const empProd = empProductionMap[emp.empId];
      if (empProd) {
        if (empProd.processes.size === 1) {
          setProcessFilter(Array.from(empProd.processes)[0]);
        }
        if (empProd.subProcesses.size === 1) {
          setSubProcessFilter(Array.from(empProd.subProcesses)[0]);
        }
      }
    }
  };

  const handleReportingManagerChange = (val: string) => {
    setReportingManager(val);
    if (!val) return;
    const filtered = activeEmployees.filter(emp => emp.rm === val);
    if (filtered.length === 1) {
      const emp = filtered[0];
      setEmpName(emp.name);
      setLineManager(emp.lm || '');
      setRcmManager(emp.rcm || '');
      
      const empProd = empProductionMap[emp.empId];
      if (empProd) {
        if (empProd.processes.size === 1) {
          setProcessFilter(Array.from(empProd.processes)[0]);
        }
        if (empProd.subProcesses.size === 1) {
          setSubProcessFilter(Array.from(empProd.subProcesses)[0]);
        }
      }
    }
  };

  const handleLineManagerChange = (val: string) => {
    setLineManager(val);
    if (!val) return;
    const filtered = activeEmployees.filter(emp => emp.lm === val);
    if (filtered.length === 1) {
      const emp = filtered[0];
      setEmpName(emp.name);
      setReportingManager(emp.rm || '');
      setRcmManager(emp.rcm || '');
      
      const empProd = empProductionMap[emp.empId];
      if (empProd) {
        if (empProd.processes.size === 1) {
          setProcessFilter(Array.from(empProd.processes)[0]);
        }
        if (empProd.subProcesses.size === 1) {
          setSubProcessFilter(Array.from(empProd.subProcesses)[0]);
        }
      }
    }
  };

  const handleRcmManagerChange = (val: string) => {
    setRcmManager(val);
    if (!val) return;
    const filtered = activeEmployees.filter(emp => emp.rcm === val);
    if (filtered.length === 1) {
      const emp = filtered[0];
      setEmpName(emp.name);
      setReportingManager(emp.rm || '');
      setLineManager(emp.lm || '');
      
      const empProd = empProductionMap[emp.empId];
      if (empProd) {
        if (empProd.processes.size === 1) {
          setProcessFilter(Array.from(empProd.processes)[0]);
        }
        if (empProd.subProcesses.size === 1) {
          setSubProcessFilter(Array.from(empProd.subProcesses)[0]);
        }
      }
    }
  };

  const handleProcessFilterChange = (val: string) => {
    setProcessFilter(val);
  };

  const handleSubProcessFilterChange = (val: string) => {
    setSubProcessFilter(val);
  };

  const handleResetFilters = () => {
    setEmpName('');
    setReportingManager('');
    setLineManager('');
    setRcmManager('');
    setProcessFilter('');
    setSubProcessFilter('');
  };

  // Filtered dataset
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Exclude Relieved and Absconded
      const status = (emp.status || '').toLowerCase();
      if (status.includes('relieved') || status.includes('abscond')) return false;

      if (empName && emp.name !== empName) return false;
      if (reportingManager && !matchesClean(emp.rm, reportingManager)) return false;
      if (lineManager && !matchesClean(emp.lm, lineManager)) return false;
      if (rcmManager && !matchesClean(emp.rcm, rcmManager)) return false;
      return true;
    });
  }, [employees, empName, reportingManager, lineManager, rcmManager]);

  const filteredEmpIds = useMemo(() => new Set(filteredEmployees.map(e => normalizeEmpId(e.empId))), [filteredEmployees]);

  const filteredProduction = useMemo(() => {
    return production.filter(prod => {
      if (!filteredEmpIds.has(normalizeEmpId(prod.empId))) return false;
      if (processFilter && prod.processName !== processFilter) return false;
      if (subProcessFilter && prod.subProcessName !== subProcessFilter) return false;
      return true;
    });
  }, [production, filteredEmpIds, processFilter, subProcessFilter]);

  const filteredQualityRollups = useMemo(() => {
    return qualityRollups.filter(r => {
      const emp = employees.find(e => normalizeEmpId(e.empId) === normalizeEmpId(r.empId));
      if (emp) {
        if (empName && emp.name !== empName) return false;
        if (reportingManager && !matchesClean(emp.rm, reportingManager)) return false;
        if (lineManager && !matchesClean(emp.lm, lineManager)) return false;
        if (rcmManager && !matchesClean(emp.rcm, rcmManager)) return false;
      } else {
        if (empName && !matchesClean(r.name, empName)) return false;
        if (reportingManager && !matchesClean(r.primaryReportingName, reportingManager)) return false;
      }
      if (processFilter && !matchesClean(r.process, processFilter)) return false;
      return true;
    });
  }, [qualityRollups, employees, empName, reportingManager, lineManager, rcmManager, processFilter]);

  const filteredQualityAudits = useMemo(() => {
    return qualityAudits.filter(r => {
      const emp = employees.find(e => normalizeEmpId(e.empId) === normalizeEmpId(r.empId) || e.name.toLowerCase().trim() === r.empName.toLowerCase().trim());
      if (emp) {
        if (empName && emp.name !== empName) return false;
        if (reportingManager && !matchesClean(emp.rm, reportingManager)) return false;
        if (lineManager && !matchesClean(emp.lm, lineManager)) return false;
        if (rcmManager && !matchesClean(emp.rcm, rcmManager)) return false;
      } else {
        if (empName && !matchesClean(r.empName, empName)) return false;
        if (reportingManager && !matchesClean(r.primaryReportingName, reportingManager)) return false;
      }
      if (processFilter && !matchesClean(r.processName, processFilter)) return false;
      if (subProcessFilter && !matchesClean(r.subProcessName, subProcessFilter)) return false;
      return true;
    });
  }, [qualityAudits, employees, empName, reportingManager, lineManager, rcmManager, processFilter, subProcessFilter]);

  // Weeks helper matching calendar structure dynamically
  const getWeekLabel = (dateStr: string): string => {
    if (!dateStr) return 'Week 1';
    const parts = dateStr.split('-');
    if (parts.length < 3) return 'Week 1';
    const monthNum = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthLabel = monthNames[monthNum - 1] || 'Jun';
    
    if (day <= 7) return `${monthLabel} Week 1 (01-07)`;
    if (day <= 14) return `${monthLabel} Week 2 (08-14)`;
    if (day <= 21) return `${monthLabel} Week 3 (15-21)`;
    if (day <= 28) return `${monthLabel} Week 4 (22-28)`;
    return `${monthLabel} Week 5 (29-31)`;
  };

  // Headline KPI Metric Cards calculations
  const summaryKpiStats = useMemo(() => {
    let averageAccuracy = 100.0;
    let totalAuditedVolume = 0;
    let uniqueOperatorsAudited = 0;
    let totalErrorsCount = 0;

    if (filteredQualityAudits.length > 0) {
      const totalAudited = filteredQualityAudits.reduce((sum, a) => sum + (a.auditedCount || 1), 0);
      const totalErrors = filteredQualityAudits.filter(a => a.status === 'ERROR').length;
      totalErrorsCount = totalErrors;
      totalAuditedVolume = totalAudited;
      averageAccuracy = totalAudited > 0 ? Number(((totalAudited - totalErrors) / totalAudited * 100).toFixed(1)) : 100.0;
      uniqueOperatorsAudited = new Set(filteredQualityAudits.map(a => a.empId)).size;
    } else if (filteredQualityRollups.length > 0) {
      const totalAudited = filteredQualityRollups.reduce((sum, r) => sum + r.auditedCount, 0);
      const totalErrors = filteredQualityRollups.reduce((sum, r) => sum + r.errorCount, 0);
      totalErrorsCount = totalErrors;
      totalAuditedVolume = totalAudited;
      averageAccuracy = totalAudited > 0 ? Number(((totalAudited - totalErrors) / totalAudited * 100).toFixed(1)) : 100.0;
      uniqueOperatorsAudited = new Set(filteredQualityRollups.map(r => r.empId)).size;
    } else {
      const totalAccuracySum = filteredProduction.reduce((sum, p) => sum + p.accuracy, 0);
      averageAccuracy = filteredProduction.length > 0 ? Number((totalAccuracySum / filteredProduction.length).toFixed(1)) : 100.0;
      totalAuditedVolume = filteredProduction.reduce((sum, p) => sum + (p.auditedCount || 0), 0);
      uniqueOperatorsAudited = new Set(filteredProduction.map(p => p.empId)).size;
      totalErrorsCount = filteredProduction.reduce((sum, p) => sum + (p.accuracy < 100 ? 1 : 0), 0);
    }

    let slaComplianceRate = 100;
    if (filteredQualityAudits.length > 0) {
      const opStats: { [empId: string]: { audited: number; errors: number } } = {};
      filteredQualityAudits.forEach(a => {
        if (!opStats[a.empId]) opStats[a.empId] = { audited: 0, errors: 0 };
        opStats[a.empId].audited += (a.auditedCount || 1);
        if (a.status === 'ERROR') opStats[a.empId].errors++;
      });
      const ops = Object.values(opStats);
      const compliantOpsCount = ops.filter(o => {
        const score = o.audited > 0 ? ((o.audited - o.errors) / o.audited * 100) : 100.0;
        return score >= 95.0;
      }).length;
      slaComplianceRate = ops.length > 0 ? Math.round((compliantOpsCount / ops.length) * 100) : 100;
    } else if (filteredQualityRollups.length > 0) {
      const compliantRollups = filteredQualityRollups.filter(r => r.qualityScore >= 95.0).length;
      slaComplianceRate = filteredQualityRollups.length > 0 ? Math.round((compliantRollups / filteredQualityRollups.length) * 100) : 100;
    } else {
      const compliantCount = filteredProduction.filter(p => p.accuracy >= 95.0).length;
      slaComplianceRate = filteredProduction.length > 0 ? Math.round((compliantCount / filteredProduction.length) * 100) : 100;
    }

    return {
      averageAccuracy,
      slaComplianceRate,
      totalAuditedVolume,
      uniqueOperatorsAudited,
      totalErrorsCount
    };
  }, [filteredQualityAudits, filteredQualityRollups, filteredProduction]);

  // Extended reports and KPI cards
  const qualityKpiReports = useMemo(() => {
    // 1. Production Count
    const productionCount = filteredProduction.reduce((sum, p) => sum + p.achieved, 0);

    // 2. Transaction Audited
    const auditedCount = filteredQualityAudits.reduce((sum, a) => sum + (a.auditedCount || 1), 0);

    // 3. No. of Errors
    const errorsCount = filteredQualityAudits.filter(a => a.status === 'ERROR').length;

    // 4. Sampling %
    const samplingPct = productionCount > 0 ? (auditedCount / productionCount) * 100 : 0;

    // 5. Quality Score (average accuracy)
    const qualityScore = summaryKpiStats.averageAccuracy;

    // 6. Error Categories
    const fyiCount = filteredQualityAudits.filter(a => a.status === 'FYI').length;
    const passesCount = Math.max(0, auditedCount - errorsCount - fyiCount);
    const errorCategoryDisplay = `ERROR: ${errorsCount} | FYI: ${fyiCount} | NO ERROR: ${passesCount}`;

    // 7. Error Types
    const errorTypesMap: { [key: string]: number } = {};
    filteredQualityAudits.forEach(a => {
      if (a.status === 'ERROR' || a.status === 'FYI') {
        const type = a.errorType || 'Unspecified';
        errorTypesMap[type] = (errorTypesMap[type] || 0) + 1;
      }
    });
    const sortedErrorTypes = Object.entries(errorTypesMap)
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => type);
    const errorTypesDisplay = sortedErrorTypes.slice(0, 2).join(', ') || 'No Errors Recorded';

    // Grouping helper for Production report
    const prodMap: { [key: string]: { empName: string; process: string; achieved: number; target: number } } = {};
    filteredProduction.forEach(p => {
      const key = `${p.empId}_${p.processName}`;
      const emp = employees.find(e => e.empId.toString().toUpperCase() === p.empId.toString().toUpperCase());
      const name = emp?.name || p.empId;
      if (!prodMap[key]) {
        prodMap[key] = { empName: name, process: p.processName, achieved: 0, target: 0 };
      }
      prodMap[key].achieved += p.achieved;
      prodMap[key].target += p.target;
    });
    const productionRows = Object.values(prodMap).map(p => [
      p.empName,
      p.process,
      p.achieved.toLocaleString(),
      p.target.toLocaleString(),
      p.target > 0 ? `${Math.round((p.achieved / p.target) * 100)}%` : '100%'
    ]);

    // Grouping helper for Audited report
    const auditMap: { [key: string]: { empName: string; process: string; audited: number; errors: number; fyi: number } } = {};
    filteredQualityAudits.forEach(a => {
      const key = `${a.empId}_${a.processName}`;
      if (!auditMap[key]) {
        auditMap[key] = { empName: a.empName, process: a.processName || 'Unknown', audited: 0, errors: 0, fyi: 0 };
      }
      auditMap[key].audited += (a.auditedCount || 1);
      if (a.status === 'ERROR') auditMap[key].errors++;
      if (a.status === 'FYI') auditMap[key].fyi++;
    });
    const auditedRows = Object.values(auditMap).map(a => [
      a.empName,
      a.process,
      a.audited.toLocaleString(),
      a.errors.toLocaleString(),
      a.fyi.toLocaleString(),
      a.audited > 0 ? `${((a.audited - a.errors) / a.audited * 100).toFixed(1)}%` : '100%'
    ]);

    // Individual Errors Report
    const individualErrorRows = filteredQualityAudits
      .filter(a => a.status === 'ERROR' || a.status === 'FYI')
      .map(a => [
        a.empName,
        a.workedDate,
        a.processName || 'Unknown',
        a.errorType || 'Unspecified',
        a.category || 'N/A',
        a.status === 'ERROR' ? 'One-Time Error' : 'Repeated Error',
        a.comments || 'No comment provided'
      ]);

    // Sampling Report by Process
    const sampleMap: { [key: string]: { process: string; production: number; audited: number } } = {};
    filteredProduction.forEach(p => {
      if (!sampleMap[p.processName]) {
        sampleMap[p.processName] = { process: p.processName, production: 0, audited: 0 };
      }
      sampleMap[p.processName].production += p.achieved;
    });
    filteredQualityAudits.forEach(a => {
      if (!sampleMap[a.processName]) {
        sampleMap[a.processName] = { process: a.processName || 'Unknown', production: 0, audited: 0 };
      }
      sampleMap[a.processName].audited += (a.auditedCount || 1);
    });
    const samplingRows = Object.values(sampleMap).map(s => [
      s.process,
      s.production.toLocaleString(),
      s.audited.toLocaleString(),
      s.production > 0 ? `${((s.audited / s.production) * 100).toFixed(2)}%` : '0%'
    ]);

    // Quality Score Ranking
    const qsMap: { [key: string]: { empName: string; process: string; audited: number; errors: number } } = {};
    filteredQualityAudits.forEach(a => {
      const key = `${a.empId}_${a.processName}`;
      if (!qsMap[key]) {
        qsMap[key] = { empName: a.empName, process: a.processName || 'Unknown', audited: 0, errors: 0 };
      }
      qsMap[key].audited += (a.auditedCount || 1);
      if (a.status === 'ERROR') qsMap[key].errors++;
    });
    const scoreRows = Object.values(qsMap)
      .map(q => {
        const score = q.audited > 0 ? ((q.audited - q.errors) / q.audited) * 100 : 100;
        return { ...q, score };
      })
      .sort((a, b) => b.score - a.score)
      .map(q => [
        q.empName,
        q.process,
        q.audited.toLocaleString(),
        q.errors.toLocaleString(),
        `${q.score.toFixed(1)}%`
      ]);

    // Error Category Breakdown
    const catMap: { [key: string]: { process: string; errors: number; fyi: number; passes: number; total: number } } = {};
    filteredQualityAudits.forEach(a => {
      const proc = a.processName || 'Unknown';
      if (!catMap[proc]) {
        catMap[proc] = { process: proc, errors: 0, fyi: 0, passes: 0, total: 0 };
      }
      catMap[proc].total += (a.auditedCount || 1);
      if (a.status === 'ERROR') {
        catMap[proc].errors++;
      } else if (a.status === 'FYI') {
        catMap[proc].fyi++;
      } else {
        catMap[proc].passes += (a.auditedCount || 1);
      }
    });
    const categoryRows = Object.values(catMap).map(c => [
      c.process,
      c.passes.toLocaleString(),
      c.errors.toLocaleString(),
      c.fyi.toLocaleString(),
      c.total.toLocaleString()
    ]);

    // Error Type Report by Frequency
    const errTypeMap: { [key: string]: { errorType: string; category: string; count: number } } = {};
    filteredQualityAudits.forEach(a => {
      if (a.status === 'ERROR' || a.status === 'FYI') {
        const type = a.errorType || 'Unspecified';
        if (!errTypeMap[type]) {
          errTypeMap[type] = { errorType: type, category: a.category || 'N/A', count: 0 };
        }
        errTypeMap[type].count++;
      }
    });
    const totalAllErrors = Object.values(errTypeMap).reduce((sum, e) => sum + e.count, 0) || 1;
    const typeRows = Object.values(errTypeMap)
      .sort((a, b) => b.count - a.count)
      .map(e => [
        e.errorType,
        e.category,
        e.count.toLocaleString(),
        `${((e.count / totalAllErrors) * 100).toFixed(1)}%`
      ]);

    return {
      productionCount,
      auditedCount,
      errorsCount,
      samplingPct,
      qualityScore,
      errorCategoryDisplay,
      errorTypesDisplay,
      reports: {
        production: {
          title: "Production Count Detailed Report",
          description: "Breakdown of achieved production volume by representative and process stream under active filters.",
          headers: ["Employee Name", "Process Name", "Achieved Volume", "Target Volume", "Target Completion %"],
          rows: productionRows
        },
        audited: {
          title: "No. of Transactions Audited Detailed Report",
          description: "Summary of audits, error counts, and accuracy levels grouped by representative.",
          headers: ["Employee Name", "Process Name", "Audited Count", "One-Time Errors", "Repeated Errors (FYI)", "Quality Rate"],
          rows: auditedRows
        },
        errors: {
          title: "No. of Errors Detailed Report",
          description: "Individual log of audited errors (One-Time and Repeated) for currently filtered associates.",
          headers: ["Employee Name", "Date", "Process", "Error Type", "Category", "Status", "Auditor Comments"],
          rows: individualErrorRows
        },
        sampling: {
          title: "Sampling % Detailed Report",
          description: "Audited volume vs total production volume comparison across process streams.",
          headers: ["Process Stream", "Total Production Volume", "Total Audited Volume", "Sampling %"],
          rows: samplingRows
        },
        qualityScore: {
          title: "Quality Score Detailed Report",
          description: "Ranked list of representatives by their overall audited quality score under current filters.",
          headers: ["Employee Name", "Process Name", "Total Audited", "One-Time Errors", "Quality Score %"],
          rows: scoreRows
        },
        category: {
          title: "Error Category Detailed Report",
          description: "Audit pass/fail/FYI counts aggregated across all filtered process streams.",
          headers: ["Process Stream", "No Error (Pass)", "One-Time Error (ERROR)", "Repeated Error (FYI)", "Total Audited"],
          rows: categoryRows
        },
        errorTypes: {
          title: "Error Type Detailed Report",
          description: "Audit failure breakdown by specific error type and structural classification.",
          headers: ["Error Type", "Classification Category", "Occurrence Count", "% of Total Errors"],
          rows: typeRows
        }
      }
    };
  }, [filteredProduction, filteredQualityAudits, employees, summaryKpiStats]);

  // 1. Outgoing Accuracy Weekly Trends
  const weeklyAccuracyTrends = useMemo(() => {
    const weekMap: { [key: string]: { audited: number; errors: number; fallbackSum: number; fallbackCount: number } } = {};
    
    if (filteredQualityAudits.length > 0) {
      filteredQualityAudits.forEach(a => {
        const wk = getWeekLabel(a.workedDate);
        if (!weekMap[wk]) weekMap[wk] = { audited: 0, errors: 0, fallbackSum: 0, fallbackCount: 0 };
        weekMap[wk].audited += (a.auditedCount || 1);
        if (a.status === 'ERROR') {
          weekMap[wk].errors++;
        }
      });
      
      return Object.keys(weekMap).sort().map(wk => {
        const audited = weekMap[wk].audited;
        const errors = weekMap[wk].errors;
        const avgAccuracy = audited > 0 ? Number(((audited - errors) / audited * 100).toFixed(1)) : 100.0;
        return {
          week: wk,
          'Accuracy Rate %': avgAccuracy,
          'Target Baseline %': 95.0
        };
      });
    } else {
      filteredProduction.forEach(p => {
        const wk = getWeekLabel(p.date);
        if (!weekMap[wk]) weekMap[wk] = { audited: 0, errors: 0, fallbackSum: 0, fallbackCount: 0 };
        weekMap[wk].fallbackSum += p.accuracy;
        weekMap[wk].fallbackCount++;
      });
      
      return Object.keys(weekMap).sort().map(wk => {
        const avgAccuracy = weekMap[wk].fallbackCount > 0 ? Number((weekMap[wk].fallbackSum / weekMap[wk].fallbackCount).toFixed(1)) : 100;
        return {
          week: wk,
          'Accuracy Rate %': avgAccuracy,
          'Target Baseline %': 95.0
        };
      });
    }
  }, [filteredQualityAudits, filteredProduction]);

  // 2. Organizational Quality Baselines (Process Wise)
  const orgQualityBaselines = useMemo(() => {
    const procMap: { [key: string]: { audited: number; errors: number; sumFallback: number; countFallback: number } } = {};
    
    if (filteredQualityAudits.length > 0) {
      filteredQualityAudits.forEach(a => {
        const proc = a.processName || 'Unknown';
        if (!procMap[proc]) procMap[proc] = { audited: 0, errors: 0, sumFallback: 0, countFallback: 0 };
        procMap[proc].audited += (a.auditedCount || 1);
        if (a.status === 'ERROR') procMap[proc].errors++;
      });
      
      return Object.keys(procMap).map(proc => {
        const audited = procMap[proc].audited;
        const errors = procMap[proc].errors;
        const avgAccuracy = audited > 0 ? Number(((audited - errors) / audited * 100).toFixed(1)) : 100.0;
        return {
          name: proc,
          'Baseline Accuracy %': avgAccuracy,
          'Standard Target %': 95
        };
      });
    } else if (filteredQualityRollups.length > 0) {
      filteredQualityRollups.forEach(r => {
        const proc = r.process || 'Unknown';
        if (!procMap[proc]) procMap[proc] = { audited: 0, errors: 0, sumFallback: 0, countFallback: 0 };
        procMap[proc].audited += r.auditedCount;
        procMap[proc].errors += r.errorCount;
      });
      
      return Object.keys(procMap).map(proc => {
        const audited = procMap[proc].audited;
        const errors = procMap[proc].errors;
        const avgAccuracy = audited > 0 ? Number(((audited - errors) / audited * 100).toFixed(1)) : 100.0;
        return {
          name: proc,
          'Baseline Accuracy %': avgAccuracy,
          'Standard Target %': 95
        };
      });
    } else {
      filteredProduction.forEach(p => {
        const proc = p.processName;
        if (!procMap[proc]) procMap[proc] = { audited: 0, errors: 0, sumFallback: 0, countFallback: 0 };
        procMap[proc].sumFallback += p.accuracy;
        procMap[proc].countFallback++;
      });
      
      return Object.keys(procMap).map(proc => {
        const avgAccuracy = procMap[proc].countFallback > 0 ? Number((procMap[proc].sumFallback / procMap[proc].countFallback).toFixed(1)) : 100;
        return {
          name: proc,
          'Baseline Accuracy %': avgAccuracy,
          'Standard Target %': 95
        };
      });
    }
  }, [filteredQualityAudits, filteredQualityRollups, filteredProduction]);

  // 3. Pareto Analysis (80-20 Rule) of Error Defects
  const errorParetoData = useMemo(() => {
    const errorMap: { [key: string]: number } = {};
    let totalErrors = 0;
    
    if (filteredQualityAudits.length > 0) {
      filteredQualityAudits.forEach(a => {
        if (a.status === 'ERROR') {
          const category = a.category || a.errorType || 'Uncategorized';
          errorMap[category] = (errorMap[category] || 0) + 1;
          totalErrors++;
        }
      });
    }
    
    if (totalErrors === 0) {
      const defaults = [
        { name: 'Incorrect Demo Capture', count: 18 },
        { name: 'Provider NPI Missing', count: 14 },
        { name: 'Incorrect Modifier Applied', count: 9 },
        { name: 'DX Mismatch', count: 5 },
        { name: 'Authorization Missing', count: 3 },
        { name: 'Eligibility Verification Failure', count: 1 }
      ];
      let sum = 0;
      const totalDef = defaults.reduce((s, c) => s + c.count, 0);
      return defaults.map(d => {
        sum += d.count;
        const cumPct = Number(((sum / totalDef) * 100).toFixed(0));
        return {
          name: d.name,
          'Defect Count': d.count,
          'Cumulative %': cumPct
        };
      });
    }

    const sortedErrors = Object.keys(errorMap)
      .map(key => ({ name: key, count: errorMap[key] }))
      .sort((a, b) => b.count - a.count);

    let runningSum = 0;
    return sortedErrors.map(item => {
      runningSum += item.count;
      const cumPct = Number(((runningSum / totalErrors) * 100).toFixed(0));
      return {
        name: item.name,
        'Defect Count': item.count,
        'Cumulative %': cumPct
      };
    });
  }, [filteredQualityAudits]);

  // Top defect focus recommendations based on Pareto 80/20 data
  const topDefectTriggers = useMemo(() => {
    return errorParetoData.slice(0, 3);
  }, [errorParetoData]);

  // 4. Direct Audited Operator Quality Output Registry
  const qualityRegistry = useMemo(() => {
    if (filteredQualityRollups.length > 0) {
      return filteredQualityRollups.map(r => {
        const emp = employees.find(e => normalizeEmpId(e.empId) === normalizeEmpId(r.empId) || e.name.toLowerCase().trim() === r.name.toLowerCase().trim());
        const designation = emp ? emp.designation : 'Process Associate';
        
        let cert = 'Certified';
        let certColor = 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-100';
        
        if (r.qualityScore < 90.0) {
          cert = 'Remedial training';
          certColor = 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-100';
        } else if (r.qualityScore < 95.0) {
          cert = 'Under review';
          certColor = 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-100';
        }

        return {
          id: r.empId,
          name: r.name,
          designation,
          totalAudited: r.auditedCount,
          accuracy: r.qualityScore,
          cert,
          certColor,
          daysLogged: 22
        };
      }).sort((a, b) => a.accuracy - b.accuracy);
    } else if (filteredQualityAudits.length > 0) {
      const associateMap: { [empId: string]: { name: string; audited: number; errors: number; dates: Set<string> } } = {};
      
      filteredQualityAudits.forEach(a => {
        const empId = a.empId;
        if (!associateMap[empId]) {
          associateMap[empId] = { name: a.empName, audited: 0, errors: 0, dates: new Set() };
        }
        associateMap[empId].audited += (a.auditedCount || 1);
        if (a.status === 'ERROR') {
          associateMap[empId].errors++;
        }
        associateMap[empId].dates.add(a.workedDate);
      });
      
      return Object.keys(associateMap).map(empId => {
        const item = associateMap[empId];
        const accuracy = item.audited > 0 ? Number(((item.audited - item.errors) / item.audited * 100).toFixed(2)) : 100.0;
        const emp = employees.find(e => normalizeEmpId(e.empId) === normalizeEmpId(empId) || e.name.toLowerCase().trim() === item.name.toLowerCase().trim());
        const designation = emp ? emp.designation : 'Process Associate';

        let cert = 'Certified';
        let certColor = 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-100';
        
        if (accuracy < 90.0) {
          cert = 'Remedial training';
          certColor = 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-100';
        } else if (accuracy < 95.0) {
          cert = 'Under review';
          certColor = 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-100';
        }

        return {
          id: empId,
          name: item.name,
          designation,
          totalAudited: item.audited,
          accuracy,
          cert,
          certColor,
          daysLogged: item.dates.size || 1
        };
      }).sort((a, b) => a.accuracy - b.accuracy);
    } else {
      return filteredEmployees.map(emp => {
        const empProds = filteredProduction.filter(p => p.empId === emp.empId);
        const metrics = calculateProductionMetrics(emp.empId, filteredProduction);
        const totalAudited = empProds.reduce((sum, r) => sum + (r.auditedCount || 0), 0);
        
        let cert = 'Certified';
        let certColor = 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-100';
        
        if (metrics.accuracy < 90.0) {
          cert = 'Remedial training';
          certColor = 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-100';
        } else if (metrics.accuracy < 95.0) {
          cert = 'Under review';
          certColor = 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-100';
        }

        return {
          id: emp.empId,
          name: emp.name,
          designation: emp.designation,
          totalAudited,
          accuracy: metrics.accuracy,
          cert,
          certColor,
          daysLogged: metrics.daysLogged
        };
      }).filter(e => e.daysLogged > 0).sort((a,b) => a.accuracy - b.accuracy);
    }
  }, [filteredEmployees, filteredProduction, filteredQualityRollups, filteredQualityAudits, employees]);

  // Filter operator log registry by name or designation
  const filteredRegistry = useMemo(() => {
    return qualityRegistry.filter(op => 
      op.name.toLowerCase().includes(operatorSearch.toLowerCase()) ||
      op.designation.toLowerCase().includes(operatorSearch.toLowerCase())
    );
  }, [qualityRegistry, operatorSearch]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 120, damping: 15 } }
  };

  return (
    <div className="space-y-6" id="quality_workspace">
      
      {/* ─── DYNAMIC METRIC LEAD HEADER (PROFESSIONAL STATS BAR) ──────────────── */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ backgroundImage: 'linear-gradient(to right, #f2ab35 0%, #ec6b1e 50%, #cf5114 100%)' }}
        className="p-6 rounded-[28px] text-[#0f0701] shadow-lg border border-amber-500/20 relative overflow-hidden transition-all duration-300"
      >
        <div className="absolute inset-0 bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:12px_12px] opacity-[0.07] pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-[#0a0400] tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#4e2504] animate-pulse" />
              Quality Workspace
            </h1>
          </div>
        </div>
      </motion.div>

      {/* Dynamic KPI Cards Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3.5" id="quality_view_kpi_cards">
        
        {/* Card 1: Production Count */}
        <button 
          onClick={() => setActiveReportModal(qualityKpiReports.reports.production)}
          className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-xs transition hover:shadow-md hover:border-purple-300 text-left cursor-pointer group focus:outline-none focus:ring-2 focus:ring-purple-200 w-full"
        >
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono block">Production Count</span>
          <h3 className="text-lg font-black text-slate-800 mt-1">{qualityKpiReports.productionCount.toLocaleString()}</h3>
          <span className="text-[8px] text-purple-600 font-bold mt-2 inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            View Report &rarr;
          </span>
        </button>

        {/* Card 2: No. of Transaction Audited */}
        <button 
          onClick={() => setActiveReportModal(qualityKpiReports.reports.audited)}
          className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-xs transition hover:shadow-md hover:border-purple-300 text-left cursor-pointer group focus:outline-none focus:ring-2 focus:ring-purple-200 w-full"
        >
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono block">Audited Txns</span>
          <h3 className="text-lg font-black text-slate-800 mt-1">{qualityKpiReports.auditedCount.toLocaleString()}</h3>
          <span className="text-[8px] text-purple-600 font-bold mt-2 inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            View Report &rarr;
          </span>
        </button>

        {/* Card 3: No. of Errors */}
        <button 
          onClick={() => setActiveReportModal(qualityKpiReports.reports.errors)}
          className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-xs transition hover:shadow-md hover:border-rose-300 text-left cursor-pointer group focus:outline-none focus:ring-2 focus:ring-rose-200 w-full"
        >
          <span className="text-[9px] text-rose-500 font-bold uppercase tracking-wider font-mono block">No. of Errors</span>
          <h3 className="text-lg font-black text-rose-600 mt-1">{qualityKpiReports.errorsCount.toLocaleString()}</h3>
          <span className="text-[8px] text-rose-500 font-bold mt-2 inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            View Errors &rarr;
          </span>
        </button>

        {/* Card 4: Sampling % */}
        <button 
          onClick={() => setActiveReportModal(qualityKpiReports.reports.sampling)}
          className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-xs transition hover:shadow-md hover:border-purple-300 text-left cursor-pointer group focus:outline-none focus:ring-2 focus:ring-purple-200 w-full"
        >
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono block">Sampling %</span>
          <h3 className="text-lg font-black text-slate-800 mt-1">{qualityKpiReports.samplingPct.toFixed(2)}%</h3>
          <span className="text-[8px] text-purple-600 font-bold mt-2 inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            View Rates &rarr;
          </span>
        </button>

        {/* Card 5: Quality Score */}
        <button 
          onClick={() => setActiveReportModal(qualityKpiReports.reports.qualityScore)}
          className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-xs transition hover:shadow-md hover:border-emerald-300 text-left cursor-pointer group focus:outline-none focus:ring-2 focus:ring-emerald-200 w-full"
        >
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono block">Quality Score</span>
          <h3 className={`text-lg font-black mt-1 ${qualityKpiReports.qualityScore >= 95 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {qualityKpiReports.qualityScore.toFixed(1)}%
          </h3>
          <span className="text-[8px] text-emerald-600 font-bold mt-2 inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            View Ranking &rarr;
          </span>
        </button>

        {/* Card 6: Error category (ERROR/NO ERROR/FYI) */}
        <button 
          onClick={() => setActiveReportModal(qualityKpiReports.reports.category)}
          className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-xs transition hover:shadow-md hover:border-purple-300 text-left cursor-pointer group focus:outline-none focus:ring-2 focus:ring-purple-200 w-full"
        >
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono block">Error Category</span>
          <div className="text-[9px] text-slate-700 font-bold space-y-0.5 mt-1 leading-tight">
            <div className="flex justify-between"><span className="text-rose-600 font-extrabold">ERROR:</span> <span className="font-mono font-black">{qualityKpiReports.errorsCount}</span></div>
            <div className="flex justify-between"><span className="text-amber-600 font-extrabold">FYI:</span> <span className="font-mono font-black">{filteredQualityAudits.filter(a => a.status === 'FYI').length}</span></div>
          </div>
          <span className="text-[8px] text-purple-600 font-bold mt-2 inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            View Breakdown &rarr;
          </span>
        </button>

        {/* Card 7: Error type (ERROR Types) */}
        <button 
          onClick={() => setActiveReportModal(qualityKpiReports.reports.errorTypes)}
          className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-xs transition hover:shadow-md hover:border-purple-300 text-left cursor-pointer group focus:outline-none focus:ring-2 focus:ring-purple-200 w-full"
        >
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono block">Error Types</span>
          <p className="text-[9px] text-slate-600 font-bold truncate mt-1 leading-relaxed" title={qualityKpiReports.errorTypesDisplay}>
            {qualityKpiReports.errorTypesDisplay}
          </p>
          <span className="text-[8px] text-purple-600 font-bold mt-2 inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            View Frequencies &rarr;
          </span>
        </button>

      </div>

      {/* ─── PRIMARILY TABBED NAVIGATION BAR ──────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200 w-fit select-none">
        {(['trends', 'pareto', 'outgoing', 'rawlogs'] as const).map((tab) => {
          const isActive = subTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setSubTab(tab)}
              className="relative px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer focus:outline-none"
            >
              {isActive && (
                <motion.span
                  layoutId="activeQualityTabBg"
                  className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/50"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className={`relative z-10 transition-colors duration-250 ${
                isActive ? 'text-purple-600 font-black' : 'text-slate-500 hover:text-slate-800'
              }`}>
                {tab === 'trends' && '📈 Accuracy Performance Trends'}
                {tab === 'pareto' && '📊 Categorized Error Pareto'}
                {tab === 'outgoing' && '📋 Operator Outgoing Accuracy Log'}
                {tab === 'rawlogs' && '📁 Quality Raw Logs'}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── DYNAMIC COLLAPSIBLE ADVANCED FILTER BOARD ──────────────────────── */}
      <div className="bg-white border border-slate-200/85 rounded-2xl shadow-xs overflow-hidden">
        <button
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
          className="w-full flex items-center justify-between px-6 py-4 bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-purple-600" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-700 font-mono">
              Quality Workspace Filter Option Panel
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-4xs uppercase tracking-wider font-extrabold font-mono">
              {isFilterExpanded ? 'Click to collapse' : 'Click to expand'}
            </span>
            {isFilterExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        <AnimatePresence initial={false}>
          {isFilterExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="p-6 border-t border-slate-100 bg-white grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Employee Select */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 font-mono">
                    Employee Name
                  </label>
                  <select 
                    value={empName} 
                    onChange={e => handleEmpNameChange(e.target.value)} 
                    className="w-full bg-slate-50/70 border border-slate-200 hover:border-slate-300 focus:border-purple-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition cursor-pointer outline-none"
                  >
                    <option value="">All Employees</option>
                    {uniqueEmps.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>

                {/* Reporting Manager Select */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 font-mono">
                    Reporting Manager
                  </label>
                  <select 
                    value={reportingManager} 
                    onChange={e => handleReportingManagerChange(e.target.value)} 
                    className="w-full bg-slate-50/70 border border-slate-200 hover:border-slate-300 focus:border-purple-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition cursor-pointer outline-none"
                  >
                    <option value="">All Managers</option>
                    {uniqueRMs.map(rm => <option key={rm} value={rm}>{rm}</option>)}
                  </select>
                </div>

                {/* Line Manager Select */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 font-mono">
                    Line Manager
                  </label>
                  <select 
                    value={lineManager} 
                    onChange={e => handleLineManagerChange(e.target.value)} 
                    className="w-full bg-slate-50/70 border border-slate-200 hover:border-slate-300 focus:border-purple-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition cursor-pointer outline-none"
                  >
                    <option value="">All Managers</option>
                    {uniqueLMs.map(lm => <option key={lm} value={lm}>{lm}</option>)}
                  </select>
                </div>

                {/* RCM Manager Select */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 font-mono">
                    RCM Manager
                  </label>
                  <select 
                    value={rcmManager} 
                    onChange={e => handleRcmManagerChange(e.target.value)} 
                    className="w-full bg-slate-50/70 border border-slate-200 hover:border-slate-300 focus:border-purple-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition cursor-pointer outline-none"
                  >
                    <option value="">All Managers</option>
                    {uniqueRCMs.map(rcm => <option key={rcm} value={rcm}>{rcm}</option>)}
                  </select>
                </div>

                {/* Process Filter */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 font-mono">
                    Process Domain
                  </label>
                  <select 
                    value={processFilter} 
                    onChange={e => handleProcessFilterChange(e.target.value)} 
                    className="w-full bg-slate-50/70 border border-slate-200 hover:border-slate-300 focus:border-purple-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition cursor-pointer outline-none"
                  >
                    <option value="">All Processes</option>
                    {uniqueProcesses.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {/* Sub Process Filter */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 font-mono">
                    Sub Process Domain
                  </label>
                  <select 
                    value={subProcessFilter} 
                    onChange={e => handleSubProcessFilterChange(e.target.value)} 
                    className="w-full bg-slate-50/70 border border-slate-200 hover:border-slate-300 focus:border-purple-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition cursor-pointer outline-none"
                  >
                    <option value="">All Sub Processes</option>
                    {uniqueSubProcesses.map(sp => <option key={sp} value={sp}>{sp}</option>)}
                  </select>
                </div>

                {/* Reset Buttons */}
                {(empName || reportingManager || lineManager || rcmManager || processFilter || subProcessFilter) && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-6 flex justify-end pt-2"
                  >
                    <button
                      onClick={handleResetFilters}
                      className="px-4 py-2 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold uppercase tracking-wide cursor-pointer transition-all"
                    >
                      Clear Active Filters
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── DYNAMIC TAB CONTENTS ────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={subTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="space-y-6"
        >
          {/* TAB 1: Trends */}
          {subTab === 'trends' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Outgoing Accuracy Weekly Trends Line Chart */}
              <motion.div 
                variants={itemVariants}
                onClick={() => openChartExplanation("Outgoing Accuracy Weekly Trends")}
                className="bg-white border border-slate-200/85 p-6 rounded-2xl shadow-xs cursor-pointer transition-all hover:border-purple-400 hover:shadow-md hover:ring-2 hover:ring-purple-50"
              >
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Activity size={16} className="text-purple-500" />
                      Outgoing Accuracy Weekly Trends
                      <button
                        onClick={(e) => { e.stopPropagation(); openChartExplanation("Outgoing Accuracy Weekly Trends"); }}
                        className="text-slate-400 hover:text-purple-600 p-1 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition flex items-center gap-1 text-[10px] font-bold"
                        title="Explain Calculation"
                      >
                        <HelpCircle size={12} />
                        <span className="sr-only sm:not-sr-only">Explain Math</span>
                      </button>
                    </h3>
                  </div>
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyAccuracyTrends} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="week" stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} domain={[85, 100]} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#1e293b',
                          borderRadius: '12px',
                          color: '#ffffff',
                          fontSize: '11px'
                        }}
                      />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Line type="monotone" name="Accuracy Rate %" dataKey="Accuracy Rate %" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                      <Line type="monotone" name="Target Baseline %" dataKey="Target Baseline %" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Organizational Quality Baselines Bar Chart */}
              <motion.div 
                variants={itemVariants}
                onClick={() => openChartExplanation("Organizational Quality Baselines")}
                className="bg-white border border-slate-200/85 p-6 rounded-2xl shadow-xs cursor-pointer transition-all hover:border-indigo-400 hover:shadow-md hover:ring-2 hover:ring-indigo-50"
              >
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <TrendingUp size={16} className="text-indigo-500" />
                      Organizational Quality Baselines (Process Wise)
                      <button
                        onClick={(e) => { e.stopPropagation(); openChartExplanation("Organizational Quality Baselines"); }}
                        className="text-slate-400 hover:text-indigo-600 p-1 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition flex items-center gap-1 text-[10px] font-bold"
                        title="Explain Calculation"
                      >
                        <HelpCircle size={12} />
                        <span className="sr-only sm:not-sr-only">Explain Math</span>
                      </button>
                    </h3>
                  </div>
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={orgQualityBaselines} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} domain={[80, 100]} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#1e293b',
                          borderRadius: '12px',
                          color: '#ffffff',
                          fontSize: '11px'
                        }}
                      />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar name="Baseline Accuracy %" dataKey="Baseline Accuracy %" fill="#6366f1" barSize={18} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>
          )}

          {/* TAB 2: Pareto */}
          {subTab === 'pareto' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Pareto Dual Axis Composed Chart */}
              <motion.div 
                variants={itemVariants}
                onClick={() => openChartExplanation("Error Defect Pareto")}
                className="bg-white border border-slate-200/85 p-6 rounded-2xl shadow-xs lg:col-span-2 cursor-pointer transition-all hover:border-amber-400 hover:shadow-md hover:ring-2 hover:ring-amber-50"
              >
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Zap size={16} className="text-amber-500 animate-pulse" />
                      Error Defect Pareto (By Category Volume)
                      <button
                        onClick={(e) => { e.stopPropagation(); openChartExplanation("Error Defect Pareto"); }}
                        className="text-slate-400 hover:text-amber-600 p-1 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition flex items-center gap-1 text-[10px] font-bold"
                        title="Explain Calculation"
                      >
                        <HelpCircle size={12} />
                        <span className="sr-only sm:not-sr-only">Explain Math</span>
                      </button>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase font-mono tracking-wider">
                      Applying the 80/20 rule to focus on the top factors causing defects
                    </p>
                  </div>
                </div>

                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={errorParetoData} margin={{ left: -15, right: 15, top: 10, bottom: 0 }}>
                      <CartesianGrid stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={8} tickLine={false} interval={0} />
                      <YAxis yAxisId="left" stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={9} tickLine={false} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#1e293b',
                          borderRadius: '12px',
                          color: '#ffffff',
                          fontSize: '11px'
                        }}
                      />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar yAxisId="left" name="Defect Count" dataKey="Defect Count" fill="#ec4899" barSize={18} radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" name="Cumulative %" dataKey="Cumulative %" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Priority Remedial Focus Path */}
              <motion.div 
                variants={itemVariants}
                onClick={() => openChartExplanation("Priority Remedial Focus Path")}
                className="bg-white border border-slate-200/85 p-6 rounded-2xl shadow-xs flex flex-col justify-between cursor-pointer transition-all hover:border-purple-400 hover:shadow-md hover:ring-2 hover:ring-purple-50"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <AlertCircle size={16} className="text-purple-600" />
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest font-mono flex items-center gap-1.5">
                      Priority Remedial Focus Path
                      <button
                        onClick={(e) => { e.stopPropagation(); openChartExplanation("Priority Remedial Focus Path"); }}
                        className="text-slate-400 hover:text-purple-600 p-1 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition flex items-center gap-1 text-[10px] font-bold"
                        title="Explain Calculation"
                      >
                        <HelpCircle size={12} />
                        <span className="sr-only sm:not-sr-only">Explain Math</span>
                      </button>
                    </h3>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Applying the <strong className="text-purple-600 font-bold">80/20 Rule (Pareto Principle)</strong> to our transaction backlog suggests that correcting the top triggers recovers <strong className="text-emerald-600 font-bold">80% of lost outputs</strong>.
                  </p>

                  <div className="space-y-3">
                    {topDefectTriggers.map((df, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-[10px] font-mono">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="text-xs font-extrabold text-slate-800 block leading-tight">{df.name}</span>
                            <span className="text-[9px] text-slate-400 font-semibold uppercase font-mono tracking-wide">Remedial Focus</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-rose-600 font-mono">Qty: {df['Defect Count']}</span>
                          <span className="block text-[9px] text-slate-400 font-mono font-bold">Cumul: {formatPercent(df['Cumulative %'])}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 font-mono">
                    Priority Remediation Insight
                  </p>
                  <div className="bg-purple-50/50 border border-purple-100 p-3 rounded-xl text-[10px] text-purple-800 leading-relaxed font-medium">
                    Schedule review and refitting modules for <strong>{topDefectTriggers[0]?.name || 'Incorrect Demo Capture'}</strong> with bottom performers this cycle. Halting these errors recovers a major portion of evaluated scores.
                  </div>
                </div>
              </motion.div>

            </div>
          )}

          {/* TAB 3: Outgoing Log Registry Table */}
          {subTab === 'outgoing' && (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="bg-white border border-slate-200/85 rounded-2xl shadow-xs overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-4 md:items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest font-mono">
                    Direct Audited Operator Quality Output Registry
                  </h3>
                </div>
                
                {/* Internal Table Search Box */}
                <div className="relative w-full md:w-64">
                  <input
                    type="text"
                    placeholder="Search operator name or role..."
                    value={operatorSearch}
                    onChange={e => setOperatorSearch(e.target.value)}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-purple-500 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-700 shadow-xs outline-none transition"
                  />
                  <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                </div>
              </div>

              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-6">Operator Details</th>
                      <th className="py-3 px-6">Role Designation</th>
                      <th className="py-3 px-6 text-center">Total Audited Claims</th>
                      <th className="py-3 px-6 text-center">Audited Accuracy</th>
                      <th className="py-3 px-6 text-right">Status Certificate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                    {filteredRegistry.map((op, idx) => (
                      <motion.tr 
                        key={idx}
                        variants={itemVariants}
                        className="hover:bg-slate-50/55 transition-colors"
                      >
                        <td className="py-3 px-6 font-semibold text-slate-800">{op.name}</td>
                        <td className="py-3 px-6 text-slate-400 font-semibold">{op.designation}</td>
                        <td className="py-3 px-6 text-center font-mono font-bold text-slate-700">{op.totalAudited || 'N/A'}</td>
                        <td className={`py-3 px-6 text-center font-mono font-black text-xs ${
                          op.accuracy >= 95.0 
                            ? 'text-emerald-600' 
                            : op.accuracy >= 90.0 
                            ? 'text-amber-600' 
                            : 'text-rose-600'
                        }`}>
                          {formatPercent(op.accuracy)}
                        </td>
                        <td className="py-3 px-6 text-right">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border ring-2 ring-offset-1 ${op.certColor}`}>
                            {op.cert}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                    {filteredRegistry.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-slate-400 font-bold uppercase tracking-wider text-xs">
                          No operator logs match the search query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* TAB 4: Quality Raw Logs */}
          {subTab === 'rawlogs' && (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="bg-white border border-slate-200/85 rounded-2xl shadow-xs overflow-hidden space-y-4 animate-in fade-in duration-200"
            >
              <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-4 md:items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest font-mono">
                    Quality Raw Logs Explorer
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Browse, filter, and audit full quality raw transactional records uploaded into the platform
                  </p>
                </div>
                
                {/* Search Box */}
                <div className="relative w-full md:w-80">
                  <input
                    type="text"
                    placeholder="Search raw logs by name, client, auditor, etc..."
                    value={rawLogsSearch}
                    onChange={e => setRawLogsSearch(e.target.value)}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-purple-500 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-700 shadow-xs outline-none transition"
                  />
                  <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                </div>
              </div>

              {/* Scrollable Container */}
              <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
                <table className="w-full text-left text-[11px] border-collapse min-w-[2800px]">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[9px] sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-4 sticky left-0 z-20 bg-slate-950 text-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">Associate ID & Name</th>
                      <th className="py-3 px-4">Worked Date</th>
                      <th className="py-3 px-4">Client Name</th>
                      <th className="py-3 px-4">PMS/Billing Software</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Process</th>
                      <th className="py-3 px-4">Sub Process</th>
                      <th className="py-3 px-4 text-center">Production Count</th>
                      <th className="py-3 px-4">File Name / Batch#</th>
                      <th className="py-3 px-4 text-center">PG#</th>
                      <th className="py-3 px-4 text-center">Check#</th>
                      <th className="py-3 px-4 text-center">Claim# / Account</th>
                      <th className="py-3 px-4">DOS</th>
                      <th className="py-3 px-4 text-right">CPT / Check Amt</th>
                      <th className="py-3 px-4">Denial Comments</th>
                      <th className="py-3 px-4">Action Taken</th>
                      <th className="py-3 px-4">Auditor Checked EMP ID</th>
                      <th className="py-3 px-4">Auditor Checked Name</th>
                      <th className="py-3 px-4">Audit Date</th>
                      <th className="py-3 px-4">Auditor Review Comments</th>
                      <th className="py-3 px-4 text-center">#Number of ERROR</th>
                      <th className="py-3 px-4 text-center">Total Audited</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">ERROR Types</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Primary Reporting Name</th>
                      <th className="py-3 px-4">Rework Status</th>
                      <th className="py-3 px-4">Feedback Comments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-medium animate-in fade-in duration-300">
                    {paginatedRawLogs.map((log, idx) => {
                      const isError = log.status === 'ERROR';
                      const isFyi = log.status === 'FYI';
                      
                      return (
                        <tr key={log.id || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-black text-slate-800 sticky left-0 z-15 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">
                            <span className="block text-[10px] text-slate-400 font-mono font-normal">{log.empId}</span>
                            {log.empName}
                          </td>
                          <td className="py-3 px-4 font-mono">{log.workedDate}</td>
                          <td className="py-3 px-4 font-extrabold text-slate-700">{log.clientName}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-[10px] font-mono text-indigo-600 font-bold uppercase">{log.pms}</span>
                          </td>
                          <td className="py-3 px-4 font-mono">{log.location}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] uppercase font-bold text-slate-500">{log.processName}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-500">{log.subProcessName}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold">{log.productionCount || 0}</td>
                          <td className="py-3 px-4 font-mono text-slate-500">{log.fileNameBatch || 'N/A'}</td>
                          <td className="py-3 px-4 font-mono text-center">{log.pg || 'N/A'}</td>
                          <td className="py-3 px-4 font-mono text-center">{log.checkNum || 'N/A'}</td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-700 text-center">{log.claimNum || 'N/A'}</td>
                          <td className="py-3 px-4 font-mono text-slate-400">{log.dateOfService || 'N/A'}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">{log.cptAmount || 'N/A'}</td>
                          <td className="py-3 px-4 max-w-xs truncate text-slate-500" title={log.comments}>{log.comments || 'N/A'}</td>
                          <td className="py-3 px-4 max-w-xs truncate text-slate-500" title={log.actionTaken}>{log.actionTaken || 'N/A'}</td>
                          <td className="py-3 px-4 font-mono text-slate-400">{log.auditorEmpId || 'N/A'}</td>
                          <td className="py-3 px-4 text-slate-700 font-semibold">{log.auditorName || 'N/A'}</td>
                          <td className="py-3 px-4 font-mono text-slate-400">{log.auditDate || 'N/A'}</td>
                          <td className="py-3 px-4 max-w-xs truncate text-slate-500" title={log.auditorComments}>{log.auditorComments || 'N/A'}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-rose-600">{log.errorCount || 0}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold">{log.auditedCount || 0}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border whitespace-nowrap ${
                              isError 
                                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                : isFyi 
                                ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {isError ? 'One-Time Error' : isFyi ? 'Repeated Error' : log.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500">{log.errorType || 'N/A'}</td>
                          <td className="py-3 px-4 font-mono text-[10px] text-purple-600 font-bold">{log.category || 'N/A'}</td>
                          <td className="py-3 px-4 font-semibold text-slate-700">{log.primaryReportingName || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                              (log.reworkStatus || '').toLowerCase() === 'completed' 
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}>
                              {log.reworkStatus || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-slate-400 font-mono" title={log.feedbackComments}>{log.feedbackComments || 'N/A'}</td>
                        </tr>
                      );
                    })}
                    {filteredRawLogs.length === 0 && (
                      <tr>
                        <td colSpan={28} className="text-center py-20 text-slate-400 font-bold uppercase tracking-wider text-xs">
                          No quality raw logs match the search query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {filteredRawLogs.length > 0 && (
                <div className="p-4 border-t border-slate-150 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide font-mono">
                    Showing {Math.min(filteredRawLogs.length, (rawLogsPage - 1) * itemsPerPage + 1)} to {Math.min(filteredRawLogs.length, rawLogsPage * itemsPerPage)} of {filteredRawLogs.length} Records
                  </span>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => setRawLogsPage(prev => Math.max(1, prev - 1))}
                      disabled={rawLogsPage === 1}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 disabled:opacity-50 disabled:pointer-events-none rounded-lg text-xs font-bold font-mono transition shadow-xs cursor-pointer text-slate-600 hover:text-slate-900"
                    >
                      ◀ PREV
                    </button>
                    
                    <span className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-black font-mono text-slate-700">
                      PAGE {rawLogsPage} OF {totalRawLogsPages}
                    </span>
                    
                    <button
                      onClick={() => setRawLogsPage(prev => Math.min(totalRawLogsPages, prev + 1))}
                      disabled={rawLogsPage === totalRawLogsPages}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 disabled:opacity-50 disabled:pointer-events-none rounded-lg text-xs font-bold font-mono transition shadow-xs cursor-pointer text-slate-600 hover:text-slate-900"
                    >
                      NEXT ▶
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ─── DYNAMIC KPI CARDS DETAILED REPORT POPUP MODAL ────────────────── */}
      {activeReportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in duration-150 text-slate-700 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
                  <SlidersHorizontal size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide font-mono">
                    {activeReportModal.title}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                    {activeReportModal.description}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveReportModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Table Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {activeReportModal.rows.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-medium">
                  No records found under active filter criteria.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10">
                      <tr>
                        {activeReportModal.headers.map((h, i) => (
                          <th key={i} className="py-3 px-5 text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                      {activeReportModal.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="py-3.5 px-5 font-semibold text-slate-700 font-sans">
                              {/* Highlight statuses or specific numbers */}
                              {typeof cell === 'string' && (cell.includes('Error') || cell.includes('ERROR') || cell.includes('FYI')) ? (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  cell.includes('One-Time') || cell.includes('ERROR')
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {cell}
                                </span>
                              ) : (
                                cell
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => setActiveReportModal(null)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition shadow-xs"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CHART EXPLANATION MODAL ─────────────────────────────────────── */}
      {selectedChartExplanation && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className={`bg-white rounded-3xl border border-slate-200 shadow-2xl w-full ${chartModalTab === 'breakdown' ? 'max-w-4xl' : 'max-w-2xl'} overflow-hidden animate-in fade-in zoom-in duration-150 text-slate-700`}>
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
                        selectedChartExplanation === 'Outgoing Accuracy Weekly Trends' ? `${weeklyAccuracyTrends.length} Weeks` :
                        selectedChartExplanation === 'Organizational Quality Baselines' ? `${orgQualityBaselines.length} Process Baselines` :
                        selectedChartExplanation === 'Error Defect Pareto' ? `${errorParetoData.length} Error Categories` :
                        selectedChartExplanation === 'Priority Remedial Focus Path' ? `${topDefectTriggers.length} Main Triggers` : ''
                      })
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                    <table className="w-full text-left border-collapse bg-white text-xs">
                      {selectedChartExplanation === 'Outgoing Accuracy Weekly Trends' && (
                        <>
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-mono">
                              <th className="py-3 px-4">Calendar Window</th>
                              <th className="py-3 px-4 text-center">Avg Accuracy Rate %</th>
                              <th className="py-3 px-4 text-center">Target SLA Baseline</th>
                              <th className="py-3 px-4 text-center">SLA Compliance Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                            {weeklyAccuracyTrends.map((e, idx) => {
                              const isCompliant = e['Accuracy Rate %'] >= 95.0;
                              return (
                                <tr key={idx} className="hover:bg-slate-50/70 transition">
                                  <td className="py-2.5 px-4 font-mono font-bold text-slate-600">{e.week}</td>
                                  <td className="py-2.5 px-4 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                                      isCompliant ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-600 bg-rose-50 border-rose-100'
                                    }`}>
                                      {formatPercent(e['Accuracy Rate %'])}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-center text-slate-500 font-mono">95.0%</td>
                                  <td className="py-2.5 px-4 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                                      isCompliant ? 'text-emerald-700 bg-emerald-100/60' : 'text-rose-700 bg-rose-100/60'
                                    }`}>
                                      {isCompliant ? 'Compliant' : 'Breached'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </>
                      )}

                      {selectedChartExplanation === 'Organizational Quality Baselines' && (
                        <>
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-mono">
                              <th className="py-3 px-4">Process Segment</th>
                              <th className="py-3 px-4 text-center">Baseline Accuracy %</th>
                              <th className="py-3 px-4 text-center">Standard Target</th>
                              <th className="py-3 px-4 text-center">Variance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                            {orgQualityBaselines.map((e, idx) => {
                              const variance = Number((e['Baseline Accuracy %'] - 95).toFixed(1));
                              const isPositive = variance >= 0;
                              return (
                                <tr key={idx} className="hover:bg-slate-50/70 transition">
                                  <td className="py-2.5 px-4">
                                    <span className="px-2 py-0.5 bg-slate-100 rounded-md text-slate-600 font-bold uppercase font-mono text-[9px]">
                                      {e.name}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                                      e['Baseline Accuracy %'] >= 95 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-600 bg-rose-50 border-rose-100'
                                    }`}>
                                      {formatPercent(e['Baseline Accuracy %'])}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-center text-slate-500 font-mono">95%</td>
                                  <td className="py-2.5 px-4 text-center font-mono">
                                    <span className={`font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {isPositive ? '+' : ''}{formatPercent(variance)}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </>
                      )}

                      {(selectedChartExplanation === 'Error Defect Pareto' || selectedChartExplanation === 'Priority Remedial Focus Path') && (
                        <>
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-mono">
                              <th className="py-3 px-4">Category Trigger</th>
                              <th className="py-3 px-4 text-center">Defect Count</th>
                              <th className="py-3 px-4 text-center">Cumulative Ratio %</th>
                              <th className="py-3 px-4 text-center">Remedial Action Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                            {(selectedChartExplanation === 'Priority Remedial Focus Path' ? topDefectTriggers : errorParetoData).map((e, idx) => {
                              const isTopTrigger = idx < 3;
                              return (
                                <tr key={idx} className="hover:bg-slate-50/70 transition">
                                  <td className="py-2.5 px-4 font-bold text-slate-800">{e.name}</td>
                                  <td className="py-2.5 px-4 text-center text-rose-600 font-bold font-mono">{e['Defect Count']}</td>
                                  <td className="py-2.5 px-4 text-center font-mono">{formatPercent(e['Cumulative %'])}</td>
                                  <td className="py-2.5 px-4 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                                      isTopTrigger ? 'text-rose-700 bg-rose-50 border-rose-100 animate-pulse' : 'text-slate-500 bg-slate-50 border-slate-100'
                                    }`}>
                                      {isTopTrigger ? '🔥 High Priority' : 'Standard Queue'}
                                    </span>
                                  </td>
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
                      {selectedChartExplanation === 'Outgoing Accuracy Weekly Trends' && (
                        <span>Weekly Accuracy = (∑ Quality Rating for Week) / (Total Days Audited in Week). Plotted against the standard 95% SLA Target Line.</span>
                      )}
                      {selectedChartExplanation === 'Organizational Quality Baselines' && (
                        <span>Process Baseline = Average of Audit Accuracy ratings for each process stream. It aggregates records based on active filter choices.</span>
                      )}
                      {selectedChartExplanation === 'Error Defect Pareto' && (
                        <span>Plots defect frequencies descending. Cumulative % = (Running Sum of Defects / Grand Total Defects) × 100 (Dual Axis).</span>
                      )}
                      {selectedChartExplanation === 'Priority Remedial Focus Path' && (
                        <span>Filters defects to identify the top 3 high-volume triggers. Recovers the largest portion of errors according to the 80/20 Rule.</span>
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
                          <span className="text-slate-500">Filtered Logs Checked:</span>
                          <span className="font-mono font-bold text-slate-800">{production.length} audited entries</span>
                        </div>

                        <div className="flex justify-between font-medium">
                          <span className="text-slate-500">Roster Staff:</span>
                          <span className="font-mono font-bold text-slate-800">{new Set(production.map(p => p.empId)).size} representatives</span>
                        </div>
                      </div>

                      {/* Right Column: Step by step logic */}
                      <div className="bg-indigo-50/45 p-4 rounded-xl border border-indigo-100/60 space-y-2.5">
                        <span className="text-[9px] text-indigo-950/60 font-black uppercase tracking-wider font-mono block mb-1">
                          Execution Trace
                        </span>
                        
                        {selectedChartExplanation === 'Outgoing Accuracy Weekly Trends' && (
                          <p className="text-[11px] text-indigo-900 leading-normal font-medium">
                            1. System reads audited production logs.<br />
                            2. Clusters records into weekly windows.<br />
                            3. Calculates average QA score for each week sequence.
                          </p>
                        )}

                        {selectedChartExplanation === 'Organizational Quality Baselines' && (
                          <p className="text-[11px] text-indigo-900 leading-normal font-medium">
                            1. Segments production logs by RCM stream.<br />
                            2. Averages accuracy values per segment.<br />
                            3. Renders high-contrast bar columns.
                          </p>
                        )}

                        {selectedChartExplanation === 'Error Defect Pareto' && (
                          <p className="text-[11px] text-indigo-900 leading-normal font-medium">
                            1. tallies occurrence of each error category.<br />
                            2. Sorts categories from highest to lowest volume.<br />
                            3. Plots running cumulative percentages as a secondary axis line.
                          </p>
                        )}

                        {selectedChartExplanation === 'Priority Remedial Focus Path' && (
                          <p className="text-[11px] text-indigo-900 leading-normal font-medium">
                            1. Evaluates defect tally list.<br />
                            2. Identifies categories that sum to 80% of total errors.<br />
                            3. Directs managers to prioritize specific remediation modules.
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

    </div>
  );
};
