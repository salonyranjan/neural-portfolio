# **Neural Portfolio**
*A 3‑D interactive map of your professional work, built to showcase skills & projects at a glance.*

[![Build Status](https://img.shields.io/github/actions/workflow/status/SalonyRanjan/neural-portfolio/main.yml?label=build)](https://github.com/SalonyRanjan/neural-portfolio/actions) • [![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE) • [![Version](https://img.shields.io/badge/version-v1.0.0-orange)](#) • [![Stars](https://img.shields.io/github/stars/SalonyRanjan/neural-portfolio?style=social)](https://github.com/SalonyRanjan/neural-portfolio)

---

## 🎬 Visual Showcase
![Demo GIF or Screenshot Placeholder](./assets/demo.gif)
> *[Insert a short caption describing the animation – e.g., “Navigate a live 3‑D knowledge graph of my GitHub repos.”]*

---

## 🤔 Why I built this
I built this to bridge the gap between static resumes and immersive data storytelling. The biggest challenges were:
- **Real‑time data sync** – pulling fresh GitHub metrics without throttling the API.
- **Performance‑heavy 3‑D rendering** in the browser while keeping the UI buttery smooth.
- **Scalable architecture** – a front‑end that could grow with new data sources (e.g., LinkedIn, Kaggle) without a rewrite.
By combining **React‑Three‑Fiber** with a **Python‑driven scraper** on AWS Lambda, I turned those hurdles into a sleek, responsive experience that loads **≤ 2 seconds** on average.

---

## ✨ Key Features
- 🚀 **Live GitHub integration** – auto‑updates stars, forks, and recent activity.
- 🌐 **Interactive 3‑D navigation** – orbit, pan, and zoom through nodes with smooth physics.
- 📊 **Analytics overlay** – hover to see contribution stats, project tags, and timelines.
- 🛠️ **Modular plug‑in system** – drop‑in new data adapters with a single config change.
- 🔒 **Secure, server‑less backend** – AWS Lambda + API Gateway, no secrets in the repo.

---

## 🛠️ Tech Stack

| Front‑end | Rendering | Backend | Cloud | Data |
|-----------|-----------|---------|-------|------|
| <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB" alt="React"> | <img src="https://img.shields.io/badge/Three.js-20232A?logo=three.js&logoColor=white" alt="Three.js"> | <img src="https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white" alt="Python"> | <img src="https://img.shields.io/badge/AWS-232F3E?logo=amazon-aws&logoColor=white" alt="AWS"> | <img src="https://img.shields.io/badge/GitHub%20API-181717?logo=github&logoColor=white" alt="GitHub API"> |

---

## 📦 Installation & Setup
```bash
# Clone the repo
git clone https://github.com/SalonyRanjan/neural-portfolio.git
cd neural-portfolio

# Backend (Python)
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r backend/requirements.txt

# Frontend (Node)
npm install               # Installs React + Three.js deps
npm run dev               # Starts the dev server at http://localhost:3000
```
> **Tip** – Ensure you have **Node ≥ 18** and **Python ≥ 3.9** installed.

---

## 🏗️ Project Architecture
```
┌─────────────────────┐        ┌─────────────────────┐
│  React Front‑end    │  ←→   │  FastAPI (Python)   │
│  (React‑Three‑Fiber)│        │  Lambda Handlers    │
└─────────────────────┘        └─────────────────────┘
        ▲                               ▲
        │   REST/GraphQL (JSON)        │
        └───────────────────────────────┘
```
*The UI renders a Three.js scene, fetching node data from the serverless API, which in turn scrapes GitHub and caches results in DynamoDB.*

---

## 🗺️ Future Roadmap
- **🔗 Social graph expansion** – ingest LinkedIn and Twitter to show professional connections.
- **⚡ Real‑time collaboration** – enable multiple users to explore the map together via WebSockets.
- **🧠 AI‑enhanced insights** – integrate a large‑language model to generate project summaries on hover.
- **📱 Mobile‑optimized view** – responsive 3‑D controls for touch devices.

---

## 🤝 Contributing & License
**Contributions are welcome!** Please follow these steps:
1. Fork the repo and create a feature branch (`git checkout -b feat/awesome-feature`).
2. Write tests and ensure the existing suite passes (`npm test && pytest`).
3. Submit a PR with a clear description and link to the related issue.

This project is licensed under the **MIT License** – see the `LICENSE` file for details.

---

> **Note**
> Replace the placeholder demo GIF (`./assets/demo.gif`) with an actual 10‑second loop uploaded to `assets/demo.gif`.
