  // Local storage of data until logs are reset
const localStorageKey = "rabbit_behavior_log";

let behaviorLog = JSON.parse(localStorage.getItem(localStorageKey)) || {
  rabbit1: [],
  rabbit2: []
};

const selectRabbit = document.getElementById("select-rabbit");
const buttonsDiv = document.getElementById("buttons");
const chart = d3.select("#chart");

  // Data is saved every time a new behaviour is logged
function saveLogs() {
  localStorage.setItem(localStorageKey, JSON.stringify(behaviorLog));
}

  // Each log saved with behaviour, time, together or solo, and optional note
function logBehavior(behavior) {
  const selectedRabbit = selectRabbit.value;
  const isTogether = document.getElementById("together-checkbox").checked;
  const noteInput = document.getElementById("note-input");
  const note = noteInput.value.trim();
  const timestamp = new Date();

  const entry = { behavior, timestamp, together: isTogether, note };

  // Log for selected rabbit
  behaviorLog[selectedRabbit].push(entry);

  // If rabbits are doing an activity together, log for the other rabbit too
  if (isTogether) {
    const otherRabbit = selectedRabbit === "rabbit1" ? "rabbit2" : "rabbit1";
    behaviorLog[otherRabbit].push({ ...entry }); // clone entry
  }

  // Clear note after logging
  noteInput.value = "";

  saveLogs();
  updateChart();
}

  // Reset logs to clear all data from the tracker including local storage
function resetLogs() {
  if (confirm("Clear all behaviour logs for all rabbits?")) {
    behaviorLog = { rabbit1: [], rabbit2: [] };
    saveLogs();
    updateChart();
  }
}

  // Export data for selected rabbit to a CSV file for further analysis
function exportCSV() {
  const selectedRabbit = selectRabbit.value;
  const logs = behaviorLog[selectedRabbit];
  let csvContent = "Behavior,Timestamp,Together,Note\n";

  logs.forEach(({ behavior, timestamp, together, note }) => {
    const safeNote = note ? `"${note.replace(/"/g, '""')}"` : "";
    csvContent += `${behavior},"${new Date(timestamp).toISOString()}",${together ? "Yes" : "No"},${safeNote}\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${selectedRabbit}_behavior_log.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

  // Add each log to the bar chart 
function updateChart() {
  const selectedRabbit = selectRabbit.value;
  const logs = behaviorLog[selectedRabbit];
  
  // Count behaviours and shared activities
const behaviorCounts = {};
logs.forEach(({ behavior, together }) => {
  if (!behaviorCounts[behavior]) {
    behaviorCounts[behavior] = { count: 0, together: 0 };
  }
  behaviorCounts[behavior].count += 1;
  if (together) {
    behaviorCounts[behavior].together += 1;
  }
});

  // Count total and shared activities
let totalLogs = logs.length;
let sharedLogs = logs.filter(entry => entry.together).length;
let soloLogs = totalLogs - sharedLogs;

  // Avoid dividing by 0
let sharedPct = totalLogs ? ((sharedLogs / totalLogs) * 100).toFixed(1) : 0;
let soloPct = totalLogs ? ((soloLogs / totalLogs) * 100).toFixed(1) : 0;

  // Display the summary of shared and solo activities
document.getElementById("summary").textContent = 
  `Shared: ${sharedLogs} (${sharedPct}%), Solo: ${soloLogs} (${soloPct}%)`;

const data = Object.entries(behaviorCounts).map(([behavior, { count, together }]) => ({
  behavior,
  count,
  togetherCount: together
}));

  // Clear previous chart so it can be updated
chart.selectAll("*").remove();

  // Setup dimensions for chart
const width = +chart.attr("width");
const height = +chart.attr("height");
const margin = { top: 20, right: 20, bottom: 30, left: 30 };

const x = d3.scaleBand()
  .domain(data.map(d => d.behavior))
  .range([margin.left, width - margin.right])
  .padding(0.1);

const y = d3.scaleLinear()
  .domain([0, d3.max(data, d => d.count) || 1])
  .nice()
  .range([height - margin.bottom, margin.top]);

// Bar colour changes when shared activities are more than half the total count
const barColor = d => (d.togetherCount / d.count > 0.5 ? "#ffb347" : "steelblue");

chart.append("g")
  .selectAll("rect")
  .data(data)
  .join("rect")
    .attr("x", d => x(d.behavior))
    .attr("y", d => y(d.count))
    .attr("height", d => y(0) - y(d.count))
    .attr("width", x.bandwidth())
    .attr("fill", barColor);

chart.append("g")
  .attr("transform", `translate(0,${height - margin.bottom})`)
  .call(d3.axisBottom(x));

chart.append("g")
  .attr("transform", `translate(${margin.left},0)`)
  .call(d3.axisLeft(y));
  
chart.selectAll("rect")
  .append("title")
  .text(d => {
    const percentage = ((d.togetherCount / d.count) * 100).toFixed(1);
    return `${d.behavior}\nShared: ${percentage}%`;
  });
}

  // Event listeners log behaviour, reset logs or create CSV for export when clicked
buttonsDiv.addEventListener("click", e => {
  if (e.target.dataset.behavior) {
    logBehavior(e.target.dataset.behavior);
  } else if (e.target.id === "reset-btn") {
    resetLogs();
  } else if (e.target.id === "export-btn") {
    exportCSV();
  }
});

selectRabbit.addEventListener("change", updateChart);

// Draw chart and update summary of shared and solo behaviours when a behaviour button is clicked
updateChart();
