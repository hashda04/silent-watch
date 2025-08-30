# **SilentWatch – README**

## **Project Overview**

**SilentWatch** is a JavaScript library to detect **silent UI workflow failures** in web applications.
It automatically tracks user interactions (clicks, form submissions) and reports “silent failures” to a backend. These failures are logged in MongoDB and can trigger **Slack notifications** and **email alerts** when thresholds are exceeded.

This is ideal for tracking UX issues where users attempt actions but nothing happens.

---

## **Features**

* Tracks **actionable clicks** and **form submissions**.
* Detects **silent failures** when no network call occurs after user action.
* Stores logs in **MongoDB**.
* Sends **Slack alerts** when failure rates spike.
* Sends **Email alerts** using Gmail.
* Provides **API endpoints** for logs and stats.
* Optional **dashboard** to visualize logs and failure rates.

---

## **Setup**

### 1. Clone the repo

```bash
git clone https://github.com/<your-github>/silent-watch.git
cd silent-watch/backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in `backend/`:

```env
MONGO_URI=your-mongodb-uri
SLACK_WEBHOOK=your-slack-webhook
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-gmail-app-password
```

---

### 4. Run the backend

```bash
node server.js
```

* Backend runs on `http://localhost:4001`.
* Endpoints:

  * `POST /log` → Receive logs from SilentWatch npm package.
  * `GET /logs` → Get latest logs.
  * `GET /stats` → Get failure stats.

---

### 5. Install SilentWatch npm package

```bash
npm install ../path-to-silent-watch
```

### 6. Configure SilentWatch in frontend

```ts
import { createSilentWatch } from "silent-watch";

const watch = createSilentWatch({
  backendUrl: "http://localhost:4001/log",
  debug: true,
});
watch.start();
```

* All clicks and form submissions are now tracked.

---

### 7. Test Alerts

* Slack: check the channel defined in your webhook.
* Email: check the inbox of `EMAIL_USER`.
* Cron job checks failure rate every 5 minutes (adjust for testing if needed).

---

## **Dashboard (Optional but Recommended)**

You can create a **simple React dashboard** to visualize logs and stats:

* **Components**:

  * **LogsTable** → Shows last 100 logs with `type`, `timestamp`, `silentFailure`.
  * **StatsPanel** → Shows total logs, failure count, and failure rate.
  * **Charts** → Bar chart for failure distribution, line chart for failures over time.

* **Data Source**: Connect via your backend endpoints `/logs` and `/stats`.

* **Libraries**:

  * React + Vite or Create React App
  * Axios for API calls
  * Chart.js or Recharts for graphs

---

### **Example API call in React**

```js
import axios from "axios";

const fetchLogs = async () => {
  const res = await axios.get("http://localhost:4001/logs");
  console.log(res.data);
};
```

---

### **Folder Structure**

```
silent-watch/
├─ backend/          # Express + MongoDB backend
├─ src/              # SilentWatch npm package
├─ dist/             # Compiled package
├─ dashboard/        # Optional React dashboard
├─ package.json
├─ README.md
└─ .env
```

---

### **Future Improvements**

* Add **real-time dashboard updates** via WebSocket.
* Add **user-friendly UI filters** for logs (by type, tag, time).
* Add **multi-user support**.
* Publish the npm package to **npm registry**.

---

### **Author**

Hashida Sherin – Final Year Project – 2025

---


