function Day({ status, onClick, dayNumber }) {
    // logic to pick color
    let bgColor = "white";
    if (status === "morning") bgColor = "lightgreen";
    if (status === "evening") bgColor = "lightsalmon";

    return (
        <div
            onClick={onClick}
            style={{
                border: "1px solid #ddd",
                width: "25px", // Smaller size
                height: "25px",
                backgroundColor: bgColor,
                cursor: "pointer",
            }}
        >
            {dayNumber}
        </div>
    );
}
export default Day;