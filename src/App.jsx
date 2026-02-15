import { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css';
import EmployeeList from './components/EmployeeList';
import ScheduleGrid from './components/ScheduleGrid';
import ShiftTemplateSelector from './components/ShiftTemplateSelector';
import DataControls from './components/DataControls';
import SchedulingRules from './components/SchedulingRules';
import VerificationLog from './components/VerificationLog';
import BatchApply from './components/BatchApply';
import { verifySchedule } from './utils/scheduleVerification';
import { exportToPDF } from './utils/exportPDF';
import { exportToExcel } from './utils/exportExcel';

// Define Leave Types outside component to avoid recreation (already optimized)
const LEAVE_TYPES = [
  { id: 'ND', symbol: 'ND', title: 'Dzień wolny z tytułu niedzieli', type: 'leave' },
  { id: 'ŚW', symbol: 'ŚW', title: 'Dzień wolny z tytułu święta', type: 'leave' },
  { id: 'W5', symbol: 'W5', title: 'Dzień wolny z tyt. 5-dniowego tyg. pracy', type: 'leave' },
  { id: 'WH', symbol: 'WH', title: 'Dzień wolny wynikający z harmonogramu', type: 'leave' },
  { id: 'WN', symbol: 'WN', title: 'Dzień wolny za pracę w niedzielę', type: 'leave' },
  { id: 'WŚ', symbol: 'WŚ', title: 'Dzień wolny za pracę w święto', type: 'leave' },
  { id: 'WW', symbol: 'WW', title: 'Dzień wolny za pracę w dniu wolnym', type: 'leave' },
  { id: 'CH', symbol: 'CH', title: 'Chorobowe (zwolnienie lekarskie)', type: 'leave' },
  { id: 'UW', symbol: 'UW', title: 'Urlop wypoczynkowy', type: 'leave' },
  { id: 'UŻ', symbol: 'UŻ', title: 'Urlop na żądanie', type: 'leave' },
  { id: 'UM', symbol: 'UM', title: 'Urlop macierzyński', type: 'leave' },
];

const DEFAULT_HOLIDAYS = [
  { date: '2026-01-01', name: 'Nowy Rok' },
  { date: '2026-01-06', name: 'Trzech Króli' },
  { date: '2026-04-05', name: 'Wielkanoc' },
  { date: '2026-04-06', name: 'Poniedziałek Wielkanocny' },
  { date: '2026-05-01', name: 'Święto Pracy' },
  { date: '2026-05-03', name: 'Święto Konstytucji 3 Maja' },
  { date: '2026-05-24', name: 'Zesłanie Ducha Świętego' },
  { date: '2026-06-04', name: 'Boże Ciało' },
  { date: '2026-08-15', name: 'Wniebowzięcie NMP' },
  { date: '2026-11-01', name: 'Wszystkich Świętych' },
  { date: '2026-11-11', name: 'Święto Niepodległości' },
  { date: '2026-12-25', name: 'Boże Narodzenie' },
  { date: '2026-12-26', name: 'Drugi dzień Bożego Narodzenia' },
];

const DEFAULT_RULES = {
  hoursAfterDay: 24,
  hoursAfterNight: 48,
  sundayRuleEnabled: true,
  sundayRuleDays: 6,
  weeklyRestHours: 35,
  saturdayCompensation: true,
  sundayCompensationStrict: true,
  fourthSundayRule: true,
  checkUnmarkedDays: true,
};

function App() {
  const [employees, setEmployees] = useState(() => {
    try {
      const saved = localStorage.getItem('employees');
      return saved ? JSON.parse(saved) : [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' }
      ];
    } catch (error) {
      console.error('Failed to load employees from localStorage:', error);
      return [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' }
      ];
    }
  });

  const [schedule, setSchedule] = useState(() => {
    try {
      const saved = localStorage.getItem('schedule');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Failed to load schedule from localStorage:', error);
      return {};
    }
  });

  const [shiftTemplates, setShiftTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem('shiftTemplates');
      return saved ? JSON.parse(saved) : [
        { id: 1, name: 'Dzień', type: 'day', hours: 12, startTime: '07:00', endTime: '19:00' },
        { id: 2, name: 'Noc', type: 'night', hours: 12, startTime: '19:00', endTime: '07:00' }
      ];
    } catch (error) {
      console.error('Failed to load shift templates from localStorage:', error);
      return [
        { id: 1, name: 'Dzień', type: 'day', hours: 12, startTime: '07:00', endTime: '19:00' },
        { id: 2, name: 'Noc', type: 'night', hours: 12, startTime: '19:00', endTime: '07:00' }
      ];
    }
  });

  const [schedulingRules, setSchedulingRules] = useState(() => {
    try {
      const saved = localStorage.getItem('schedulingRules');
      return saved ? { ...DEFAULT_RULES, ...JSON.parse(saved) } : DEFAULT_RULES;
    } catch (error) {
      console.error('Failed to load scheduling rules from localStorage:', error);
      return DEFAULT_RULES;
    }
  });

  const [bankHolidays, setBankHolidays] = useState(() => {
    try {
      const saved = localStorage.getItem('bankHolidays');
      return saved ? JSON.parse(saved) : DEFAULT_HOLIDAYS;
    } catch (error) {
      console.error('Failed to load bank holidays from localStorage:', error);
      return DEFAULT_HOLIDAYS;
    }
  });

  const [verificationIssues, setVerificationIssues] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTemplate, setSelectedTemplate] = useState(shiftTemplates[0]);
  const [saveError, setSaveError] = useState(null);

  // Auto-save effects with error handling
  useEffect(() => {
    try {
      localStorage.setItem('employees', JSON.stringify(employees));
      setSaveError(null);
    } catch (error) {
      console.error('Failed to save employees:', error);
      setSaveError('Nie udało się zapisać danych pracowników. Sprawdź czy masz wystarczająco miejsca w przeglądarce.');
    }
  }, [employees]);

  useEffect(() => {
    try {
      localStorage.setItem('schedule', JSON.stringify(schedule));
      setSaveError(null);
    } catch (error) {
      console.error('Failed to save schedule:', error);
      setSaveError('Nie udało się zapisać grafiku. Sprawdź czy masz wystarczająco miejsca w przeglądarce.');
    }
  }, [schedule]);

  useEffect(() => {
    try {
      localStorage.setItem('shiftTemplates', JSON.stringify(shiftTemplates));
      setSaveError(null);
    } catch (error) {
      console.error('Failed to save shift templates:', error);
      setSaveError('Nie udało się zapisać szablonów zmian. Sprawdź czy masz wystarczająco miejsca w przeglądarce.');
    }
  }, [shiftTemplates]);

  useEffect(() => {
    try {
      localStorage.setItem('schedulingRules', JSON.stringify(schedulingRules));
      setSaveError(null);
    } catch (error) {
      console.error('Failed to save scheduling rules:', error);
      setSaveError('Nie udało się zapisać zasad grafikowania. Sprawdź czy masz wystarczająco miejsca w przeglądarce.');
    }
  }, [schedulingRules]);

  useEffect(() => {
    try {
      localStorage.setItem('bankHolidays', JSON.stringify(bankHolidays));
      setSaveError(null);
    } catch (error) {
      console.error('Failed to save bank holidays:', error);
      setSaveError('Nie udało się zapisać dni świątecznych. Sprawdź czy masz wystarczająco miejsca w przeglądarce.');
    }
  }, [bankHolidays]);

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

  const handlePrevMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const handleExportData = () => {
    try {
      const data = {
        employees,
        schedule,
        shiftTemplates,
        schedulingRules,
        bankHolidays
      };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'work-schedule.json';
      a.click();
      URL.revokeObjectURL(url);
      setSaveError(null);
    } catch (error) {
      console.error('Failed to export data:', error);
      setSaveError('Nie udało się wyeksportować danych. Spróbuj ponownie.');
    }
  };

  const handleImportData = (data) => {
    try {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format');
      }
      if (data.employees && Array.isArray(data.employees)) setEmployees(data.employees);
      if (data.schedule && typeof data.schedule === 'object') setSchedule(data.schedule);
      if (data.shiftTemplates && Array.isArray(data.shiftTemplates)) setShiftTemplates(data.shiftTemplates);
      if (data.schedulingRules && typeof data.schedulingRules === 'object') {
        setSchedulingRules(data.schedulingRules);
      }
      if (data.bankHolidays && Array.isArray(data.bankHolidays)) setBankHolidays(data.bankHolidays);
      setSaveError(null);
    } catch (error) {
      console.error('Failed to import data:', error);
      setSaveError('Nie udało się zaimportować danych. Sprawdź czy plik jest prawidłowy.');
    }
  };

  const handleAddEmployee = useCallback((name, maxHours = 168, maxHoursQuarter = 504) => {
    const newEmployee = {
      id: Date.now(),
      name: name,
      maxHours: Number(maxHours),
      maxHoursQuarter: Number(maxHoursQuarter),
    };
    setEmployees(prev => [...prev, newEmployee]);
  }, []);

  const handleAddShiftTemplate = useCallback((template) => {
    setShiftTemplates(prev => [...prev, { ...template, id: Date.now() }]);
  }, []);

  const handleUpdateShiftTemplate = useCallback((updatedTemplate) => {
    setShiftTemplates(prev => prev.map(t =>
      t.id === updatedTemplate.id ? updatedTemplate : t
    ));
    // Also update selectedTemplate if it was the one edited
    setSelectedTemplate(prev => {
      if (prev && prev.id === updatedTemplate.id) {
        return updatedTemplate;
      }
      return prev;
    });
  }, []);

  const handleDeleteShiftTemplate = useCallback((templateId) => {
    if (confirm('Are you sure you want to delete this template? All assigned shifts of this type will be removed.')) {
      // 1. Remove from templates list
      setShiftTemplates(prev => prev.filter(t => t.id !== templateId));

      // 2. Clear from selected if needed
      setSelectedTemplate(prev => {
        if (prev && prev.id === templateId) {
          return null;
        }
        return prev;
      });

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
  }, []);

  const handleRemoveEmployee = useCallback((id) => {
    setEmployees(prev => prev.filter((employee) => employee.id !== id));
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
  }, []);

  const handleClearSchedule = useCallback(() => {
    if (confirm('Are you sure you want to clear the entire schedule for the CURRENT MONTH? This cannot be undone.')) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      setSchedule(prev => {
        const newSchedule = { ...prev };
        // Loop through all days in current month and delete them from schedule
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day);
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          const dateKey = `${y}-${m}-${d}`;
          delete newSchedule[dateKey];
        }
        return newSchedule;
      });
    }
  }, [currentDate]);

  const handleVerifySchedule = () => {
    const issues = verifySchedule({ schedule, employees, currentDate, schedulingRules, bankHolidays });
    setVerificationIssues(issues);
  };

  const handleExportPDF = () => {
    try {
      exportToPDF({ employees, schedule, currentDate, bankHolidays });
    } catch (error) {
      console.error('Failed to export PDF:', error);
      setSaveError('Nie udało się wyeksportować PDF. Spróbuj ponownie.');
    }
  };

  const handleExportExcel = () => {
    try {
      exportToExcel({ employees, schedule, currentDate, bankHolidays });
    } catch (error) {
      console.error('Failed to export Excel:', error);
      setSaveError('Nie udało się wyeksportować Excel. Spróbuj ponownie.');
    }
  };

  const hasBlockingErrors = useMemo(() =>
    verificationIssues.some(issue => issue.blocking),
    [verificationIssues]
  );

  const handleUpdateEmployee = useCallback((id, field, value) => {
    setEmployees(prev => prev.map(emp =>
      emp.id === id ? { ...emp, [field]: value } : emp
    ));
  }, []);

  const handleApplyShift = useCallback((dateKey, employeeId) => {
    setSchedule(prev => {
      if (!selectedTemplate) return prev; // Do nothing if no template selected

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
  }, [selectedTemplate]);

  const handleBatchApply = useCallback((dateKeys, employeeId, template) => {
    setSchedule(prev => {
      const newSchedule = { ...prev };
      dateKeys.forEach(dateKey => {
        const daySchedule = { ...(newSchedule[dateKey] || {}) };
        daySchedule[employeeId] = template;
        newSchedule[dateKey] = daySchedule;
      });
      return newSchedule;
    });
  }, []);

  const [activeTab, setActiveTab] = useState('planning');

  return (
    <div className="app-container">
      <h1>Planer zmian</h1>

      {saveError && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{saveError}</span>
          <button className="error-close" onClick={() => setSaveError(null)}>✕</button>
        </div>
      )}

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
            bankHolidays={bankHolidays}
            onUpdateHolidays={setBankHolidays}
          />
        )}

        {activeTab === 'planning' && (
          <>
            <BatchApply
              employees={employees}
              leaveTypes={LEAVE_TYPES}
              shiftTemplates={shiftTemplates}
              onApplyBatch={handleBatchApply}
            />
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
              bankHolidays={bankHolidays}
            />
          </>
        )}
      </div>

      {activeTab === 'planning' && (
        <>
          <DataControls
            onExport={handleExportData}
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
            onImport={handleImportData}
            onVerifySchedule={handleVerifySchedule}
            onClearSchedule={handleClearSchedule}
            exportDisabled={hasBlockingErrors}
          />

          <VerificationLog issues={verificationIssues} />
        </>
      )}

    </div>
  );
}

export default App;
