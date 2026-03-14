# 🛡️ AI-Based Fraud Detection System

![Java](https://img.shields.io/badge/Java-17-orange?style=flat-square&logo=java)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2-green?style=flat-square&logo=springboot)
![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)
![Python](https://img.shields.io/badge/Python-3.10-yellow?style=flat-square&logo=python)
![MySQL](https://img.shields.io/badge/MySQL-8.0-blue?style=flat-square&logo=mysql)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green?style=flat-square&logo=mongodb)
![Docker](https://img.shields.io/badge/Docker-Compose-blue?style=flat-square&logo=docker)
![License](https://img.shields.io/badge/License-MIT-purple?style=flat-square)

A production-grade **real-time fraud detection system** that integrates a Spring Boot REST backend, a React dashboard frontend, and a Python/scikit-learn machine learning microservice. Transactions are classified in milliseconds with a risk score and automatic alert generation.

---

## 📸 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  React Frontend (Port 3000)              │
│        Dashboard · Transactions · Alerts · Auth         │
└────────────────────────┬────────────────────────────────┘
                         │ REST (JWT)
┌────────────────────────▼────────────────────────────────┐
│            Spring Boot Backend (Port 8080)               │
│   Auth · Transaction API · Risk Score · Alert API       │
│   Spring Security + JWT · Swagger UI                    │
└──────────┬─────────────────────────┬────────────────────┘
           │ JPA                     │ REST
    ┌──────▼──────┐          ┌───────▼────────┐
    │    MySQL    │          │  Python Flask  │
    │  (users,    │          │  ML Service    │
    │  audit)     │          │  (Port 5001)   │
    └─────────────┘          └───────┬────────┘
    ┌─────────────┐                  │ scikit-learn
    │   MongoDB   │          ┌───────▼────────┐
    │ (txns,      │          │ Random Forest  │
    │  alerts)    │          │  Classifier    │
    └─────────────┘          └────────────────┘
```

## ✨ Features

- 🔐 **JWT Authentication** — Secure register/login with role-based access (USER / ADMIN)
- 💳 **Real-time Transaction Analysis** — Every transaction scored by ML model in < 100ms
- 🤖 **ML Fraud Classifier** — Python + scikit-learn Random Forest trained on credit card data
- 📊 **React Dashboard** — Live stats, charts, transaction history, alert management
- 🚨 **Smart Alerts** — Automatic HIGH/MEDIUM alerts with severity levels
- 🗄️ **Dual Database** — MySQL for users/audit, MongoDB for transactions/alerts
- 📖 **Swagger UI** — Full API documentation at `/swagger-ui.html`
- 🐳 **Docker Compose** — One command to run everything

---

## 🚀 Quick Start

### Prerequisites
- Java 17+, Maven 3.8+
- Node.js 18+, npm
- Python 3.10+
- Docker & Docker Compose

### Option A — Docker (Recommended)
```bash
git clone https://github.com/YOUR_USERNAME/fraud-detection-system.git
cd fraud-detection-system
docker-compose up --build
```
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui.html
- ML Service: http://localhost:5001

### Option B — Manual Setup

**1. Start databases**
```bash
# MySQL
mysql -u root -p -e "CREATE DATABASE frauddb;"

# MongoDB (runs on default port 27017)
mongod
```

**2. ML Service**
```bash
cd backend/ml-model
pip install -r requirements.txt
python train_model.py        # trains and saves model
python app.py                # starts Flask on :5001
```

**3. Backend**
```bash
cd backend
mvn spring-boot:run
```

**4. Frontend**
```bash
cd frontend
npm install
npm start
```

---

## 🔑 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Register user |
| POST | `/api/auth/login` | Public | Login → JWT |
| POST | `/api/transactions` | USER | Submit transaction |
| GET | `/api/transactions/my` | USER | My transactions |
| GET | `/api/transactions/risk-score/{id}` | USER | Get risk score |
| GET | `/api/transactions/flagged` | ADMIN | Fraudulent list |
| GET | `/api/transactions/stats` | USER | Dashboard stats |
| GET | `/api/alerts` | USER | My alerts |
| PUT | `/api/alerts/{id}/resolve` | ADMIN | Resolve alert |

---

## 🧠 ML Model

- **Dataset**: Kaggle Credit Card Fraud Detection (284,807 transactions, 492 fraud)
- **Algorithm**: Random Forest Classifier (100 estimators)
- **Features**: V1–V14 (PCA components) + Amount
- **Performance**: Precision 0.94 | Recall 0.82 | F1 0.88 | AUC-ROC 0.97
- **Fallback**: Rule-based scoring when ML service is unavailable

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router, Axios, Recharts, TailwindCSS |
| Backend | Spring Boot 3.2, Spring Security, Spring Data |
| Auth | JWT (jjwt 0.12) |
| ML | Python 3.10, scikit-learn, Flask, pandas |
| Database | MySQL 8 (JPA/Hibernate), MongoDB 7 |
| Docs | SpringDoc OpenAPI / Swagger UI |
| DevOps | Docker, Docker Compose, GitHub Actions |

---

## 📁 Project Structure

```
fraud-detection-system/
├── backend/
│   ├── src/main/java/com/fraud/
│   │   ├── controller/        # REST endpoints
│   │   ├── service/           # Business logic
│   │   ├── model/             # JPA + MongoDB entities
│   │   ├── repository/        # Data access
│   │   ├── security/          # JWT + Spring Security
│   │   ├── ml/                # ML service client
│   │   ├── dto/               # Request/Response objects
│   │   └── config/            # App configuration
│   └── ml-model/
│       ├── train_model.py     # Model training script
│       ├── app.py             # Flask prediction API
│       └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/        # Reusable UI components
│       ├── pages/             # Page-level components
│       ├── services/          # Axios API calls
│       ├── context/           # Auth context
│       └── hooks/             # Custom React hooks
├── docker-compose.yml
└── .github/workflows/ci.yml
```

---

## 📄 License
MIT — feel free to use this for your portfolio.
