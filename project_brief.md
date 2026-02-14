# Project Brief: Work Scheduler App

## Overview
A React-based Shift Scheduling Application for managing employee rosters, tracking hours, and verifying scheduling rules.
**Built with**: React (Vite), CSS (Modules/Vanilla), localStorage for persistence.

## Current State (As of Feb 14, 2026)

### Key Features
1.  **Schedule Grid**: 
    - Sticky "Employee" column.
    - Day/Night/Leave shift visualization.
    - Monthly view with date navigation.
    - **Stats**: Displays "Scheduled / Max Hours" per employee (e.g., 160 / 168h), turns red if exceeded.
2.  **Shift Templates**:
    - **Configurable Shifts**: Users can define Start/End times and colors (Day/Night).
    - **Leave Types**: Fixed list of non-working codes (ND, W5, WN, etc.) displayed as small gray symbols.
3.  **Employee Management**:
    - Add/Remove employees.
    - Set **Max Hours** per month for each employee.
4.  **Verification System ("Zweryfikuj")**:
    - Replaces "Auto-Schedule".
    - Validates:
        - **Max Hours**: Checks if scheduled hours > max.
        - **Rest Periods**: Checks for breaks between shifts (configurable, e.g., 11h after Day, 48h after Night).
        - **Sunday Rule**: Checks if employees working Sunday have a free day within ±6 days (configurable).
    - **Verification Log**: Displays validation errors/warnings in a list at the bottom.
5.  **Scheduling Rules**:
    - "Zasady" tab to configure:
        - Minimum break after Day shift (default 24h?).
        - Minimum break after Night shift (default 48h).
        - Sunday Rule toggle and range.

### Components Structure
- **`App.jsx`**: Main state (`schedule`, `employees`, `rules`), persistence, and **Verification Logic**.
- **`ScheduleGrid.jsx`**: Renders the main roster. Handles styling of shifts and leave types.
- **`ShiftTemplateSelector.jsx`**: Top bar for selecting templates. Includes Modal for adding/editing templates and list of Leave Types.
- **`EmployeeList.jsx`**: Sidebar for managing employees and adding new ones with specific contract hours.
- **`DataControls.jsx`**: Bottom bar with "Clear Schedule" and "Verify" buttons.
- **`VerificationLog.jsx`**: Component to render the list of validation issues.
- **`SchedulingRules.jsx`**: Form for configuring global scheduling constraints.

### Recent Changes
- **Refined UI**: Smaller delete buttons, compact leave cards (50px), standardized grid columns.
- **Verification Logic**: Fixed `Invalid Date` bugs by defaulting missing shift times to 07:00/19:00.
- **Leave Types**: Integrated non-working days into the grid and selector.

### Known Issues / To-Dos
- **Edit Employee**: Currently cannot edit Max Hours after adding an employee (must delete and re-add).
- **Auto-Scheduler**: Logic exists but is currently detached/unused in favor of manual scheduling + verification.
- **Export**: JSON export/import exists but might need testing with new Leave types.

## How to Run
1.  `npm install`
2.  `npm run dev`
