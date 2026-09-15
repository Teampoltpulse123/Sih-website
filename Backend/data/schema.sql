-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    district VARCHAR(255) NOT NULL,
    budget VARCHAR(50) NOT NULL,
    parcels INT DEFAULT 0,
    progress INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Planning',
    risk INT DEFAULT 0,
    authority VARCHAR(255),
    director VARCHAR(150),
    start_date DATE,
    end_date DATE,
    land VARCHAR(100),
    stake VARCHAR(255),
    packages JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Land Parcels Table (With Verification Columns)
CREATE TABLE IF NOT EXISTS parcels (
    parcel VARCHAR(50) PRIMARY KEY,
    khasra VARCHAR(100) NOT NULL,
    owner VARCHAR(255) NOT NULL,
    village VARCHAR(150) NOT NULL,
    district VARCHAR(150) NOT NULL,
    state VARCHAR(150) NOT NULL,
    area VARCHAR(50) NOT NULL,
    land_type VARCHAR(50) DEFAULT 'Agricultural',
    status VARCHAR(50) DEFAULT 'Pending',
    gps VARCHAR(100),
    land_verified VARCHAR(50) DEFAULT 'Pending',
    owner_verified VARCHAR(50) DEFAULT 'Pending',
    verified_by VARCHAR(150),
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    parcel VARCHAR(50),
    state VARCHAR(150),
    uploaded_by VARCHAR(150),
    status VARCHAR(50) DEFAULT 'Verified',
    date_str VARCHAR(50),
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parcel) REFERENCES parcels(parcel) ON DELETE CASCADE
);

-- 4. Field Surveys Table
CREATE TABLE IF NOT EXISTS surveys (
    id VARCHAR(50) PRIMARY KEY,
    parcel VARCHAR(50),
    state VARCHAR(150),
    inspector VARCHAR(150) NOT NULL,
    gps VARCHAR(100),
    survey_date VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parcel) REFERENCES parcels(parcel) ON DELETE CASCADE
);

-- 5. Compensation Table
CREATE TABLE IF NOT EXISTS compensations (
    case_id VARCHAR(50) PRIMARY KEY,
    parcel VARCHAR(50),
    state VARCHAR(150),
    beneficiary VARCHAR(255) NOT NULL,
    market VARCHAR(50) NOT NULL,
    approved VARCHAR(50) NOT NULL,
    payment VARCHAR(50) DEFAULT 'Pending',
    bank VARCHAR(50) DEFAULT 'Verified',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parcel) REFERENCES parcels(parcel) ON DELETE CASCADE
);

-- 6. Grievances Table
CREATE TABLE IF NOT EXISTS grievances (
    ticket VARCHAR(50) PRIMARY KEY,
    citizen VARCHAR(255) NOT NULL,
    parcel VARCHAR(50),
    state VARCHAR(150),
    issue TEXT NOT NULL,
    hearing VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Open',
    officer VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parcel) REFERENCES parcels(parcel) ON DELETE CASCADE
);

-- 7. Audit Trail Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    time_str VARCHAR(100) NOT NULL,
    user VARCHAR(150) NOT NULL,
    action VARCHAR(255) NOT NULL,
    module VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial Mock Data
INSERT IGNORE INTO projects (id, name, type, district, budget, parcels, progress, status, risk, authority, director, start_date, end_date, land, stake, packages) VALUES 
('PRJ-NH27-02', 'NH-27 Expansion Phase II', 'Highway', 'Lucknow / Kanpur', '₹420 Cr', 182, 72, 'Active', 82, 'National Highways Authority', 'A. Singh', '2026-01-12', '2027-06-30', '1,140 ha', 'NHAI', '[["Uttar Pradesh", "Lucknow", 86, 61, 25, 71]]'),
('PRJ-WDFC-11', 'Western Dedicated Freight Corridor', 'Railway', 'Rewari / Jaipur / Ahmedabad', '₹680 Cr', 246, 54, 'Active', 74, 'Railways', 'R. Sharma', '2025-11-01', '2027-12-31', '2,820 ha', 'Railways', '[["Rajasthan", "Jaipur", 101, 61, 40, 60]]');

INSERT IGNORE INTO parcels (parcel, khasra, owner, village, district, state, area, land_type, status, gps, land_verified, owner_verified) VALUES 
('UP-LKO-10458', '245/2', 'Raj Kumar', 'Sarojini Nagar', 'Lucknow', 'Uttar Pradesh', '2.40 Acre', 'Agricultural', 'Processing', '26.7932, 80.8894', 'Verified', 'Verified'),
('RJ-JP-004821', '118/7', 'Suresh Kumar', 'Sanganer', 'Jaipur', 'Rajasthan', '4.70 Acre', 'Agricultural', 'Review', '26.8206, 75.7858', 'Pending', 'Pending'),
('KL-ER-10421', '77/4', 'Anita Nair', 'Aluva', 'Ernakulam', 'Kerala', '1.85 Acre', 'Residential', 'Pending', '10.1076, 76.3516', 'Pending', 'Pending'),
('MH-TH-55201', '402/1', 'Vijay Patil', 'Kalyan', 'Thane', 'Maharashtra', '3.60 Acre', 'Commercial', 'Processing', '19.2403, 73.1305', 'Pending', 'Pending');

INSERT IGNORE INTO documents (id, name, type, parcel, state, uploaded_by, status, date_str) VALUES 
('DOC-1', 'Ownership Record', 'Ownership', 'UP-LKO-10458', 'Uttar Pradesh', 'Revenue Office', 'Verified', '08 Sep 2026');

INSERT IGNORE INTO surveys (id, parcel, state, inspector, gps, survey_date, status) VALUES 
('SUR-01', 'UP-LKO-10458', 'Uttar Pradesh', 'A. Singh', '26.7932, 80.8894', '2026-09-08', 'Completed');

INSERT IGNORE INTO compensations (case_id, parcel, state, beneficiary, market, approved, payment, bank) VALUES 
('CMP-01', 'UP-LKO-10458', 'Uttar Pradesh', 'Raj Kumar', '₹14.80 L', '₹18.40 L', 'Pending', 'Verified');

INSERT IGNORE INTO grievances (ticket, citizen, parcel, state, issue, hearing, status, officer) VALUES 
('GRV-01', 'Suresh Kumar', 'UP-LKO-10458', 'Uttar Pradesh', 'Valuation objection', '12 Sep 2026', 'Open', 'A. Singh');

INSERT IGNORE INTO audit_logs (time_str, user, action, module) VALUES 
('08 Sep 2026 17:42', 'System', 'Clever Cloud MySQL Online', 'Core');