import { Employee, TargetMap, EmployeeProcess, ProductionRecord, AttendanceRecord, RampUpRule, QualityRollup, QualityAuditRecord } from '../types';

// Compact seed data of main processes and targets
export const seedTargets: TargetMap[] = [
  { pms: 'Advanced MD', processName: 'Denial Management', subProcessName: 'Denial/Aging', target: 65 },
  { pms: 'Advanced MD', processName: 'Payment Posting', subProcessName: 'ERA', target: 850 },
  { pms: 'Advanced MD', processName: 'SB', subProcessName: 'Charge Entry', target: 100 },
  { pms: 'Cerner', processName: 'AR Calling', subProcessName: 'AR calling', target: 25 },
  { pms: 'Cerner', processName: 'Denial Management', subProcessName: 'SCMG Denials & Aging', target: 50 },
  { pms: 'Cerner', processName: 'Payment Posting', subProcessName: 'EOB/GW/ZP', target: 900 },
  { pms: 'Cerner', processName: 'SB', subProcessName: 'Charge Entry', target: 200 },
  { pms: 'ECW', processName: 'AR Calling', subProcessName: 'AR calling', target: 20 },
  { pms: 'ECW', processName: 'Denial Management', subProcessName: 'Aging', target: 40 },
  { pms: 'ECW', processName: 'Payment Posting', subProcessName: 'EOB', target: 750 },
  { pms: 'ECW', processName: 'SB', subProcessName: 'Charge Entry', target: 150 },
  { pms: 'EXPERITY', processName: 'AR Calling', subProcessName: 'AR calling', target: 20 },
  { pms: 'EXPERITY', processName: 'Denial Management', subProcessName: 'Worker\'s Comp', target: 50 },
  { pms: 'EXPERITY', processName: 'Payment Posting', subProcessName: 'EOB Posting', target: 350 },
  { pms: 'EXPERITY', processName: 'SB', subProcessName: 'Charge Entry', target: 120 },
  { pms: 'GMED', processName: 'AR Calling', subProcessName: 'AR calling', target: 25 },
  { pms: 'Iclaim', processName: 'Payment Posting', subProcessName: 'ERA Posting', target: 850 },
  { pms: 'Iclaim', processName: 'SB', subProcessName: 'Charge Entry', target: 120 }
];

// Seed list of representative employees representing all states and configurations
export const seedEmployees: Employee[] = [
  { empId: 'RMCB 1208', name: 'MATHIVANAN GIRI G', status: 'Notice', doj: '09/03/2024', designation: 'SR. AR CALLER', rm: 'SANJEEV R', lm: '', rcm: 'KARTHIKEYAN N' },
  { empId: 'RMCB 1007', name: 'PRINCE H', status: 'Active', doj: '10/16/2023', designation: 'Quality Controller', rm: 'SUSEELA R', lm: 'MOHAMED MOHAIDEEN AALISHER', rcm: '' },
  { empId: 'RMCB 1027', name: 'PRAJEESH R', status: 'Active', doj: '12/06/2023', designation: 'Process Associate', rm: 'ANBURAJ.G', lm: 'SAM AUGUSTINE SUTHAKAR S', rcm: 'SURESH B' },
  { empId: 'RMCB 1048', name: 'SNEHA D', status: 'Active', doj: '01/17/2024', designation: 'Process Associate', rm: 'ANBURAJ.G', lm: 'SAM AUGUSTINE SUTHAKAR S', rcm: 'SURESH B' },
  { empId: 'RMCB 1055', name: 'VENKATESH S', status: 'Notice', doj: '02/07/2024', designation: 'Process Associate', rm: 'ANBURAJ.G', lm: 'SAM AUGUSTINE SUTHAKAR S', rcm: 'SURESH B' },
  { empId: 'RMCB 1062', name: 'MALLIKA D', status: 'Active', doj: '02/12/2024', designation: 'Process Associate', rm: 'SNEHA VISHNU MUPPIDI', lm: '', rcm: 'KATHIRVEL MURUGAN P' },
  { empId: 'RMCB 1073', name: 'ILAKKIYA K', status: 'Active', doj: '03/04/2024', designation: 'Quality Controller', rm: 'SUSEELA R', lm: 'MOHAMED MOHAIDEEN AALISHER', rcm: '' },
  { empId: 'RMCB 1116', name: 'MANIKANDAN A', status: 'Active', doj: '05/04/2024', designation: 'Process Associate', rm: 'SNEHA VISHNU MUPPIDI', lm: '', rcm: 'SURESH B' },
  { empId: 'RMCB 1125', name: 'MATHUMITHA S', status: 'Active', doj: '05/07/2024', designation: 'Process Associate', rm: 'ANBURAJ.G', lm: 'SAM AUGUSTINE SUTHAKAR S', rcm: 'SURESH B' },
  { empId: 'RMCB 1165', name: 'MAHALAKSMI B', status: 'Active', doj: '06/24/2024', designation: 'Process Associate', rm: 'ARUN KUMAR .R', lm: 'SAM AUGUSTINE SUTHAKAR S', rcm: 'SURESH B' },
  { empId: 'RMCB 1182', name: 'ARSHAD M', status: 'Active', doj: '07/24/2024', designation: 'Senior Process Associate', rm: 'KARTHICK R', lm: '', rcm: 'DHILIPKUMAR SHANMUGAM' },
  { empId: 'RMCB 1265', name: 'PRAVEENA M', status: 'Active', doj: '11/20/2024', designation: 'Process Associate', rm: 'RAJESHWARI S', lm: '', rcm: 'KAMALRAJ D' },
  { empId: 'RMCB 1266', name: 'VASUNDHIRA DEVI K', status: 'Active', doj: '11/20/2024', designation: 'Process Associate', rm: 'RAJESHWARI S', lm: '', rcm: 'KAMALRAJ D' },
  { empId: 'RMCB 1286', name: 'MOHAMMED AKRAM J', status: 'Active', doj: '12/16/2024', designation: 'Process Associate', rm: 'SNEHA VISHNU MUPPIDI', lm: '', rcm: 'KATHIRVEL MURUGAN P' },
  { empId: 'RMCB 1287', name: 'SARANYA S', status: 'Active', doj: '12/16/2024', designation: 'Process Associate', rm: 'SNEHA VISHNU MUPPIDI', lm: '', rcm: 'KATHIRVEL MURUGAN P' },
  { empId: 'RMCB 1383', name: 'KAVIYA R', status: 'Active', doj: '04/07/2025', designation: 'Trainee Process Associate', rm: 'ARIYANANDHANAN S', lm: 'MEENAKSHI N', rcm: '' },
  { empId: 'RMCB 1384', name: 'SUGUMAR M', status: 'Active', doj: '04/07/2025', designation: 'Trainee Process Associate', rm: 'SARAVANAKUMAR K', lm: '', rcm: 'KATHIRVEL MURUGAN P' },
  { empId: 'RMCB 1389', name: 'AARTHI KUMARI H', status: 'Active', doj: '04/16/2025', designation: 'Trainee Process Associate', rm: 'ARIYANANDHANAN S', lm: 'MEENAKSHI N', rcm: '' },
  { empId: 'RMCB 1435', name: 'KAVIPRIYA R', status: 'Active', doj: '06/23/2025', designation: 'Process Associate', rm: 'KARTHICK R', lm: '', rcm: 'DHILIPKUMAR SHANMUGAM' },
  { empId: 'RMCB 1509', name: 'PREMALATHA K', status: 'Active', doj: '09/02/2025', designation: 'Trainee Process Associate', rm: 'ARIYANANDHANAN S', lm: 'MEENAKSHI N', rcm: '' },
  { empId: 'RMCB 1541', name: 'CHANDIRAKUMAR K', status: 'Relieved', doj: '09/29/2025', designation: 'Senior Process Associate', rm: 'SNEHA VISHNU MUPPIDI', lm: '', rcm: 'KATHIRVEL MURUGAN P' },
  { empId: 'RMCB 1623', name: 'RUTHRAKUMAR H', status: 'New Joiner', doj: '04/27/2026', designation: 'Senior Process Associate', rm: 'NARESH N', lm: '', rcm: 'KATHIRVEL MURUGAN P' },
  { empId: 'RMCB 1625', name: 'RAGUL M', status: 'New Joiner', doj: '04/30/2026', designation: 'Process Associate', rm: 'KARTHIKEYAN T', lm: '', rcm: '' },
  { empId: 'RMCB 1626', name: 'AMIRTHASHALINI', status: 'New Joiner', doj: '04/30/2026', designation: 'Process Associate', rm: 'VIJAY R', lm: '', rcm: 'KAMALRAJ D' },
  { empId: 'RMCB 1632', name: 'NITHIA R', status: 'New Joiner', doj: '05/05/2026', designation: 'Trainee Process Associate', rm: 'KARTHIKEYAN T', lm: '', rcm: '' },
  { empId: 'RMCB 1633', name: 'APARNA J', status: 'New Joiner', doj: '05/05/2026', designation: 'Trainee Process Associate', rm: 'KARTHIKEYAN T', lm: '', rcm: '' },
  { empId: 'RMCB 1634', name: 'KISHORE M', status: 'New Joiner', doj: '05/05/2026', designation: 'Trainee Process Associate', rm: 'KARTHIKEYAN T', lm: '', rcm: '' },
  { empId: 'RMCB 1167', name: 'SURENDRAN S', status: 'Active', doj: '04/10/2024', designation: 'Process Associate', rm: 'VIJAY', lm: 'THIYANESHWARAN', rcm: 'DHILIPKUMAR SHANMUGAM' },
  { empId: 'RMCB 1168', name: 'KALEESWARI', status: 'Active', doj: '04/12/2024', designation: 'Process Associate', rm: 'VIJAY', lm: 'GOKULAPRIYA', rcm: 'DHILIPKUMAR SHANMUGAM' },
  { empId: 'RMCB 1169', name: 'SAM RENSWICK', status: 'Active', doj: '04/01/2024', designation: 'Process Associate', rm: 'VIJAY', lm: 'THIYANESHWARAN', rcm: 'DHILIPKUMAR SHANMUGAM' },
  { empId: 'RMCB 1170', name: 'ALWIN A', status: 'Active', doj: '04/14/2024', designation: 'Process Associate', rm: 'VIJAY', lm: 'GOKULAPRIYA', rcm: 'DHILIPKUMAR SHANMUGAM' },
  { empId: 'RMCB 1171', name: 'KARTHIK P', status: 'Active', doj: '04/15/2024', designation: 'Process Associate', rm: 'VIJAY', lm: 'GOKULAPRIYA', rcm: 'DHILIPKUMAR SHANMUGAM' },
  { empId: 'RMCB 1172', name: 'VISWAS J', status: 'Active', doj: '04/16/2024', designation: 'Process Associate', rm: 'VIJAY', lm: 'GOKULAPRIYA', rcm: 'DHILIPKUMAR SHANMUGAM' },
  { empId: 'RMCB 1173', name: 'SELVAKUMAR S', status: 'Active', doj: '04/18/2024', designation: 'Process Associate', rm: 'VIJAY', lm: 'THIYANESHWARAN', rcm: 'DHILIPKUMAR SHANMUGAM' },
  { empId: 'RMCB 1174', name: 'BHARATH KUMAR K', status: 'Active', doj: '04/20/2024', designation: 'Process Associate', rm: 'VIJAY', lm: 'GOKULAPRIYA', rcm: 'DHILIPKUMAR SHANMUGAM' }
];

// Mappings of employees to process domains
export const seedEmployeeProcesses: EmployeeProcess[] = [
  { empId: 'RMCB 1208', empName: 'MATHIVANAN GIRI G', pms: 'ECW', processName: 'AR Calling', subProcessName: 'AR calling' },
  { empId: 'RMCB 1208', empName: 'MATHIVANAN GIRI G', pms: 'EXPERITY', processName: 'AR Calling', subProcessName: 'AR calling' },
  { empId: 'RMCB 1027', empName: 'PRAJEESH R', pms: 'Cerner', processName: 'SB', subProcessName: 'Charge Entry' },
  { empId: 'RMCB 1048', empName: 'SNEHA D', pms: 'Cerner', processName: 'SB', subProcessName: 'Charge Entry' },
  { empId: 'RMCB 1055', empName: 'VENKATESH S', pms: 'Cerner', processName: 'SB', subProcessName: 'Charge Entry' },
  { empId: 'RMCB 1062', empName: 'MALLIKA D', pms: 'Advanced MD', processName: 'Payment Posting', subProcessName: 'ERA' },
  { empId: 'RMCB 1116', empName: 'MANIKANDAN A', pms: 'Cerner', processName: 'Payment Posting', subProcessName: 'EOB/GW/ZP' },
  { empId: 'RMCB 1125', empName: 'MATHUMITHA S', pms: 'Cerner', processName: 'SB', subProcessName: 'Charge Entry' },
  { empId: 'RMCB 1165', empName: 'MAHALAKSMI B', pms: 'Cerner', processName: 'Denial Management', subProcessName: 'SCMG Denials & Aging' },
  { empId: 'RMCB 1182', empName: 'ARSHAD M', pms: 'Iclaim', processName: 'Payment Posting', subProcessName: 'ERA Posting' },
  { empId: 'RMCB 1265', empName: 'PRAVEENA M', pms: 'EXPERITY', processName: 'Denial Management', subProcessName: 'Worker\'s Comp' },
  { empId: 'RMCB 1266', empName: 'VASUNDHIRA DEVI K', pms: 'EXPERITY', processName: 'Denial Management', subProcessName: 'Worker\'s Comp' },
  { empId: 'RMCB 1286', empName: 'MOHAMMED AKRAM J', pms: 'ECW', processName: 'Payment Posting', subProcessName: 'EOB' },
  { empId: 'RMCB 1287', empName: 'SARANYA S', pms: 'ECW', processName: 'Payment Posting', subProcessName: 'EOB' },
  { empId: 'RMCB 1383', empName: 'KAVIYA R', pms: 'EXPERITY', processName: 'SB', subProcessName: 'Charge Entry' },
  { empId: 'RMCB 1384', empName: 'SUGUMAR M', pms: 'EXPERITY', processName: 'SB', subProcessName: 'Charge Entry' },
  { empId: 'RMCB 1389', empName: 'AARTHI KUMARI H', pms: 'EXPERITY', processName: 'SB', subProcessName: 'Charge Entry' },
  { empId: 'RMCB 1435', empName: 'KAVIPRIYA R', pms: 'Iclaim', processName: 'Payment Posting', subProcessName: 'ERA Posting' },
  { empId: 'RMCB 1509', empName: 'PREMALATHA K', pms: 'EXPERITY', processName: 'SB', subProcessName: 'Charge Entry' },
  { empId: 'RMCB 1623', empName: 'RUTHRAKUMAR H', pms: 'ECW', processName: 'AR Calling', subProcessName: 'AR calling' },
  { empId: 'RMCB 1625', empName: 'RAGUL M', pms: 'Iclaim', processName: 'SB', subProcessName: 'Charge Entry' },
  { empId: 'RMCB 1626', empName: 'AMIRTHASHALINI', pms: 'EXPERITY', processName: 'Payment Posting', subProcessName: 'EOB Posting' },
  { empId: 'RMCB 1632', empName: 'NITHIA R', pms: 'Iclaim', processName: 'SB', subProcessName: 'Charge Entry' },
  { empId: 'RMCB 1633', empName: 'APARNA J', pms: 'Iclaim', processName: 'SB', subProcessName: 'Charge Entry' },
  { empId: 'RMCB 1634', empName: 'KISHORE M', pms: 'Iclaim', processName: 'SB', subProcessName: 'Charge Entry' },
  
  // Specific Team VIJAY Quality Audit Mappings
  { empId: 'RMCB 1167', empName: 'SURENDRAN S', pms: 'Cerner', processName: 'Payment Posting', subProcessName: 'Correspondance' },
  { empId: 'RMCB 1168', empName: 'KALEESWARI', pms: 'Cerner', processName: 'Payment Posting', subProcessName: 'ERA' },
  { empId: 'RMCB 1169', empName: 'SAM RENSWICK', pms: 'Cerner', processName: 'Payment Posting', subProcessName: 'Correspondance' },
  { empId: 'RMCB 1170', empName: 'ALWIN A', pms: 'Cerner', processName: 'Payment Posting', subProcessName: 'ERA' },
  { empId: 'RMCB 1171', empName: 'KARTHIK P', pms: 'Cerner', processName: 'Payment Posting', subProcessName: 'ERA' },
  { empId: 'RMCB 1172', empName: 'VISWAS J', pms: 'Cerner', processName: 'Payment Posting', subProcessName: 'ERA' },
  { empId: 'RMCB 1173', empName: 'SELVAKUMAR S', pms: 'Cerner', processName: 'Payment Posting', subProcessName: 'Correspondance' },
  { empId: 'RMCB 1174', empName: 'BHARATH KUMAR K', pms: 'Cerner', processName: 'Payment Posting', subProcessName: 'ERA' }
];

export const seedRampUpRules: RampUpRule[] = [
  {
    empId: 'RMCB 1632',
    type: 'Trainee',
    startWeek: 1,
    weeklyTargets: [20, 30, 45, 60, 75, 90, 105, 120], // standard target is 120
    standardTarget: 120,
    createdAt: '2026-05-05'
  },
  {
    empId: 'RMCB 1633',
    type: 'Trainee',
    startWeek: 1,
    weeklyTargets: [20, 30, 45, 60, 75, 90, 105, 120],
    standardTarget: 120,
    createdAt: '2026-05-05'
  }
];

// Dynamic generator of past 30 days of production and attendance records
// Starting from 2026-06-01 to 2026-06-30
export function generateProductionAndAttendance(
  employees: Employee[],
  mappings: EmployeeProcess[],
  targets: TargetMap[],
  rampRules: RampUpRule[]
): { production: ProductionRecord[]; attendance: AttendanceRecord[] } {
  const production: ProductionRecord[] = [];
  const attendance: AttendanceRecord[] = [];

  const defectCategories = [
    'Incorrect Demo Capture',
    'Provider NPI Missing',
    'Incorrect Modifier Applied',
    'DX Mismatch',
    'Authorization Missing',
    'Eligibility Verification Failure'
  ];

  // Helper to parse date MM/DD/YYYY
  const parseDOJ = (dojStr: string): Date => {
    try {
      const parts = dojStr.split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
      }
    } catch (e) {}
    return new Date(2023, 0, 1);
  };

  const startDate = new Date('2026-06-01');
  const endDate = new Date('2026-06-30');

  let recordCounter = 1;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    // Skip weekends
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const dateStr = d.toISOString().split('T')[0];

    employees.forEach((emp) => {
      // Don't generate if relieved or not joined yet
      const dojDate = parseDOJ(emp.doj);
      if (d < dojDate) return;
      if (emp.status === 'Relieved') {
        const relievedDate = new Date('2025-10-01'); // Assume relieved before June 2026
        if (d > relievedDate) return;
      }

      // Check leave chances (5% chance of random leave, unless notice status is active then slightly higher)
      const isNotice = emp.status === 'Notice';
      const leaveChance = isNotice ? 0.08 : 0.04;
      const onLeave = Math.random() < leaveChance;

      // Attendance record
      const expectedHours = 8;
      let hoursWorked = 0;
      let hoursBreak = 0;
      let hoursOT = 0;

      if (!onLeave) {
        // Standard shift: 8h, break average 0.6 - 1.2 hours, sometimes break excess, sometimes OT
        hoursBreak = Number((0.6 + Math.random() * 0.8).toFixed(2)); // standard is up to 1.0 (60 mins)
        hoursWorked = Number((7.2 + Math.random() * 1.5).toFixed(2));
        hoursOT = Math.random() < 0.25 ? Number((1 + Math.random() * 2).toFixed(2)) : 0;
      }

      attendance.push({
        id: `att_${emp.empId.replace(/\s+/g, '_')}_${dateStr}`,
        empId: emp.empId,
        date: dateStr,
        expectedHours,
        hoursWorked,
        hoursBreak,
        hoursOT,
        onLeave
      });

      // Production Record
      if (!onLeave) {
        // Find processes assigned
        const empProcs = mappings.filter((m) => m.empId === emp.empId);
        if (empProcs.length === 0) return;

        empProcs.forEach((ep) => {
          // Find standard target
          const targetObj = targets.find(
            (t) => t.pms === ep.pms && t.processName === ep.processName && t.subProcessName === ep.subProcessName
          );
          let targetVol = targetObj ? targetObj.target : 100;

          // Check if employee has custom ramp up rules
          const rule = rampRules.find((r) => r.empId === emp.empId);
          if (rule) {
            // Find current week from doj
            const diffTime = Math.abs(d.getTime() - dojDate.getTime());
            const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
            if (diffWeeks >= 1 && diffWeeks <= 8) {
              const ruleTargetVal = rule.weeklyTargets[diffWeeks - 1];
              if (ruleTargetVal !== undefined) {
                targetVol = ruleTargetVal;
              }
            }
          }

          // Random achievement factor (90% - 110% average)
          // Some top performers are better
          let perfFactor = 0.85 + Math.random() * 0.3;
          if (emp.empId === 'RMCB 1007' || emp.empId === 'RMCB 1182') {
            perfFactor = 1.05 + Math.random() * 0.2; // Star performers!
          } else if (emp.empId === 'RMCB 1055' || emp.empId === 'RMCB 1509') {
            perfFactor = 0.65 + Math.random() * 0.25; // Bottom quartile!
          }

          const achieved = Math.max(1, Math.round(targetVol * perfFactor));
          
          // Quality Audit (Accuracy): mostly 94% - 100%
          let accuracy = Number((92 + Math.random() * 8).toFixed(1));
          if (emp.empId === 'RMCB 1073' || emp.empId === 'RMCB 1007') {
            accuracy = Number((97 + Math.random() * 3).toFixed(1)); // Elite quality!
          } else if (emp.empId === 'RMCB 1509' || emp.empId === 'RMCB 1055') {
            accuracy = Number((84 + Math.random() * 10).toFixed(1)); // Lower quality
          }

          let auditedCount = 0;
          let errorCategory = undefined;

          // Audit evaluation
          if (Math.random() < 0.25) { // 25% are heavily audited
            auditedCount = Math.round(achieved * 0.1);
            if (accuracy < 95) {
              errorCategory = defectCategories[Math.floor(Math.random() * defectCategories.length)];
            }
          }

          production.push({
            id: `prod_${recordCounter++}`,
            empId: emp.empId,
            pms: ep.pms,
            processName: ep.processName,
            subProcessName: ep.subProcessName,
            date: dateStr,
            target: targetVol,
            achieved,
            accuracy,
            auditedCount: auditedCount || undefined,
            errorCategory
          });
        });
      }
    });
  }

  return { production, attendance };
}

export const seedQualityRollups: QualityRollup[] = [
  { id: 'qr_1', empId: 'RMCB 1167', name: 'SURENDRAN S', process: 'Payment Posting', primaryReportingName: 'VIJAY', production: 202, auditedCount: 50, errorCount: 5, qualityScore: 90.0 },
  { id: 'qr_2', empId: 'RMCB 1168', name: 'KALEESWARI', process: 'Payment Posting', primaryReportingName: 'VIJAY', production: 1550, auditedCount: 30, errorCount: 0, qualityScore: 100.0 },
  { id: 'qr_3', empId: 'RMCB 1169', name: 'SAM RENSWICK', process: 'Payment Posting', primaryReportingName: 'VIJAY', production: 230, auditedCount: 20, errorCount: 0, qualityScore: 100.0 },
  { id: 'qr_4', empId: 'RMCB 1170', name: 'ALWIN A', process: 'Payment Posting', primaryReportingName: 'VIJAY', production: 668, auditedCount: 25, errorCount: 1, qualityScore: 96.0 },
  { id: 'qr_5', empId: 'RMCB 1171', name: 'KARTHIK P', process: 'Payment Posting', primaryReportingName: 'VIJAY', production: 155, auditedCount: 15, errorCount: 1, qualityScore: 93.3 },
  { id: 'qr_6', empId: 'RMCB 1172', name: 'VISWAS J', process: 'Payment Posting', primaryReportingName: 'VIJAY', production: 2047, auditedCount: 40, errorCount: 1, qualityScore: 97.5 },
  { id: 'qr_7', empId: 'RMCB 1173', name: 'SELVAKUMAR S', process: 'Payment Posting', primaryReportingName: 'VIJAY', production: 400, auditedCount: 15, errorCount: 2, qualityScore: 86.7 },
  { id: 'qr_8', empId: 'RMCB 1174', name: 'BHARATH KUMAR K', process: 'Payment Posting', primaryReportingName: 'VIJAY', production: 1960, auditedCount: 35, errorCount: 1, qualityScore: 97.1 }
];

export const seedQualityAudits: QualityAuditRecord[] = [
  {
    id: 'qa_1',
    empId: 'RMCB 1168',
    empName: 'KALEESWARI',
    workedDate: '2026-04-29',
    clientName: 'SCMG',
    pms: 'CERNER',
    location: 'CBE',
    processName: 'PAYMENT POSTING',
    subProcessName: 'ERA',
    productionCount: 1550,
    fileNameBatch: 'ERA(D)-04242026-CHK#801419369-N-69094-$24605.17-t(1550)  KALEESWARI 04292026.CSV',
    pg: '',
    checkNum: '801419369',
    claimNum: 'SI724483X89017',
    dateOfService: '2026-04-15',
    cptAmount: '24605.17',
    comments: 'PAYMENT POSTED',
    actionTaken: 'PAYMENT POSTED',
    auditorEmpId: '941',
    auditorName: 'GOKULAPRIYA',
    auditDate: '2026-04-30',
    auditorComments: 'FYI – Incorrect insurance balance and patient balance. The Incorrect Insurance balance is $157.17, and Incorrect patient balance of $157.23 is listed. The user needs to review and update the correct secondary balance.',
    errorCount: 0,
    auditedCount: 1,
    status: 'FYI',
    errorType: 'INCORRECTLY FLIPPED THE BALANCE',
    category: 'TRANSACTION INFO',
    primaryReportingName: 'VIJAY',
    reworkStatus: '',
    feedbackComments: ''
  },
  {
    id: 'qa_2',
    empId: 'RMCB 1169',
    empName: 'SAM RENSWICK',
    workedDate: '2026-04-01',
    clientName: 'SCMG',
    pms: 'CERNER',
    location: 'CBE',
    processName: 'PAYMENT POSTING',
    subProcessName: 'CORRESPONDANCE',
    productionCount: 0,
    fileNameBatch: 'HSSi LB(C) B3263974 03312026 PG#203',
    pg: '154*165',
    checkNum: 'NO CHK',
    claimNum: '-',
    dateOfService: '-',
    cptAmount: '-',
    comments: 'NEED TO POST DENIAL',
    actionTaken: 'DND',
    auditorEmpId: '1167',
    auditorName: 'THIYANESHWARAN',
    auditDate: '2026-04-02',
    auditorComments: 'Need additional info of Waier of Liability statement, but user missed to mention the info in description',
    errorCount: 0,
    auditedCount: 1,
    status: 'FYI',
    errorType: 'Denial Reason Not Obtained',
    category: 'VITAL INFORMATION MISSING',
    primaryReportingName: 'VIJAY',
    reworkStatus: '-',
    feedbackComments: '-'
  },
  {
    id: 'qa_3',
    empId: 'RMCB 1169',
    empName: 'SAM RENSWICK',
    workedDate: '2026-04-01',
    clientName: 'SCMG',
    pms: 'CERNER',
    location: 'CBE',
    processName: 'PAYMENT POSTING',
    subProcessName: 'CORRESPONDANCE',
    productionCount: 0,
    fileNameBatch: 'HSSi LB(C) B3263974 03312026 PG#203',
    pg: '166*174',
    checkNum: 'NO CHK',
    claimNum: '-',
    dateOfService: '-',
    cptAmount: '-',
    comments: 'NEED TO POST DENIAL',
    actionTaken: 'DND',
    auditorEmpId: '1167',
    auditorName: 'THIYANESHWARAN',
    auditDate: '2026-04-02',
    auditorComments: 'Need additional info of Waier of Liability statement, but user missed to mention the info in description',
    errorCount: 0,
    auditedCount: 1,
    status: 'FYI',
    errorType: 'Denial Reason Not Obtained',
    category: 'VITAL INFORMATION MISSING',
    primaryReportingName: 'VIJAY',
    reworkStatus: '-',
    feedbackComments: '-'
  },
  {
    id: 'qa_4',
    empId: 'RMCB 1167',
    empName: 'SURENDRAN S',
    workedDate: '2026-04-01',
    clientName: 'SCMG',
    pms: 'CERNER',
    location: 'CBE',
    processName: 'PAYMENT POSTING',
    subProcessName: 'CORRESPONDANCE',
    productionCount: 0,
    fileNameBatch: 'HSSi LB(C) B3263974 03312026 PG#203',
    pg: '97*100',
    checkNum: 'NO CHK',
    claimNum: '-',
    dateOfService: '-',
    cptAmount: '-',
    comments: 'NEED TO POST DENIAL',
    actionTaken: 'CLAIM CLOSED',
    auditorEmpId: '1167',
    auditorName: 'THIYANESHWARAN',
    auditDate: '2026-04-02',
    auditorComments: 'User mentioned that claim closed but dos found in claim#si745667x116070 need to obtained denial as Itemized bill',
    errorCount: 1,
    auditedCount: 1,
    status: 'ERROR',
    errorType: 'Denial Reason Not Obtained',
    category: 'VITAL INFORMATION MISSING',
    primaryReportingName: 'VIJAY',
    reworkStatus: '-',
    feedbackComments: '-'
  },
  {
    id: 'qa_5',
    empId: 'RMCB 1167',
    empName: 'SURENDRAN S',
    workedDate: '2026-04-06',
    clientName: 'SCMG',
    pms: 'CERNER',
    location: 'CBE',
    processName: 'PAYMENT POSTING',
    subProcessName: 'CORRESPONDANCE',
    productionCount: 0,
    fileNameBatch: 'HSSI LB(C) B426555 04012026 PG#204',
    pg: '34*37',
    checkNum: 'NO CHK',
    claimNum: '-',
    dateOfService: '-',
    cptAmount: '-',
    comments: 'NEED TO POST DENIAL',
    actionTaken: 'Moved to Denial team',
    auditorEmpId: '1167',
    auditorName: 'THIYANESHWARAN',
    auditDate: '2026-04-07',
    auditorComments: 'User obtained denial for the already worked claim, denial team already moved the claim to pt',
    errorCount: 1,
    auditedCount: 1,
    status: 'ERROR',
    errorType: 'Action Incorrect',
    category: 'NEGLIGENCE ERROR',
    primaryReportingName: 'VIJAY',
    reworkStatus: '-',
    feedbackComments: '-'
  },
  {
    id: 'qa_6',
    empId: 'RMCB 1167',
    empName: 'SURENDRAN S',
    workedDate: '2026-04-08',
    clientName: 'SCMG',
    pms: 'CERNER',
    location: 'CBE',
    processName: 'PAYMENT POSTING',
    subProcessName: 'CORRESPONDANCE',
    productionCount: 0,
    fileNameBatch: 'HSSI LB(C) B426904 04072026 PG#143',
    pg: '42*45',
    checkNum: 'NO CHK',
    claimNum: '-',
    dateOfService: '-',
    cptAmount: '-',
    comments: 'NEED TO POST DENIAL',
    actionTaken: 'Moved to Denial team',
    auditorEmpId: '1167',
    auditorName: 'THIYANESHWARAN',
    auditDate: '2026-04-09',
    auditorComments: 'User obtained denial for the already worked claim, denial team already moved the claim to pt',
    errorCount: 0,
    auditedCount: 1,
    status: 'FYI',
    errorType: 'Action Incorrect',
    category: 'NEGLIGENCE ERROR',
    primaryReportingName: 'VIJAY',
    reworkStatus: '-',
    feedbackComments: '-'
  },
  {
    id: 'qa_7',
    empId: 'RMCB 1167',
    empName: 'SURENDRAN S',
    workedDate: '2026-04-14',
    clientName: 'SCMG',
    pms: 'CERNER',
    location: 'CBE',
    processName: 'PAYMENT POSTING',
    subProcessName: 'CORRESPONDANCE',
    productionCount: 0,
    fileNameBatch: 'HSSI LB(C) B4261569 04132026 PG#356',
    pg: '110*114',
    checkNum: 'NO CHK',
    claimNum: '-',
    dateOfService: '-',
    cptAmount: '-',
    comments: 'NEED TO POST DENIAL',
    actionTaken: 'Moved to Denial team',
    auditorEmpId: '1167',
    auditorName: 'THIYANESHWARAN',
    auditDate: '2026-04-15',
    auditorComments: 'claim processed as ded but user incorrectly posted denial code as co23',
    errorCount: 1,
    auditedCount: 1,
    status: 'ERROR',
    errorType: 'Action Incorrect',
    category: 'NEGLIGENCE ERROR',
    primaryReportingName: 'VIJAY',
    reworkStatus: '-',
    feedbackComments: '-'
  },
  {
    id: 'qa_8',
    empId: 'RMCB 1170',
    empName: 'ALWIN A',
    workedDate: '2026-04-13',
    clientName: 'SCMG',
    pms: 'CERNER',
    location: 'CBE',
    processName: 'PAYMENT POSTING',
    subProcessName: 'ERA',
    productionCount: 668,
    fileNameBatch: 'BCBS C26097E17422660 $7,252.06 T-517 N-66897 ALWIN 04132026.CSV',
    pg: '',
    checkNum: 'NO CHK',
    claimNum: 'SI774883X14079',
    dateOfService: '2026-04-10',
    cptAmount: '7252.06',
    comments: 'PAYMENT POSTED',
    actionTaken: 'PAYMENT POSTED',
    auditorEmpId: '941',
    auditorName: 'GOKULAPRIYA',
    auditDate: '2026-04-14',
    auditorComments: 'G0136 counseling/screening codes should not be billed to the patient. These services were incorrectly assigned to patient responsibility, resulting in a balance of $20.81.',
    errorCount: 1,
    auditedCount: 1,
    status: 'ERROR',
    errorType: 'SOP/UPDATE NOT FOLLOWED',
    category: 'CLIENT PROTOCOL ERROR',
    primaryReportingName: 'VIJAY',
    reworkStatus: '',
    feedbackComments: ''
  },
  {
    id: 'qa_9',
    empId: 'RMCB 1171',
    empName: 'KARTHIK P',
    workedDate: '2026-04-09',
    clientName: 'SCMG',
    pms: 'CERNER',
    location: 'CBE',
    processName: 'PAYMENT POSTING',
    subProcessName: 'ERA',
    productionCount: 155,
    fileNameBatch: 'GATEWAY (Z-E) 04082026 (T-155) N-66590   karthik 04092026.CSV',
    pg: '',
    checkNum: '499788499',
    claimNum: 'SI711974X19233',
    dateOfService: '2026-04-08',
    cptAmount: '0',
    comments: 'PAYMENT POSTED',
    actionTaken: 'PAYMENT POSTED',
    auditorEmpId: '941',
    auditorName: 'GOKULAPRIYA',
    auditDate: '2026-04-10',
    auditorComments: 'For claim 711974  (CPT G0179  Home Health Codes ), there is a $0.23 balance that should have been transferred to the secondary insurance. However, the balance was incorrectly transferred to the patient’s responsibility.',
    errorCount: 1,
    auditedCount: 1,
    status: 'ERROR',
    errorType: 'SOP/UPDATE NOT FOLLOWED',
    category: 'CLIENT PROTOCOL ERROR',
    primaryReportingName: 'VIJAY',
    reworkStatus: '',
    feedbackComments: ''
  },
  {
    id: 'qa_10',
    empId: 'RMCB 1172',
    empName: 'VISWAS J',
    workedDate: '2026-04-09',
    clientName: 'SCMG',
    pms: 'CERNER',
    location: 'CBE',
    processName: 'PAYMENT POSTING',
    subProcessName: 'ERA',
    productionCount: 2047,
    fileNameBatch: 'MEDICARE 801353193 $29514.43 T-2047 N-66207  VISWAS 04092026 (1).CSV',
    pg: '',
    checkNum: '801353193',
    claimNum: 'SI710027X11755',
    dateOfService: '2026-04-07',
    cptAmount: '29303.8',
    comments: 'PAYMENT POSTED',
    actionTaken: 'PAYMENT POSTED',
    auditorEmpId: '941',
    auditorName: 'GOKULAPRIYA',
    auditDate: '2026-04-10',
    auditorComments: 'For claim 710027 (CPT G0136 Counseling/Screening codes ), there is a $0.02 balance that should have been transferred to the secondary insurance. However, the balance was incorrectly transferred to the patient’s responsibility.',
    errorCount: 1,
    auditedCount: 1,
    status: 'ERROR',
    errorType: 'SOP/UPDATE NOT FOLLOWED',
    category: 'CLIENT PROTOCOL ERROR',
    primaryReportingName: 'VIJAY',
    reworkStatus: '',
    feedbackComments: ''
  }
];
