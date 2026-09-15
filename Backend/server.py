import os
import json
import random
import time
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from db import get_db_connection

# Load environment variables
load_dotenv()

# Initialize Flask App
app = Flask(__name__, static_folder="../Frontend", static_url_path="")
CORS(app)

PORT = int(os.getenv("PORT", 5000))

# Serve Frontend SPA
@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory(app.static_folder, path)

# Helper: Audit Logger
def log_audit(user, action, module):
    time_str = datetime.now().strftime("%d %b %Y %H:%M")
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO audit_logs (time_str, user, action, module) VALUES (%s, %s, %s, %s)",
            (time_str, user or "Admin", action, module)
        )
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as err:
        print(f"Audit log error: {err}")

# 1. Auth API
@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    if email == "admin@geoframe.gov.in" and password == "admin123":
        return jsonify({"success": True, "user": {"email": email, "role": "National Administrator"}})
    return jsonify({"success": False, "message": "Wrong email or password"}), 401

# 2. Dashboard KPIs
@app.route("/api/dashboard/stats", methods=["GET"])
def dashboard_stats():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT COUNT(*) AS pCount FROM projects")
        p_count = cursor.fetchone()["pCount"]

        cursor.execute("SELECT COUNT(*) AS lCount FROM parcels")
        l_count = cursor.fetchone()["lCount"]

        cursor.execute("SELECT COUNT(*) AS cCount FROM parcels WHERE status != 'Completed'")
        c_count = cursor.fetchone()["cCount"]

        cursor.execute("SELECT COUNT(*) AS rCount FROM parcels WHERE status = 'Pending'")
        r_count = cursor.fetchone()["rCount"]

        return jsonify({
            "kpis": {
                "projects": p_count or 0,
                "parcels": l_count or 0,
                "activeCases": c_count or 0,
                "highRiskCount": r_count or 0
            }
        })
    except Exception as err:
        return jsonify({"error": str(err)}), 500
    finally:
        cursor.close()
        conn.close()

# 3. Projects Management
@app.route("/api/projects", methods=["GET", "POST"])
def manage_projects():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if request.method == "GET":
            cursor.execute("""
                SELECT id, name, type, district, budget, parcels, progress, status, risk, authority, director,
                       DATE_FORMAT(start_date, '%Y-%m-%d') AS start,
                       DATE_FORMAT(end_date, '%Y-%m-%d') AS end,
                       land, stake, packages
                FROM projects ORDER BY created_at DESC
            """)
            rows = cursor.fetchall()
            for r in rows:
                r["states"] = ["Uttar Pradesh"]
                if isinstance(r.get("packages"), str):
                    try:
                        r["packages"] = json.loads(r["packages"])
                    except Exception:
                        r["packages"] = []
                elif not r.get("packages"):
                    r["packages"] = []
            return jsonify(rows)

        # POST: Create Project
        data = request.get_json() or {}
        state = data.get("state", "Uttar Pradesh")
        district = data.get("district", "Lucknow")
        parcels_cnt = int(data.get("parcels", 10))
        new_id = "PRJ-" + str(int(time.time() * 1000))[-5:]
        pkg = json.dumps([[state, district, parcels_cnt, 0, parcels_cnt, 0]])

        cursor.execute("""
            INSERT INTO projects (id, name, type, district, budget, parcels, progress, status, risk, authority, director, start_date, end_date, land, stake, packages)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            new_id, data.get("name", "Untitled Project"), data.get("type", "Highway"), district,
            data.get("budget", "₹100 Cr"), parcels_cnt, 0, "Planning", 45,
            data.get("authority", "NHAI"), data.get("director", "Project Director"),
            data.get("start", "2026-01-01"), data.get("end", "2028-12-31"), "Survey Pending", "Inter-agency", pkg
        ))
        conn.commit()
        log_audit(request.headers.get("x-user"), f"Created project {new_id}", "Projects")
        return jsonify({"id": new_id}), 201
    except Exception as err:
        return jsonify({"error": str(err)}), 500
    finally:
        cursor.close()
        conn.close()

# 4. Land Parcels & Verification Endpoints
@app.route("/api/parcels", methods=["GET", "POST"])
def manage_parcels():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if request.method == "GET":
            cursor.execute("""
                SELECT parcel, khasra, owner, village, district, state, area, 
                       land_type AS landType, status, gps,
                       COALESCE(land_verified, 'Pending') AS landVerified,
                       COALESCE(owner_verified, 'Pending') AS ownerVerified
                FROM parcels ORDER BY created_at DESC
            """)
            return jsonify(cursor.fetchall())

        data = request.get_json() or {}
        cursor.execute("""
            INSERT INTO parcels (parcel, khasra, owner, village, district, state, area, land_type, status, gps, land_verified, owner_verified)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Pending', 'Pending')
        """, (
            data.get("parcel"), data.get("khasra"), data.get("owner"), data.get("village"),
            data.get("district"), data.get("state", "Uttar Pradesh"), data.get("area"),
            data.get("landType", "Agricultural"), data.get("status", "Pending"),
            data.get("gps", "26.8467, 80.9462")
        ))
        conn.commit()
        log_audit(request.headers.get("x-user"), f"Registered parcel {data.get('parcel')}", "Parcels")
        return jsonify({"parcel": data.get("parcel"), "status": data.get("status", "Pending")}), 201
    except Exception as err:
        return jsonify({"error": str(err)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/api/parcels/<parcel_id>/verify-land", methods=["PATCH"])
def verify_land(parcel_id):
    officer = request.headers.get("x-user", "Revenue Officer")
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE parcels 
            SET land_verified = 'Verified', verified_by = %s, verified_at = CURRENT_TIMESTAMP 
            WHERE parcel = %s
        """, (officer, parcel_id))
        conn.commit()
        log_audit(officer, f"Demarcated and verified boundaries of {parcel_id}", "Land Verification")
        return jsonify({"success": True, "landVerified": "Verified"})
    except Exception as err:
        return jsonify({"error": str(err)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/api/parcels/<parcel_id>/verify-owner", methods=["PATCH"])
def verify_owner(parcel_id):
    officer = request.headers.get("x-user", "Legal Officer")
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE parcels 
            SET owner_verified = 'Verified', verified_by = %s, verified_at = CURRENT_TIMESTAMP 
            WHERE parcel = %s
        """, (officer, parcel_id))
        conn.commit()
        log_audit(officer, f"Validated owner title & e-KYC for {parcel_id}", "Owner Verification")
        return jsonify({"success": True, "ownerVerified": "Verified"})
    except Exception as err:
        return jsonify({"error": str(err)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/api/parcels/<parcel_id>/status", methods=["PATCH"])
def update_parcel_status(parcel_id):
    data = request.get_json() or {}
    status = data.get("status")
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE parcels SET status = %s WHERE parcel = %s", (status, parcel_id))
        conn.commit()
        log_audit(request.headers.get("x-user"), f"Status updated for {parcel_id} to {status}", "Workflow")
        return jsonify({"success": True})
    except Exception as err:
        return jsonify({"error": str(err)}), 500
    finally:
        cursor.close()
        conn.close()

# 5. Citizen Notice Dispatch
@app.route("/api/parcels/dispatch-notice", methods=["POST"])
def dispatch_notice():
    data = request.get_json() or {}
    parcel_id = data.get("parcelId")
    beneficiary = data.get("beneficiary")
    tx_id = f"PFMS-{random.randint(10000000, 99999999)}"
    doc_id = f"DOC-{int(time.time() * 1000)}"
    date_str = datetime.now().strftime("%d %b %Y")

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO documents (id, name, type, parcel, state, uploaded_by, status, date_str)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (doc_id, f"Statutory Notice - {parcel_id} ({tx_id})", "Notice", parcel_id, "Uttar Pradesh", "PFMS Engine", "Verified", date_str))
        conn.commit()
        log_audit(request.headers.get("x-user"), f"Dispatched {data.get('noticeType')} to {beneficiary}", "Citizen Services")
        return jsonify({"success": True, "dispatch": {"id": doc_id, "txId": tx_id, "parcelId": parcel_id}})
    except Exception as err:
        return jsonify({"error": str(err)}), 500
    finally:
        cursor.close()
        conn.close()

# 6. Documents & Approval
@app.route("/api/documents", methods=["GET"])
def get_documents():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, name, type, parcel, state, uploaded_by AS `by`, status, date_str AS date FROM documents ORDER BY created_at DESC")
        return jsonify(cursor.fetchall())
    except Exception as err:
        return jsonify({"error": str(err)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/api/documents/<doc_id>/verify", methods=["PATCH"])
def verify_document(doc_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE documents SET status = 'Verified', verified_at = CURRENT_TIMESTAMP WHERE id = %s", (doc_id,))
        conn.commit()
        log_audit(request.headers.get("x-user"), f"Approved document {doc_id}", "Documents")
        return jsonify({"success": True})
    except Exception as err:
        return jsonify({"error": str(err)}), 500
    finally:
        cursor.close()
        conn.close()

# 7. Surveys, Compensation, Grievances, Audit, AI
@app.route("/api/surveys", methods=["GET", "POST"])
def manage_surveys():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if request.method == "GET":
            cursor.execute("SELECT id, parcel, state, inspector, gps, survey_date AS date, status FROM surveys ORDER BY created_at DESC")
            return jsonify(cursor.fetchall())

        data = request.get_json() or {}
        s_id = "SUR-" + str(int(time.time() * 1000))[-4:]
        cursor.execute("""
            INSERT INTO surveys (id, parcel, state, inspector, gps, survey_date, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'Completed')
        """, (s_id, data.get("parcel"), data.get("state", "Uttar Pradesh"), data.get("inspector"), data.get("gps"), data.get("date", "2026-09-15")))
        conn.commit()
        return jsonify({"id": s_id}), 201
    except Exception as err:
        return jsonify({"error": str(err)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/api/compensation", methods=["GET"])
def get_compensation():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT case_id AS `case`, parcel, state, beneficiary, market, approved, payment, bank FROM compensations ORDER BY created_at DESC")
        return jsonify(cursor.fetchall())
    except Exception as err:
        return jsonify({"error": str(err)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/api/grievances", methods=["GET"])
def get_grievances():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT ticket, citizen, parcel, state, issue, hearing, status, officer FROM grievances ORDER BY created_at DESC")
        return jsonify(cursor.fetchall())
    except Exception as err:
        return jsonify({"error": str(err)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/api/audit", methods=["GET"])
def get_audit():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT time_str AS time, user, action, module FROM audit_logs ORDER BY id DESC LIMIT 50")
        return jsonify(cursor.fetchall())
    except Exception as err:
        return jsonify({"error": str(err)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/api/citizen/lookup", methods=["GET"])
def citizen_lookup():
    q = (request.args.get("query") or "").strip()
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT parcel, khasra, owner, village, district, state, area, land_type AS landType, status 
            FROM parcels WHERE LOWER(parcel) = LOWER(%s) LIMIT 1
        """, (q,))
        row = cursor.fetchone()
        if row:
            row["found"] = True
            row["currentStage"] = "Notification & Inquiry Stage"
            return jsonify(row)
        return jsonify({"found": False}), 404
    except Exception as err:
        return jsonify({"error": str(err)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/api/analytics/decision-support", methods=["GET"])
def decision_support():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT parcel, state, status, land_verified FROM parcels ORDER BY created_at DESC")
        rows = cursor.fetchall()
        recs = []
        for idx, p in enumerate(rows):
            is_pending = (p.get("land_verified") == "Pending")
            recs.append({
                "rank": f"#{idx + 1}",
                "parcel": p.get("parcel"),
                "state": p.get("state"),
                "score": 85 if is_pending else 45,
                "primaryFactor": "Physical Demarcation Pending" if is_pending else "Clear for Compensation",
                "recommendedAction": "Depute Field Surveyor" if is_pending else "Initiate PFMS Disbursement"
            })
        return jsonify({"recommendations": recs})
    except Exception as err:
        return jsonify({"error": str(err)}), 500
    finally:
        cursor.close()
        conn.close()

# Main Runner - ALWAYS AT THE VERY END
if __name__ == "__main__":
    print(f"GEO FRAME Flask server running at http://localhost:{PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=True)