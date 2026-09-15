document.addEventListener("DOMContentLoaded", () => {
    refreshData();
});

function refreshData() {
    loadDashboardStats();
    loadParcelsDirectory();
}

// 1. Load KPI statistics from /api/dashboard/stats
async function loadDashboardStats() {
    const statusElem = document.getElementById("connection-status");
    try {
        const response = await fetch("/api/dashboard/stats");
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.status === "success") {
            document.getElementById("stat-projects").innerText = data.kpis.projects;
            document.getElementById("stat-parcels").innerText = data.kpis.parcels;
            document.getElementById("stat-pending").innerText = data.kpis.pending;
            document.getElementById("stat-grievances").innerText = data.kpis.grievances;

            statusElem.innerText = "Live Cloud MySQL Connected";
            statusElem.style.color = "#34d399";
        }
    } catch (err) {
        console.error("Dashboard stats fetch error:", err);
        statusElem.innerText = "Server/Database Offline";
        statusElem.style.color = "#ef4444";
    }
}

// 2. Load parcel records from /api/parcels
async function loadParcelsDirectory() {
    const tableBody = document.getElementById("parcels-table");
    try {
        const response = await fetch("/api/parcels");
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        if (result.status === "success" && result.data.length > 0) {
            tableBody.innerHTML = "";
            result.data.forEach((item) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td class="parcel-id">${item.parcel}</td>
                    <td>${item.khasra}</td>
                    <td>${item.owner}</td>
                    <td>${item.district}, ${item.state}</td>
                    <td>${item.area}</td>
                    <td><span class="badge ${item.status}">${item.status}</span></td>
                    <td>
                        ${item.status !== "Verified"
                            ? `<button class="btn-action" onclick="verifyParcel('${item.parcel}')">Verify</button>`
                            : `<span style="color:#64748b; font-size:12px;">Verified</span>`}
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        } else {
            tableBody.innerHTML = `<tr><td colspan="7" class="placeholder-cell">No parcels found in database.</td></tr>`;
        }
    } catch (err) {
        console.error("Parcels fetch error:", err);
        tableBody.innerHTML = `<tr><td colspan="7" class="placeholder-cell" style="color:#ef4444;">Failed to load parcels from backend.</td></tr>`;
    }
}

// 3. Mark a parcel as verified via /api/parcels/verify
async function verifyParcel(parcelId) {
    try {
        const response = await fetch("/api/parcels/verify", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                parcel: parcelId,
                officer: "Officer Singh"
            })
        });

        const result = await response.json();
        if (result.status === "success") {
            refreshData();
        } else {
            alert("Verification failed: " + result.message);
        }
    } catch (err) {
        alert("Request error: " + err.message);
    }
}