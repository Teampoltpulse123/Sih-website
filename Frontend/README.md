# GEO FRAME Backend

REST API backend for the GEO FRAME National Land Acquisition & Management frontend.

## Stack
- Node.js + Express
- SQLite + better-sqlite3
- JWT authentication
- bcrypt password hashing
- Multer document uploads
- CORS

## Run

```bash
cd geo-frame-backend
npm install
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux
npm start
```

API: `http://localhost:5000`
Health check: `GET /api/health`

## Demo login
- Email: `admin@geoframe.gov.in`
- Password: `admin123`
- Role: `National Administrator`

Additional seeded demo users:
- `ritika.sharma@gov.in` / `demo123` / Survey Officer
- `nitin.verma@gov.in` / `demo123` / Legal Officer

## Main endpoints

### Auth
- `POST /api/auth/login`
- `GET /api/auth/me`

### Dashboard
- `GET /api/dashboard/summary`

### Projects
- `GET /api/projects`
- `GET /api/projects/:id`
- `POST /api/projects`
- `PATCH /api/projects/:id`
- `DELETE /api/projects/:id`

### Parcels
- `GET /api/parcels`
- `GET /api/parcels/:parcelId`
- `POST /api/parcels`
- `PATCH /api/parcels/:parcelId`

### Documents
- `GET /api/documents`
- `POST /api/documents` (multipart/form-data with `file`)

### Surveys
- `GET /api/surveys`
- `POST /api/surveys`

### Compensation
- `GET /api/compensations`
- `POST /api/compensations`
- `PATCH /api/compensations/:id`

### Grievances
- `GET /api/grievances`
- `POST /api/grievances`
- `PATCH /api/grievances/:id`

### Users
- `GET /api/users`
- `POST /api/users`

### Audit
- `GET /api/audit`

## Frontend integration

After login, save the returned JWT token:

```js
localStorage.setItem('geoToken', data.token);
```

Example authenticated request:

```js
const response = await fetch('http://localhost:5000/api/projects', {
  headers: {
    Authorization: `Bearer ${localStorage.getItem('geoToken')}`
  }
});
const result = await response.json();
```

For production, move the database to PostgreSQL/PostGIS, configure a strict CORS origin, use a strong JWT secret, add HTTPS, server-side validation, backups, object storage, rate limiting, and proper government SSO/identity integration.
