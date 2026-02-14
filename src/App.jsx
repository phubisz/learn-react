import { useState, useEffect } from 'react';
import './App.css';
import EmployeeList from './components/EmployeeList';
import ScheduleGrid from './components/ScheduleGrid';
import ShiftTemplateSelector from './components/ShiftTemplateSelector';
import DataControls from './components/DataControls';
import SchedulingRules from './components/SchedulingRules';
import VerificationLog from './components/VerificationLog';

// Define Leave Types outside component to avoid recreation
const LEAVE_TYPES = [
  { id: 'ND', symbol: 'ND', title: 'Dzień wolny z tytułu niedzieli', type: 'leave' },
  { id: 'ŚW', symbol: 'ŚW', title: 'Dzień wolny z tytułu święta', type: 'leave' },
  { id: 'W5', symbol: 'W5', title: 'Dzień wolny z tyt. 5-dniowego tyg. pracy', type: 'leave' },
  { id: 'WH', symbol: 'WH', title: 'Dzień wolny wynikający z harmonogramu', type: 'leave' },
  { id: 'WN', symbol: 'WN', title: 'Dzień wolny za pracę w niedzielę', type: 'leave' },
  { id: 'WŚ', symbol: 'WŚ', title: 'Dzień wolny za pracę w święto', type: 'leave' },
  { id: 'WW', symbol: 'WW', title: 'Dzień wolny za pracę w dniu wolnym', type: 'leave' },
];

function App() {
  const [employees, setEmployees] = useState(() => {
    const saved = localStorage.getItem('employees');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' }
    ];
  });

  const [schedule, setSchedule] = useState(() => {
    const saved = localStorage.getItem('schedule');
    return saved ? JSON.parse(saved) : {};
  });

  const [shiftTemplates, setShiftTemplates] = useState(() => {
    const saved = localStorage.getItem('shiftTemplates');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'Dzień', type: 'day', hours: 12, startTime: '07:00', endTime: '19:00' },
      { id: 2, name: 'Noc', type: 'night', hours: 12, startTime: '19:00', endTime: '07:00' }
    ];
  });

  const [schedulingRules, setSchedulingRules] = useState(() => {
    const saved = localStorage.getItem('schedulingRules');
    return saved ? JSON.parse(saved) : {
      hoursAfterDay: 24,
      hoursAfterNight: 48,
      sundayRuleEnabled: true,
      sundayRuleDays: 6
    };
  });

  const [verificationIssues, setVerificationIssues] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTemplate, setSelectedTemplate] = useState(shiftTemplates[0]);

  // Auto-save effects
  useEffect(() => {
    localStorage.setItem('employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('schedule', JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    localStorage.setItem('shiftTemplates', JSON.stringify(shiftTemplates));
  }, [shiftTemplates]);

  useEffect(() => {
    localStorage.setItem('schedulingRules', JSON.stringify(schedulingRules));
  }, [schedulingRules]);

  useEffect(() => {
    if (!shiftTemplates || shiftTemplates.length === 0) {
      if (selectedTemplate !== null) setSelectedTemplate(null);
      return;
    }

    if (!selectedTemplate) {
      setSelectedTemplate(shiftTemplates[0]);
      return;
    }

    const match = shiftTemplates.find(t => t.id === selectedTemplate.id);
    const isLeave = LEAVE_TYPES.find(l => l.id === selectedTemplate.id);

    if (!match && !isLeave) {
      setSelectedTemplate(shiftTemplates[0]);
    } else if (match && match !== selectedTemplate) {
      setSelectedTemplate(match);
    }
  }, [shiftTemplates, selectedTemplate]);

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleExportData = () => {
    const data = {
      employees,
      schedule,
      shiftTemplates,
      schedulingRules
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'work-schedule.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (data) => {
    if (data && Array.isArray(data.employees)) setEmployees(data.employees);
    if (data && data.schedule && typeof data.schedule === 'object') setSchedule(data.schedule);
    if (data && Array.isArray(data.shiftTemplates)) setShiftTemplates(data.shiftTemplates);
    if (data && data.schedulingRules && typeof data.schedulingRules === 'object') {
      setSchedulingRules(data.schedulingRules);
    }
  };

  const handleAddEmployee = (name, maxHours = 168) => {
    const newEmployee = {
      id: Date.now(),
      name: name,
      maxHours: Number(maxHours)
    };
    setEmployees([...employees, newEmployee]);
  };

  const handleAddShiftTemplate = (template) => {
    setShiftTemplates([...shiftTemplates, { ...template, id: Date.now() }]);
  };

  const handleUpdateShiftTemplate = (updatedTemplate) => {
    setShiftTemplates(shiftTemplates.map(t =>
      t.id === updatedTemplate.id ? updatedTemplate : t
    ));
    // Also update selectedTemplate if it was the one edited
    if (selectedTemplate && selectedTemplate.id === updatedTemplate.id) {
      setSelectedTemplate(updatedTemplate);
    }
  };

  const handleDeleteShiftTemplate = (templateId) => {
    if (confirm('Are you sure you want to delete this template? All assigned shifts of this type will be removed.')) {
      // 1. Remove from templates list
      setShiftTemplates(shiftTemplates.filter(t => t.id !== templateId));

      // 2. Clear from selected if needed
      if (selectedTemplate && selectedTemplate.id === templateId) {
        setSelectedTemplate(null);
      }

      // 3. Remove all instances from schedule
      setSchedule(prev => {
        const newSchedule = { ...prev };
        Object.keys(newSchedule).forEach(dateKey => {
          const daySchedule = { ...newSchedule[dateKey] };
          let changed = false;
          Object.keys(daySchedule).forEach(empId => {
            if (daySchedule[empId].id === templateId) {
              delete daySchedule[empId];
              changed = true;
            }
          });

          if (changed) {
            if (Object.keys(daySchedule).length === 0) {
              delete newSchedule[dateKey];
            } else {
              newSchedule[dateKey] = daySchedule;
            }
          }
        });
        return newSchedule;
      });
    }
  };

  const handleRemoveEmployee = (id) => {
    setEmployees(employees.filter((employee) => employee.id !== id));
    // Also remove from schedule
    setSchedule(prev => {
      const newSchedule = { ...prev };
      Object.keys(newSchedule).forEach(day => {
        if (newSchedule[day][id]) {
          const newDaySchedule = { ...newSchedule[day] };
          delete newDaySchedule[id];
          if (Object.keys(newDaySchedule).length === 0) {
            delete newSchedule[day];
          } else {
            newSchedule[day] = newDaySchedule;
          }
        }
      });
      return newSchedule;
    });
  };

  const handleClearSchedule = () => {
    if (confirm('Are you sure you want to clear the entire schedule for the CURRENT MONTH? This cannot be undone.')) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      setSchedule(prev => {
        const newSchedule = { ...prev };
        // Loop through all days in current month and delete them from schedule
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day);
          const dateKey = date.toISOString().split('T')[0];
          delete newSchedule[dateKey];
        }
        return newSchedule;
      });
    }
  };

  const handleVerifySchedule = () => {
    const formatDateDMY = (dateKey) => {
      const [y, m, d] = dateKey.split('-');
      return `${d}-${m}-${y}`;
    };

    const issues = [];
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
      return {
        dateKey: d.toISOString().split('T')[0],
        dayNum: i + 1,
        isSunday: d.getDay() === 0
      };
    });

    employees.forEach(emp => {
      let totalHours = 0;
      let previousShiftEnd = null;
      let previousShiftType = null;
      let sundayWorkDates = [];

      days.forEach((day, index) => {
        const dateKey = day.dateKey;
        const shift = schedule[dateKey]?.[emp.id];

        if (shift) {
          // Check for 'leave' type which counts as 0 hours usually, but let's be safe
          if (shift.type !== 'leave') {
            totalHours += Number(shift.hours || 0);

            if (previousShiftEnd) {
              const startT = shift.startTime || (shift.type === 'day' ? '07:00' : '19:00');
              const endT = shift.endTime || (shift.type === 'day' ? '19:00' : '07:00');
              const currentShiftStart = new Date(`${dateKey}T${startT}`);
              // Adjust for previous day
              const diffMinutes = (currentShiftStart - previousShiftEnd) / (1000 * 60);
              const diffHours = diffMinutes / 60;

              // Determine required break based on previous shift type
              let requiredBreak = 11; // Statutory minimum
              if (previousShiftType === 'night') {
                requiredBreak = Number(schedulingRules.hoursAfterNight) || 11;
              } else if (previousShiftType === 'day') {
                requiredBreak = Number(schedulingRules.hoursAfterDay) || 11;
              }

              if (diffHours < requiredBreak) {
                issues.push({
                  type: 'error',
                  issue: 'insufficient_rest',
                  employeeId: emp.id,
                  dateKeys: [days[index - 1].dateKey, dateKey],
                  message: `Brak wymaganego odpoczynku (${requiredBreak}h) dla pracownika ${emp.name}. Odpoczynek wynosił tylko ${diffHours.toFixed(1)}h między ${formatDateDMY(days[index - 1].dateKey)} a ${formatDateDMY(dateKey)}.`
                });
              }
            }

            // Set current shift end for next iteration
            const startT = shift.startTime || (shift.type === 'day' ? '07:00' : '19:00');
            const endT = shift.endTime || (shift.type === 'day' ? '19:00' : '07:00');
            let shiftEnd = new Date(`${dateKey}T${endT}`);
            if ((Number(shift.hours) > 0 || shift.type === 'night') && endT < startT) {
              // Overnight shift, ends next day
              shiftEnd.setDate(shiftEnd.getDate() + 1);
            }
            previousShiftEnd = shiftEnd;
            previousShiftType = shift.type;

            // Sunday Check Collection
            if (day.isSunday) {
              sundayWorkDates.push({ dateKey, index });
            }
          } else {
            // It's a leave day, reset previous shift end tracker as break is assured
            previousShiftEnd = null;
          }
        } else {
          // No shift, implies break
          previousShiftEnd = null;
        }
      });

      // 1. Max Hours Check
      const max = emp.maxHours || 168;
      if (totalHours > max) {
        issues.push({
          type: 'error',
          message: `Przekroczony limit godzin dla pracownika ${emp.name}: ${totalHours}/${max}h.`
        });
      }

      // 3. Sunday Rule Check (if enabled)
      if (schedulingRules.sundayRuleEnabled) {
        const range = schedulingRules.sundayRuleDays || 6;
        sundayWorkDates.forEach(({ dateKey, index }) => {
          // Check range +/- X days for a free day (no shift assigned)
          // Simple heuristic: Look for at least one day without a shift or with a 'leave' shift
          let hasFreeDay = false;
          const startSearch = Math.max(0, index - range);
          const endSearch = Math.min(days.length - 1, index + range);

          for (let i = startSearch; i <= endSearch; i++) {
            if (i === index) continue; // Skip the Sunday itself
            const dKey = days[i].dateKey;
            const s = schedule[dKey]?.[emp.id];
            if (!s || s.type === 'leave') {
              hasFreeDay = true;
              break;
            }
          }

          if (!hasFreeDay) {
            issues.push({
              type: 'warning',
              issue: 'sunday_rule',
              employeeId: emp.id,
              dateKeys: [dateKey],
              message: `Pracownik ${emp.name} pracuje w niedzielę (${dateKey}) i nie ma dnia wolnego w ciągu +/- ${range} dni.`
            });
          }
        });
      }
    });

    if (issues.length === 0) {
      issues.push({ type: 'success', message: 'Weryfikacja zakończona pomyślnie. Brak błędów.' });
    }

    setVerificationIssues(issues);
  };

  const handleUpdateEmployee = (id, field, value) => {
    setEmployees(employees.map(emp =>
      emp.id === id ? { ...emp, [field]: value } : emp
    ));
  };

  const handleApplyShift = (dateKey, employeeId) => {
    if (!selectedTemplate) return; // Do nothing if no template selected

    setSchedule(prev => {
      const daySchedule = { ...(prev[dateKey] || {}) };
      const currentShift = daySchedule[employeeId];

      // If clicking with the SAME template that is already assigned -> Remove it (Toggle off)
      if (currentShift && currentShift.id === selectedTemplate.id) {
        delete daySchedule[employeeId];
      } else {
        // Otherwise apply the new template
        daySchedule[employeeId] = selectedTemplate;
      }

      // Cleanup empty days
      if (Object.keys(daySchedule).length === 0) {
        const newSchedule = { ...prev };
        delete newSchedule[dateKey];
        return newSchedule;
      }

      return {
        ...prev,
        [dateKey]: daySchedule
      };
    });
  };

  const [activeTab, setActiveTab] = useState('planning');

  return (
    <div className="app-container">
      <h1>Planer zmian</h1>

      <div className="tabs">
        <button
          className={activeTab === 'planning' ? 'active' : ''}
          onClick={() => setActiveTab('planning')}
        >
          Planowanie
        </button>
        <button
          className={activeTab === 'employees' ? 'active' : ''}
          onClick={() => setActiveTab('employees')}
        >
          Pracownicy
        </button>
        <button
          className={activeTab === 'rules' ? 'active' : ''}
          onClick={() => setActiveTab('rules')}
        >
          Zasady
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'employees' && (
          <EmployeeList
            employees={employees}
            onAddEmployee={handleAddEmployee}
            onRemoveEmployee={handleRemoveEmployee}
            onUpdateEmployee={handleUpdateEmployee}
          />
        )}

        {activeTab === 'rules' && (
          <SchedulingRules
            rules={schedulingRules}
            onUpdateRules={setSchedulingRules}
          />
        )}

        {activeTab === 'planning' && (
          <>
            <ShiftTemplateSelector
              templates={shiftTemplates}
              leaveTypes={LEAVE_TYPES}
              selectedTemplate={selectedTemplate}
              onSelectTemplate={setSelectedTemplate}
              onAddTemplate={handleAddShiftTemplate}
              onUpdateTemplate={handleUpdateShiftTemplate}
              onDeleteTemplate={handleDeleteShiftTemplate}
            />
            <ScheduleGrid
              employees={employees}
              schedule={schedule}
              onApplyShift={handleApplyShift}
              currentDate={currentDate}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              issues={verificationIssues}
            />
          </>
        )}
      </div>

      <DataControls
        onExport={handleExportData}
        onImport={handleImportData}
        onVerifySchedule={handleVerifySchedule}
        onClearSchedule={handleClearSchedule}
      />

      <VerificationLog issues={verificationIssues} />

      <div className="debug-config">
        <p>Debug: Zasada niedzieli: {schedulingRules.sundayRuleEnabled ? 'Włączona' : 'Wyłączona'} ({schedulingRules.sundayRuleDays} dni)</p>
      </div>
    </div>
  );
}

export default App;
