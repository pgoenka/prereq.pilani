# prereq.pilani

A spatial graph visualization tool for academic prerequisites, built specifically for the BITS Pilani course catalog. 

prereq.pilani (The Technical Cartographer) transforms complex, tabular prerequisite data into an interactive Directed Acyclic Graph (DAG). It allows students to visually explore course dependencies, co-requisites, and conditional ("OR" / "AND") academic pathways.

## Architecture

This project is engineered as a zero-build, purely static Single Page Application (SPA). It bypasses the need for heavy frontend frameworks (like React or Vue) and backend databases, executing all graph logic, rendering, and search operations directly in the client's browser.

* **Frontend Engine:** Vanilla JavaScript (ES6+)
* **Styling:** Tailwind CSS (via CDN)
* **Graph Rendering:** Native SVG with dynamic Cubic Bezier curve calculations
* **Data Pipeline:** Python (Extract, Transform, Load from PDF to JSON)

## Key Features

* **Infinite Spatial Canvas:** Features a draggable, zoomable interface with native support for trackpad gestures and mobile pinch-to-zoom mechanics.
* **Responsive DAG Layout:** Automatically adapts graph orientation based on device constraints. Renders a horizontal (left-to-right) dependency tree on desktop environments and shifts to a vertical (top-to-bottom) hierarchy on mobile devices for optimal scrolling.
* **Intelligent Edge Routing:** Utilizes mathematical bezier curve calculations to route connecting lines around intermediate nodes, preventing visual overlap in skip-level prerequisites.
* **Semantic Search & Autocomplete:** A fast, client-side search engine that matches user queries against course codes and course titles simultaneously.
* **Complex Logic Rendering:** Natively parses and visually represents "AND" / "OR" logic gates and "Pre-requisite" vs. "Co-requisite" relationships using distinct visual markers and stroke styles.

## The Data Pipeline

The prerequisite data originates from a heavily formatted institutional PDF. To handle the inconsistencies of PDF table extraction (e.g., merged cells, ghost characters, and multiline headers), the project uses a custom Python extraction pipeline.

1.  A Python script (`extract.py`) utilizes regex and semantic pattern matching to read the raw PDF data.
2.  The script sanitizes whitespace anomalies and reconstructs broken course codes.
3.  The output is a highly compressed, structured `data.json` file.
4.  The frontend JavaScript fetches this JSON on load and builds the graph structure in memory.

## Getting Started

Because this is a zero-build static site, local execution requires no package installation (`npm`) or build steps. 

### Prerequisites
* A local web server (e.g., Python, Node `http-server`, or the VS Code Live Server extension). Note: Running the HTML file directly via the `file://` protocol will fail due to strict CORS policies preventing local JSON fetching.

### Installation & Execution

1. Clone the repository:
```bash
git clone https://github.com/yourusername/prereq.pilani.git
cd prereq.pilani
```

2. Start a local web server. If you have Python installed, you can run:
```bash
python -m http.server 8000
```

3. Open your web browser and navigate to:
```text
http://localhost:8000
```

## Deployment

Deployment is as simple as hosting static files. You can deploy this repository directly to GitHub Pages, Vercel, Netlify, or AWS S3. There are no environment variables or build commands required. Ensure that `index.html` and `data.json` are located in the root of your deployment directory.

## Author

**Pratyush Goenka**

## License

This project is open-source and available under the MIT License.
