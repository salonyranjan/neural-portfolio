# 🌌 Neural Portfolio
*A 3‑D interactive knowledge graph visualizing professional engineering projects, research, and technical activity in real‑time.*

[![Build Status](https://img.shields.io/github/actions/workflow/status/SalonyRanjan/neural-portfolio/main.yml?label=build)](https://github.com/SalonyRanjan/neural-portfolio/actions) 
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE) 
[![Version](https://img.shields.io/badge/version-v1.0.0-orange)](https://github.com/SalonyRanjan/neural-portfolio/releases) 
[![Stars](https://img.shields.io/github/stars/SalonyRanjan/neural-portfolio?style=social)](https://github.com/SalonyRanjan/neural-portfolio)

---

## 🚀 Quick Access
**[View Live Demo](https://your-deployed-url.vercel.app/)** | **[Explore the Architecture](#-project-architecture)**

---

## 🎬 Visual Showcase
![3D Knowledge Graph Demo](./assets/demo.gif)
> *Navigate a live 3‑D force‑directed network of repositories, filtered by project complexity and category.*

---

## 🤔 Why I built this
I built this to bridge the gap between static resumes and immersive data storytelling. Instead of a linear list, this graph allows recruiters to intuitively explore the **relationship** between my technical skills and project complexity.

**Engineering Highlights:**
- **Smart Data Routing:** Automatically detects Vercel/Streamlit deployments to prioritize "Live Demos" over source code.
- **Visual Hierarchy:** Implemented distance‑based edge fading and complexity‑weighted node scaling to eliminate visual clutter.
- **Performance:** A high‑frequency `requestAnimationFrame` loop keeps the simulation buttery smooth at 60FPS.

---

## ✨ Key Features
- 🚀 **Live Integration** – Auto‑syncs GitHub metadata and deployment links.
- 🌐 **Interactive 3‑D** – Orbit, pan, and zoom through nodes with custom physics.
- 📊 **Contextual Details** – Sidebar‑based drill‑down for project complexity and tech stacks.
- 🔍 **Global Search** – Quick‑find any node with `⌘K`.
- ⚡ **Zero‑State Optimized** – Intelligent edge‑filtering prevents "spaghetti" graph states.

---

## 🛠️ Tech Stack

| Front‑end | Rendering | Backend | Cloud | Data |
| :--- | :--- | :--- | :--- | :--- |
| Next.js 14 | Three.js | Python 3.x | AWS (S3/EC2) | GitHub API |
| React 18 | R3F / Canvas | FastAPI | GitHub Actions | Pinecone |

---

## 📦 Installation & Setup
```bash
# 1. Clone the repo
git clone https://github.com/SalonyRanjan/neural-portfolio.git
cd neural-portfolio

# 2. Setup Backend (Data Engine)
python -m venv venv
source venv/bin/activate 
pip install -r backend/requirements.txt

# 3. Setup Frontend
npm install
npm run dev
```

---

## 🏗️ Project Architecture
```
┌─────────────────────┐         ┌─────────────────────┐
│  React Front‑end    │  ←→    │  Python Data Engine │
│  (Three.js/Canvas)  │         │  (GitHub Scraper)   │
└─────────────────────┘         └─────────────────────┘
          ▲                               ▲
          │      JSON Data Assets         │
          └───────────────────────────────┘
```

---

## 🗺️ Future Roadmap
- 🧠 **AI Insights** – Integrate LLMs to auto‑generate project summaries on hover.
- 🔗 **Social Graph** – Ingest LinkedIn activity for a unified professional map.
- 📱 **Touch Optimization** – Dedicated gestures for mobile‑first 3D interaction.

---

## 🤝 Contributing & License
Contributions are welcome! Please fork the repo, create a feature branch, and submit a PR.

This project is licensed under the MIT License.

---

## 📬 Connect with me
[LinkedIn](#) | [Portfolio Website](#) | [Email](#)
