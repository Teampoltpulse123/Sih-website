from flask import Flask, jsonify, request
from flask_cors import CORS
from db import get_db_connection

app = Flask(__name__)
CORS(app)

@app.route('/api/dashboard/stats', methods=['GET'])
def get_stats():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT COUNT(*) AS total_projects FROM projects")
        total_projects = cursor.fetchone()['total_projects']
        
        cursor.execute("SELECT COUNT(*) AS total_parcels FROM parcels")
        total_parcels = cursor.fetchone()['total_parcels']
        
        cursor.execute("SELECT COUNT(*) AS pending_parcels FROM parcels WHERE status = 'Pending'")
        pending_parcels = cursor.fetchone()['pending_parcels']
        
        cursor.execute("SELECT COUNT(*) AS open_grievances FROM grievances WHERE status = 'Open'")
        open_grievances = cursor.fetchone()['open_grievances']
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "status": "success",
            "kpis": {
                "projects": total_projects,
                "parcels": total_parcels,
                "pending": pending_parcels,
                "grievances": open_grievances
            }
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/parcels', methods=['GET'])
def get_parcels():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM parcels ORDER BY created_at DESC")
        parcels = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify({"status": "success", "data": parcels})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/parcels/verify', methods=['POST'])
def verify_parcel():
    try:
        data = request.get_json()
        parcel_id = data.get('parcel')
        officer = data.get('officer', 'Officer Singh')

        conn = get_db_connection()
        cursor = conn.cursor()
        query = """
            UPDATE parcels 
            SET status = 'Verified', land_verified = 'Verified', owner_verified = 'Verified', verified_by = %s, verified_at = NOW() 
            WHERE parcel = %s
        """
        cursor.execute(query, (officer, parcel_id))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"status": "success", "message": f"Parcel {parcel_id} verified successfully"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)