const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const frontendPath = path.join(__dirname, "../Frontend");
app.use(express.static(frontendPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Helper: Audit Log
async function logAudit(user, action, module) {
  const time = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  try {
    await db.query(
      "INSERT INTO audit_logs (time_str, user, action, module) VALUES (?, ?, ?, ?)",
      [time, user || "Officer", action, module]
    );
  } catch (err) {
    console.error("Audit log error:", err.message);
  }
}

// ------------------------------------------------------------
// AUTHENTICATION
// ------------------------------------------------------------
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (email === "admin@geoframe.gov.in" && password === "admin123") {
    return res.json({ success: true, user: { email, role: "National Administrator" } });
  }
  res.status(401).json({ success: false, message: "Wrong email or password" });
});

// ------------------------------------------------------------
// DASHBOARD STATS (Includes Verification Metrics)
// ------------------------------------------------------------
app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const [[{ pCount }]] = await db.query("SELECT COUNT(*) AS pCount FROM projects");
    const [[{ lCount }]] = await db.query("SELECT COUNT(*) AS lCount FROM parcels");
    const [[{ cCount }]] = await db.query("SELECT COUNT(*) AS cCount FROM parcels WHERE status != 'Completed'");
    const [[{ rCount }]] = await db.query("SELECT COUNT(*) AS rCount FROM parcels WHERE status = 'Pending'");
    const [[{ verifiedLandCount }]] = await db.query("SELECT COUNT(*) AS verifiedLandCount FROM parcels WHERE land_verified = 'Verified'");

    res.json({
      kpis: {
        projects: pCount || 0,
        parcels: lCount || 0,
        activeCases: cCount || 0,
        highRiskCount: rCount || 0,
        verifiedLands: verifiedLandCount || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------
// LAND & OWNER REGISTRY (With Verification States)
// ------------------------------------------------------------
app.get("/api/parcels", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        parcel, khasra, owner, village, district, state, area, 
        land_type AS landType, status, gps,
        COALESCE(land_verified, 'Pending') AS landVerified,
        COALESCE(owner_verified, 'Pending') AS ownerVerified,
        verified_by AS verifiedBy,
        DATE_FORMAT(verified_at, '%d %b %Y') AS verifiedDate
      FROM parcels 
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify Land Physical Boundaries & Survey Record
app.patch("/api/parcels/:id/verify-land", async (req, res) => {
  const parcelId = req.params.id;
  const { status, remarks } = req.body; // status: 'Verified' or 'Rejected'
  const officer = req.headers["x-user"] || "Revenue Officer";

  try {
    await db.query(
      `UPDATE parcels 
       SET land_verified = ?, verified_by = ?, verification_notes = ?, verified_at = CURRENT_TIMESTAMP 
       WHERE parcel = ?`,
      [status || "Verified", officer, remarks || "Physical demarcation & survey verified", parcelId]
    );

    await logAudit(officer, `Marked Land ${parcelId} as ${status}`, "Land Verification");
    res.json({ success: true, parcel: parcelId, landVerified: status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify Landowner Identity & Title (e-KYC)
app.patch("/api/parcels/:id/verify-owner", async (req, res) => {
  const parcelId = req.params.id;
  const { status, remarks } = req.body; // status: 'Verified' or 'Rejected'
  const officer = req.headers["x-user"] || "Legal Officer";

  try {
    await db.query(
      `UPDATE parcels 
       SET owner_verified = ?, verified_by = ?, verified_at = CURRENT_TIMESTAMP 
       WHERE parcel = ?`,
      [status || "Verified", officer, parcelId]
    );

    await logAudit(officer, `Verified Owner KYC for ${parcelId}`, "Owner Verification");
    res.json({ success: true, parcel: parcelId, ownerVerified: status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------
// DOCUMENT VERIFICATION ENGINE
// ------------------------------------------------------------
app.get("/api/documents", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        id, name, type, parcel, state, 
        uploaded_by AS \`by\`, status, date_str AS date,
        verified_by AS verifiedBy,
        DATE_FORMAT(verified_at, '%d %b %Y') AS verifiedAt
      FROM documents 
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Officer Document Approval / Rejection API
app.patch("/api/documents/:id/verify", async (req, res) => {
  const docId = req.params.id;
  const { status, rejectionReason } = req.body; // status: 'Verified' or 'Rejected'
  const officer = req.headers["x-user"] || "Document Reviewer";

  try {
    await db.query(
      `UPDATE documents 
       SET status = ?, verified_by = ?, rejection_reason = ?, verified_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [status || "Verified", officer, rejectionReason || null, docId]
    );

    await logAudit(officer, `Document ${docId} set to ${status}`, "Document Management");
    res.json({ success: true, id: docId, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------
// REMAINING MODULE ENDPOINTS (Standard GeoFrame APIs)
// ------------------------------------------------------------
app.get("/api/projects", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, name, type, district, budget, parcels, progress, status, risk, authority, director,
        DATE_FORMAT(start_date, '%Y-%m-%d') AS start,
        DATE_FORMAT(end_date, '%Y-%m-%d') AS end,
        land, stake, packages
      FROM projects ORDER BY created_at DESC
    `);
    const formatted = rows.map(r => ({
      ...r,
      states: ["Uttar Pradesh"],
      packages: typeof r.packages === "string" ? JSON.parse(r.packages) : r.packages || []
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/projects", async (req, res) => {
  const state = req.body.state || "Uttar Pradesh";
  const district = req.body.district || "Lucknow";
  const parcelsCount = Number(req.body.parcels) || 10;
  const newId = "PRJ-" + Date.now().toString().slice(-5);
  const packages = JSON.stringify([[state, district, parcelsCount, 0, parcelsCount, 0]]);

  try {
    await db.query(
      `INSERT INTO projects (id, name, type, district, budget, parcels, progress, status, risk, authority, director, start_date, end_date, land, stake, packages)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId, req.body.name, req.body.type || "Highway", district, req.body.budget || "₹100 Cr", parcelsCount, 0, "Planning", 45, req.body.authority || "NHAI", req.body.director || "Director", req.body.start || "2026-01-01", req.body.end || "2028-12-31", "Survey Pending", "Inter-agency", packages]
    );
    await logAudit(req.headers["x-user"], `Created project ${newId}`, "Projects");
    res.status(201).json({ id: newId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/parcels", async (req, res) => {
  const { parcel, khasra, owner, village, district, state, area, landType, status, gps } = req.body;
  try {
    await db.query(
      "INSERT INTO parcels (parcel, khasra, owner, village, district, state, area, land_type, status, gps, land_verified, owner_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 'Pending')",
      [parcel, khasra, owner, village, district, state, area, landType || "Agricultural", status || "Pending", gps || "26.8467, 80.9462"]
    );
    await logAudit(req.headers["x-user"], `Registered parcel ${parcel}`, "Parcels");
    res.status(201).json({ parcel, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/parcels/:id/status", async (req, res) => {
  try {
    await db.query("UPDATE parcels SET status = ? WHERE parcel = ?", [req.body.status, req.params.id]);
    await logAudit(req.headers["x-user"], `Updated status of ${req.params.id} to ${req.body.status}`, "Workflow");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/compensation", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT case_id AS `case`, parcel, state, beneficiary, market, approved, payment, bank FROM compensations ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/surveys", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, parcel, state, inspector, gps, survey_date AS date, status FROM surveys ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/grievances", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT ticket, citizen, parcel, state, issue, hearing, status, officer FROM grievances ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/audit", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT time_str AS time, user, action, module FROM audit_logs ORDER BY id DESC LIMIT 50");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/analytics/decision-support", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT parcel, state, status, land_verified FROM parcels ORDER BY created_at DESC");
    const recommendations = rows.map((p, idx) => ({
      rank: `#${idx + 1}`,
      parcel: p.parcel,
      state: p.state,
      score: p.land_verified === "Pending" ? 85 : 45,
      primaryFactor: p.land_verified === "Pending" ? "Physical Verification Pending" : "Clear for Compensation",
      recommendedAction: p.land_verified === "Pending" ? "Depute Field Surveyor" : "Initiate PFMS Disbursement"
    }));
    res.json({ recommendations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`GEO FRAME verification server running at http://localhost:${PORT}`);
});