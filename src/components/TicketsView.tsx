import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Ticket, EmployeeProcess, ProductionRecord, Employee } from '../types';
import { 
  ClipboardList, AlertCircle, CheckCircle2, XCircle, Clock, 
  Send, Plus, Check, X, Search, Filter, RefreshCcw, User,
  Lock, ShieldAlert, CheckSquare, PlusCircle, Users, ArrowRight, Settings, FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const TicketsView: React.FC = () => {
  const { 
    employees, 
    production, 
    attendance,
    tickets, 
    addTicket, 
    approveTicket, 
    rejectTicket,
    clearTickets,
    showAlert,
    currentUser,
    currentUserRole
  } = useApp();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [showNewForm, setShowNewForm] = useState(false);

  // Advanced Ticket Type Selection
  const [customTicketCategory, setCustomTicketCategory] = useState('Wrongly uploaded the production data');

  const detectedSubForm = useMemo(() => {
    const text = customTicketCategory.toLowerCase();
    if (text.includes('target') || text.includes('baseline') || text.includes('adjustment')) {
      return 'Target Change';
    }
    if (text.includes('joiner') || text.includes('employee') || text.includes('register') || text.includes('join') || text.includes('add new employee') || text.includes('new joiner')) {
      return 'New Joiner';
    }
    if (text.includes('team') || text.includes('manager') || text.includes('reporting') || text.includes('remap') || text.includes('team change')) {
      return 'Team Change';
    }
    if (text.includes('process') || text.includes('workflow') || text.includes('sub-process')) {
      return 'Add Process';
    }
    return 'Data Correction'; // fallback/default
  }, [customTicketCategory]);

  // Form states - Base fields
  const [formEmpId, setFormEmpId] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formField, setFormField] = useState<'achieved' | 'target' | 'accuracy'>('achieved');
  const [formNewValue, setFormNewValue] = useState<number>(0);
  const [formReason, setFormReason] = useState('');

  // Form states - New Joiner / Add Employee Details
  const [newEmpId, setNewEmpId] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpDesignation, setNewEmpDesignation] = useState('Associate - AR');
  const [newEmpDoj, setNewEmpDoj] = useState(new Date().toISOString().split('T')[0]);
  const [newEmpRm, setNewEmpRm] = useState('');
  const [newEmpLm, setNewEmpLm] = useState('');
  const [newEmpRcm, setNewEmpRcm] = useState('');

  // Form states - Team Change
  const [teamChangeEmpId, setTeamChangeEmpId] = useState('');
  const [teamChangeNewRm, setTeamChangeNewRm] = useState('');
  const [teamChangeNewLm, setTeamChangeNewLm] = useState('');
  const [teamChangeNewRcm, setTeamChangeNewRcm] = useState('');

  // Form states - Add Process / Sub-Process Details
  const [processPms, setProcessPms] = useState('ECW');
  const [processName, setProcessName] = useState('');
  const [processSubName, setProcessSubName] = useState('');
  const [processTarget, setProcessTarget] = useState<number>(100);

  // Check Role Permissions
  const hasFullAccess = currentUserRole === 'Admin' || currentUserRole === 'General Manager';

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

  // Auto-resolve current old value based on selected employee and date
  const resolvedOldValue = useMemo(() => {
    if (!formEmpId || !formDate) return 0;
    const match = production.find(
      p => p && p.empId && p.empId.toString().toUpperCase().trim() === formEmpId.toString().toUpperCase().trim() && p.date === formDate
    );
    if (!match) return 0;
    return match[formField] || 0;
  }, [formEmpId, formDate, formField, production]);

  // Statistics
  const stats = useMemo(() => {
    const pending = tickets.filter(t => t.status === 'Pending').length;
    const approved = tickets.filter(t => t.status === 'Approved').length;
    const rejected = tickets.filter(t => t.status === 'Rejected').length;
    return {
      total: tickets.length,
      pending,
      approved,
      rejected
    };
  }, [tickets]);

  // Handle submit new ticket
  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    
    let detailsReason = formReason || 'None provided.';
    let empId = formEmpId;
    let empName = '';
    let prodDate = formDate;
    let field = formField;
    let oldVal = resolvedOldValue;
    let newVal = Number(formNewValue);
    
    let newEmpDetails = undefined;
    let teamChangeDetails = undefined;
    let processDetails = undefined;

    const subForm = detectedSubForm;

    if (subForm === 'New Joiner') {
      if (!newEmpId || !newEmpName) {
        showAlert('Please fill in the Employee ID and Name.');
        return;
      }
      empId = newEmpId;
      empName = newEmpName;
      prodDate = newEmpDoj;
      newEmpDetails = {
        empId: newEmpId,
        name: newEmpName,
        designation: newEmpDesignation,
        doj: newEmpDoj,
        status: 'New Joiner' as const,
        rm: newEmpRm || 'Unassigned',
        lm: newEmpLm || 'Unassigned',
        rcm: newEmpRcm || 'Unassigned'
      };
      detailsReason = `Request to register employee: ${newEmpName} (${newEmpId}) - Designation: ${newEmpDesignation}. RM: ${newEmpRm}, LM: ${newEmpLm}, RCM: ${newEmpRcm}. Justification: ${formReason}`;
    } else if (subForm === 'Team Change') {
      if (!teamChangeEmpId) {
        showAlert('Please select an employee.');
        return;
      }
      const emp = employees.find(e => e.empId === teamChangeEmpId);
      empId = teamChangeEmpId;
      empName = emp?.name || '';
      teamChangeDetails = {
        empId: teamChangeEmpId,
        newRm: teamChangeNewRm,
        newLm: teamChangeNewLm,
        newRcm: teamChangeNewRcm
      };
      detailsReason = `Request team manager remapping for ${empName}. New RM: ${teamChangeNewRm}, New LM: ${teamChangeNewLm}, New RCM: ${teamChangeNewRcm}. Justification: ${formReason}`;
    } else if (subForm === 'Add Process') {
      if (!processName || !processSubName) {
        showAlert('Please fill in the Process and Sub-Process names.');
        return;
      }
      processDetails = {
        pms: processPms,
        processName,
        subProcessName: processSubName,
        target: Number(processTarget)
      };
      detailsReason = `Request to introduce process: ${processPms} - ${processName} / ${processSubName} (Target: ${processTarget}). Justification: ${formReason}`;
    } else {
      // standard Data Correction or Target Change
      if (!formEmpId) {
        showAlert('Please select an employee.');
        return;
      }
      const selectedEmp = employees.find(emp => emp.empId === formEmpId);
      empName = selectedEmp?.name || '';
      
      if (formNewValue < 0) {
        showAlert('Proposed value must be a positive number.');
        return;
      }
    }

    const newTicket: Ticket = {
      id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      requestor: currentUser || 'User',
      requestorRole: currentUserRole || 'User(Production)',
      ticketType: customTicketCategory,
      empId,
      empName,
      productionDate: prodDate,
      fieldToChange: field,
      oldValue: oldVal,
      newValue: newVal,
      reason: detailsReason,
      status: 'Pending',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      newEmployeeDetails: newEmpDetails,
      teamChangeDetails,
      processDetails
    };

    addTicket(newTicket);
    
    // Reset Form fields
    setFormReason('');
    setNewEmpId('');
    setNewEmpName('');
    setProcessName('');
    setProcessSubName('');
    setFormEmpId('');
    setFormNewValue(0);
    setTeamChangeEmpId('');
    setTeamChangeNewRm('');
    setTeamChangeNewLm('');
    setTeamChangeNewRcm('');
    setShowNewForm(false);
  };

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Status filter
      if (statusFilter !== 'All' && ticket.status !== statusFilter) return false;

      // Search term filter
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        return (
          ticket.id.toLowerCase().includes(query) ||
          ticket.empId.toLowerCase().includes(query) ||
          ticket.empName.toLowerCase().includes(query) ||
          ticket.requestor.toLowerCase().includes(query) ||
          ticket.reason.toLowerCase().includes(query) ||
          (ticket.ticketType && ticket.ticketType.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [tickets, statusFilter, searchTerm]);

  return (
    <div className="space-y-6 animate-fade-in" id="ticketing_system_view">
      
      {/* Shared KPI Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4" id="view_shared_kpi_cards">
        <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-xs transition hover:shadow-md">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono block">Avg Daily Prod</span>
          <div className="flex items-baseline gap-1 mt-1">
            <h3 className="text-lg font-black text-slate-800">{kpiMetrics.avgDailyProd}</h3>
            <span className="text-[10px] text-slate-400 font-medium">units</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-xs transition hover:shadow-md">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono block">Avg Weekly Prod</span>
          <div className="flex items-baseline gap-1 mt-1">
            <h3 className="text-lg font-black text-slate-800">{kpiMetrics.avgWeeklyProd}</h3>
            <span className="text-[10px] text-slate-400 font-medium">units</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-xs transition hover:shadow-md">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono block">Productivity %</span>
          <div className="flex items-baseline gap-1 mt-1">
            <h3 className="text-lg font-black text-slate-800">{kpiMetrics.productivityPct}%</h3>
            <span className={`text-[9px] font-bold px-1 py-0.2 rounded ml-1.5 ${
              kpiMetrics.productivityPct >= 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
            }`}>
              {kpiMetrics.productivityPct >= 90 ? 'SLA' : 'Short'}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-xs transition hover:shadow-md">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono block">Quality %</span>
          <div className="flex items-baseline gap-1 mt-1">
            <h3 className="text-lg font-black text-slate-800">{kpiMetrics.avgQualityPct}%</h3>
            <span className={`text-[9px] font-bold px-1 py-0.2 rounded ml-1.5 ${
              kpiMetrics.avgQualityPct >= 95 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              {kpiMetrics.avgQualityPct >= 95 ? 'Target' : 'Below'}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-xs transition hover:shadow-md">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono block">Shrinkage %</span>
          <div className="flex items-baseline gap-1 mt-1">
            <h3 className="text-lg font-black text-slate-800">{kpiMetrics.shrinkagePct}%</h3>
            <span className="text-[9px] text-slate-400 font-medium ml-1.5">Off-Duty</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-xs transition hover:shadow-md">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono block">Hours Shortfall</span>
          <div className="flex items-baseline gap-1 mt-1">
            <h3 className="text-lg font-black text-rose-600">{kpiMetrics.hoursShortfall}h</h3>
            <span className="text-[9px] text-rose-400 font-medium ml-1">deficit</span>
          </div>
        </div>
      </div>

      {/* Role-Based Governance Notice Banner */}
      <div className={`p-4 rounded-2xl border flex items-start gap-3.5 transition-all ${
        hasFullAccess 
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800' 
          : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-800'
      }`}>
        {hasFullAccess ? (
          <ShieldAlert className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
        ) : (
          <Lock className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
        )}
        <div className="text-xs font-semibold">
          <p className="font-bold uppercase tracking-wide font-mono text-[10px]">
            {hasFullAccess ? '🛡️ Portal Access Status: Full Operational Authority' : '🔒 Portal Access Status: Standard Auditor View-Only'}
          </p>
          <p className="mt-1 font-medium leading-relaxed">
            {hasFullAccess 
              ? 'You have administrative permissions. You can view, submit, reject, or approve and apply operational tickets. Approved tickets modify the production database instantly.'
              : 'As an operational user (' + currentUserRole + '), you have read-only permissions on active files. Direct database writing is locked. Please submit change tickets below to propose corrections or directory additions.'}
          </p>
        </div>
      </div>

      {/* Ticket Status Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tickets */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Total Requests</span>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{stats.total}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
            <ClipboardList size={20} />
          </div>
        </div>

        {/* Pending Approval */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider font-mono">Pending Approval</span>
            <h3 className="text-2xl font-black text-amber-600 mt-1">{stats.pending}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
            <Clock size={20} />
          </div>
        </div>

        {/* Approved & Applied */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider font-mono">Approved & Applied</span>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{stats.approved}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
            <CheckCircle2 size={20} />
          </div>
        </div>

        {/* Rejected */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider font-mono">Rejected / Cancelled</span>
            <h3 className="text-2xl font-black text-rose-600 mt-1">{stats.rejected}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
            <XCircle size={20} />
          </div>
        </div>
      </div>

      {/* Primary Toolbar / Actions Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {st} Tickets
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowNewForm(true)}
          className="bg-[#ec6b1e] hover:bg-[#cf5114] text-white text-xs font-extrabold px-4.5 py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer self-start sm:self-auto uppercase tracking-wider font-mono"
        >
          <Plus size={15} />
          Submit Operational Ticket
        </button>
      </div>

      {/* Grid containing Ticket Ledger and Creation Form */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left/Middle Column: Tickets List Ledger */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 font-mono">
                <ClipboardList className="text-amber-500" size={16} /> Audit Governance Ledger
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Historical change records, team remappings, and new register requests</p>
            </div>

            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input
                type="text"
                placeholder="Search ticket, operator or type..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-amber-500 rounded-lg pl-9 pr-4 py-1.5 text-xs font-semibold outline-none text-slate-700 transition"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-mono">
                  <th className="py-3.5 px-4">ID</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Operator / Subject</th>
                  <th className="py-3.5 px-4">Changes Proposing</th>
                  <th className="py-3.5 px-4">Details & Rationale</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Action Authority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredTickets.map(tkt => {
                  const isPending = tkt.status === 'Pending';
                  return (
                    <tr key={tkt.id} className="hover:bg-slate-50/50 transition">
                      {/* Ticket ID */}
                      <td className="py-4 px-4 font-mono font-bold text-slate-500">{tkt.id}</td>
                      
                      {/* Ticket Type */}
                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase bg-slate-100 text-slate-600 border border-slate-200">
                          {tkt.ticketType || 'Data Correction'}
                        </span>
                        <div className="text-[9px] font-mono text-slate-400 mt-1">{tkt.createdAt}</div>
                      </td>
                      
                      {/* Operator Details */}
                      <td className="py-4 px-4">
                        {tkt.empName ? (
                          <>
                            <div className="font-bold text-slate-800">{tkt.empName}</div>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">{tkt.empId}</div>
                          </>
                        ) : (
                          <span className="text-slate-400 italic">Global Directory</span>
                        )}
                      </td>

                      {/* Changes Proposing */}
                      <td className="py-4 px-4">
                        {(!tkt.ticketType || tkt.ticketType === 'Data Correction' || tkt.ticketType === 'Target Change') && (
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide font-mono">
                              {tkt.fieldToChange === 'accuracy' ? 'Accuracy Rate' : tkt.fieldToChange === 'achieved' ? 'Achieved Vol' : 'Target Goal'}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 font-mono font-bold text-slate-700">
                              <span className="text-slate-400">{tkt.oldValue}{tkt.fieldToChange === 'accuracy' ? '%' : ''}</span>
                              <span className="text-slate-300">➔</span>
                              <span className="text-[#ec6b1e] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                {tkt.newValue}{tkt.fieldToChange === 'accuracy' ? '%' : ''}
                              </span>
                            </div>
                            {tkt.productionDate && <div className="text-[9px] text-slate-400 font-mono mt-1">Log Date: {tkt.productionDate}</div>}
                          </div>
                        )}

                        {tkt.ticketType === 'New Joiner' && tkt.newEmployeeDetails && (
                          <div>
                            <div className="text-[9px] font-bold text-amber-600 uppercase font-mono bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded inline-block">
                              New Registration
                            </div>
                            <div className="text-[10px] font-bold text-slate-700 mt-1">{tkt.newEmployeeDetails.designation}</div>
                            <div className="text-[9px] text-slate-400 font-mono">DOJ: {tkt.newEmployeeDetails.doj}</div>
                          </div>
                        )}

                        {tkt.ticketType === 'Team Change' && tkt.teamChangeDetails && (
                          <div>
                            <div className="text-[9px] font-bold text-indigo-600 uppercase font-mono bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded inline-block">
                              Manager Re-Link
                            </div>
                            <div className="text-[9px] text-slate-500 mt-1">
                              RM: {tkt.teamChangeDetails.newRm}
                            </div>
                          </div>
                        )}

                        {(tkt.ticketType === 'Add Process' || tkt.ticketType === 'Add Sub-Process') && tkt.processDetails && (
                          <div>
                            <div className="text-[9px] font-bold text-purple-600 uppercase font-mono bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded inline-block">
                              Process Addition
                            </div>
                            <div className="text-[10px] font-bold text-slate-800 mt-1">{tkt.processDetails.pms} - {tkt.processDetails.processName}</div>
                            <div className="text-[9px] text-slate-400 font-mono">Sub: {tkt.processDetails.subProcessName} (Target: {tkt.processDetails.target})</div>
                          </div>
                        )}
                      </td>

                      {/* Requestor & Rationale */}
                      <td className="py-4 px-4 max-w-[220px]">
                        <div className="text-slate-800 text-[11px] font-bold flex items-center gap-1 font-mono">
                          <User size={10} className="text-slate-400" /> {tkt.requestor} 
                          <span className="text-[9px] font-normal text-slate-400">({tkt.requestorRole || 'LM'})</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1.5 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100 select-all" title={tkt.reason}>
                          "{tkt.reason}"
                        </div>
                      </td>

                      {/* Status badge */}
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider inline-block ${
                          tkt.status === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          tkt.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {tkt.status}
                        </span>
                      </td>

                      {/* Action buttons (Approve / Reject) with permission checks */}
                      <td className="py-4 px-4 text-center">
                        {isPending ? (
                          hasFullAccess ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => approveTicket(tkt.id)}
                                className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 cursor-pointer transition shadow-4xs"
                                title="Approve & Apply Live Change"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => rejectTicket(tkt.id)}
                                className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 cursor-pointer transition shadow-4xs"
                                title="Reject Request"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[9px] text-slate-400 font-mono flex items-center justify-center gap-1 select-none">
                              <Lock size={10} className="text-slate-400 shrink-0" /> Pending GM
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono italic">
                            Reviewed {tkt.reviewedAt}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredTickets.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <ClipboardList className="mx-auto text-slate-200 mb-2" size={32} />
                      <p className="font-bold text-xs text-slate-500">No tickets matching the search context</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Submission Form */}
        <div className="space-y-6">
          <AnimatePresence>
            {showNewForm && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
              >
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 font-mono">
                      <Send size={15} className="text-[#ec6b1e]" /> Create Audit Ticket
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Formal proposal for operations modifications</p>
                  </div>
                  <button
                    onClick={() => setShowNewForm(false)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSubmitTicket} className="p-5 space-y-4 text-xs font-semibold">
                  
                  {/* Custom Ticket Category Box */}
                  <div>
                    <label className="block text-slate-500 mb-1">Proposed Action / Ticket Category (Custom Entry)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Wrongly uploaded the production data, Team change request..."
                      value={customTicketCategory}
                      onChange={e => setCustomTicketCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:bg-white outline-none focus:border-[#ec6b1e] font-bold text-slate-700"
                    />
                    <div className="mt-2.5 space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Or quick select standard templates:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: '❌ Data Correction', val: 'Wrongly uploaded the production data' },
                          { label: '🎯 Target Change', val: 'Production target change' },
                          { label: '👤 New Joiner', val: 'New Joiner details' },
                          { label: '👥 Team Change', val: 'Production user Team change' },
                          { label: '⚙️ Add Process', val: 'Add new process / sub-process target' }
                        ].map(pill => (
                          <button
                            key={pill.label}
                            type="button"
                            onClick={() => setCustomTicketCategory(pill.val)}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                              customTicketCategory === pill.val
                                ? 'bg-amber-100 border-amber-300 text-amber-800'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {pill.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Auto-detected Subform badge to assist user */}
                    <div className="mt-2 text-[10px] text-slate-400 font-medium">
                      Auto-detected layout: <span className="font-bold text-slate-700 uppercase font-mono">{detectedSubForm} Form</span>
                    </div>
                  </div>

                  {/* Dynamic Inputs: 1. Data Correction / Target Change */}
                  {(detectedSubForm === 'Data Correction' || detectedSubForm === 'Target Change') && (
                    <>
                      {/* Choose Employee */}
                      <div>
                        <label className="block text-slate-500 mb-1">Select Employee Operator</label>
                        <select
                          required
                          value={formEmpId}
                          onChange={e => setFormEmpId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white outline-none focus:border-amber-500 font-bold text-slate-700 cursor-pointer"
                        >
                          <option value="">-- Choose Employee --</option>
                          {employees.map(emp => (
                            <option key={emp.empId} value={emp.empId}>
                              {emp.name} ({emp.empId})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Choose Date */}
                      <div>
                        <label className="block text-slate-500 mb-1">Log Target Production Date</label>
                        <input
                          type="date"
                          required
                          value={formDate}
                          onChange={e => setFormDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white outline-none focus:border-amber-500 font-bold text-slate-700 font-mono"
                        />
                      </div>

                      {/* Choose Field */}
                      <div>
                        <label className="block text-slate-500 mb-1">Target Field to Adjust</label>
                        <select
                          value={formField}
                          onChange={e => setFormField(e.target.value as any)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white outline-none focus:border-amber-500 font-bold text-slate-700 cursor-pointer"
                        >
                          <option value="achieved">Achieved Volume (Actuals)</option>
                          <option value="target">Daily Target Goal</option>
                          <option value="accuracy">Accuracy Rate (Quality %)</option>
                        </select>
                      </div>

                      {/* Old Value vs Proposed New Value display */}
                      <div className="grid grid-cols-2 gap-4 p-3.5 bg-amber-500/5 rounded-xl border border-amber-500/20">
                        <div>
                          <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider font-mono">Current Value</span>
                          <span className="text-base font-black text-slate-500 font-mono block mt-0.5">
                            {resolvedOldValue}
                            {formField === 'accuracy' ? '%' : ''}
                          </span>
                        </div>
                        <div>
                          <label className="block text-[10px] text-amber-700 uppercase font-bold tracking-wider font-mono mb-0.5">Proposed Value</label>
                          <input
                            type="number"
                            required
                            value={formNewValue}
                            onChange={e => setFormNewValue(Number(e.target.value))}
                            className="w-full bg-white border border-amber-200 rounded-lg px-2 py-1 font-mono font-bold text-amber-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Dynamic Inputs: 2. New Joiner Details */}
                  {detectedSubForm === 'New Joiner' && (
                    <div className="space-y-3.5 bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-amber-600 font-mono uppercase tracking-widest font-black block">New Employee Configuration</span>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-500 text-[10px] mb-1">Employee ID</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. RMCB 1250"
                            value={newEmpId}
                            onChange={e => setNewEmpId(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-slate-700 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-500 text-[10px] mb-1">Full Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. KARTHIK S"
                            value={newEmpName}
                            onChange={e => setNewEmpName(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-700 font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-500 text-[10px] mb-1">Designation</label>
                          <select
                            value={newEmpDesignation}
                            onChange={e => setNewEmpDesignation(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-700 cursor-pointer font-bold"
                          >
                            <option value="Associate - AR">Associate - AR</option>
                            <option value="Senior Associate - AR">Senior Associate - AR</option>
                            <option value="Associate - SB">Associate - SB</option>
                            <option value="Quality Auditor">Quality Auditor</option>
                            <option value="Team Leader">Team Leader</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-500 text-[10px] mb-1">Date of Join (DOJ)</label>
                          <input
                            type="date"
                            required
                            value={newEmpDoj}
                            onChange={e => setNewEmpDoj(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-slate-700 font-bold"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-slate-500 text-[10px]">Reporting Managers (RM, LM, RCM)</label>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            placeholder="RM Name"
                            value={newEmpRm}
                            onChange={e => setNewEmpRm(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[11px] text-slate-700"
                          />
                          <input
                            type="text"
                            placeholder="LM Name"
                            value={newEmpLm}
                            onChange={e => setNewEmpLm(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[11px] text-slate-700"
                          />
                          <input
                            type="text"
                            placeholder="RCM Name"
                            value={newEmpRcm}
                            onChange={e => setNewEmpRcm(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[11px] text-slate-700"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dynamic Inputs: 3. Team Change */}
                  {detectedSubForm === 'Team Change' && (
                    <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-indigo-600 font-mono uppercase tracking-widest font-black block">Manager Alignment Config</span>
                      
                      <div>
                        <label className="block text-slate-500 text-[10px] mb-1">Select Employee to Realign</label>
                        <select
                          required
                          value={teamChangeEmpId}
                          onChange={e => {
                            setTeamChangeEmpId(e.target.value);
                            const found = employees.find(emp => emp.empId === e.target.value);
                            if (found) {
                              setTeamChangeNewRm(found.rm);
                              setTeamChangeNewLm(found.lm);
                              setTeamChangeNewRcm(found.rcm);
                            }
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-700 font-bold cursor-pointer"
                        >
                          <option value="">-- Choose Employee --</option>
                          {employees.map(emp => (
                            <option key={emp.empId} value={emp.empId}>
                              {emp.name} ({emp.empId})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div>
                          <label className="block text-slate-400 text-[9px] mb-0.5">New RM</label>
                          <input
                            type="text"
                            placeholder="RM"
                            value={teamChangeNewRm}
                            onChange={e => setTeamChangeNewRm(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[10px] text-slate-700 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[9px] mb-0.5">New LM</label>
                          <input
                            type="text"
                            placeholder="LM"
                            value={teamChangeNewLm}
                            onChange={e => setTeamChangeNewLm(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[10px] text-slate-700 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[9px] mb-0.5">New RCM</label>
                          <input
                            type="text"
                            placeholder="RCM"
                            value={teamChangeNewRcm}
                            onChange={e => setTeamChangeNewRcm(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[10px] text-slate-700 font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dynamic Inputs: 4. Add Process */}
                  {detectedSubForm === 'Add Process' && (
                    <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-purple-600 font-mono uppercase tracking-widest font-black block">Process Configuration</span>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-500 text-[10px] mb-1">PMS System</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. ECW, OfficeAlly"
                            value={processPms}
                            onChange={e => setProcessPms(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-700 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-500 text-[10px] mb-1">Process Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. SB, AR"
                            value={processName}
                            onChange={e => setProcessName(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-700 font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-500 text-[10px] mb-1">Sub-Process Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Charge Entry"
                            value={processSubName}
                            onChange={e => setProcessSubName(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-700 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-500 text-[10px] mb-1">Standard SLA Target</label>
                          <input
                            type="number"
                            required
                            value={processTarget}
                            onChange={e => setProcessTarget(Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-slate-700 font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Justification Reason text-area */}
                  <div>
                    <label className="block text-slate-500 mb-1">Justification Reason</label>
                    <textarea
                      required
                      rows={3}
                      value={formReason}
                      onChange={e => setFormReason(e.target.value)}
                      placeholder="Provide operational reference, ticket context or reasoning for change approval..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:bg-white outline-none focus:border-amber-500 font-bold text-slate-700"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="submit"
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm uppercase tracking-wider font-mono"
                    >
                      <Send size={13} /> Propose Ticket
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewForm(false)}
                      className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer font-bold text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Explanatory informational helper when form is closed */}
          {!showNewForm && (
            <div className="bg-gradient-to-br from-amber-500/5 to-slate-50 border border-slate-200 p-5 rounded-2xl shadow-xs text-xs font-semibold text-slate-600 space-y-3">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                <AlertCircle size={15} className="text-[#ec6b1e]" /> Audit Data Procedures
              </h4>
              <p className="leading-relaxed">
                In compliance with strict ISO health-revenue and financial operational audits:
              </p>
              <div className="space-y-2 text-[11px] text-slate-500 pl-4 list-decimal list-inside font-medium">
                <div>Standard users propose operations delta requests.</div>
                <div>Current values are fetched and logged for transparency.</div>
                <div>Ops Admin or GM reviews and signs off.</div>
                <div>Upon approval, state variables adjust in real-time.</div>
              </div>
              <button
                onClick={() => setShowNewForm(true)}
                className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-[#cf5114] rounded-xl border border-amber-200 font-bold transition flex items-center justify-center gap-1 cursor-pointer font-mono uppercase text-[10px] tracking-wider"
              >
                <Plus size={13} /> Open Change Request Form
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
