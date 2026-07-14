// --- 0. Splash Screen Logic ---
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        splash.style.opacity = '0';
        setTimeout(() => splash.remove(), 700); // Wait for transition
    }, 1500); // Display time
});

// --- Core State ---
let courseGraph = {};
let courseKeys = []; 
let globalEdges = [];
let currentActiveCourse = null;

// --- 1. Infinite Canvas Engine (Pan & Zoom) ---
let scale = 1;
let translateX = 0, translateY = 0;
let isDragging = false;
let startX, startY;
const MIN_SCALE = 0.2;
const MAX_SCALE = 3;

const graphView = document.getElementById('graphView');
const zoomContainer = document.getElementById('zoomContainer');

function updateTransform() {
    zoomContainer.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}

graphView.addEventListener('mousedown', (e) => {
    if(e.button !== 0) return; 
    isDragging = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
});
window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    updateTransform();
});
window.addEventListener('mouseup', () => isDragging = false);
window.addEventListener('mouseleave', () => isDragging = false);

graphView.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomSensitivity = 0.0015;
    const delta = -e.deltaY * zoomSensitivity;
    let newScale = scale * Math.exp(delta);
    newScale = Math.max(MIN_SCALE, Math.min(newScale, MAX_SCALE));

    const rect = graphView.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    translateX = mouseX - (mouseX - translateX) * (newScale / scale);
    translateY = mouseY - (mouseY - translateY) * (newScale / scale);
    scale = newScale;
    updateTransform();
}, { passive: false });

let initialDistance = null;
let initialScale = scale;

graphView.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
        initialDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        initialScale = scale;
    } else if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX - translateX;
        startY = e.touches[0].clientY - translateY;
    }
}, {passive: false});

graphView.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 2 && initialDistance !== null) {
        const currentDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        const ratio = currentDistance / initialDistance;
        let newScale = initialScale * ratio;
        newScale = Math.max(MIN_SCALE, Math.min(newScale, MAX_SCALE));

        const pinchX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const pinchY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

        translateX = pinchX - (pinchX - translateX) * (newScale / scale);
        translateY = pinchY - (pinchY - translateY) * (newScale / scale);
        scale = newScale;
        updateTransform();
    } else if (isDragging && e.touches.length === 1) {
        translateX = e.touches[0].clientX - startX;
        translateY = e.touches[0].clientY - startY;
        updateTransform();
    }
}, {passive: false});

graphView.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) initialDistance = null;
    if (e.touches.length === 0) isDragging = false;
    else if (e.touches.length === 1) {
        startX = e.touches[0].clientX - translateX;
        startY = e.touches[0].clientY - translateY;
    }
});

function zoomTo(newScale) {
    const rect = graphView.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    translateX = centerX - (centerX - translateX) * (newScale / scale);
    translateY = centerY - (centerY - translateY) * (newScale / scale);
    scale = newScale;
    updateTransform();
}
function zoomIn() { zoomTo(Math.min(scale * 1.4, MAX_SCALE)); }
function zoomOut() { zoomTo(Math.max(scale / 1.4, MIN_SCALE)); }
function resetZoom() {
    translateX = 0; translateY = 0; scale = 1;
    updateTransform();
}

// --- 2. Data Loading & Parsing ---
fetch('./data.json')
    .then(res => res.json())
    .then(rawData => parseCustomData(rawData))
    .catch(err => console.error("Failed to load data.json:", err));

function parseCustomData(rawData) {
    rawData.forEach(course => {
        const code = course.code;
        // Basic filter for valid course code
        if (/^[A-Z]{2,5}\s+[A-Z0-9]{3,4}$/i.test(code)) {
            courseGraph[code] = course;
        }
    });
    courseKeys = Object.keys(courseGraph);
}

// --- 3. UI Interactions ---
function handleAutocomplete(query, dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    dropdown.innerHTML = '';
    query = query.toLowerCase().trim();

    if (!query) {
        dropdown.classList.add('hidden');
        return;
    }

    const matches = courseKeys.filter(code => 
        code.toLowerCase().includes(query) || 
        (courseGraph[code].title && courseGraph[code].title.toLowerCase().includes(query))
    ).slice(0, 8); 

    if (matches.length > 0) {
        dropdown.classList.remove('hidden');
        matches.forEach(code => {
            const title = courseGraph[code].title;
            const item = document.createElement('div');
            item.className = "px-4 py-3 hover:bg-surface-variant cursor-pointer border-b border-outline-variant/10 last:border-none flex justify-between items-center";
            item.innerHTML = `<span class="font-bold text-primary">${code}</span><span class="text-xs text-on-surface-variant truncate ml-4">${title}</span>`;
            item.onclick = () => switchToGraphView(code);
            dropdown.appendChild(item);
        });
    } else {
        dropdown.classList.add('hidden');
    }
}

function switchToGraphView(courseCode) {
    currentActiveCourse = courseCode;
    document.getElementById('landingView').classList.add('hidden');
    document.getElementById('graphView').classList.remove('hidden');
    document.getElementById('graphView').classList.add('block');
    document.getElementById('headerSearchContainer').classList.remove('opacity-0');
    document.getElementById('navDropdown').classList.add('hidden');
    document.getElementById('mainDropdown').classList.add('hidden');
    
    resetZoom();
    renderGraph(courseCode);
}

function resetView() {
    currentActiveCourse = null;
    document.getElementById('landingView').classList.remove('hidden');
    document.getElementById('graphView').classList.add('hidden');
    document.getElementById('graphView').classList.remove('block');
    document.getElementById('headerSearchContainer').classList.add('opacity-0');
    document.getElementById('mainSearchInput').value = '';
    document.getElementById('navSearchInput').value = '';
}

// --- 4. Responsive Spatial Layout System ---
function renderGraph(targetCode) {
    const container = document.getElementById('nodesContainer');
    container.innerHTML = '';
    globalEdges = [];

    const nodesMap = new Map(); 
    const edgesList = [];
    const edgeSet = new Set(); 

    function traversePre(code, currentDepth, pathSet) {
        if (pathSet.has(code)) return; 
        if (!nodesMap.has(code)) {
            nodesMap.set(code, { depth: currentDepth, data: courseGraph[code] || { title: "Unknown", prereqs: [], postreqs: [] }});
        } else {
            nodesMap.get(code).depth = Math.max(nodesMap.get(code).depth, currentDepth); 
        }

        const data = courseGraph[code];
        if (data && data.prereqs) {
            const newPath = new Set(pathSet).add(code);
            data.prereqs.forEach(req => {
                const edgeKey = `${req.code}->${code}`;
                if (!edgeSet.has(edgeKey)) {
                    edgeSet.add(edgeKey);
                    edgesList.push({ source: req.code, target: code, condition: req.condition, type: req.type });
                }
                traversePre(req.code, currentDepth + 1, newPath);
            });
        }
    }

    function traversePost(code, currentDepth, pathSet) {
        if (pathSet.has(code)) return; 
        if (!nodesMap.has(code)) {
            nodesMap.set(code, { depth: currentDepth, data: courseGraph[code] || { title: "Unknown", prereqs: [], postreqs: [] }});
        } else {
            nodesMap.get(code).depth = Math.min(nodesMap.get(code).depth, currentDepth); 
        }

        const data = courseGraph[code];
        if (data && data.postreqs) {
            const newPath = new Set(pathSet).add(code);
            data.postreqs.forEach(req => {
                const edgeKey = `${code}->${req.code}`;
                if (!edgeSet.has(edgeKey)) {
                    edgeSet.add(edgeKey);
                    edgesList.push({ source: code, target: req.code, condition: req.condition, type: req.type });
                }
                traversePost(req.code, currentDepth - 1, newPath);
            });
        }
    }

    traversePre(targetCode, 0, new Set());
    traversePost(targetCode, 0, new Set());

    const byDepth = {};
    nodesMap.forEach((val, code) => {
        if (!byDepth[val.depth]) byDepth[val.depth] = [];
        byDepth[val.depth].push({ code, ...val });
    });

    const layoutData = {};
    const isMobile = window.innerWidth < 768;
    
    const hSpacing = isMobile ? 220 : 450;
    const vSpacing = isMobile ? 220 : 200; 
    
    const startX = window.innerWidth / 2 + (isMobile ? 0 : 150);
    const startY = window.innerHeight / 2 + (isMobile ? 150 : 0);

    Object.keys(byDepth).forEach(depthStr => {
        const depth = parseInt(depthStr);
        const levelNodes = byDepth[depthStr];
        
        if (isMobile) {
            const totalWidth = (levelNodes.length - 1) * hSpacing;
            const leftX = startX - totalWidth / 2;
            const currentY = startY - (depth * vSpacing); // Positive depth = above

            levelNodes.forEach((node, index) => {
                const x = leftX + (index * hSpacing);
                const y = currentY;
                layoutData[node.code] = { x, y };

                const isRoot = depth === 0;
                const pTitle = node.data.title || (courseGraph[node.code] ? courseGraph[node.code].title : "Unknown Title");
                let nodeType = depth < 0 ? "POST" : "PRE";
                if (!isRoot) {
                    const referringEdge = edgesList.find(e => e.source === node.code || e.target === node.code);
                    if (referringEdge && referringEdge.type && referringEdge.type.includes('CO')) {
                        nodeType = "CO";
                    }
                }

                container.appendChild(createNodeElement(node.code, pTitle, isRoot, x, y, nodeType));
            });
        } else {
            const totalHeight = (levelNodes.length - 1) * vSpacing;
            const topY = startY - totalHeight / 2;
            const currentX = startX - (depth * hSpacing); // Positive depth = left, negative depth = right

            levelNodes.forEach((node, index) => {
                const x = currentX;
                const y = topY + (index * vSpacing);
                layoutData[node.code] = { x, y };

                const isRoot = depth === 0;
                const pTitle = node.data.title || (courseGraph[node.code] ? courseGraph[node.code].title : "Unknown Title");
                let nodeType = depth < 0 ? "POST" : "PRE";
                if (!isRoot) {
                    const referringEdge = edgesList.find(e => e.source === node.code || e.target === node.code);
                    if (referringEdge && referringEdge.type && referringEdge.type.includes('CO')) {
                        nodeType = "CO";
                    }
                }

                container.appendChild(createNodeElement(node.code, pTitle, isRoot, x, y, nodeType));
            });
        }
    });

    globalEdges = edgesList.map(edge => ({
        sourcePos: layoutData[edge.source],
        targetPos: layoutData[edge.target],
        sourceDepth: nodesMap.get(edge.source).depth,
        targetDepth: nodesMap.get(edge.target).depth,
        condition: edge.condition,
        type: edge.type || "PRE"
    }));

    if (nodesMap.size === 1) {
        const noPreReq = document.createElement('div');
        noPreReq.className = "absolute text-xs text-outline-variant font-medium tracking-widest uppercase node-enter transform -translate-y-1/2";
        if (isMobile) {
            noPreReq.style.left = `${startX - 50}px`;
            noPreReq.style.top = `${startY - 120}px`;
        } else {
            noPreReq.style.left = `${startX - 180}px`;
            noPreReq.style.top = `${startY}px`;
        }
        noPreReq.innerText = "No Dependencies";
        container.appendChild(noPreReq);
    }

    setTimeout(drawLines, 50); 
}

function createNodeElement(code, title, isTarget, x, y, type) {
    const el = document.createElement('div');
    let baseClasses = "absolute p-4 rounded-md w-48 shadow-lg cursor-pointer transition-colors duration-300 node-enter";
    
    if (isTarget) {
        el.className = `${baseClasses} bg-surface-container-high border border-primary/60 ring-1 ring-primary/20 shadow-[0_0_20px_rgba(46,98,255,0.15)] z-20`;
    } else {
        const borderHover = type.includes('CO') ? 'hover:border-secondary-container' : 'hover:border-primary/50';
        el.className = `${baseClasses} bg-surface-container-low border border-outline-variant/20 shadow-black/20 z-10 ${borderHover}`;
        el.onclick = () => switchToGraphView(code);
    }

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    let tagHTML = '';
    if (isTarget) {
        tagHTML = `<span class="text-[9px] px-1.5 py-0.5 rounded bg-primary-container/20 text-primary font-medium tracking-wider">TARGET</span>`;
    } else if (type.includes('CO')) {
        tagHTML = `<span class="text-[9px] px-1.5 py-0.5 rounded bg-secondary-container/20 text-secondary-container font-medium tracking-wider">CO-REQ</span>`;
    } else if (type === 'POST') {
        tagHTML = `<span class="text-[9px] px-1.5 py-0.5 rounded bg-surface-variant/40 text-on-surface-variant font-medium tracking-wider">POST-REQ</span>`;
    } else {
        tagHTML = `<span class="text-[9px] px-1.5 py-0.5 rounded bg-surface-variant/40 text-on-surface-variant font-medium tracking-wider">PRE-REQ</span>`;
    }

    const titleColor = isTarget ? 'text-primary' : 'text-on-surface';
    el.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <span class="${titleColor} font-extrabold text-lg headline">${code}</span>
            ${tagHTML}
        </div>
        <h3 class="text-on-surface-variant text-xs font-medium leading-tight">${title}</h3>
    `;
    return el;
}

function getBezierPoint(t, p0, p1, p2, p3) {
    const mt = 1 - t;
    return (mt*mt*mt*p0) + (3*mt*mt*t*p1) + (3*mt*t*t*p2) + (t*t*t*p3);
}

function drawLines() {
    const linesGroup = document.getElementById('linesGroup');
    linesGroup.innerHTML = '';
    const isMobile = window.innerWidth < 768;

    const portUsage = {
        left: {},
        right: {},
        top: {},
        bottom: {}
    };

    globalEdges.forEach(conn => {
        if(!conn.sourcePos || !conn.targetPos) return;

        if (isMobile) {
            if (conn.sourcePos.y < conn.targetPos.y) {
                conn.sourcePort = 'bottom';
                conn.targetPort = 'top';
            } else {
                conn.sourcePort = 'top';
                conn.targetPort = 'bottom';
            }
        } else {
            if (conn.sourcePos.x < conn.targetPos.x) {
                conn.sourcePort = 'right';
                conn.targetPort = 'left';
            } else {
                conn.sourcePort = 'left';
                conn.targetPort = 'right';
            }
        }

        const sourceKey = `${conn.sourcePos.x},${conn.sourcePos.y}`;
        const targetKey = `${conn.targetPos.x},${conn.targetPos.y}`;
        
        if (!portUsage[conn.sourcePort][sourceKey]) portUsage[conn.sourcePort][sourceKey] = [];
        portUsage[conn.sourcePort][sourceKey].push(conn);
        
        if (!portUsage[conn.targetPort][targetKey]) portUsage[conn.targetPort][targetKey] = [];
        portUsage[conn.targetPort][targetKey].push(conn);
    });

    globalEdges.forEach(conn => {
        if(!conn.sourcePos || !conn.targetPos) return;

        const nodeWidth = 192; 
        const nodeHeight = 88; 
        
        const sourceKey = `${conn.sourcePos.x},${conn.sourcePos.y}`;
        const targetKey = `${conn.targetPos.x},${conn.targetPos.y}`;

        const sourceIndex = portUsage[conn.sourcePort][sourceKey].indexOf(conn);
        const sourceTotal = portUsage[conn.sourcePort][sourceKey].length;
        const targetIndex = portUsage[conn.targetPort][targetKey].indexOf(conn);
        const targetTotal = portUsage[conn.targetPort][targetKey].length;

        const getOffset = (index, total, size) => {
            if (total === 1) return 0;
            const spread = Math.min(size * 0.7, (total - 1) * 20); 
            const start = -spread / 2;
            return start + (index * (spread / (total - 1)));
        };

        const sourceOffsetX = (conn.sourcePort === 'top' || conn.sourcePort === 'bottom') ? getOffset(sourceIndex, sourceTotal, nodeWidth) : 0;
        const sourceOffsetY = (conn.sourcePort === 'left' || conn.sourcePort === 'right') ? getOffset(sourceIndex, sourceTotal, nodeHeight) : 0;
        
        const targetOffsetX = (conn.targetPort === 'top' || conn.targetPort === 'bottom') ? getOffset(targetIndex, targetTotal, nodeWidth) : 0;
        const targetOffsetY = (conn.targetPort === 'left' || conn.targetPort === 'right') ? getOffset(targetIndex, targetTotal, nodeHeight) : 0;

        let startX, startY, endX, endY, d, textX, textY;

        if (isMobile) {
            if (conn.sourcePos.y < conn.targetPos.y) {
                startX = conn.sourcePos.x + sourceOffsetX;
                startY = conn.sourcePos.y + (nodeHeight / 2);
                endX = conn.targetPos.x + targetOffsetX;
                endY = conn.targetPos.y - (nodeHeight / 2) - 10;
            } else {
                startX = conn.sourcePos.x + sourceOffsetX;
                startY = conn.sourcePos.y - (nodeHeight / 2);
                endX = conn.targetPos.x + targetOffsetX;
                endY = conn.targetPos.y + (nodeHeight / 2) + 10;
            }

            let controlX1 = startX;
            let controlX2 = endX;

            const yDist = endY - startY;
            let cOffsetY = Math.max(Math.abs(yDist) / 2, 80) + (Math.abs(endX - startX) * 0.25);
            if (yDist < 0) cOffsetY = -cOffsetY;
            
            d = `M ${startX} ${startY} C ${controlX1} ${startY + cOffsetY}, ${controlX2} ${endY - cOffsetY}, ${endX} ${endY}`;
            
            if (conn.condition === "OR") {
                textX = getBezierPoint(0.3, startX, controlX1, controlX2, endX);
                textY = getBezierPoint(0.3, startY, startY + cOffsetY, endY - cOffsetY, endY);
            }
        } else {
            if (conn.sourcePos.x < conn.targetPos.x) {
                startX = conn.sourcePos.x + (nodeWidth / 2);
                startY = conn.sourcePos.y + sourceOffsetY;
                endX = conn.targetPos.x - (nodeWidth / 2) - 10; 
                endY = conn.targetPos.y + targetOffsetY;
            } else {
                startX = conn.sourcePos.x - (nodeWidth / 2);
                startY = conn.sourcePos.y + sourceOffsetY;
                endX = conn.targetPos.x + (nodeWidth / 2) + 10; 
                endY = conn.targetPos.y + targetOffsetY;
            }

            let controlY1 = startY;
            let controlY2 = endY;

            const xDist = endX - startX;
            let cOffsetX = Math.max(Math.abs(xDist) / 2, 80) + (Math.abs(endY - startY) * 0.25);
            if (xDist < 0) cOffsetX = -cOffsetX;
            
            d = `M ${startX} ${startY} C ${startX + cOffsetX} ${controlY1}, ${endX - cOffsetX} ${controlY2}, ${endX} ${endY}`;

            if (conn.condition === "OR") {
                textX = getBezierPoint(0.3, startX, startX + cOffsetX, endX - cOffsetX, endX);
                textY = getBezierPoint(0.3, startY, controlY1, controlY2, endY);
            }
        }

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke-width", "2");
        path.setAttribute("stroke-dasharray", "4");

        if (conn.type.includes('CO')) {
            path.setAttribute("stroke", "#c68315");
            path.setAttribute("opacity", "0.5");
            path.setAttribute("marker-end", "url(#arrowhead-co)");
        } else {
            path.setAttribute("stroke", "#434656");
            path.setAttribute("opacity", "0.8");
            path.setAttribute("marker-end", "url(#arrowhead)");
        }
        linesGroup.appendChild(path);

        if (conn.condition === "OR") {
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", textX);
            text.setAttribute("y", textY + 4); 
            text.setAttribute("fill", "#8d90a2");
            text.setAttribute("font-size", "10");
            text.setAttribute("font-family", "Inter");
            text.setAttribute("font-weight", "800");
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("paint-order", "stroke fill");
            text.setAttribute("stroke", "#121315"); 
            text.setAttribute("stroke-width", "6");
            text.setAttribute("stroke-linecap", "round");
            text.setAttribute("stroke-linejoin", "round");

            text.textContent = "OR";
            linesGroup.appendChild(text);
        }
    });
}

window.addEventListener('resize', () => {
    if (!document.getElementById('graphView').classList.contains('hidden') && currentActiveCourse) {
        renderGraph(currentActiveCourse);
    }
});
