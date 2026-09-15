"use strict";

// Automatically use current live domain in cloud production, fallback to localhost
const API_BASE = window.location.origin.includes("localhost")
  ? "http://localhost:5000/api"
  : `${window.location.origin}/api`;

const $ = id => document.getElementById(id);

let projects = [];
let parcels = [];
let docs = [];
let surveys = [];
let compensations = [];
let grievances = [];
let auditLogs = [];
let users = [];

const roles = [
  "National Administrator", "State Land Officer", "District Land Officer", "Sub-Divisional Magistrate",
  "Revenue Officer", "Survey Officer", "GIS Analyst", "Legal Officer", "Compensation Officer",
  "Project Director", "Document Reviewer", "Citizen Support Officer", "Finance Auditor", "Compliance Officer", "Field Inspector"
];

const states = [
  ["Andhra Pradesh", "South"], ["Arunachal Pradesh", "Northeast"], ["Assam", "Northeast"], ["Bihar", "East"], ["Chhattisgarh", "Central"],
  ["Goa", "West"], ["Gujarat", "West"], ["Haryana", "North"], ["Himachal Pradesh", "North"], ["Jharkhand", "East"],
  ["Karnataka", "South"], ["Kerala", "South"], ["Madhya Pradesh", "Central"], ["Maharashtra", "West"], ["Manipur", "Northeast"],
  ["Meghalaya", "Northeast"], ["Mizoram", "Northeast"], ["Nagaland", "Northeast"], ["Odisha", "East"], ["Punjab", "North"],
  ["Rajasthan", "West"], ["Sikkim", "Northeast"], ["Tamil Nadu", "South"], ["Telangana", "South"], ["Tripura", "Northeast"],
  ["Uttar Pradesh", "North"], ["Uttarakhand", "North"], ["West Bengal", "East"],
  ["Andaman and Nicobar Islands", "UT"], ["Chandigarh", "UT"], ["Dadra and Nagar Haveli and Daman and Diu", "UT"],
  ["Delhi", "UT"], ["Jammu and Kashmir", "UT"], ["Ladakh", "UT"], ["Lakshadweep", "UT"], ["Puducherry", "UT"]
];

const stateNames = states.map(x => x[0]);

const stateCenters = {
  "Andhra Pradesh": [15.9129, 79.74], "Arunachal Pradesh": [28.218, 94.7278], "Assam": [26.2006, 92.9376], "Bihar": [25.0961, 85.3131],
  "Chhattisgarh": [21.2787, 81.8661], "Goa": [15.2993, 74.124], "Gujarat": [22.2587, 71.1924], "Haryana": [29.0588, 76.0856],
  "Himachal Pradesh": [31.1048, 77.1734], "Jharkhand": [23.6102, 85.2799], "Karnataka": [15.3173, 75.7139], "Kerala": [10.8505, 76.2711],
  "Madhya Pradesh": [22.9734, 78.6569], "Maharashtra": [19.7515, 75.7139], "Manipur": [24.6637, 93.9063], "Meghalaya": [25.467, 91.3662],
  "Mizoram": [23.1645, 92.9376], "Nagaland": [26.1584, 94.5624], "Odisha": [20.9517, 85.0985], "Punjab": [31.1471, 75.3412],
  "Rajasthan": [27.0238, 74.2179], "Sikkim": [27.533, 88.5122], "Tamil Nadu": [11.1271, 78.6569], "Telangana": [18.1124, 79.0193],
  "Tripura": [23.9408, 91.9882], "Uttar Pradesh": [26.8467, 80.9462], "Uttarakhand": [30.0668, 79.0193], "West Bengal": [22.9868, 87.855],
  "Delhi": [28.6139, 77.209], "Jammu and Kashmir": [33.7782, 76.5762], "Ladakh": [34.1526, 77.5771], "Chandigarh": [30.7333, 76.7794],
  "Puducherry": [11.9416, 79.8083], "Lakshadweep": [10.5667, 72.6417], "Andaman and Nicobar Islands": [11.7401, 92.6586],
  "Dadra and Nagar Haveli and Daman and Diu": [20.4283, 72.8397]
};

const parcelPolygons = {
  "UP-LKO-10458": [[26.7942, 80.8884], [26.7950, 80.8910], [26.7925, 80.8920], [26.7918, 80.8890]],
  "RJ-JP-004821": [[26.8216, 75.7838], [26.8226, 75.7870], [26.8190, 75.7880], [26.8180, 75.7845]],
  "KL-ER-10421": [[10.1086, 76.3506], [10.1095, 76.3530], [10.1065, 76.3535], [10.1058, 76.3510]],
  "MH-TH-55201": [[19.2413, 73.1295], [19.2420, 73.1320], [19.2390, 73.1325], [19.2385, 73.1298]]
};

const pageInfo = {
  dashboard: ["National Dashboard", "Real-Time National Land Acquisition & Management System"],
  mapPage: ["GIS Command Map", "Interactive national view of projects, parcels and hotspots"],
  states: ["States & UTs", "National coverage across all 28 states and 8 Union Territories"],
  projects: ["Project Management", "Create, open and monitor acquisition projects"],
  projectDetail: ["Project Profile", "Detailed project management and acquisition package"],
  parcels: ["Land Parcel Registry", "Digital parcel, ownership and acquisition inventory"],
  parcelDetail: ["Parcel Profile", "Integrated land, workflow, compensation and documents"],
  workflow: ["Acquisition Workflow", "End-to-end acquisition lifecycle"],
  documents: ["Digital Documents", "Ownership, survey, notice and compensation evidence"],
  surveys: ["Field Surveys", "GPS-enabled inspections and field evidence"],
  compensation: ["Compensation", "Valuation, approvals and payment monitoring"],
  grievances: ["Grievances & Hearings", "Objections, complaints and public hearing workflow"],
  analytics: ["Analytics & AI", "Priority analysis and operational decision support"],
  citizen: ["Citizen Portal", "Public status lookup and grievance access"],
  audit: ["Audit Trail", "Accountability and traceability"],
  users: ["Users & Roles", "National, state and district access management"],
  reports: ["Reports", "Management reports and export tools"]
};

let chart = null, map = null, mapReady = false, mapLayers = {}, currentProject = null, currentParcel = null;

function toast(m) {
  const t = $("toast");
  if (!t) return;
  t.textContent = m;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), 2500);
}

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}

function fillSelect(id, items, placeholder) {
  const el = $(id);
  if (!el) return;
  el.innerHTML = (placeholder ? `<option value="">${placeholder}</option>` : "") + items.map(v => `<option>${esc(v)}</option>`).join("");
}

fillSelect("parcelState", stateNames, "All States / UTs");
fillSelect("stateDash", stateNames, "All India");
fillSelect("roleFilter", roles, "All Roles");

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "x-user": localStorage.getItem("geoUser") || "admin@geoframe.gov.in"
  };
}

function showApp() {
  if ($("loginPage")) $("loginPage").classList.add("hidden");
  if ($("app")) $("app").classList.remove("hidden");
  const role = localStorage.getItem("geoRole") || "National Administrator";
  if ($("uRole")) $("uRole").textContent = role;
  if ($("uName")) $("uName").textContent = (localStorage.getItem("geoUser") || "admin@geoframe.gov.in").split("@")[0];
  if ($("date")) $("date").textContent = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  loadAllFromBackend();
  initChart();
}

if ($("loginForm")) {
  $("loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const email = $("email").value.trim();
    const password = $("password").value;
    const role = $("loginRole").value;

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role })
      });
      const result = await res.json();
      if (result.success) {
        localStorage.setItem("geoLogin", "1");
        localStorage.setItem("geoRole", role);
        localStorage.setItem("geoUser", email);
        showApp();
      } else {
        alert(result.message || "Invalid credentials");
      }
    } catch (err) {
      alert("Backend connect nahi ho pa raha hai! Check karein ki 'node server.js' terminal me chal raha hai.");
    }
  });
}

if ($("logout")) {
  $("logout").addEventListener("click", () => {
    localStorage.removeItem("geoLogin");
    location.reload();
  });
}

if (localStorage.getItem("geoLogin") === "1") showApp();

document.querySelectorAll(".nav-btn").forEach(btn => btn.addEventListener("click", () => {
  const p = btn.dataset.page;
  document.querySelectorAll(".nav-btn").forEach(x => x.classList.remove("active"));
  btn.classList.add("active");
  document.querySelectorAll(".page").forEach(x => x.classList.remove("active"));
  if ($(p)) $(p).classList.add("active");
  if (pageInfo[p]) {
    if ($("heading")) $("heading").textContent = pageInfo[p][0];
    if ($("subheading")) $("subheading").textContent = pageInfo[p][1];
  }
  if ($("sidebar")) $("sidebar").classList.remove("open");
  if (p === "mapPage") setTimeout(initMap, 100);
}));

if ($("menu")) $("menu").addEventListener("click", () => $("sidebar").classList.toggle("open"));
if ($("notification")) $("notification").addEventListener("click", () => {
  const gBtn = document.querySelector('[data-page="grievances"]');
  if (gBtn) gBtn.click();
});

function initChart() {
  if (typeof Chart === "undefined" || !$("trend")) return;
  if (chart) chart.destroy();
  chart = new Chart($("trend"), {
    type: "line",
    data: {
      labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"],
      datasets: [
        { label: "Acquired", data: [920, 1080, 1190, 1350, 1510, 1730], tension: .35, fill: true, borderWidth: 2 },
        { label: "New Proposals", data: [420, 510, 470, 640, 590, 720], tension: .35, fill: true, borderWidth: 2 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { font: { size: 9 } } } },
      scales: { x: { grid: { display: false } }, y: { beginAtZero: true } }
    }
  });
}

async function fetchDashboardStats() {
  try {
    const res = await fetch(`${API_BASE}/dashboard/stats`);
    const data = await res.json();
    if (data && data.kpis) {
      if ($("dkProjects")) $("dkProjects").textContent = data.kpis.projects;
      if ($("dkParcels")) $("dkParcels").textContent = data.kpis.parcels;
      if ($("dkCases")) $("dkCases").textContent = data.kpis.activeCases;
      if ($("dkRisk")) $("dkRisk").textContent = data.kpis.highRiskCount;
    }
  } catch (err) {
    console.error("Dashboard stats error:", err);
  }
}

if ($("refresh")) {
  $("refresh").addEventListener("click", async () => {
    await loadAllFromBackend();
    toast("National data refreshed from MySQL");
  });
}

if ($("stateDash")) {
  $("stateDash").addEventListener("change", () => {
    toast($("stateDash").value ? `Dashboard filtered: ${$("stateDash").value}` : "Dashboard reset to All India");
  });
}

// Interactive GIS Command Map
let streetLayer = (typeof L !== "undefined") ? L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }) : null;
let satelliteLayer = (typeof L !== "undefined") ? L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Tiles © Esri" }) : null;

function initMap() {
  if (typeof L === "undefined" || !$("map")) return;
  if (mapReady) { map.invalidateSize(); return; }

  map = L.map("map", {
    center: [22.7, 79.1],
    zoom: 5,
    layers: [streetLayer]
  });

  const baseMaps = {
    "🗺️ Roadmap": streetLayer,
    "🛰️ Satellite View": satelliteLayer
  };
  L.control.layers(baseMaps, null, { position: "topright" }).addTo(map);

  mapLayers.projects = L.layerGroup();
  mapLayers.parcels = L.layerGroup();
  mapLayers.risk = L.layerGroup();
  mapLayers.polygons = L.layerGroup();

  renderMapLayers();

  const drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);
  const drawControl = new L.Control.Draw({
    edit: { featureGroup: drawnItems },
    draw: { polygon: true, rectangle: true, polyline: false, circle: false, marker: false, circlemarker: false }
  });
  map.addControl(drawControl);

  map.on(L.Draw.Event.CREATED, function (event) {
    drawnItems.addLayer(event.layer);
    toast("Khasra Plot Boundary demarcated successfully!");
  });

  Object.values(mapLayers).forEach(l => l.addTo(map));

  document.querySelectorAll(".switch").forEach(s => s.onclick = () => {
    const l = mapLayers[s.dataset.layer];
    if (l) {
      if (map.hasLayer(l)) {
        map.removeLayer(l);
        s.classList.remove("on");
      } else {
        map.addLayer(l);
        s.classList.add("on");
      }
    }
  });

  mapReady = true;
}

function renderMapLayers() {
  if (!mapReady) return;
  mapLayers.projects.clearLayers();
  mapLayers.parcels.clearLayers();
  mapLayers.risk.clearLayers();
  if (mapLayers.polygons) mapLayers.polygons.clearLayers();

  projects.forEach(p => {
    const stateName = (p.states && p.states[0]) ? p.states[0] : "Uttar Pradesh";
    const center = stateCenters[stateName] || [22.7, 79.1];
    L.circle(center, { radius: 18000, color: "#1d4ed8", fillOpacity: 0.15 })
      .bindPopup(`<b>${esc(p.name)}</b><br>${esc(p.type)}<br>${esc((p.states || []).join(", "))}<br>Progress: ${p.progress}%`)
      .addTo(mapLayers.projects);
  });

  parcels.forEach(p => {
    const coords = (p.gps || "22.7,79.1").split(",").map(Number);
    if (!isNaN(coords[0]) && !isNaN(coords[1])) {
      L.marker(coords)
        .bindPopup(`<b>${esc(p.parcel)}</b><br>Owner: ${esc(p.owner)}<br>Village: ${esc(p.village)}<br>Status: ${esc(p.status)}<br><button class="small-btn" onclick="openParcel('${p.parcel}')">View Details</button>`)
        .addTo(mapLayers.parcels);

      if (p.status === "Pending") {
        L.circle(coords, { radius: 5000, color: "#dc2626", fillOpacity: .15 })
          .bindPopup(`High risk bottleneck: ${esc(p.parcel)}`)
          .addTo(mapLayers.risk);
      }

      if (parcelPolygons[p.parcel]) {
        L.polygon(parcelPolygons[p.parcel], {
          color: p.landVerified === "Verified" ? "#15803d" : "#dc2626",
          weight: 2,
          fillOpacity: 0.35
        }).bindPopup(`<b>Khasra: ${esc(p.khasra)}</b><br>Area: ${esc(p.area)}<br>Owner: ${esc(p.owner)}<br>Land Status: <b>${esc(p.landVerified || 'Pending')}</b>`).addTo(mapLayers.polygons);
      }
    }
  });
}

if ($("geo")) {
  $("geo").addEventListener("click", () => {
    if (!navigator.geolocation) {
      toast("Geolocation is not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(p => {
      if (!mapReady) initMap();
      map.setView([p.coords.latitude, p.coords.longitude], 13);
      L.marker([p.coords.latitude, p.coords.longitude]).addTo(map).bindPopup("Your Survey Location").openPopup();
    }, () => toast("Location permission was not granted"));
  });
}

function renderStates() {
  if (!$("stateBody")) return;
  const q = ($("stateSearch") ? $("stateSearch").value : "").toLowerCase();
  const r = $("regionFilter") ? $("regionFilter").value : "";
  const stateStats = states.map((x, i) => ({
    name: x[0],
    region: x[1],
    projects: projects.filter(p => (p.states || []).includes(x[0])).length || (3 + (i * 7) % 19),
    cases: parcels.filter(p => p.state === x[0]).length || (42 + (i * 17) % 310),
    parcels: 180 + (i * 97) % 1450,
    completion: 45 + (i * 13) % 53,
    risk: i % 9 === 0 ? "High" : i % 3 === 0 ? "Medium" : "Low",
    officer: ["A. Singh", "R. Sharma", "N. Verma", "P. Kumar", "M. Yadav"][i % 5]
  }));

  const data = stateStats.filter(s => s.name.toLowerCase().includes(q) && (!r || s.region === r));
  $("stateBody").innerHTML = data.map(s => `<tr><td><b>${esc(s.name)}</b></td><td>${s.region}</td><td>${s.projects}</td><td>${s.cases}</td><td>${s.parcels.toLocaleString()}</td><td>${s.completion}%</td><td><span class="status ${s.risk === "High" ? "pending" : s.risk === "Medium" ? "processing" : "completed"}">${s.risk}</span></td><td>${s.officer}</td><td><button class="small-btn" onclick="toast('Opened ${esc(s.name)} national profile')">Open</button></td></tr>`).join("");
}

if ($("stateSearch")) $("stateSearch").addEventListener("input", renderStates);
if ($("regionFilter")) $("regionFilter").addEventListener("change", renderStates);

async function fetchProjects() {
  try {
    const res = await fetch(`${API_BASE}/projects`);
    projects = await res.json();
    renderProjects();
    if (mapReady) renderMapLayers();
  } catch (err) {
    console.error("Projects error:", err);
  }
}

function renderProjects() {
  if (!$("projectGrid")) return;
  const q = ($("projectSearch") ? $("projectSearch").value : "").toLowerCase();
  const type = $("projectType") ? $("projectType").value : "";
  const status = $("projectStatus") ? $("projectStatus").value : "";
  const data = projects.filter(p => Object.values(p).join(" ").toLowerCase().includes(q) && (!type || p.type === type) && (!status || p.status === status));
  $("projectGrid").innerHTML = data.map(p => `<div class="card project-card">
    <div class="card-head"><h3>${esc(p.name)}</h3><span>${esc(p.id)}</span></div>
    <div class="project-meta"><span><b>Type:</b> ${esc(p.type)}</span><span><b>State:</b> ${esc((p.states || []).join(", "))}</span><span><b>Districts:</b> ${esc(p.district)}</span><span><b>Budget:</b> ${esc(p.budget)}</span><span><b>Parcels:</b> ${p.parcels} · <b>Risk:</b> ${p.risk}</span></div>
    <div class="progress"><i style="width:${p.progress}%"></i></div><div class="project-footer"><span>${p.progress}% completed</span><span class="status ${p.status === "Delayed" ? "pending" : p.status === "Near Completion" ? "completed" : p.status === "Planning" ? "review" : "processing"}">${p.status}</span></div>
    <div class="project-actions"><button class="small-btn" onclick="openProject('${p.id}')">Open Project</button><button class="small-btn" onclick="toast('Report prepared')">Report</button><button class="small-btn" onclick="toast('Map centered on ${esc(p.states?.[0] || 'National')}')">Map</button></div>
  </div>`).join("");
}

if ($("projectSearch")) $("projectSearch").addEventListener("input", renderProjects);
if ($("projectType")) $("projectType").addEventListener("change", renderProjects);
if ($("projectStatus")) $("projectStatus").addEventListener("change", renderProjects);

window.openProject = function(id) {
  const p = projects.find(x => x.id === id);
  if (!p) return;
  currentProject = p;
  if ($("pTitle")) $("pTitle").textContent = p.name;
  if ($("pSub")) $("pSub").textContent = `${p.id} · ${p.authority}`;
  if ($("pdId")) $("pdId").textContent = p.id;
  if ($("pdType")) $("pdType").textContent = p.type;
  if ($("pdRegion")) $("pdRegion").textContent = (p.states || []).join(" / ");
  if ($("pdStatus")) $("pdStatus").textContent = p.status;
  if ($("pdBudget")) $("pdBudget").textContent = p.budget;
  if ($("pdParcels")) $("pdParcels").textContent = p.parcels;
  if ($("pdProgress")) $("pdProgress").textContent = p.progress + "%";
  if ($("pdRisk")) $("pdRisk").textContent = p.risk + "/100";
  if ($("pdDistrict")) $("pdDistrict").textContent = p.district;
  if ($("pdAuthority")) $("pdAuthority").textContent = p.authority;
  if ($("pdStart")) $("pdStart").textContent = p.start;
  if ($("pdEnd")) $("pdEnd").textContent = p.end;
  if ($("pdLandReq")) $("pdLandReq").textContent = p.land;
  if ($("pdStake")) $("pdStake").textContent = p.stake;
  if ($("pdDirector")) $("pdDirector").textContent = p.director;

  const stages = ["Planning", "Proposal", "Survey", "Verification", "Notification", "Compensation", "Possession", "Closure"];
  const done = Math.round(p.progress / 12.5);
  if ($("milestones")) {
    $("milestones").innerHTML = stages.map((s, i) => `<div class="milestone"><div class="m-dot ${i < done ? "done-dot" : i === done ? "live-dot" : "todo-dot"}">${i < done ? "✓" : i === done ? "●" : "○"}</div><div><strong>${s}</strong><small>${i < done ? "Completed" : i === done ? "Current stage" : "Pending"}</small></div><em>${i < done ? "Completed" : i === done ? "In progress" : "—"}</em></div>`).join("");
  }
  if ($("projectPackage")) {
    $("projectPackage").innerHTML = (p.packages || []).map(x => `<tr><td>${x[0]}</td><td>${x[1]}</td><td>${x[2]}</td><td>${x[3]}</td><td>${x[4]}</td><td>${x[5]}%</td></tr>`).join("");
  }
  if ($("teamList")) {
    $("teamList").innerHTML = [["Project Director", p.director], ["Revenue Lead", "State Land Officer"], ["Survey Lead", "Field Survey Unit"], ["Legal Lead", "Legal Cell"], ["Finance Lead", "Compensation Officer"]].map(x => `<div class="person"><div><strong>${x[0]}</strong><span>${x[1]}</span></div><span>Assigned</span></div>`).join("");
  }

  document.querySelectorAll(".page").forEach(x => x.classList.remove("active"));
  if ($("projectDetail")) $("projectDetail").classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(x => x.classList.remove("active"));
  if ($("heading")) $("heading").textContent = pageInfo.projectDetail[0];
  if ($("subheading")) $("subheading").textContent = pageInfo.projectDetail[1];
};

if ($("backProjects")) $("backProjects").addEventListener("click", () => document.querySelector('[data-page="projects"]').click());
if ($("editProject")) $("editProject").addEventListener("click", () => toast("Project edit panel opened"));
if ($("projectReport")) $("projectReport").addEventListener("click", () => toast("Project report generated"));
if ($("projectDocs")) $("projectDocs").addEventListener("click", () => document.querySelector('[data-page="documents"]').click());

async function fetchParcels() {
  try {
    const res = await fetch(`${API_BASE}/parcels`);
    parcels = await res.json();
    renderParcels();
    if (mapReady) renderMapLayers();
  } catch (err) {
    console.error("Parcels error:", err);
  }
}

function renderParcels() {
  if (!$("parcelBody")) return;
  const q = ($("parcelSearch") ? $("parcelSearch").value : "").toLowerCase();
  const st = $("parcelState") ? $("parcelState").value : "";
  const status = $("parcelStatus") ? $("parcelStatus").value : "";
  const data = parcels.filter(p => Object.values(p).join(" ").toLowerCase().includes(q) && (!st || p.state === st) && (!status || p.status === status));
  $("parcelBody").innerHTML = data.map(p => `<tr>
    <td><b>${esc(p.parcel)}</b></td>
    <td>${esc(p.khasra)}</td>
    <td>${esc(p.owner)}</td>
    <td>${esc(p.village)}</td>
    <td>${esc(p.district)}</td>
    <td>${esc(p.state)}</td>
    <td>${esc(p.area)}</td>
    <td>${esc(p.landType)}</td>
    <td><span class="status ${esc(p.status.toLowerCase())}">${esc(p.status)}</span></td>
    <td><button class="small-btn" onclick="openParcel('${esc(p.parcel)}')">View</button></td>
  </tr>`).join("");
}

if ($("parcelSearch")) $("parcelSearch").addEventListener("input", renderParcels);
if ($("parcelState")) $("parcelState").addEventListener("change", renderParcels);
if ($("parcelStatus")) $("parcelStatus").addEventListener("change", renderParcels);

// Enhanced Parcel Detail Profile (With Land Demarcation & Owner KYC Verification)
window.openParcel = function(id) {
  currentParcel = parcels.find(p => p.parcel === id);
  if (!currentParcel) return;

  if ($("dParcel")) $("dParcel").textContent = currentParcel.parcel;
  if ($("dKhasra")) $("dKhasra").textContent = currentParcel.khasra;
  if ($("dOwner")) $("dOwner").textContent = currentParcel.owner;
  if ($("ownerName")) $("ownerName").textContent = currentParcel.owner;
  if ($("dVillage")) $("dVillage").textContent = currentParcel.village + " / " + currentParcel.district;
  if ($("dState")) $("dState").textContent = currentParcel.state;
  if ($("dArea")) $("dArea").textContent = currentParcel.area;
  if ($("dLandType")) $("dLandType").textContent = currentParcel.landType;
  if ($("dGps")) $("dGps").textContent = currentParcel.gps;
  if ($("parcelTitle")) $("parcelTitle").textContent = `Parcel ${currentParcel.parcel}`;

  const landV = currentParcel.landVerified || "Pending";
  const ownerV = currentParcel.ownerVerified || "Pending";

  if ($("parcelStatusBadge")) {
    $("parcelStatusBadge").innerHTML = `
      <span class="status ${currentParcel.status.toLowerCase()}">${currentParcel.status}</span>
      <span class="status ${landV === "Verified" ? "completed" : "pending"}">Land: ${landV}</span>
      <span class="status ${ownerV === "Verified" ? "completed" : "pending"}">Owner KYC: ${ownerV}</span>
    `;
  }

  // Verification Quick-Action Toolbar
  let verifyToolbar = $("verifyToolbar");
  if (!verifyToolbar) {
    verifyToolbar = document.createElement("div");
    verifyToolbar.id = "verifyToolbar";
    verifyToolbar.style.cssText = "display:flex;gap:10px;margin-top:14px;padding:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;";
    const container = $("parcelDetail");
    if (container) container.prepend(verifyToolbar);
  }

  verifyToolbar.innerHTML = `
    <button class="small-btn" style="background:#0284c7;color:#fff;font-weight:700" onclick="verifyLandPlot('${currentParcel.parcel}')">
      📍 Mark Land Demarcation Verified
    </button>
    <button class="small-btn" style="background:#16a34a;color:#fff;font-weight:700" onclick="verifyOwnerKyc('${currentParcel.parcel}')">
      👤 Validate Owner Title & e-KYC
    </button>
  `;

  const stages = ["Proposal", "Survey", "Verification", "Notification", "Objection", "Compensation", "Possession", "Closure"];
  const active = stages.indexOf("Notification");
  if ($("parcelWorkflow")) {
    $("parcelWorkflow").innerHTML = stages.map((s, i) => `<div class="milestone"><div class="m-dot ${i < active ? "done-dot" : i === active ? "live-dot" : "todo-dot"}">${i < active ? "✓" : i === active ? "●" : "○"}</div><div><strong>${s}</strong><small>${i < active ? "Completed" : i === active ? "Current stage" : "Pending"}</small></div><em>${i < active ? "Done" : i === active ? "Today" : "—"}</em></div>`).join("");
  }

  document.querySelectorAll(".page").forEach(x => x.classList.remove("active"));
  if ($("parcelDetail")) $("parcelDetail").classList.add("active");
  if ($("heading")) $("heading").textContent = pageInfo.parcelDetail[0];
  if ($("subheading")) $("subheading").textContent = pageInfo.parcelDetail[1];
};

window.verifyLandPlot = async function(parcelId) {
  try {
    const res = await fetch(`${API_BASE}/parcels/${encodeURIComponent(parcelId)}/verify-land`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ status: "Verified", remarks: "Cadastral field survey and boundary confirmed" })
    });
    if (res.ok) {
      toast(`Land parcel ${parcelId} demarcated & verified!`);
      await fetchParcels();
      openParcel(parcelId);
      await fetchAudit();
    }
  } catch (err) {
    toast("Error verifying land plot");
  }
};

window.verifyOwnerKyc = async function(parcelId) {
  try {
    const res = await fetch(`${API_BASE}/parcels/${encodeURIComponent(parcelId)}/verify-owner`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ status: "Verified" })
    });
    if (res.ok) {
      toast(`Owner legal title & biometric KYC verified!`);
      await fetchParcels();
      openParcel(parcelId);
      await fetchAudit();
    }
  } catch (err) {
    toast("Error verifying owner KYC");
  }
};

if ($("backParcels")) $("backParcels").addEventListener("click", () => document.querySelector('[data-page="parcels"]').click());

if ($("parcelUpdate")) {
  $("parcelUpdate").addEventListener("click", async () => {
    if (!currentParcel) return;
    const order = ["Pending", "Processing", "Review", "Completed"];
    const nextStatus = order[(order.indexOf(currentParcel.status) + 1) % order.length];

    try {
      const res = await fetch(`${API_BASE}/parcels/${encodeURIComponent(currentParcel.parcel)}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        currentParcel.status = nextStatus;
        openParcel(currentParcel.parcel);
        renderParcels();
        fetchAudit();
        toast(`Parcel status updated to ${nextStatus}`);
      }
    } catch (err) {
      toast("Error updating parcel status");
    }
  });
}

if ($("parcelRemark")) $("parcelRemark").addEventListener("click", () => openModal("Add Parcel Remark", `<form id="remarkForm"><div class="field"><label>Officer Remark</label><textarea name="remark" rows="5" required placeholder="Enter observation, decision, or field remark..."></textarea></div><div class="modal-actions"><button type="button" class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn primary">Save Remark</button></div></form>`));
if ($("parcelDocs")) $("parcelDocs").addEventListener("click", () => document.querySelector('[data-page="documents"]').click());

// Digital Documents & Officer Approval Engine
async function fetchDocuments() {
  try {
    const res = await fetch(`${API_BASE}/documents`);
    docs = await res.json();
    renderDocs();
  } catch (err) {
    console.error("Docs error:", err);
  }
}

function renderDocs() {
  if (!$("docBody")) return;
  const q = ($("docSearch") ? $("docSearch").value : "").toLowerCase();
  const t = $("docType") ? $("docType").value : "";
  $("docBody").innerHTML = docs.filter(d => Object.values(d).join(" ").toLowerCase().includes(q) && (!t || d.type === t)).map(d => {
    const isVerified = d.status === "Verified";
    return `<tr>
      <td><b>📄 ${esc(d.name)}</b></td>
      <td>${esc(d.type)}</td>
      <td>${esc(d.parcel)}</td>
      <td>${esc(d.state)}</td>
      <td>${esc(d.by)}</td>
      <td><span class="status ${isVerified ? "completed" : "pending"}">${esc(d.status)}</span></td>
      <td>${esc(d.date)}</td>
      <td>
        ${!isVerified 
          ? `<button class="small-btn" style="background:#15803d;color:#fff;font-weight:700" onclick="verifyDocument('${esc(d.id)}')">✓ Approve</button>` 
          : `<span style="color:#15803d;font-size:11px;font-weight:700">Verified ✓</span>`
        }
      </td>
    </tr>`;
  }).join("");
}

window.verifyDocument = async function(docId) {
  try {
    const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(docId)}/verify`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ status: "Verified" })
    });
    if (res.ok) {
      toast(`Document ${docId} verified successfully!`);
      await fetchDocuments();
      await fetchAudit();
    }
  } catch (err) {
    toast("Failed to verify document");
  }
};

if ($("docSearch")) $("docSearch").addEventListener("input", renderDocs);
if ($("docType")) $("docType").addEventListener("change", renderDocs);

// Field Surveys
async function fetchSurveys() {
  try {
    const res = await fetch(`${API_BASE}/surveys`);
    surveys = await res.json();
    renderSurveys();
  } catch (err) {
    console.error("Surveys error:", err);
  }
}

function renderSurveys() {
  if (!$("surveyBody")) return;
  $("surveyBody").innerHTML = surveys.map(s => `<tr><td>${esc(s.id)}</td><td><b>${esc(s.parcel)}</b></td><td>${esc(s.state)}</td><td>${esc(s.inspector)}</td><td>${esc(s.gps)}</td><td>${esc(s.date)}</td><td><span class="status ${s.status === "Completed" ? "completed" : s.status === "In Progress" ? "processing" : "review"}">${esc(s.status)}</span></td><td><button class="small-btn" onclick="toast('Survey record verified on site')">Open</button></td></tr>`).join("");
}

// Compensation
async function fetchComp() {
  try {
    const res = await fetch(`${API_BASE}/compensation`);
    compensations = await res.json();
    renderComp();
  } catch (err) {
    console.error("Compensation error:", err);
  }
}

function renderComp() {
  if (!$("compBody")) return;
  $("compBody").innerHTML = compensations.map(c => `<tr><td>${esc(c.case)}</td><td><b>${esc(c.parcel)}</b></td><td>${esc(c.state)}</td><td>${esc(c.beneficiary)}</td><td>${esc(c.market)}</td><td>${esc(c.approved)}</td><td><span class="status ${c.payment.toLowerCase()}">${esc(c.payment)}</span></td><td><span class="status ${c.bank === "Verified" ? "completed" : "processing"}">${esc(c.bank)}</span></td></tr>`).join("");
}

// Grievances
async function fetchGrievances() {
  try {
    const res = await fetch(`${API_BASE}/grievances`);
    grievances = await res.json();
    renderGrievances();
  } catch (err) {
    console.error("Grievances error:", err);
  }
}

function renderGrievances() {
  if (!$("grievanceBody")) return;
  $("grievanceBody").innerHTML = grievances.map(g => `<tr><td>${esc(g.ticket)}</td><td>${esc(g.citizen)}</td><td>${esc(g.parcel)}</td><td>${esc(g.state)}</td><td>${esc(g.issue)}</td><td>${esc(g.hearing)}</td><td><span class="status ${g.status === "Resolved" ? "completed" : g.status === "Open" ? "pending" : "review"}">${esc(g.status)}</span></td><td>${esc(g.officer)}</td></tr>`).join("");
}

// Analytics & AI Decision Support
async function fetchAI() {
  try {
    const res = await fetch(`${API_BASE}/analytics/decision-support`);
    const data = await res.json();
    const rows = data.recommendations || [];
    if ($("aiBody")) {
      $("aiBody").innerHTML = rows.map(r => `<tr><td><b>${esc(r.rank)}</b></td><td>${esc(r.parcel)}</td><td>${esc(r.state)}</td><td>${esc(r.score >= 80 ? "Critical Acquisition Zone" : "Standard Zone")}</td><td><span class="status ${r.score >= 80 ? "pending" : "processing"}">${r.score}</span></td><td>${esc(r.primaryFactor)}</td><td>${esc(r.recommendedAction)}</td></tr>`).join("");
    }
  } catch (err) {
    console.error("AI scoring error:", err);
  }
}

if ($("runAI")) {
  $("runAI").addEventListener("click", () => {
    fetchAI();
    toast("National priority analysis updated from server");
  });
}

// Audit Trail
async function fetchAudit() {
  try {
    const res = await fetch(`${API_BASE}/audit`);
    auditLogs = await res.json();
    renderAudit();
  } catch (err) {
    console.error("Audit log error:", err);
  }
}

function renderAudit() {
  const container = document.querySelector("#audit .card");
  if (!container) return;
  const header = `<div class="audit-row" style="font-weight:800;background:#f8fafc"><span>Time</span><span>User</span><span>Action</span><span>Module</span></div>`;
  const rows = auditLogs.map(a => `<div class="audit-row"><span>${esc(a.time)}</span><span>${esc(a.user)}</span><span>${esc(a.action)}</span><span>${esc(a.module)}</span></div>`).join("");
  container.innerHTML = header + rows;
}

// Citizen Public Status Lookup
if ($("citizenSearch")) {
  $("citizenSearch").addEventListener("click", async () => {
    const q = $("citizenQuery").value.trim();
    if (!q) {
      toast("Please enter a Parcel ID to look up");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/citizen/lookup?query=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (res.ok && data.found) {
        $("citizenResult").innerHTML = `<div class="card citizen-result">
          <div class="card-head"><h3>Public Status — ${esc(data.parcel)}</h3><span class="status ${data.status.toLowerCase()}">${esc(data.status)}</span></div>
          <div class="detail-row"><span>State</span><b>${esc(data.state)}</b></div>
          <div class="detail-row"><span>District</span><b>${esc(data.district)}</b></div>
          <div class="detail-row"><span>Village</span><b>${esc(data.village)}</b></div>
          <div class="detail-row"><span>Area</span><b>${esc(data.area)}</b></div>
          <div class="detail-row"><span>Current Public Stage</span><b>${esc(data.currentStage)}</b></div>
        </div>`;
      } else {
        $("citizenResult").innerHTML = `<div class="card citizen-result"><b>No public record found</b><p style="font-size:9px;color:#64748b">Please verify Parcel ID e.g., UP-LKO-10458 or RJ-JP-004821.</p></div>`;
      }
    } catch (err) {
      toast("Citizen service currently unreachable");
    }
  });
}

// Users & Roles
users = [
  { name: "Arun Singh", email: "admin@geoframe.gov.in", dept: "Revenue", role: "National Administrator", state: "Uttar Pradesh", status: "Active", last: "Today 17:42" },
  { name: "Ritika Sharma", email: "ritika.sharma@gov.in", dept: "Survey", role: "Survey Officer", state: "Rajasthan", status: "Active", last: "Today 16:58" },
  { name: "Nitin Verma", email: "nitin.verma@gov.in", dept: "Legal", role: "Legal Officer", state: "Uttar Pradesh", status: "Active", last: "Today 15:31" },
  { name: "Neha Menon", email: "neha.menon@gov.in", dept: "Infrastructure", role: "Project Director", state: "Kerala", status: "Active", last: "Today 14:52" }
];

function renderUsers() {
  if (!$("userBody")) return;
  const q = ($("userSearch") ? $("userSearch").value : "").toLowerCase();
  const role = $("roleFilter") ? $("roleFilter").value : "";
  $("userBody").innerHTML = users.filter(u => Object.values(u).join(" ").toLowerCase().includes(q) && (!role || u.role === role)).map(u => `<tr><td><b>${esc(u.name)}</b></td><td>${esc(u.email)}</td><td>${esc(u.dept)}</td><td>${esc(u.role)}</td><td>${esc(u.state)}</td><td><span class="status ${u.status === "Active" ? "completed" : "pending"}">${esc(u.status)}</span></td><td>${esc(u.last)}</td><td><button class="small-btn" onclick="toast('Permissions panel opened')">Manage</button></td></tr>`).join("");
}

if ($("userSearch")) $("userSearch").addEventListener("input", renderUsers);
if ($("roleFilter")) $("roleFilter").addEventListener("change", renderUsers);

if ($("advance")) $("advance").addEventListener("click", () => toast("Selected acquisition case advanced to next stage"));

function downloadCsv(filename, headers, rows) {
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

if ($("auditCsv")) {
  $("auditCsv").addEventListener("click", () => {
    downloadCsv("geo-frame-audit.csv", ["Time", "User", "Action", "Module"], auditLogs.map(a => [a.time, a.user, a.action, a.module]));
  });
}

if ($("exportParcel")) {
  $("exportParcel").addEventListener("click", () => {
    downloadCsv("geo-frame-land-parcels.csv", ["Parcel ID", "Khasra", "Owner", "Village", "District", "State", "Area", "Land Type", "Status"], parcels.map(p => [p.parcel, p.khasra, p.owner, p.village, p.district, p.state, p.area, p.landType, p.status]));
  });
}

function openModal(title, html) {
  if (!$("modal")) return;
  $("modalTitle").textContent = title;
  $("modalBody").innerHTML = html;
  $("modal").classList.remove("hidden");
  bindForms();
}

function closeModal() {
  if ($("modal")) $("modal").classList.add("hidden");
}

if ($("modalClose")) $("modalClose").addEventListener("click", closeModal);
if ($("modal")) $("modal").addEventListener("click", e => { if (e.target === $("modal")) closeModal(); });

function bindForms() {
  const projectForm = $("newProjectForm");
  if (projectForm) {
    projectForm.onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(projectForm);
      const data = Object.fromEntries(formData.entries());

      try {
        const response = await fetch(`${API_BASE}/projects`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(data)
        });

        if (response.ok) {
          closeModal();
          await fetchProjects();
          await fetchDashboardStats();
          await fetchAudit();
          toast("Project successfully created & saved to MySQL!");
        } else {
          toast("Error saving project to server");
        }
      } catch (err) {
        console.error(err);
        toast("Server connection failed");
      }
    };
  }

  const parcelForm = $("newParcelForm");
  if (parcelForm) {
    parcelForm.onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(parcelForm);
      const data = Object.fromEntries(formData.entries());

      try {
        const res = await fetch(`${API_BASE}/parcels`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(data)
        });
        if (res.ok) {
          closeModal();
          await fetchParcels();
          await fetchDashboardStats();
          await fetchAudit();
          toast("New parcel saved to MySQL database!");
        }
      } catch (err) {
        toast("Failed to register parcel");
      }
    };
  }

  const surveyForm = $("surveyForm");
  if (surveyForm) {
    surveyForm.onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(surveyForm);
      const data = Object.fromEntries(formData.entries());

      try {
        const res = await fetch(`${API_BASE}/surveys`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(data)
        });
        if (res.ok) {
          closeModal();
          await fetchSurveys();
          await fetchAudit();
          toast("Field survey recorded!");
        }
      } catch (err) {
        toast("Failed to submit survey");
      }
    };
  }
}

// Modal Form Launchers
if ($("createProject")) {
  $("createProject").addEventListener("click", () => openModal("Create Acquisition Project", `<form id="newProjectForm"><div class="modal-grid">
    <div><label class="mini-label">Project Name</label><input name="name" required placeholder="National Highway Package"></div>
    <div><label class="mini-label">Project Type</label><select name="type"><option>Highway</option><option>Railway</option><option>Airport</option><option>Industrial</option><option>Metro</option><option>Port</option><option>Defence</option><option>Urban</option><option>Renewable Energy</option></select></div>
    <div><label class="mini-label">State / UT</label><select name="state">${stateNames.map(s => `<option>${s}</option>`).join("")}</select></div>
    <div><label class="mini-label">District / Region</label><input name="district" required></div>
    <div><label class="mini-label">Budget</label><input name="budget" placeholder="₹250 Cr"></div>
    <div><label class="mini-label">Planned Parcels</label><input name="parcels" type="number" min="1" required></div>
    <div><label class="mini-label">Project Authority</label><input name="authority" required></div>
    <div><label class="mini-label">Project Director</label><input name="director" required></div>
    <div><label class="mini-label">Start Date</label><input name="start" type="date"></div>
    <div><label class="mini-label">Target Completion</label><input name="end" type="date"></div>
  </div><div class="modal-actions"><button type="button" class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn primary">Create Project</button></div></form>`));
}

if ($("addParcel")) {
  $("addParcel").addEventListener("click", () => openModal("Add Digital Land Parcel", `<form id="newParcelForm"><div class="modal-grid">
    <div><label class="mini-label">Parcel ID</label><input name="parcel" required></div><div><label class="mini-label">Khasra / Khatauni</label><input name="khasra" required></div>
    <div><label class="mini-label">Owner Name</label><input name="owner" required></div><div><label class="mini-label">Village</label><input name="village" required></div>
    <div><label class="mini-label">District</label><input name="district" required></div><div><label class="mini-label">State / UT</label><select name="state">${stateNames.map(s => `<option>${s}</option>`).join("")}</select></div>
    <div><label class="mini-label">Area</label><input name="area" required></div><div><label class="mini-label">Land Type</label><select name="landType"><option>Agricultural</option><option>Residential</option><option>Commercial</option><option>Industrial</option><option>Infrastructure</option></select></div>
    <div><label class="mini-label">Status</label><select name="status"><option>Processing</option><option>Review</option><option>Pending</option><option>Completed</option></select></div>
    <div><label class="mini-label">GPS Coordinates</label><input name="gps" placeholder="26.8467,80.9462"></div>
  </div><div class="modal-actions"><button type="button" class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn primary">Save Parcel</button></div></form>`));
}

if ($("newSurvey")) {
  $("newSurvey").addEventListener("click", () => openModal("New Field Survey", `<form id="surveyForm"><div class="modal-grid"><div><label class="mini-label">Parcel ID</label><input name="parcel" required></div><div><label class="mini-label">State / UT</label><select name="state">${stateNames.map(s => `<option>${s}</option>`).join("")}</select></div><div><label class="mini-label">Inspector</label><input name="inspector" required></div><div><label class="mini-label">GPS</label><input name="gps" placeholder="26.8467,80.9462" required></div><div><label class="mini-label">Date</label><input name="date" type="date" required></div><div class="full"><label class="mini-label">Field Remarks</label><textarea name="remarks" rows="4" placeholder="Boundary markers, crop, road access, structures, observations..."></textarea></div></div><div class="modal-actions"><button type="button" class="btn secondary" onclick="closeModal()">Cancel</button><button class="btn primary">Save Survey</button></div></form>`));
}

// RFCTLARR 2013 Statutory Compensation Calculator
if ($("openCalc")) {
  $("openCalc").addEventListener("click", () => {
    const calcModalHTML = `
      <div style="font-size:11px;color:#475569;margin-bottom:12px">
        Calculate compensation legally under <b>RFCTLARR Act 2013</b> (Market Rate × Factor + 100% Solatium).
      </div>
      <div class="modal-grid">
        <div>
          <label class="mini-label">Base Land Market Value (₹ Lakhs)</label>
          <input id="calcBase" type="number" value="15" step="0.5" oninput="runCompensationMath()">
        </div>
        <div>
          <label class="mini-label">Location Multiplier Factor</label>
          <select id="calcAreaType" onchange="runCompensationMath()">
            <option value="2.0">Rural Area (Multiplier Factor: 2.0x)</option>
            <option value="1.25">Semi-Urban (Multiplier Factor: 1.25x)</option>
            <option value="1.0">Urban Area (Multiplier Factor: 1.0x)</option>
          </select>
        </div>
        <div>
          <label class="mini-label">Attached Assets/Crops/Buildings (₹ Lakhs)</label>
          <input id="calcAssets" type="number" value="2.5" step="0.5" oninput="runCompensationMath()">
        </div>
        <div>
          <label class="mini-label">Solatium (100% Mandatory Award)</label>
          <input id="calcSolatium" type="text" value="₹30.00 Lakhs" readonly style="background:#f8fafc">
        </div>
      </div>
      <div style="margin-top:14px;padding:12px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px">
        <div style="font-size:10px;color:#065f46;font-weight:700">Estimated Total Compensation Award:</div>
        <div id="calcTotal" style="font-size:22px;font-weight:800;color:#047857;margin-top:4px">₹62.50 Lakhs</div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn primary" onclick="closeModal()">Close Calculator</button>
      </div>
    `;
    openModal("RFCTLARR Act 2013 Compensation Calculator", calcModalHTML);
  });
}

window.runCompensationMath = function() {
  const base = parseFloat($("calcBase").value) || 0;
  const factor = parseFloat($("calcAreaType").value) || 1.0;
  const assets = parseFloat($("calcAssets").value) || 0;

  const adjustedLand = base * factor;
  const solatium = adjustedLand;
  const total = adjustedLand + solatium + assets;

  $("calcSolatium").value = `₹${solatium.toFixed(2)} Lakhs`;
  $("calcTotal").textContent = `₹${total.toFixed(2)} Lakhs`;
};

// Citizen Legal Notice Dispatcher
if ($("dispatchNotify")) {
  $("dispatchNotify").addEventListener("click", () => {
    if (!currentParcel) {
      toast("Select a parcel first");
      return;
    }

    const defaultComp = compensations.find(c => c.parcel === currentParcel.parcel) || {
      approved: "₹18.40 L",
      beneficiary: currentParcel.owner
    };

    const modalHTML = `
      <div class="dispatch-grid">
        <div>
          <div style="font-size:11px;color:#64748b;margin-bottom:10px">
            Issue legally enforceable acquisition notices and PFMS disbursement advisories via WhatsApp & SMS.
          </div>
          <form id="dispatchForm">
            <div class="field">
              <label>Target Land Parcel</label>
              <input value="${esc(currentParcel.parcel)} (${esc(currentParcel.village)}, ${esc(currentParcel.district)})" readonly style="background:#f8fafc">
            </div>
            <div class="modal-grid">
              <div>
                <label class="mini-label">Registered Beneficiary</label>
                <input id="dispName" value="${esc(currentParcel.owner)}" required>
              </div>
              <div>
                <label class="mini-label">Citizen Mobile No.</label>
                <input id="dispPhone" value="+91 98765 43210" required>
              </div>
            </div>
            <div class="modal-grid">
              <div>
                <label class="mini-label">Statutory Notice Type</label>
                <select id="dispNoticeType" onchange="updateSimulatedChat()">
                  <option value="Section 19 Award">Section 19: Compensation Award Notice</option>
                  <option value="Section 21 Possession">Section 21: Notice to Take Possession</option>
                  <option value="Hearing Schedule">Section 15: Objection Hearing Call</option>
                  <option value="PFMS Disbursed">PFMS: Treasury Direct Benefit Credit</option>
                </select>
              </div>
              <div>
                <label class="mini-label">Award / Valuation Amount</label>
                <input id="dispAmount" value="${esc(defaultComp.approved)}" oninput="updateSimulatedChat()">
              </div>
            </div>
            <div class="field">
              <label>Communication Channel & Language</label>
              <div class="tab-select">
                <button type="button" class="tab-btn active" id="btnHindi" onclick="setDispLang('hi')">🇮🇳 Hindi (हिंदी)</button>
                <button type="button" class="tab-btn" id="btnEnglish" onclick="setDispLang('en')">🌐 English</button>
              </div>
            </div>
            <div style="padding:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:9px;font-size:9px;color:#166534;margin-bottom:12px">
              🔒 <b>Court Admissible Proof:</b> A digitally signed cryptographic receipt (SHA-256) will be generated and logged to the MySQL Audit Trail.
            </div>
            <div class="modal-actions">
              <button type="button" class="btn secondary" onclick="closeModal()">Cancel</button>
              <button type="submit" class="btn primary" style="background:#059669">🚀 Send Legal Alert</button>
            </div>
          </form>
        </div>

        <div>
          <div class="phone-case">
            <div class="phone-screen">
              <div class="phone-notch"></div>
              <div class="phone-header">
                <div class="avatar-small">🏛️</div>
                <div>
                  <strong>GEO FRAME • Gov of India</strong>
                  <small>Verified Official Land Authority</small>
                </div>
              </div>
              <div class="phone-body" id="phoneChatBody"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    openModal("Citizen WhatsApp / SMS Dispatch System", modalHTML);
    window.currentDispLang = "hi";
    updateSimulatedChat();

    const form = $("dispatchForm");
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
          parcelId: currentParcel.parcel,
          beneficiary: $("dispName").value,
          phone: $("dispPhone").value,
          noticeType: $("dispNoticeType").value,
          amount: $("dispAmount").value,
          lang: window.currentDispLang
        };

        try {
          const res = await fetch(`${API_BASE}/parcels/dispatch-notice`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.success) {
            toast(`Alert sent to ${payload.phone}. Tx ID: ${data.dispatch.txId}`);
            closeModal();
            await fetchDocuments();
            await fetchAudit();
          }
        } catch (err) {
          toast("Failed to dispatch alert");
        }
      };
    }
  });
}

window.setDispLang = function(lang) {
  window.currentDispLang = lang;
  if (lang === "hi") {
    $("btnHindi").classList.add("active");
    $("btnEnglish").classList.remove("active");
  } else {
    $("btnEnglish").classList.add("active");
    $("btnHindi").classList.remove("active");
  }
  updateSimulatedChat();
};

window.updateSimulatedChat = function() {
  const container = $("phoneChatBody");
  if (!container || !currentParcel) return;

  const name = ($("dispName") ? $("dispName").value : currentParcel.owner) || "Landowner";
  const amount = ($("dispAmount") ? $("dispAmount").value : "₹18.40 Lakhs");
  const notice = $("dispNoticeType") ? $("dispNoticeType").value : "Section 19 Award";
  const now = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  let textHindi = "";
  let textEng = "";

  if (notice === "PFMS Disbursed") {
    textHindi = `प्रिय <b>${esc(name)}</b>, आपकी भूमि (खसरा ${esc(currentParcel.khasra)}, ${esc(currentParcel.village)}) के अधिग्रहण हेतु PFMS खाते में <b>${esc(amount)}</b> की मुआवाज़ा राशि स्थानांतरित कर दी गई है।<br><br>लेन-देन सं.: <b>PFMS-9482103</b><br><span class="bubble-link">gov.in/pfms/receipt</span>`;
    textEng = `Dear <b>${esc(name)}</b>, compensation of <b>${esc(amount)}</b> for parcel ${esc(currentParcel.parcel)} (Khasra ${esc(currentParcel.khasra)}) has been credited to your bank account via PFMS.<br><br>Txn Ref: <b>PFMS-9482103</b><br><span class="bubble-link">gov.in/pfms/receipt</span>`;
  } else if (notice === "Hearing Schedule") {
    textHindi = `प्रिय <b>${esc(name)}</b>, भूमि पार्सल <b>${esc(currentParcel.parcel)}</b> के सम्बंध में आपकी आपत्ति पर सार्वजनिक सुनवाई <b>12 Sep 2026</b> को SDM कोर्ट में निर्धारित है।<br><span class="bubble-link">gov.in/hearing-pass</span>`;
    textEng = `Notice: Public hearing on objection for Parcel <b>${esc(currentParcel.parcel)}</b> is scheduled on <b>12 Sep 2026</b> at District Magistrate Office.<br><span class="bubble-link">gov.in/hearing-pass</span>`;
  } else {
    textHindi = `भारत सरकार द्वारा भू-अधिग्रहण सूचना (धारा 19):<br>खसरा: <b>${esc(currentParcel.khasra)}</b>, ग्राम: ${esc(currentParcel.village)}<br>प्रस्तावित मुआवज़ा: <b>${esc(amount)}</b><br><br>आपत्ति दर्ज करने अथवा विवरण देखने हेतु नीचे क्लिक करें:<br><span class="bubble-link">geoframe.gov.in/status?p=${esc(currentParcel.parcel)}</span>`;
    textEng = `Govt of India Land Acquisition Award (Section 19):<br>Khasra: <b>${esc(currentParcel.khasra)}</b>, Village: ${esc(currentParcel.village)}<br>Award Amount: <b>${esc(amount)}</b><br><br>Check order and file feedback:<br><span class="bubble-link">geoframe.gov.in/status?p=${esc(currentParcel.parcel)}</span>`;
  }

  const selectedText = window.currentDispLang === "hi" ? textHindi : textEng;

  container.innerHTML = `
    <div class="chat-bubble">
      <b>📌 राष्ट्रीय भू-अधिग्रहण प्राधिकरण (GEO FRAME)</b><br>
      सत्यापित सरकारी संचार विभाग
      <span class="msg-time">Today, 10:00 AM</span>
    </div>
    <div class="chat-bubble green-badge">
      ${selectedText}
      <span class="msg-time">${now} · Delivered ✓✓</span>
    </div>
  `;
};

// Initial Bulk Parallel Data Fetch
async function loadAllFromBackend() {
  await Promise.allSettled([
    fetchDashboardStats(),
    fetchProjects(),
    fetchParcels(),
    fetchDocuments(),
    fetchSurveys(),
    fetchComp(),
    fetchGrievances(),
    fetchAI(),
    fetchAudit()
  ]);
  renderStates();
  renderUsers();
}


// Horizontal navbar click sync
document.querySelectorAll(".nav-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    const pageId = tab.dataset.page;
    
    // Switch active view
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add("active");

    // Re-render GIS Map if Map tab is chosen
    if (pageId === "mapPage" && typeof initMap === "function") {
      setTimeout(initMap, 150);
    }
  });
});





function showApp() {
  if ($("loginPage")) $("loginPage").classList.add("hidden");
  if ($("app")) $("app").classList.remove("hidden");

  const role = localStorage.getItem("geoRole") || "National Administrator";
  const user = (localStorage.getItem("geoUser") || "admin@geoframe.gov.in").split("@")[0];

  // Navbar user profile update
  if ($("navUName")) $("navUName").textContent = user;
  if ($("navURole")) $("navURole").textContent = role;
  if ($("navAvatar")) $("navAvatar").textContent = user.charAt(0).toUpperCase();

  // Sidebar profile update
  if ($("uRole")) $("uRole").textContent = role;
  if ($("uName")) $("uName").textContent = user;

  loadAllFromBackend();
  initChart();
}