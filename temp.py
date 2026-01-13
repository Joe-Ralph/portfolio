import zipfile
import os

# --- FILE CONTENTS ---

PACKAGE_JSON = """{
  "name": "holographic-portfolio",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "gsap": "^3.12.5",
    "three": "^0.160.0"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
"""

INDEX_HTML = """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Holographic OS Portfolio</title>
  </head>
  <body>
    <div id="canvas-container"></div>
    <div class="vignette"></div>
    <div id="info-panel">SYSTEM: ONLINE // WAITING FOR INPUT...</div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
"""

STYLE_CSS = """
body { 
    margin: 0; 
    overflow: hidden; 
    background-color: #050505; /* Deep dark background */
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
#canvas-container { width: 100vw; height: 100vh; display: block; }

/* Vignette for monitor feel */
.vignette {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none;
    background: radial-gradient(circle, transparent 50%, rgba(0,0,0,0.8) 100%);
}

#info-panel {
    position: absolute;
    bottom: 20px;
    left: 20px;
    color: #00ffff;
    font-family: monospace;
    pointer-events: none;
    opacity: 0.7;
    user-select: none;
}
"""

DATA_JSON = """{
    "id": "root",
    "label": "JOHN DOE",
    "type": "root",
    "children": [
        {
            "id": "about",
            "label": "PROFILE",
            "type": "category",
            "children": [
                { "id": "bio", "label": "Full Stack Eng.", "type": "info" },
                { "id": "loc", "label": "San Francisco, CA", "type": "info" }
            ]
        },
        {
            "id": "skills",
            "label": "SKILLS",
            "type": "category",
            "children": [
                { "id": "js", "label": "JavaScript / TS", "type": "info" },
                { "id": "react", "label": "React & Three.js", "type": "info" },
                { "id": "backend", "label": "Node & Python", "type": "info" }
            ]
        },
        {
            "id": "projects",
            "label": "PROJECTS",
            "type": "category",
            "children": [
                { "id": "p1", "label": "Holo-UI", "type": "link", "url": "#" },
                { "id": "p2", "label": "E-Commerce", "type": "link", "url": "#" }
            ]
        },
        {
            "id": "contact",
            "label": "CONTACT",
            "type": "category",
            "children": [
                { "id": "email", "label": "email@dev.com", "type": "link", "url": "mailto:email@dev.com" },
                { "id": "gh", "label": "GitHub", "type": "link", "url": "https://github.com" }
            ]
        }
    ]
}
"""

MAIN_JS = """import './style.css'
import * as THREE from 'three';
import gsap from 'gsap';

// --- CONFIGURATION & SOUND HOOKS ---

const CONFIG = {
    hexRadius: 10,       // Size of the hexagon
    gap: 2,              // Gap between hexagons
    colors: {
        default: 0x0088aa, // Cyan-ish
        hover: 0x00ffff,   // Bright Cyan
        active: 0xff0055,  // Selection Color
        text: '#ffffff'
    }
};

const SOUNDS = {
    // To enable sounds, place mp3 files in public/sounds/ and uncomment lines below
    hover: () => { 
        // const audio = new Audio('/sounds/hover.mp3');
        // audio.volume = 0.2;
        // audio.play().catch(e => {}); 
    },
    spawn: () => { 
        // const audio = new Audio('/sounds/spawn.mp3');
        // audio.volume = 0.2;
        // audio.play().catch(e => {});
    },
    click: () => { 
        // const audio = new Audio('/sounds/click.mp3');
        // audio.play().catch(e => {});
    }
};

// --- THREE.JS SETUP ---

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050505, 0.008);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(0, 0, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('canvas-container').appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0x00ffff, 1, 100);
pointLight.position.set(10, 10, 20);
scene.add(pointLight);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// State
const occupiedGrids = new Set();
const nodesMap = new Map();
const group = new THREE.Group();
scene.add(group);

// --- HELPER FUNCTIONS ---

function createHexShape(radius) {
    const shape = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
        const angle = (i * 60) * (Math.PI / 180);
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
}

function createTextTexture(text) {
    const canvas = document.createElement('canvas');
    const size = 256; 
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'rgba(0,0,0,0)'; 
    ctx.fillRect(0, 0, size, size);

    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CONFIG.colors.text;
    ctx.shadowColor = "cyan";
    ctx.shadowBlur = 10;
    
    const words = text.split(' ');
    if(words.length > 2) {
         ctx.fillText(words.slice(0, Math.ceil(words.length/2)).join(' '), size/2, size/2 - 20);
         ctx.fillText(words.slice(Math.ceil(words.length/2)).join(' '), size/2, size/2 + 20);
    } else {
        ctx.fillText(text, size / 2, size / 2);
    }

    return new THREE.CanvasTexture(canvas);
}

function hexToPixel(q, r, radius) {
    const x = radius * (3/2 * q);
    const y = radius * (Math.sqrt(3)/2 * q  +  Math.sqrt(3) * r);
    return { x, y };
}

// --- NODE CLASS ---

class HexNode {
    constructor(data, q, r, parent = null) {
        this.data = data;
        this.id = data.id;
        this.q = q;
        this.r = r;
        this.parent = parent;
        this.childrenNodes = [];
        this.expanded = false;

        // Geometry & Material
        const geometry = new THREE.ShapeGeometry(createHexShape(CONFIG.hexRadius - 0.5));
        
        this.baseMaterial = new THREE.MeshBasicMaterial({ 
            color: CONFIG.colors.default,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending 
        });
        
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 });
        this.border = new THREE.LineSegments(edges, lineMaterial);

        this.mesh = new THREE.Mesh(geometry, this.baseMaterial);
        this.mesh.add(this.border);

        // Label
        const textTexture = createTextTexture(data.label);
        const labelGeo = new THREE.PlaneGeometry(12, 12);
        const labelMat = new THREE.MeshBasicMaterial({ 
            map: textTexture, 
            transparent: true, 
            side: THREE.DoubleSide,
            depthTest: false
        });
        this.labelMesh = new THREE.Mesh(labelGeo, labelMat);
        this.labelMesh.position.z = 0.1;
        this.mesh.add(this.labelMesh);

        // Position
        const pos = hexToPixel(q, r, CONFIG.hexRadius + CONFIG.gap);
        this.mesh.position.set(pos.x, pos.y, 0);
        this.mesh.scale.set(0,0,0); // Start hidden
        
        group.add(this.mesh);
        
        this.mesh.userData = { node: this };
        occupiedGrids.add(`${q},${r}`);
        nodesMap.set(this.id, this);

        this.animateIn();
    }

    animateIn() {
        SOUNDS.spawn();
        gsap.to(this.mesh.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: "back.out(1.7)" });
        gsap.to(this.baseMaterial, { opacity: 0.2, duration: 1 });
    }

    hover(isHovering) {
        if(isHovering) {
            document.body.style.cursor = 'pointer';
            gsap.to(this.baseMaterial, { color: CONFIG.colors.hover, opacity: 0.4, duration: 0.2 });
            gsap.to(this.mesh.scale, { x: 1.1, y: 1.1, z: 1.1, duration: 0.2 });
            SOUNDS.hover();
        } else {
            document.body.style.cursor = 'default';
            const targetColor = this.expanded ? CONFIG.colors.active : CONFIG.colors.default;
            gsap.to(this.baseMaterial, { color: targetColor, opacity: 0.2, duration: 0.2 });
            gsap.to(this.mesh.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
        }
    }

    toggle() {
        SOUNDS.click();
        if (this.data.url) {
            window.open(this.data.url, '_blank');
            return;
        }
        if (this.expanded) this.collapse();
        else this.expand();
    }

    expand() {
        if (!this.data.children || this.data.children.length === 0) return;
        
        this.expanded = true;
        gsap.to(this.baseMaterial, { color: CONFIG.colors.active, duration: 0.3 });

        const neighbors = [
            {q: +1, r: 0}, {q: +1, r: -1}, {q: 0, r: -1},
            {q: -1, r: 0}, {q: -1, r: +1}, {q: 0, r: +1}
        ];

        let childIndex = 0;
        
        // Simple organic fill
        for (let offset of neighbors) {
            if (childIndex >= this.data.children.length) break;

            const targetQ = this.q + offset.q;
            const targetR = this.r + offset.r;
            const key = `${targetQ},${targetR}`;

            if (!occupiedGrids.has(key)) {
                const childData = this.data.children[childIndex];
                const childNode = new HexNode(childData, targetQ, targetR, this);
                this.childrenNodes.push(childNode);
                childIndex++;
            }
        }
    }

    collapse() {
        this.expanded = false;
        gsap.to(this.baseMaterial, { color: CONFIG.colors.default, duration: 0.3 });
        this.childrenNodes.forEach(child => child.destroy());
        this.childrenNodes = [];
    }

    destroy() {
        if (this.expanded) this.collapse();
        
        const key = `${this.q},${this.r}`;
        occupiedGrids.delete(key);
        nodesMap.delete(this.id);

        gsap.to(this.mesh.scale, { x: 0, y: 0, z: 0, duration: 0.3, onComplete: () => {
            group.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.baseMaterial.dispose();
            this.border.geometry.dispose();
            this.border.material.dispose();
            this.labelMesh.geometry.dispose();
            this.labelMesh.material.map.dispose();
            this.labelMesh.material.dispose();
        }});
    }
}

// --- INIT APP ---

async function init() {
    try {
        const response = await fetch('/data.json');
        const data = await response.json();
        
        // Center the camera
        new HexNode(data, 0, 0);
        
    } catch (e) {
        console.error("Failed to load portfolio data", e);
        document.getElementById('info-panel').innerText = "SYSTEM ERROR: DATA CORRUPT";
    }
}

init();

// --- EVENTS ---

let hoveredNode = null;
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(group.children);

    if (intersects.length > 0) {
        let object = intersects[0].object;
        while(!object.userData.node && object.parent) object = object.parent;
        
        const node = object.userData.node;
        if (node && node !== hoveredNode) {
            if (hoveredNode) hoveredNode.hover(false);
            hoveredNode = node;
            hoveredNode.hover(true);
        }
    } else {
        if (hoveredNode) {
            hoveredNode.hover(false);
            hoveredNode = null;
        }
    }
});

window.addEventListener('click', () => {
    if (hoveredNode) hoveredNode.toggle();
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;
    group.position.y = Math.sin(time) * 0.5; 
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, mouse.y * 0.05, 0.05);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, mouse.x * 0.05, 0.05);
    renderer.render(scene, camera);
}

animate();
"""

GITIGNORE = """
node_modules
.DS_Store
dist
dist-ssr
*.local
"""

# --- ZIP GENERATION ---

def create_zip():
    filename = "holographic_portfolio.zip"
    
    files = [
        ("package.json", PACKAGE_JSON),
        ("index.html", INDEX_HTML),
        ("src/main.js", MAIN_JS),
        ("src/style.css", STYLE_CSS),
        ("public/data.json", DATA_JSON),
        (".gitignore", GITIGNORE)
    ]

    with zipfile.ZipFile(filename, 'w', zipfile.ZIP_DEFLATED) as zf:
        for path, content in files:
            zf.writestr(path, content)
            print(f"Adding {path}...")
    
    print(f"\\nSuccessfully created {filename}")
    print("Next steps:")
    print("1. Unzip the file")
    print("2. Run 'npm install'")
    print("3. Run 'npm run dev'")

if __name__ == "__main__":
    create_zip()