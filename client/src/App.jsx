
import { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx-js-style";
const CROPS_API = "https://agri-tech-smart-farming.onrender.com/api/crops";
const IRRIGATION_API = "https://agri-tech-smart-farming.onrender.com/api/irrigation";
function App() {
  const [page, setPage] = useState("Dashboard");
  const [crops, setCrops] = useState([]);
  const [cropName, setCropName] = useState("");
  const [area, setArea] = useState("");
  const [stage, setStage] = useState("Seedling");
  const [soil, setSoil] = useState({ ph: "6.5", moisture: "45", nitrogen: "50" });
  const [soilReport, setSoilReport] = useState(null);
  const [notice, setNotice] = useState("");
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState("");
  const [irrigationMoisture, setIrrigationMoisture] = useState("35");
  const [selectedCropId, setSelectedCropId] = useState("");
  const [rainForecast, setRainForecast] = useState(null);
  const [irrigationHistory, setIrrigationHistory] = useState([]);
  const [irrigationSaving, setIrrigationSaving] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [readAlertIds, setReadAlertIds] = useState(() => {
  try {
    return JSON.parse(
      localStorage.getItem("agritech-read-alerts") || "[]"
    );
  } catch {
    return [];
  }
});
  const analytics = {
  totalRecords: irrigationHistory.length,
  pending: irrigationHistory.filter(
    (record) => record.action === "Pending"
  ).length,
  completed: irrigationHistory.filter(
    (record) => record.action === "Irrigated"
  ).length,
};
useEffect(() => {
  localStorage.setItem(
    "agritech-read-alerts",
    JSON.stringify(readAlertIds)
  );
}, [readAlertIds]);
useEffect(() => {
  async function loadWeather() {
    try {
      setWeatherLoading(true);
      setWeatherError("");

      const response = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=28.67&longitude=77.43&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m&daily=precipitation_probability_max,precipitation_sum&forecast_days=3&timezone=Asia%2FKolkata"
      );

      if (!response.ok) {
        throw new Error("Weather service is unavailable.");
      }

      const data = await response.json();
      setWeather(data.current);
      setRainForecast(data.daily);
    } catch (error) {
      setWeatherError(error.message || "Could not load live weather.");
    } finally {
      setWeatherLoading(false);
    }
  }

  loadWeather();
}, []);
  
useEffect(() => {
  async function loadIrrigationHistory() {
    try {
      const response = await axios.get(
        `${IRRIGATION_API}?t=${Date.now()}`
      );

      const records = response.data.records || [];

      setIrrigationHistory(records);

      console.log("Loaded irrigation records:", records.length);
    } catch (error) {
      console.error(
        "Could not load irrigation history:",
        error.response?.data || error.message
      );
    }
  }

  loadIrrigationHistory();
}, []);
useEffect(() => {
    async function loadCrops() {
      try {
        const response = await axios.get(CROPS_API);
        setCrops(response.data.crops.map((crop) => ({
          ...crop,
          id: crop._id,
        })));
      } catch (error) {
        setNotice("Could not load crops. Check that the backend is running.");
      }
    }

    loadCrops();
  }, []);

  async function addCrop(e) {
    e.preventDefault();

    if (!cropName.trim() || Number(area) <= 0) {
      setNotice("Enter a crop name and a valid area.");
      return;
    }

    try {
      const response = await axios.post(CROPS_API, {
        name: cropName.trim(),
        area: Number(area),
        stage,
      });

      const savedCrop = {
        ...response.data.crop,
        id: response.data.crop._id,
      };
      setCrops((currentCrops) => [...currentCrops, savedCrop]);
      setCropName("");
      setArea("");
      setStage("Seedling");
      setNotice("Crop saved to MongoDB successfully!");
    } catch (error) {
      setNotice(error.response?.data?.message || "Could not save crop. Check the backend and try again.");
    }
  }

  async function deleteCrop(id) {
    try {
      await axios.delete(`${CROPS_API}/${id}`);
      setCrops((currentCrops) => currentCrops.filter((crop) => crop.id !== id));
      setNotice("Crop deleted from MongoDB.");
    } catch (error) {
      setNotice(error.response?.data?.message || "Could not delete crop. Please try again.");
    }
  }

  function analyzeSoil(e) {
    e.preventDefault();

    const ph = Number(soil.ph);
    const moisture = Number(soil.moisture);
    const nitrogen = Number(soil.nitrogen);

    if (
      soil.ph === "" || soil.moisture === "" || soil.nitrogen === "" ||
      !Number.isFinite(ph) || !Number.isFinite(moisture) ||
      !Number.isFinite(nitrogen) ||
      ph < 0 || ph > 14 || moisture < 0 || moisture > 100 ||
      nitrogen < 0
    ) {
      setSoilReport({ error: "Enter valid values: pH 0–14, moisture 0–100%, and non-negative nitrogen." });
 
      return;
    }

    setSoilReport({
      error: "",
      ph: ph < 5.5 ? "Acidic" : ph > 7.5 ? "Alkaline" : "Near-neutral",
      moisture: moisture < 30 ? "Low" : moisture > 70 ? "High" : "Moderate",
      nitrogen: nitrogen < 30 ? "Low" : nitrogen > 80 ? "High" : "Moderate",
    });
  }
useEffect(() => {
  console.log("Irrigation history count:", irrigationHistory.length);
  console.log("Irrigation history data:", irrigationHistory);
}, [irrigationHistory]);

const irrigationChartData = [
  {
    label: "Pending",
    count: irrigationHistory.filter(
      (record) => record.action === "Pending"
    ).length,
    color: "#F59E0B",
  },
  {
    label: "Irrigated",
    count: irrigationHistory.filter(
      (record) => record.action === "Irrigated"
    ).length,
    color: "#16A34A",
  },
  {
    label: "Skipped",
    count: irrigationHistory.filter(
      (record) => record.action === "Skipped"
    ).length,
    color: "#64748B",
  },
];

const maxIrrigationCount = Math.max(
  ...irrigationChartData.map((item) => item.count),
  1
);

const orderedIrrigationHistory = selectedCropId
  ? [
      ...irrigationHistory.filter((record) => {
        const recordCropId =
          record.cropId?._id || record.cropId;
        return String(recordCropId) === String(selectedCropId);
      }),
      ...irrigationHistory.filter((record) => {
        const recordCropId =
          record.cropId?._id || record.cropId;
        return String(recordCropId) !== String(selectedCropId);
      }),
    ]
  : irrigationHistory;

  const menu = [
  "Dashboard",
  "My Crops",
  "Soil Analysis",
  "Smart Irrigation",
  "Weather",
  "Pest Alerts",
];

const pendingIrrigationCount = irrigationHistory.filter(
  (record) => record.action === "Pending"
).length;


const latestMoistureRecord = irrigationHistory.reduce(
  (latest, record) => {
    if (!latest) return record;

    return new Date(record.createdAt || 0) >
      new Date(latest.createdAt || 0)
      ? record
      : latest;
  },
  null
);

const lowMoisture =
  latestMoistureRecord !== null &&
  Number(latestMoistureRecord.moisture) < 30;

const moistureValue = lowMoisture
  ? Number(latestMoistureRecord.moisture)
  : null;


const rainyDayIndex =
  rainForecast?.precipitation_probability_max?.findIndex(
    (probability) => probability >= 60
  ) ?? -1;
const smartAlerts = [];

if (lowMoisture) {
  smartAlerts.push({
    id: "low-moisture",
    icon: "💧",
    title: "Low Soil Moisture",
    message: `Latest saved soil moisture is ${moistureValue}%. Check the soil before watering.`,
    type: "warning",
  });
}

if (rainyDayIndex >= 0) {
  smartAlerts.push({
    id: "rain-forecast",
    icon: "🌧️",
    title: "Rain Forecast Alert",
    message: `Rain probability is ${rainForecast.precipitation_probability_max[rainyDayIndex]}% on ${rainForecast.time[rainyDayIndex]}. Review irrigation plans.`,
    type: "info",
  });
}


const pendingAlertsByCrop = Object.values(
  irrigationHistory
    .filter((record) => record.action === "Pending")
    .reduce((groups, record) => {
      const cropId = record.cropId?._id || record.cropId;
      const crop = crops.find(
        (item) => item.id === cropId
      );

      const cropName =
        record.cropName || crop?.name || "Unknown Crop";

      const key = cropId || cropName;

      if (!groups[key]) {
        groups[key] = {
          id: `pending-irrigation-${key}`,
          cropId: key,
          cropName,
          count: 0,
          icon: "⏳",
          title: `Pending Irrigation — ${cropName}`,
          message: "",
          type: "warning",
        };
      }

      groups[key].count += 1;
      groups[key].message =
        `${groups[key].count} pending irrigation record(s) need attention.`;

      return groups;
    }, {})
);

smartAlerts.push(...pendingAlertsByCrop);


const unreadAlertCount = smartAlerts.filter(
  (alert) => !readAlertIds.includes(alert.id)
).length;

async function saveIrrigationRecord() {
  if (!selectedCropId) {
    setNotice("Please select a registered crop first.");
    return;
  }

  const moistureValue = Number(irrigationMoisture);

  if (
    irrigationMoisture === "" ||
    !Number.isFinite(moistureValue) ||
    moistureValue < 0 ||
    moistureValue > 100
  ) {
    setNotice("Enter soil moisture between 0 and 100.");
    return;
  }

  const selectedCrop = crops.find(
    (crop) => crop.id === selectedCropId
  );

  if (!selectedCrop) {
    setNotice("Selected crop was not found.");
    return;
  }

  let recommendation;

  if (moistureValue < 30) {
    recommendation = "Irrigation may be needed.";
  } else if (moistureValue <= 60) {
    recommendation = "Monitor soil moisture.";
  } else {
    recommendation = "No immediate irrigation suggested.";
  }

  try {
    setIrrigationSaving(true);
    setNotice("");

    const response = await axios.post(IRRIGATION_API, {
      cropId: selectedCropId,
      moisture: moistureValue,
      recommendation,
    });

    setIrrigationHistory((previous) => [
      response.data.record,
      ...previous,
    ]);

    setNotice("Irrigation record saved successfully!");
  } catch (error) {
    setNotice(
      error.response?.data?.message ||
      "Could not save irrigation record. Check the backend."
    );
  } finally {
    setIrrigationSaving(false);
  }
}

async function updateIrrigationAction(recordId, action) {
  try {
    const response = await axios.patch(
      `${IRRIGATION_API}/${recordId}`,
      { action }
    );

    setIrrigationHistory((previous) =>
      previous.map((record) =>
        record._id === recordId
          ? response.data.record
          : record
      )
    );

    setNotice("Irrigation status updated successfully!");
  
} catch (error) {
  console.error("UPDATE IRRIGATION ERROR:", error);
  console.error("SERVER RESPONSE:", error.response?.data);
  console.error("HTTP STATUS:", error.response?.status);

  setNotice(
    error.response?.data?.message ||
    `Request failed: ${error.message}`
  );
}

}


function downloadFarmReport() {
  const workbook = XLSX.utils.book_new();

  const cropRows = [
    ["AGRI-TECH FARM MANAGEMENT SYSTEM"],
    ["Farm Report", `Generated: ${new Date().toLocaleString()}`],
    [],
    ["CROP DETAILS"],
    ["Crop Name", "Area (Acres)", "Growth Stage"],
    ...crops.map((crop) => [
      crop.name,
      crop.area,
      crop.stage,
    ]),
  ];

  const irrigationRows = [
    ["IRRIGATION HISTORY"],
    ["Generated", new Date().toLocaleString()],
    [],
    [
      "Crop Name",
      "Soil Moisture (%)",
      "Recommendation",
      "Status",
      "Date & Time",
    ],
    ...irrigationHistory.map((record) => [
      record.cropName,
      record.moisture,
      record.recommendation,
      record.action,
      record.createdAt
        ? new Date(record.createdAt).toLocaleString()
        : "N/A",
    ]),
  ];

  const cropSheet = XLSX.utils.aoa_to_sheet(cropRows);

  const irrigationSheet = XLSX.utils.aoa_to_sheet(irrigationRows);
function styleCell(sheet, address, style) {
  if (!sheet[address]) return;

  sheet[address].s = style;
}

const titleStyle = {
  font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "166534" } },
  alignment: {
  horizontal: "center",
  vertical: "center",
  wrapText: true,
},
};

const headingStyle = {
  font: { bold: true, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "15803D" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: {
    top: { style: "thin", color: { rgb: "D1D5DB" } },
    bottom: { style: "thin", color: { rgb: "D1D5DB" } },
    left: { style: "thin", color: { rgb: "D1D5DB" } },
    right: { style: "thin", color: { rgb: "D1D5DB" } },
  },
};

const borderStyle = {
  top: { style: "thin", color: { rgb: "D1D5DB" } },
  bottom: { style: "thin", color: { rgb: "D1D5DB" } },
  left: { style: "thin", color: { rgb: "D1D5DB" } },
  right: { style: "thin", color: { rgb: "D1D5DB" } },
};

// Style crop report title and headings
styleCell(cropSheet, "A1", titleStyle);
["A5", "B5", "C5"].forEach((cell) =>
  styleCell(cropSheet, cell, headingStyle)
);

// Add borders to crop data
for (let row = 6; row <= 5 + crops.length; row++) {
  ["A", "B", "C"].forEach((col) => {
    styleCell(cropSheet, `${col}${row}`, { border: borderStyle });
  });
}

// Style irrigation report title and headings
styleCell(irrigationSheet, "A1", titleStyle);
["A4", "B4", "C4", "D4", "E4"].forEach((cell) =>
  styleCell(irrigationSheet, cell, headingStyle)
);

// Add borders to irrigation data and color statuses
for (let row = 5; row <= 4 + irrigationHistory.length; row++) {
  ["A", "B", "C", "D", "E"].forEach((col) => {
    styleCell(irrigationSheet, `${col}${row}`, {
      border: borderStyle,
    });
  });

  const record = irrigationHistory[row - 5];
  if (record) {
    const statusColor =
      record.action === "Irrigated"
        ? "DCFCE7"
        : record.action === "Pending"
        ? "FEF3C7"
        : "E5E7EB";

    styleCell(irrigationSheet, `D${row}`, {
      fill: { fgColor: { rgb: statusColor } },
      font: { bold: true },
      border: borderStyle,
    });
  }
}
  function setColumnWidths(sheet, rows, minimum = 14) {
    const columnCount = Math.max(
      ...rows.map((row) => row.length),
      1
    );

    sheet["!cols"] = Array.from(
      { length: columnCount },
      (_, colIndex) => {
        const longest = Math.max(
          minimum,
          ...rows.map((row) =>
            String(row[colIndex] ?? "").length
          )
        );

        return { wch: Math.min(longest + 3, 50) };
      }
    );
  }

  setColumnWidths(cropSheet, cropRows);
  setColumnWidths(irrigationSheet, irrigationRows);
cropSheet["!merges"] = [
  { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
];

irrigationSheet["!merges"] = [
  { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
];
  if (crops.length > 0) {
    cropSheet["!autofilter"] = {
      ref: `A5:C${5 + crops.length}`,
    };
  }

  if (irrigationHistory.length > 0) {
    irrigationSheet["!autofilter"] = {
      ref: `A4:E${4 + irrigationHistory.length}`,
    };
  }

  XLSX.utils.book_append_sheet(workbook, cropSheet, "Crop Details");
  XLSX.utils.book_append_sheet(
    workbook,
    irrigationSheet,
    "Irrigation History"
  );
cropSheet["!rows"] = cropSheet["!rows"] || [];
cropSheet["!rows"][0] = { hpt: 45 };

irrigationSheet["!rows"] = irrigationSheet["!rows"] || [];
irrigationSheet["!rows"][0] = { hpt: 45 };
  XLSX.writeFile(
    workbook,
    `Agri-Tech-Farm-Report-${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`
  );
}
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">🌱 Agri-Tech</div>
        <p className="sidebar-subtitle">SMART FARMING PLATFORM</p>

        {menu.map((item, i) => (
          <button
            key={item}
            className={`nav-item ${page === item ? "active" : ""}`}
            onClick={() => {
              setPage(item);
              setNotice("");
            }}
          >
            <span>{["▦", "🌾", "🧪", "💧", "☀️", "⚠️"][i]}</span>
            {item}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="farmer-avatar">F</div>
          <div>
            <strong>Farmer Portal</strong>
            <small>Demo account</small>
          </div>
        </div>
      </aside>

      <main className="main-area">
        
<header className="topbar">
  <div>
    <span className="eyebrow">AGRICULTURE MANAGEMENT</span>
    <h1>{page}</h1>
  </div>

  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "14px",
    }}
  >
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="btn btn-outline-success position-relative"
        aria-label={`Notifications: ${unreadAlertCount} unread`}
        aria-expanded={alertsOpen}
        onClick={() => {
          
if (!alertsOpen) {
  setReadAlertIds((previous) => [
    ...new Set([
      ...previous,
      ...smartAlerts.map((alert) => alert.id),
    ]),
  ]);
}


          setAlertsOpen((open) => !open);
        }}
      >
        🔔

        {unreadAlertCount > 0 && (
          <span
            className="badge bg-danger"
            style={{
              position: "absolute",
              top: "-8px",
              right: "-8px",
            }}
          >
            {unreadAlertCount}
          </span>
        )}
      </button>

      {alertsOpen && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 10px)",
            width: "min(320px, 85vw)",
            maxHeight: "360px",
            overflowY: "auto",
            background: "#ffffff",
            border: "1px solid #dee2e6",
            borderRadius: "12px",
            padding: "14px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 1050,
            color: "#212529",
          }}
        >
          <div className="d-flex justify-content-between align-items-center mb-3">
            <strong>Notifications</strong>

            <button
              type="button"
              className="btn-close"
              aria-label="Close notifications"
              onClick={() => setAlertsOpen(false)}
            />
          </div>

          {smartAlerts.length === 0 ? (
            <p className="text-muted mb-0">
              No active alerts. Your farm is all caught up!
            </p>
          ) : (
            smartAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`alert alert-${alert.type} py-2 mb-2`}
              >
                <strong>
                  {alert.icon} {alert.title}
                </strong>

                <p className="mb-2 small">{alert.message}</p>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-dark"
                  onClick={() => {
  if (alert.cropId) {
    setSelectedCropId(String(alert.cropId));
  }

  setPage("Smart Irrigation");
  setAlertsOpen(false);
}}
                >
                  View irrigation
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>

    <span className="demo-badge">● Demo mode</span>
  </div>
</header>


        {notice && (
          <div className="alert alert-success py-2">{notice}</div>
        )}

        {page === "Dashboard" && (
          <>
            <section className="welcome-banner">
              <div>
                <span className="welcome-tag">YOUR FARM, YOUR FUTURE</span>
                <h2>Grow smarter, farm better.</h2>
                <p>Manage your crops and explore smart farming tools in one place.</p>
                <button className="btn btn-light mt-2" onClick={() => setPage("My Crops")}>
                  Manage my crops →
                </button>
              </div>
              <div className="banner-plant">🌿</div>
            </section>

            
<section className="stats-grid">
  <Stat
    title="Total Crops"
    value={crops.length}
    icon="🌾"
  />

  <Stat
    title="Total Farm Area"
    value={`${crops.reduce((sum, c) => sum + Number(c.area || 0), 0)} acres`}
    icon="🌍"
  />

  <Stat
    title="Soil Reports"
    value={soilReport && !soilReport.error ? 1 : 0}
    icon="🧪"
  />

  <Stat
    title="Total Irrigation Records"
    value={analytics.totalRecords}
    icon="💧"
  />
  <Stat
    title="Pending Irrigation"
    value={analytics.pending}
    icon="⏳"
  />

  
<Stat
  title="Completed Irrigation"
  value={analytics.completed}
  icon="✅"
/>

<Stat
  title="Skipped Irrigation"
  value={
    irrigationHistory.filter(
      (record) => record.action === "Skipped"
    ).length
  }
  icon="⏭️"
/>
</section>

<section
  style={{
    background: "#ffffff",
    padding: "24px",
    marginTop: "24px",
    borderRadius: "16px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
  }}
>
  <h2 style={{ margin: "0 0 8px", color: "#14532d" }}>
    Irrigation Analytics
  </h2>

  <p style={{ color: "#64748b", fontSize: "14px" }}>
    Overview of irrigation status across your farm
  </p>

  <div style={{ display: "flex", flexDirection: "column", gap: "22px", marginTop: "24px" }}>
    {irrigationChartData.map((item) => (
      <div key={item.label}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px",
            fontSize: "14px",
          }}
        >
          <span>{item.label}</span>
          <strong>{item.count}</strong>
        </div>

        <div
          style={{
            height: "14px",
            width: "100%",
            background: "#e2e8f0",
            borderRadius: "999px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${(item.count / maxIrrigationCount) * 100}%`,
              backgroundColor: item.color,
              borderRadius: "999px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>
    ))}
  </div>

  <p style={{ color: "#64748b", fontSize: "13px", marginTop: "20px" }}>
    Counts are calculated from saved irrigation records.
  </p>
</section>


<section className="panel mt-4">
  <div className="panel-heading">
    <div>
      <h3>Recent Irrigation Activity</h3>
      <p>Latest saved irrigation records</p>
    </div>
    <button
      className="text-button"
      onClick={() => setPage("Smart Irrigation")}
    >
      View all →
    </button>
    
<button
  type="button"
  className="btn btn-success btn-sm"
  onClick={downloadFarmReport}
>
  ↓ Download Report
</button>

  </div>

  {irrigationHistory.length === 0 ? (
    <p className="empty-state">No irrigation activity yet.</p>
  ) : (
    <div className="table-responsive">
      <table className="table align-middle mt-3">
        <thead>
          <tr>
            <th>Crop</th>
            <th>Moisture</th>
            <th>Recommendation</th>
            <th>Status</th>
            <th>Date & Time</th>
          </tr>
        </thead>
        <tbody>
          {irrigationHistory.slice(0, 5).map((record) => (
            <tr key={record._id}>
              <td>{record.cropName}</td>
              <td>{record.moisture}%</td>
              <td>{record.recommendation}</td>
              <td>
                <span className="stage-badge">
                  {record.action}
                </span>
              </td>
              <td>
                {new Date(record.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</section>


            <div className="content-grid">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h3>My Crops</h3>
                    <p>Your registered crop records</p>
                  </div>
                  <button className="text-button" onClick={() => setPage("My Crops")}>
                    View all →
                  </button>
                </div>
                {crops.length === 0 ? (
                  <p className="empty-state">No crops added yet. Add your first crop.</p>
                ) : crops.slice(0, 4).map((crop) => (
                  <div className="crop-row" key={crop.id}>
                    <div className="crop-icon">🌱</div>
                    <div className="crop-info">
                      <strong>{crop.name}</strong>
                      <small>{crop.area} acres</small>
                    </div>
                    <span className="stage-badge">{crop.stage}</span>
                  </div>
                ))}
              </section>

              <section className="panel weather-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Weather Overview</h3>
                    <p>Sample demonstration data</p>
                  </div>
                  <span>☀️</span>
                </div>
                
<div className="temperature">
  {weatherLoading ? "Loading..." :
    weather ? `${weather.temperature_2m}°C` : "--"}
</div>
<h4>Current Weather</h4>
<p className="muted">
  {weatherError ? "Weather unavailable" : "Live weather data"}
</p>
<hr />
<div className="weather-details">
  <span>
    💧 Humidity{" "}
    <strong>
      {weather ? `${weather.relative_humidity_2m}%` : "--"}
    </strong>
  </span>
  <span>
    💨 Wind{" "}
    <strong>
      {weather ? `${weather.wind_speed_10m} km/h` : "--"}
    </strong>
  </span>
</div>

                <button className="btn btn-outline-success w-100 mt-3"
                  onClick={() => setPage("Weather")}>
                  Weather details
                </button>
              </section>
            </div>

            
<section className="panel mt-4">
  <div className="panel-heading">
    <div>
      <h3>Smart Farming Alerts</h3>
      <p>Live alerts based on current readings and records</p>
    </div>

    <span className="badge bg-danger">
  {smartAlerts.length} Active
</span>
  </div>

  {smartAlerts.length === 0 ? (
    <div className="alert alert-success mt-3 mb-0">
      ✅ No active alerts right now.
    </div>
  ) : (
    smartAlerts.map((alert) => (
      <div className="alert-row" key={alert.id}>
        <span>{alert.icon}</span>
        <div>
          <strong>{alert.title}</strong>
          <p>{alert.message}</p>
        </div>
      </div>
    ))
  )}

  <p className="muted mt-3 mb-0">
    Alerts use demo thresholds and available forecast data.
    Verify local conditions before making farming decisions.
  </p>
</section>

          </>
        )}

        {page === "My Crops" && (
          <>
            <section className="panel mb-4">
              <h3>Add a Crop</h3>
              <p className="muted">Register a crop in your farm records.</p>
              <form onSubmit={addCrop}>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Crop name</label>
                    <input className="form-control" value={cropName}
                      onChange={(e) => setCropName(e.target.value)}
                      placeholder="e.g. Wheat" required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Area (acres)</label>
                    <input className="form-control" type="number" min="0.1" step="0.1"
                     value={area}  onChange={(e) => setArea(e.target.value)} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Growth stage</label>
                    <select className="form-select" value={stage}
                      onChange={(e) => setStage(e.target.value)}>
                      <option>Seedling</option>
                      <option>Growing</option>
                      <option>Flowering</option>
                      <option>Harvesting</option>
                    </select>
                  </div>
                </div>
                <button className="btn btn-success mt-3">+ Add Crop</button>
              </form>
            </section>

            <section className="panel">
              <h3>Registered Crops ({crops.length})</h3>
              <div className="table-responsive">
                <table className="table align-middle mt-3">
                  <thead><tr><th>Crop</th><th>Area</th><th>Stage</th><th>Action</th></tr></thead>
                  <tbody>
                    {crops.map((crop) => (
                      <tr key={crop.id}>
                        <td>🌿 {crop.name}</td>
                        <td>{crop.area} acres</td>
                        <td><span className="stage-badge">{crop.stage}</span></td>
                        <td><button className="btn btn-sm btn-outline-danger"
                          onClick={() => deleteCrop(crop.id)}>Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {crops.length === 0 && <p>No crops registered yet.</p>}
              </div>
            </section>
          </>
        )}

        {page === "Soil Analysis" && (
          <section className="panel">
            <h3>Soil Health Analysis</h3>
            <p className="muted">Enter readings from a soil test or sensor.</p>
            <form onSubmit={analyzeSoil}>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">Soil pH (0–14)</label>
                  <input className="form-control" type="number" min="0" max="14" step="0.1"
                    value={soil.ph} onChange={(e) => setSoil({...soil, ph: e.target.value})} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Moisture (%)</label>
                  <input className="form-control" type="number" min="0" max="100"
                    value={soil.moisture} onChange={(e) => setSoil({...soil, moisture: e.target.value})} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Nitrogen (mg/kg)</label>
                  <input className="form-control" type="number" min="0"
                    value={soil.nitrogen} onChange={(e) => setSoil({...soil, nitrogen: e.target.value})} required />
                </div>
              </div>
              <button className="btn btn-success mt-3">Analyze readings</button>
            </form>

            {soilReport && (
              <div className="analysis-result mt-4">
                <h4>Analysis Summary</h4>
                {soilReport.error ? <p>{soilReport.error}</p> : (
                  <>
                    <p>Soil pH: <strong>{soilReport.ph}</strong></p>
                    <p>Moisture: <strong>{soilReport.moisture}</strong></p>
                    <p>Nitrogen: <strong>{soilReport.nitrogen}</strong></p>
                    <p className="muted mb-0">Preliminary rule-based screening only. Confirm results with a soil laboratory or agricultural expert before making fertilizer or irrigation decisions.</p>
                  </>
                )}
              </div>
            )}
          </section>
        )}

{page === "Smart Irrigation" && (
  <section className="panel">
    <h3>💧 Smart Irrigation Recommendation</h3>
    <p className="muted">
      Enter your soil moisture reading for a preliminary suggestion.
    </p>
<label className="form-label">Select Registered Crop</label>

<select
  className="form-select mb-3"
  value={selectedCropId}
  onChange={(e) => setSelectedCropId(e.target.value)}
>
  <option value="">Select a crop</option>
  {crops.map((crop) => (
    <option key={crop.id} value={crop.id}>
      {crop.name} — {crop.stage}
    </option>
  ))}
</select>

{selectedCropId && (
  <p className="muted">
    Growth stage: {
      crops.find((crop) => crop.id === selectedCropId)?.stage
    }
  </p>
)}

{rainForecast && (
  <div className="analysis-result mt-3">
    <h4>3-Day Rainfall Forecast</h4>

    {rainForecast.time.map((day, index) => (
      <p key={day}>
        <strong>{day}</strong>:{" "}
        {rainForecast.precipitation_sum[index]} mm rain
        {" "}(
        {rainForecast.precipitation_probability_max[index]}%
        chance)
      </p>
    ))}
  </div>
)}

    <label className="form-label">Soil Moisture (%)</label>
    <input
      className="form-control"
      type="number"
      min="0"
      max="100"
      step="1"
      value={irrigationMoisture}
      onChange={(e) => setIrrigationMoisture(e.target.value)}
      required
    />

    {irrigationMoisture !== "" &&
      Number.isFinite(Number(irrigationMoisture)) &&
      Number(irrigationMoisture) >= 0 &&
      Number(irrigationMoisture) <= 100 && (
        <div className="analysis-result mt-4">
          <h4>Recommendation</h4>

          {Number(irrigationMoisture) < 30 ? (
            <p>
              <strong>Irrigation may be needed.</strong>
              {" "}Moisture is low under this demo rule. Check the crop and soil before watering.
            </p>
          ) : Number(irrigationMoisture) <= 60 ? (
            <p>
              <strong>Monitor soil moisture.</strong>
              {" "}Recheck the soil and consider crop requirements.
            </p>
          ) : (
            <p>
              <strong>No immediate irrigation suggested.</strong>
              {" "}Moisture is relatively high under this demo rule.
            </p>
          )}

          {weatherLoading ? (
            <p className="muted">Loading weather context...</p>
          ) : weather ? (
            <p className="muted">
              Current weather: {weather.temperature_2m}°C;
              {" "}precipitation: {weather.precipitation} mm.
            </p>
          ) : (
            <p className="muted">Weather data unavailable.</p>
          )}

          <p className="muted mb-0">
            Demo guidance only. Appropriate irrigation depends on crop,
            soil type, growth stage, and local conditions. These thresholds
            are illustrative, not scientifically validated irrigation rules.
          </p>
        </div>
      )}
      
    <button
      type="button"
      className="btn btn-success mt-3"
      onClick={saveIrrigationRecord}
      disabled={irrigationSaving}
    >
      {irrigationSaving ? "Saving..." : "Save Irrigation Record"}
    </button>

    {notice && (
      <p className="mt-3" role="status">
        {notice}
      </p>
    )}
    <div className="analysis-result mt-4">
      <h4>Irrigation History</h4>

      {irrigationHistory.length === 0 ? (
        <p className="muted">No irrigation records saved yet.</p>
      ) : (
        orderedIrrigationHistory.map((record) => (
          <div className="alert-row" key={record._id}>
            <div>
              <strong>{record.cropName}</strong>
              <p>Soil moisture: {record.moisture}%</p>
              <p>{record.recommendation}</p>
              
<label className="form-label">Irrigation Status</label>
<select
  className="form-select"
  value={record.action}
  onChange={(e) =>
    updateIrrigationAction(record._id, e.target.value)
  }
>
  <option value="Pending">Pending</option>
  <option value="Irrigated">Irrigated</option>
  <option value="Skipped">Skipped</option>
</select>

              <p className="muted">
                {new Date(record.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        ))
      )}
    </div>

  </section>
)}

        {page === "Weather" && (
  <section className="panel">
    <h3>Live Weather Forecast</h3>

    {weatherLoading ? (
      <p>Loading live weather...</p>
    ) : weatherError ? (
      <div className="alert alert-danger">{weatherError}</div>
    ) : weather ? (
      <>
        <div className="weather-feature">
          <span>🌤️</span>
          <div>
            <h2>{weather.temperature_2m}°C</h2>
            <p>Current Temperature</p>
          </div>
        </div>

        <div className="weather-details mt-3">
          <span>💧 Humidity: <strong>{weather.relative_humidity_2m}%</strong></span>
          <span>🌡️ Feels like: <strong>{weather.apparent_temperature}°C</strong></span>
          <span>💨 Wind: <strong>{weather.wind_speed_10m} km/h</strong></span>
          <span>🌧️ Precipitation: <strong>{weather.precipitation} mm</strong></span>
        </div>

        <p className="muted mt-3">
          Live weather data for the configured Ghaziabad-area coordinates.
        </p>
      </>
    ) : (
      <p>Weather data is unavailable.</p>
    )}
  </section>
)}

        {page === "Pest Alerts" && (
          <section className="panel">
            <h3>Pest Monitoring & Alerts</h3>
            <p className="muted">General inspection reminders — not confirmed pest detections.</p>
            {[
              ["🌾", "Inspect leaves", "Check both sides of crop leaves for spots, eggs, or insects."],
              ["🔎", "Check crop stems", "Look for damage, holes, wilting, or unusual discoloration."],
              ["📋", "Record observations", "Note the crop, location, date, and symptoms before seeking advice."],
            ].map(([icon, title, description]) => (
              <div className="alert-row" key={title}>
                <span>{icon}</span>
                <div><strong>{title}</strong><p>{description}</p></div>
              </div>
            ))}
            <div className="alert alert-info mt-3">
              For identification and treatment, consult a local agricultural expert or extension officer.
            </div>
          </section>
        )}

        <footer className="footer">Agri-Tech • Individual Capstone Project • Demo Build</footer>
      </main>
    </div>
  );
}

function Stat({ title, value, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-top"><span>{title}</span><span className="stat-icon">{icon}</span></div>
      <strong>{value}</strong>
    </div>
  );
}

export default App;
