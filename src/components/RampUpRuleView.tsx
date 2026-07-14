import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PlusCircle, Trash2, Award, Zap, TrendingUp, Compass, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const RampUpRuleView: React.FC = () => {
  const { employees, targets, rampUpRules, addRampUpRule, removeRampUpRule, clearRampUpRules, showAlert } = useApp();

  // Create rule form states
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [rampType, setRampType] = useState<'Trainee' | 'Cross-Training'>('Trainee');
  const [standardTarget, setStandardTarget] = useState(100);
  
  // Weekly targets percentage sliders
  const [weeksTargets, setWeeksTargets] = useState<number[]>([20, 30, 45, 60, 75, 90, 105, 120]);

  // Non-ramped employees list
  const eligibleEmployees = useMemo(() => {
    const rampedIds = new Set(rampUpRules.map(r => r.empId));
    return employees.filter(e => !rampedIds.has(e.empId));
  }, [employees, rampUpRules]);

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) {
      showAlert('Please select an employee.');
      return;
    }

    addRampUpRule({
      empId: selectedEmpId,
      type: rampType,
      startWeek: 1,
      weeklyTargets: [...weeksTargets],
      standardTarget,
      createdAt: new Date().toISOString().split('T')[0]
    });

    // Reset selection
    setSelectedEmpId('');
  };

  const handleSliderChange = (idx: number, value: number) => {
    setWeeksTargets(prev => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  // Active plans details
  const activeRampPlans = useMemo(() => {
    return rampUpRules.map(rule => {
      const emp = employees.find(e => e.empId === rule.empId);
      
      // Calculate active week
      let currentWeek = 1;
      let completed = false;
      if (rule.createdAt) {
        const diffTime = Math.abs(new Date('2026-06-30').getTime() - new Date(rule.createdAt).getTime());
        const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
        currentWeek = diffWeeks;
        if (currentWeek > 8) {
          completed = true;
        }
      }

      return {
        ...rule,
        employeeName: emp?.name || 'Unknown',
        role: emp?.designation || 'N/A',
        currentWeek,
        completed
      };
    });
  }, [rampUpRules, employees]);

  // Chart data for previewing target progression
  const chartPreviewData = useMemo(() => {
    return weeksTargets.map((t, idx) => ({
      week: `Week ${idx+1}`,
      'Custom Target': t,
      'Standard Target': standardTarget
    }));
  }, [weeksTargets, standardTarget]);

  return (
    <div className="space-y-6" id="ramp_up_view">
      {/* Intro info panel */}
      <div 
        style={{ backgroundImage: 'linear-gradient(to right, #f2ab35 0%, #ec6b1e 50%, #cf5114 100%)' }}
        className="p-6 rounded-[28px] text-[#0f0701] shadow-lg border border-amber-500/20 relative overflow-hidden flex flex-col md:flex-row gap-4 justify-between items-start md:items-center"
      >
        <div className="absolute inset-0 bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:12px_12px] opacity-[0.07] pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-1.5">
            <Compass className="w-5 h-5 text-[#4e2504]" />
            <h2 className="text-base font-black text-[#0a0400] tracking-tight">Ramp-up Target Management Rules</h2>
          </div>
          <p className="text-xs text-[#351904]/90 font-medium">Onboard new hires or cross-train experienced staff with custom weekly learning paths</p>
        </div>
        <div className="bg-white/10 border border-white/20 backdrop-blur-sm text-[#351904] px-3.5 py-1.5 rounded-xl text-[10px] font-extrabold uppercase font-mono tracking-wider relative z-10 shadow-xs">
          Standard target conversion active
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Rule Form */}
        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100">Configure New Plan Curve</h3>
          
          <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-500 mb-1 font-semibold">Select Target Employee</label>
                <select 
                  value={selectedEmpId} 
                  onChange={e => setSelectedEmpId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 font-medium"
                >
                  <option value="">-- Choose Staff --</option>
                  {eligibleEmployees.map(e => (
                    <option key={e.empId} value={e.empId}>{e.name} ({e.empId})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-semibold">Onboarding Path Type</label>
                <select 
                  value={rampType} 
                  onChange={e => setRampType(e.target.value as any)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 font-medium"
                >
                  <option value="Trainee">Trainee Onboarding</option>
                  <option value="Cross-Training">Experienced Team Change</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-semibold">Standard Process Target</label>
                <input 
                  type="number" 
                  value={standardTarget} 
                  onChange={e => setStandardTarget(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 font-mono font-bold"
                />
              </div>
            </div>

            {/* Week Targets sliders */}
            <div>
              <p className="font-semibold text-gray-600 mb-2 uppercase tracking-wide text-4xs">Incremental Weekly Target Output Progression</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 border border-slate-200 rounded-lg">
                {weeksTargets.map((val, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-3xs font-semibold text-gray-500">
                      <span>Week {idx+1}</span>
                      <span className="font-mono text-blue-600">{val}</span>
                    </div>
                    <input 
                      type="range"
                      min={1}
                      max={standardTarget * 1.5}
                      value={val}
                      onChange={e => handleSliderChange(idx, Number(e.target.value))}
                      className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md transition-colors cursor-pointer shadow-xs"
              >
                Onboard and Deploy Curve
              </button>
            </div>
          </form>

          {/* Chart Preview */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-4xs text-slate-400 font-bold uppercase tracking-wider mb-2">Onboarding Curve Target Progression Preview</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartPreviewData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="week" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip />
                  <Line type="monotone" dataKey="Custom Target" stroke="#2563eb" strokeWidth={2.5} />
                  <Line type="monotone" dataKey="Standard Target" stroke="#94a3b8" strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Active Plans list and rules */}
        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100">Active Ramp-up Rule Pipelines</h3>
          
          <div className="space-y-3 max-h-120 overflow-y-auto pr-1">
            {activeRampPlans.map((plan, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-3.5">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">{plan.employeeName}</h4>
                    <span className="text-4xs text-slate-400 font-semibold uppercase">{plan.empId} • {plan.role}</span>
                  </div>
                  <button 
                    onClick={() => removeRampUpRule(plan.empId)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                    title="Remove Rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-3xs pb-2 border-b border-slate-200/50">
                  <div>
                    <span className="text-gray-400 block">Plan Path Type</span>
                    <span className="font-semibold text-slate-700">{plan.type}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Target Week</span>
                    <span className="font-mono font-bold text-blue-600">Week {plan.currentWeek} of 8</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-3xs">
                  <div>
                    <span className="text-gray-400 block">Current Target</span>
                    <span className="font-mono font-bold text-blue-600">{plan.completed ? plan.standardTarget : plan.weeklyTargets[Math.min(7, plan.currentWeek-1)]}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Standard Target</span>
                    <span className="font-mono font-semibold text-slate-500">{plan.standardTarget}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Status Conversion</span>
                    {plan.completed ? (
                      <span className="inline-flex px-1.5 py-0.5 font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Completed Standardized</span>
                    ) : (
                      <span className="inline-flex px-1.5 py-0.5 font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Ramping Up</span>
                    )}
                  </div>
                </div>

                {/* If completed, prompt details */}
                {plan.completed && (
                  <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-4xs text-emerald-800 leading-normal">
                    This staff successfully passed their 8-week ramp up plan! As a result, standard targets automatically override previous progressive parameters.
                  </div>
                )}
              </div>
            ))}

            {activeRampPlans.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-xs">
                No active employee ramp up paths configured. Setting up rules overrides process target defaults during onboarding.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
