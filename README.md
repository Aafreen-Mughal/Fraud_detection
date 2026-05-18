# 🛡️ FraudShield — Real-Time Fraud Detection Platform

A full-stack fraud detection platform built with React, Node.js, PostgreSQL, and Machine Learning.
Based on the [PaySim Financial Fraud Dataset](https://www.kaggle.com/code/eshummalik/fraud-detection).

Project Structure
fraudd/
├── backend/          → Node.js + Express API
├── frontend/         → React.js Web App
├── ml_api/           → Python Flask ML Model
├── nginx/            → Reverse Proxy Config
├── scripts/          → Deploy & Rollback Scripts
├── .github/          → CI/CD Pipeline
├── docker-compose.yml
└── README.md
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Prerequisites

Make sure these are installed before starting:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | v18+ | https://nodejs.org |
| Python | v3.9+ | https://python.org |
| PostgreSQL | v14+ | https://postgresql.org |
| Git | latest | https://git-scm.com |

------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## 🗄️ Step 1 — Setup PostgreSQL Database

### Windows
1. Open **pgAdmin** (installed with PostgreSQL)
2. Right-click **Databases** → **Create** → **Database**
3. Name it `fraudshield` → Save

### OR via Command Prompt
```cmd
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres
```
```sql
CREATE DATABASE fraudshield;
\q
```

---
------------------------------------------------------------------------------------------------------------------------------------------------------------------------
## 🔧 Step 2 — Run the Backend

### Navigate to backend folder
```cmd
cd fraudd/backend
```

### Create environment file
```cmd
copy .env.example .env
notepad .env
```

### Fill in your `.env` file
```env
PORT              = 5000
NODE_ENV          = development
DB_HOST           = localhost
DB_PORT           = 5432
DB_NAME           = fraudshield
DB_USER           = postgres
DB_PASSWORD       = your_postgres_password
JWT_SECRET        = fraudshield_super_secret_key_2024
JWT_EXPIRES_IN    = 7d
FRONTEND_URL      = http://localhost:3000
```

### Install dependencies
```cmd
npm install
```

### Seed the database with demo data (run once only)
```cmd
npm run seed
```

### Start the backend server
```cmd
npm run dev
```

### ✅ Backend is running at
```
http://localhost:5000
```

### Test it works
Open browser and go to:
```
http://localhost:5000/api/health
```
You should see:
```json
{ "status": "ok", "db": "connected" }
```

---
------------------------------------------------------------------------------------------------------------------------------------------------------------------------
## 🎨 Step 3 — Run the Frontend

Open a **new terminal window** (keep backend running)

### Navigate to frontend folder
```cmd
cd fraudd/frontend
```

### Install dependencies
```cmd
npm install
```

### Start the React app
cmd
npm start


### ✅ Frontend is running at
```
http://localhost:3000
```
Browser will open automatically.

---

## 🤖 Step 4 — Run the ML API

Open another **new terminal window**

### Navigate to ml_api folder
```cmd
cd fraudd/ml_api
```

### Create a Python virtual environment
```cmd
python -m venv venv
```

### Activate the virtual environment

**Windows:**
```cmd
venv\Scripts\activate
```

**Mac/Linux:**
```bash
source venv/bin/activate
```

### Install Python dependencies
```cmd
pip install -r requirements.txt
```

### Start the ML API server
cmd
python app.py

### ✅ ML API is running at
http://localhost:8000

## 🔑 Demo Login Accounts

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@fraudshield.io | Admin@123 |
| **Analyst** | fatima@demo.com | Demo@123 |
| **User** | sarah@demo.com | Demo@123 |


## 🖥️ All Three Terminals at Once
Terminal 1 (Backend)         Terminal 2 (Frontend)        Terminal 3 (ML API)
─────────────────────        ──────────────────────       ──────────────────
cd fraudd/backend            cd fraudd/frontend           cd fraudd/ml_api
npm run dev                  npm start                    python app.py

✅ localhost:5000             ✅ localhost:3000             ✅ localhost:8000

------------------------------------------------------------------------------------------------------------------------------------------------------------------------
## 🚀 Pages & Features

| Page | URL | Description |
|------|-----|-------------|
| Login | `/login` | Sign in to your account |
| Register | `/register` | Create new account |
| Dashboard | `/dashboard` | Overview & stats |
| Transactions | `/transactions` | All transactions + fraud scores |
| Fraud Alerts | `/alerts` | Active fraud incidents |
| Analytics | `/analytics` | Charts & reports |
| E-Commerce | `/ecommerce` | Simulate purchases |
| Accounts | `/accounts` | Manage accounts |
| Help | `/help` | FAQ & documentation |
| Admin | `/admin` | Admin panel (admin only) |
------------------------------------------------------------------------------------------------------------------------------------------------------------------------
##  CI/CD Pipeline
Powered by **GitHub Actions** — runs automatically on every push to `main`.
git push → GitHub Actions triggers
              ↓
        🔧 Backend Job     🎨 Frontend Job
        npm install        npm install
                           npm run build
              ↓
        ✅ Green = Safe    ❌ Red = Fix it
View pipeline: `https://github.com/YOUR_USERNAME/Fraud_detection/actions`
------------------------------------------------------------------------------------------------------------------------------------------------------------------------
Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js, Chart.js, React Router |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| ML API | Python, Flask, Scikit-learn |
| Auth | JWT (JSON Web Tokens) |
| DevOps | GitHub Actions CI/CD |
| Proxy | Nginx |
| Container | Docker |

**Aafreen Mughal**
GitHub: [@Aafreen-Mughal](https://github.com/Aafreen-Mughal)
