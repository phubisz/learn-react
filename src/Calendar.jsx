import { useState } from 'react';
import Day from './Day';

function Calendar() {
    const days = Array.from({ length: 28 }, (_, i) => i + 1);
    const studentList = ["Alice", "Bob", "Charlie", "David", "Eve"];

    // 1. Helper: Create a full month of "morning" attendance
    const getFullMonth = () => {
        const month = {};
        for (let i = 1; i <= 28; i++) {
            month[i] = "morning";
        }
        return month;
    };

    // 2. Initialize State with the helper
    const [attendance, setAttendance] = useState({
        "Alice": getFullMonth(),
        "Bob": getFullMonth(),
        "Charlie": getFullMonth(),
        "David": getFullMonth(),
        "Eve": getFullMonth()
    });

    const toggleDay = (studentName, dayNum) => {
        const studentRecord = attendance[studentName];
        const currentStatus = studentRecord[dayNum];

        // Cycle: Morning -> Evening -> Absent (delete) -> Morning
        let nextStatus;
        if (currentStatus === "morning") {
            nextStatus = "evening";
        } else if (currentStatus === "evening") {
            nextStatus = undefined; // Absent
        } else {
            nextStatus = "morning"; // Back to present
        }

        // Update State
        const newRecord = { ...studentRecord };
        if (nextStatus) {
            newRecord[dayNum] = nextStatus;
        } else {
            delete newRecord[dayNum];
        }

        setAttendance({
            ...attendance,
            [studentName]: newRecord
        });
    };

    return (
        <div style={{ padding: "20px" }}>
            <h2>Attendance Sheet</h2>
            {/* ... rest of the render code is exactly the same ... */}
            <div style={{ display: "flex", marginBottom: "10px" }}>
                <div style={{ width: "100px" }}>Student</div>
                {days.map(d => (
                    <div key={d} style={{ width: "30px", textAlign: "center", fontSize: "0.8em" }}>{d}</div>
                ))}
            </div>

            {studentList.map((student) => (
                <div key={student} style={{ display: "flex", marginBottom: "5px", alignItems: "center" }}>
                    <div style={{ width: "100px", fontWeight: "bold" }}>{student}</div>

                    {days.map((day) => (
                        <div key={day} style={{ width: "30px", display: "flex", justifyContent: "center" }}>
                            <Day
                                status={attendance[student][day]}
                                onClick={() => toggleDay(student, day)}
                            />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

export default Calendar;