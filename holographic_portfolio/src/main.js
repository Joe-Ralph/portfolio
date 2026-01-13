import './style.css'
import * as THREE from 'three';
import gsap from 'gsap';

// --- CONFIGURATION & SOUND HOOKS ---

const CONFIG = {
    hexRadius: 10,       // Size of the hexagon
    gap: 2,              // Gap between hexagons
    colors: {
        default: 0x003366, // Deep Electric Blue
        hover: 0x00ffff,   // Bright Cyan
        active: 0xffffff,  // White/Bright for selection
        text: '#ffffff',
        glow: 0x00ffff     // Cyan Glow
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

// Panning State
let isPanning = false;
let isPreviewOpen = false; // Interaction Lock
let panStartX = 0;
let panStartY = 0;
let cameraStartPos = new THREE.Vector3();


// --- HELPER FUNCTIONS ---

function createHexShape(radius, cornerRadius = 1.6) {
    const shape = new THREE.Shape();
    const width = radius * 2;
    // Angle per slice
    const angleStep = Math.PI / 3;
    // Tangent distance from corner for the curve start/end
    // Internal angle is 120, so half angle is 60. 90-60 = 30.
    // tan(30) = 0.577.
    const d = cornerRadius * Math.tan(Math.PI / 6);

    for (let i = 0; i < 6; i++) {
        const currentAngle = i * angleStep;
        const nextAngle = (i + 1) * angleStep;

        // Vertex Position
        const vx = radius * Math.cos(currentAngle);
        const vy = radius * Math.sin(currentAngle);

        // We need to approach the vertex but stop 'd' units short along the edge.
        // But since we are iterating vertices, let's look at it as:
        // Vertex V.
        // Previous Vertex Vprev.
        // Point P1 = V moved towards Vprev by d.
        // Point P2 = V moved towards Vnext by d.

        // Actually, simpler loop:
        // 1. Calculate vertex V
        // 2. We need previous vertex direction and next vertex direction.
        // This is getting complex inside the loop.
    }

    // Easier approach with just vertices array first
    const vertices = [];
    for (let i = 0; i < 6; i++) {
        vertices.push(new THREE.Vector2(
            radius * Math.cos(i * angleStep),
            radius * Math.sin(i * angleStep)
        ));
    }

    /*
      Draw path:
      Start at first vertex's "exit" point (tangent).
      Line to next vertex's "entry" point.
      Curve to next vertex's "exit" point.
    */

    for (let i = 0; i < 6; i++) {
        const curr = vertices[i];
        const next = vertices[(i + 1) % 6];
        const prev = vertices[(i + 5) % 6];

        // Direction vectors
        const toPrev = prev.clone().sub(curr).normalize();
        const toNext = next.clone().sub(curr).normalize();

        // Tangent points
        const start = curr.clone().add(toNext.multiplyScalar(d)); // Exit towards next
        const end = next.clone().add(curr.clone().sub(next).normalize().multiplyScalar(d)); // Entry from curr

        // Actually, we must handle the corners.
        // The corner is AT 'curr'. 
        // We arrive from 'prev' at 'curr - toPrev*d'.
        // We curve to 'curr + toNext*d'.

        // Let's restructure loop to draw LINES then CORNERS.

        const edgeStart = curr.clone().add(toNext.multiplyScalar(d));
        // We need the END of this edge, which is near 'next'.
        // Direction 'toNext' is correct.
        // Distance to next is radius (approx for hexagon segments).
        // Actually distance is radius.
        // Next vertex is 'next'. 
        // We stop 'd' before 'next'.

        // Let's use standard Path commands properly.
        // Move to P0_exit (if first).

    }

    // Retry simplified logic: 
    // Just hardcode the 6 segments with curves

    const corners = [];
    for (let i = 0; i < 6; i++) {
        corners.push({
            x: radius * Math.cos(i * angleStep),
            y: radius * Math.sin(i * angleStep)
        });
    }

    // Helper to lerp
    const lerp = (p1, p2, t) => ({ x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t });
    // Distance between vertices is radius.
    // We want to cut 'd' from each end.
    // ratio = d / radius.
    const ratio = d / radius;

    for (let i = 0; i < 6; i++) {
        const curr = corners[i];
        const next = corners[(i + 1) % 6];

        // Points on the edge
        const pStart = lerp(curr, next, ratio);
        const pEnd = lerp(curr, next, 1 - ratio);

        if (i === 0) shape.moveTo(pStart.x, pStart.y);
        shape.lineTo(pEnd.x, pEnd.y);

        // Create curve for the corner at 'next'
        // We are at pEnd (which is on the edge between curr and next, close to next)
        // We need to curve to the START of the next edge (next -> next+1)
        const nextNext = corners[(i + 2) % 6];
        const nextEdgeStart = lerp(next, nextNext, ratio);

        shape.quadraticCurveTo(next.x, next.y, nextEdgeStart.x, nextEdgeStart.y);
    }

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

    ctx.font = 'bold 30px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CONFIG.colors.text;
    ctx.shadowBlur = 0; // Removed glow

    const words = text.split(' ');
    if (words.length > 2) {
        ctx.fillText(words.slice(0, Math.ceil(words.length / 2)).join(' '), size / 2, size / 2 - 20);
        ctx.fillText(words.slice(Math.ceil(words.length / 2)).join(' '), size / 2, size / 2 + 20);
    } else {
        ctx.fillText(text, size / 2, size / 2);
    }

    return new THREE.CanvasTexture(canvas);
}

function hexToPixel(q, r, radius) {
    const x = radius * (3 / 2 * q);
    const y = radius * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
    return { x, y };
}

// --- NODE CLASS ---

class HexNode {
    constructor(data, q, r, parent = null, level = 0) {
        this.data = data;
        this.id = data.id;
        this.q = q;
        this.r = r;
        this.parent = parent;
        this.childrenNodes = [];
        this.expanded = false;
        this.level = level;

        // Static Color (Uniform Light Blue Veil)
        this.defaultColor = new THREE.Color(CONFIG.colors.default);

        // Geometry & Material
        const geometry = new THREE.ShapeGeometry(createHexShape(CONFIG.hexRadius - 0.5));

        this.baseMaterial = new THREE.MeshBasicMaterial({
            color: this.defaultColor,
            transparent: true,
            opacity: 0.6, // Higher opacity for brighter hologram
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        if (this.data.image) {
            const loader = new THREE.TextureLoader();
            loader.load(this.data.image, (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;

                // Cover Logic
                const imageAspect = texture.image.width / texture.image.height;
                const targetAspect = 1.1547; // Hex aspect ratio roughly

                if (imageAspect > targetAspect) {
                    texture.repeat.set(targetAspect / imageAspect, 1);
                    texture.offset.x = (1 - texture.repeat.x) / 2;
                } else {
                    texture.repeat.set(1, imageAspect / targetAspect);
                    texture.offset.y = (1 - texture.repeat.y) / 2;
                }
                texture.center.set(0.5, 0.5);

                // Apply to material
                this.baseMaterial.map = texture;
                this.baseMaterial.color.setHex(0xffffff); // Reset color to white so image shows true colors
                this.baseMaterial.blending = THREE.NormalBlending; // Solid for images
                this.baseMaterial.needsUpdate = true;

                // Fade in
                gsap.to(this.baseMaterial, { opacity: 1, duration: 0.5 });
            });
        }

        // Overflow Node specific styling
        if (this.data.type === 'overflow') {
            this.baseMaterial.color.setHex(0xffaa00); // Orange for 'More'
            this.baseMaterial.opacity = 0.5;
        }

        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
        this.border = new THREE.LineSegments(edges, lineMaterial);

        this.mesh = new THREE.Mesh(geometry, this.baseMaterial);

        // Main Border
        this.mesh.add(this.border);

        // Glow Border (Extra layer for glow effect)
        const glowGeometry = new THREE.EdgesGeometry(geometry);
        const glowMaterial = new THREE.LineBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.3
        });
        const glowBorder = new THREE.LineSegments(glowGeometry, glowMaterial);
        glowBorder.scale.set(1.05, 1.05, 1.05); // Slightly larger
        this.mesh.add(glowBorder);
        this.glowBorder = glowBorder; // Reference for animation

        // Label
        // Only show label if NOT standard image, or if explicitly requested.
        // But for "More..." node (overflow), definitely show label.

        if (!this.data.image || this.data.type === 'overflow') {
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
        }

        // Position
        const pos = hexToPixel(q, r, CONFIG.hexRadius + CONFIG.gap);
        this.mesh.position.set(pos.x, pos.y, 0);
        this.mesh.scale.set(0, 0, 0); // Start hidden

        group.add(this.mesh);

        this.mesh.userData = { node: this };
        occupiedGrids.add(`${q},${r}`);
        nodesMap.set(this.id, this);

        this.animateIn();
    }

    animateIn() {
        SOUNDS.spawn();
        this.mesh.visible = true;
        gsap.to(this.mesh.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: "back.out(1.7)" });
        // Target opacity 0.6 for NormalBlending, 1.0 for images if set
        // Target opacity 0.6 for brighter Hologram, 1.0 for images if set
        const targetOpacity = this.data.image ? 1 : 0.6;
        gsap.to(this.baseMaterial, { opacity: targetOpacity, duration: 1 });
    }

    hide() {
        gsap.to(this.mesh.scale, {
            x: 0, y: 0, z: 0, duration: 0.3, onComplete: () => {
                this.mesh.visible = false;
            }
        });
    }

    show() {
        this.mesh.visible = true;
        gsap.to(this.mesh.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: "back.out(1.7)" });
    }

    hover(isHovering) {
        const cursor = document.querySelector('.custom-cursor');
        if (isHovering) {
            if (cursor) cursor.classList.add('cursor-hover');
            document.body.style.cursor = 'none';

            // Fix: Don't tint images, just scale/opacity
            if (!this.data.image) {
                // Tween RGB components separately to ensure Three.js Color integrity
                const hoverColor = new THREE.Color(CONFIG.colors.hover);
                gsap.to(this.baseMaterial.color, {
                    r: hoverColor.r,
                    g: hoverColor.g,
                    b: hoverColor.b,
                    duration: 0.2
                });
                gsap.to(this.baseMaterial, { opacity: 0.4, duration: 0.2 });
            } else {
                gsap.to(this.baseMaterial, { opacity: 1, duration: 0.2 });
            }

            gsap.to(this.mesh.scale, { x: 1.1, y: 1.1, z: 1.1, duration: 0.2 });
            this.createInfinityMirror();
            SOUNDS.hover();
        } else {
            if (cursor) cursor.classList.remove('cursor-hover');
            document.body.style.cursor = 'none';

            if (!this.data.image) {
                const targetColor = this.expanded ? new THREE.Color(CONFIG.colors.active) : this.defaultColor;

                // Revert to stable opacity and color RGB
                gsap.to(this.baseMaterial.color, {
                    r: targetColor.r,
                    g: targetColor.g,
                    b: targetColor.b,
                    duration: 0.2
                });
                gsap.to(this.baseMaterial, { opacity: 0.6, duration: 0.2 });
            } else {
                gsap.to(this.baseMaterial, { opacity: 1, duration: 0.2 });
            }

            gsap.to(this.mesh.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
            this.removeInfinityMirror();
        }
    }

    toggle() {
        SOUNDS.click();

        if (this.data.type === 'image') {
            this.openPreview();
            return;
        }

        if (this.data.url) {
            window.open(this.data.url, '_blank');
            return;
        }
        if (this.expanded) {
            this.collapse();
        } else {
            this.expand();
        }

        // Center Camera on Click (Slow Animation)
        // We want the camera to look AT the node. 
        // Since camera looks at (camera.x, camera.y, 0) effectively (parallel projection center),
        // we just move camera x/y to node x/y.

        const worldPos = new THREE.Vector3();
        this.mesh.getWorldPosition(worldPos);

        gsap.to(camera.position, {
            x: worldPos.x,
            y: worldPos.y,
            duration: 1.5, // Slow animation
            ease: "power2.inOut"
        });
    }

    createInfinityMirror() {
        if (this.mirrorGroup) return;

        this.mirrorGroup = new THREE.Group();
        this.mesh.add(this.mirrorGroup);

        // Volumetric Prism Layers
        // We want a solid block feel. 3 sets of lines: 
        // 1. Center (Mesh Border - already exists)
        // 2. Front 
        // 3. Back

        const geometry = this.border.geometry;
        const offset = 8; // Thickness

        const createLayer = (zPos) => {
            const material = new THREE.LineBasicMaterial({
                color: CONFIG.colors.glow,
                transparent: true,
                opacity: 0, // Start invisible, animate in
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            const layer = new THREE.LineSegments(geometry, material);
            layer.position.z = 0; // Start at center

            this.mirrorGroup.add(layer);

            // Animate expansion
            gsap.to(layer.position, { z: zPos, duration: 0.4, ease: "power2.out" });
            gsap.to(material, { opacity: 0.8, duration: 0.4 });
        };

        createLayer(offset);  // Front
        createLayer(-offset); // Back
    }

    removeInfinityMirror() {
        if (!this.mirrorGroup) return;

        // Fade out then remove
        const children = [...this.mirrorGroup.children];
        this.mirrorGroup.children.forEach(child => {
            gsap.killTweensOf(child.position);
            gsap.killTweensOf(child.material);
            gsap.to(child.material, {
                opacity: 0,
                duration: 0.5,
                onComplete: () => {
                    child.geometry.dispose();
                    child.material.dispose();
                }
            });
        });

        // Remove group after fade
        gsap.delayedCall(0.5, () => {
            if (this.mirrorGroup) {
                this.mesh.remove(this.mirrorGroup);
                this.mirrorGroup = null;
            }
        });
    }

    update(camera) {
        // Disabled tunnel perspective logic for 'Solid Flip' effect
        // The mirror group now moves rigidly with the mesh.
    }

    openPreview() {
        this.createInfinityMirror(); // Add effect
        if (isPreviewOpen) return;
        isPreviewOpen = true; // Lock interactions

        // Create a separate mesh for preview to avoid messing up the grid node too much
        const geometry = new THREE.PlaneGeometry(5, 5); // Aspect ratio? Square for now or check texture?
        // Reuse texture
        const material = new THREE.MeshBasicMaterial({
            map: this.baseMaterial.map,
            transparent: true,
            side: THREE.DoubleSide
        });

        const previewMesh = new THREE.Mesh(geometry, material);

        // Start at node position
        const worldPos = new THREE.Vector3();
        this.mesh.getWorldPosition(worldPos);
        previewMesh.position.copy(worldPos);

        // Start rotation matches camera to start with? Or node?
        // Let's start with node rotation? No, grid might be tilted.
        // Start flat to camera but small?
        previewMesh.lookAt(camera.position);

        scene.add(previewMesh);

        // Target Position: In front of camera.
        // Camera is looking down -Z usually or at target.
        // We want it fixed relative to camera.
        const dist = 20;
        const targetPos = new THREE.Vector3(0, 0, -dist);
        targetPos.applyMatrix4(camera.matrixWorld);

        // Calc size to fit screen at dist
        // vFOV = camera.fov (degrees)
        // visible height = 2 * tan(fov/2) * dist
        const vFOV = THREE.MathUtils.degToRad(camera.fov);
        const height = 2 * Math.tan(vFOV / 2) * dist;
        const width = height * camera.aspect;

        // Target Scale: Fit within 80% of screen
        // Initial geometry is size 5.
        // We need padding.
        const scaleH = (height * 0.8) / 5;
        const scaleW = (width * 0.8) / 5;
        const targetScale = Math.min(scaleH, scaleW);

        // Animate Position
        gsap.to(previewMesh.position, {
            x: targetPos.x,
            y: targetPos.y,
            z: targetPos.z,
            duration: 0.5,
            ease: "back.out(1.0)"
        });

        // Animate Rotation to match Camera (perfectly flat)
        const targetQuaternion = camera.quaternion.clone();
        gsap.to(previewMesh.quaternion, {
            x: targetQuaternion.x,
            y: targetQuaternion.y,
            z: targetQuaternion.z,
            w: targetQuaternion.w,
            duration: 0.5
        });

        // Animate Scale
        gsap.to(previewMesh.scale, {
            x: targetScale,
            y: targetScale,
            z: targetScale,
            duration: 0.5
        });

        this.previewMesh = previewMesh; // Store Ref

        // Show Close Button
        let closeBtn = document.getElementById('preview-close-btn');
        if (!closeBtn) {
            closeBtn = document.createElement('button');
            closeBtn.id = 'preview-close-btn';
            closeBtn.innerText = 'X';
            Object.assign(closeBtn.style, {
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: '9999', // Ensure extremely high Z-Index
                padding: '10px 20px',
                fontSize: '20px',
                background: 'rgba(0, 0, 0, 0.8)',
                color: '#00ffff',
                border: '1px solid #00ffff',
                cursor: 'pointer',
                borderRadius: '5px'
            });
            document.body.appendChild(closeBtn);
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault(); // Stop propagation issues
                e.stopPropagation();
                if (this.previewMesh) this.closePreview();
            });
        }
        closeBtn.style.display = 'block';
    }

    closePreview() {
        if (!this.previewMesh) return;

        const closeBtn = document.getElementById('preview-close-btn');
        if (closeBtn) closeBtn.style.display = 'none';

        // Animate back? Or just fade out?
        // Animate back to node pos is cooler
        const worldPos = new THREE.Vector3();
        this.mesh.getWorldPosition(worldPos);

        gsap.to(this.previewMesh.position, {
            x: worldPos.x,
            y: worldPos.y,
            z: worldPos.z,
            duration: 0.4,
            ease: "power2.in"
        });

        gsap.to(this.previewMesh.scale, {
            x: 0,
            y: 0,
            z: 0,
            duration: 0.4,
            onComplete: () => {
                scene.remove(this.previewMesh);
                this.previewMesh.geometry.dispose();
                this.previewMesh.material.dispose();
                this.previewMesh = null;
                isPreviewOpen = false; // Unlock interactions
            }
        });
        this.removeInfinityMirror(); // Remove effect
    }

    expand() {
        if (!this.data.children || this.data.children.length === 0) return;

        this.expanded = true;

        // Fix: Tween RGB
        const activeColor = new THREE.Color(CONFIG.colors.active);
        gsap.to(this.baseMaterial.color, {
            r: activeColor.r,
            g: activeColor.g,
            b: activeColor.b,
            duration: 0.3
        });

        // Hide siblings
        if (this.parent) {
            this.parent.childrenNodes.forEach(sibling => {
                if (sibling !== this) {
                    if (sibling.expanded) sibling.collapse();
                    sibling.hide();
                }
            });
        }

        const neighbors = [
            { q: +1, r: 0 }, { q: +1, r: -1 }, { q: 0, r: -1 },
            { q: -1, r: 0 }, { q: -1, r: +1 }, { q: 0, r: +1 }
        ];

        // Determine available slots
        const availableSlots = [];
        for (let offset of neighbors) {
            const targetQ = this.q + offset.q;
            const targetR = this.r + offset.r;
            const key = `${targetQ},${targetR}`;
            if (!occupiedGrids.has(key)) {
                availableSlots.push({ q: targetQ, r: targetR });
            }
        }

        const itemsToDisplay = this.data.children;
        const totalItems = itemsToDisplay.length;
        const maxSlots = availableSlots.length;

        let displayCount = totalItems;
        let useOverflow = false;

        // If we have more items than slots, we need to reserve one slot for "More..."
        if (totalItems > maxSlots) {
            displayCount = maxSlots - 1;
            useOverflow = true;
        }

        // Render standard items
        for (let i = 0; i < displayCount; i++) {
            const slot = availableSlots[i];
            const childData = itemsToDisplay[i];
            const childNode = new HexNode(childData, slot.q, slot.r, this, this.level + 1);
            this.childrenNodes.push(childNode);
        }

        // Render Overflow Node
        if (useOverflow) {
            const slot = availableSlots[displayCount]; // The last reserved slot
            const remainingItems = itemsToDisplay.slice(displayCount);

            const overflowData = {
                id: `overflow-${this.id}-${Date.now()}`,
                label: "...",
                type: "overflow",
                children: remainingItems
            };

            const overflowNode = new HexNode(overflowData, slot.q, slot.r, this, this.level + 1);
            this.childrenNodes.push(overflowNode);
        }
    }

    collapse(showSiblings = true) {
        this.expanded = false;

        // Fix: Tween RGB
        const targetColor = this.defaultColor;
        gsap.to(this.baseMaterial.color, {
            r: targetColor.r,
            g: targetColor.g,
            b: targetColor.b,
            duration: 0.3
        });

        this.childrenNodes.forEach(child => child.destroy());
        this.childrenNodes = [];

        // Show siblings
        if (showSiblings && this.parent) {
            this.parent.childrenNodes.forEach(sibling => {
                if (sibling !== this) {
                    sibling.show();
                }
            });
        }
    }

    destroy() {
        if (this.expanded) this.collapse(false);

        const key = `${this.q},${this.r}`;
        occupiedGrids.delete(key);
        nodesMap.delete(this.id);

        gsap.to(this.mesh.scale, {
            x: 0, y: 0, z: 0, duration: 0.3, onComplete: () => {
                group.remove(this.mesh);
                this.mesh.geometry.dispose();
                this.baseMaterial.dispose();
                this.border.geometry.dispose();
                this.border.material.dispose();
                if (this.labelMesh) {
                    this.labelMesh.geometry.dispose();
                    this.labelMesh.material.map.dispose();
                    this.labelMesh.material.dispose();
                }
            }
        });
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

// Prevent context menu
window.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('mousedown', (event) => {
    if (isPreviewOpen) return; // Block

    // Right click (button 2) for panning
    if (event.button === 2) {
        isPanning = true;
        panStartX = event.clientX;
        panStartY = event.clientY;
        cameraStartPos.copy(camera.position);
        document.body.style.cursor = 'grabbing';
    }
});

window.addEventListener('mousemove', (event) => {
    // Custom Cursor Position
    const cursor = document.querySelector('.custom-cursor');
    if (cursor) {
        cursor.style.left = `${event.clientX}px`;
        cursor.style.top = `${event.clientY}px`;
    }

    if (isPreviewOpen) {
        document.body.style.cursor = 'default';
        return;
    }

    // Update mouse vector for raycasting
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Handle Panning
    if (isPanning) {
        const deltaX = event.clientX - panStartX;
        const deltaY = event.clientY - panStartY;

        // Adjust sensitivity as needed
        const sensitivity = 0.1;

        camera.position.x = cameraStartPos.x - deltaX * sensitivity;
        camera.position.y = cameraStartPos.y + deltaY * sensitivity;
        return; // Skip raycasting while panning
    }

    // Raycasting
    raycaster.setFromCamera(mouse, camera);

    // Check Group Children AND any interacting (detached) node
    let targets = [...group.children];
    if (hoveredNode && hoveredNode.mesh.parent === scene) {
        targets.push(hoveredNode.mesh);
    }

    const intersects = raycaster.intersectObjects(targets);

    if (intersects.length > 0) {
        let object = intersects[0].object;
        while (!object.userData.node && object.parent) object = object.parent;

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

window.addEventListener('mouseup', () => {
    if (isPanning) {
        isPanning = false;
        document.body.style.cursor = 'default';
    }
});

window.addEventListener('mouseleave', () => {
    if (isPanning) {
        isPanning = false;
        document.body.style.cursor = 'default';
    }
});

window.addEventListener('wheel', (event) => {
    if (isPreviewOpen) return;
    event.preventDefault();
    const panSpeed = 0.5;
    camera.position.x += event.deltaX * panSpeed * 0.1;
    camera.position.y -= event.deltaY * panSpeed * 0.1;
}, { passive: false });

// Touch Handling
let touchStartDist = 0;
let lastTouchX = 0;
let lastTouchY = 0;

window.addEventListener('touchstart', (event) => {
    if (isPreviewOpen) return;
    if (event.touches.length === 2) {
        isPanning = true;
        lastTouchX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
        lastTouchY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
    }
});

window.addEventListener('touchmove', (event) => {
    if (isPanning && event.touches.length === 2) {
        event.preventDefault(); // Prevent native scroll
        const currentX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
        const currentY = (event.touches[0].clientY + event.touches[1].clientY) / 2;

        const deltaX = currentX - lastTouchX;
        const deltaY = currentY - lastTouchY;

        const sensitivity = 0.2;
        camera.position.x -= deltaX * sensitivity;
        camera.position.y += deltaY * sensitivity; // Y is inverted in 3D space relative to screen

        lastTouchX = currentX;
        lastTouchY = currentY;
    }
}, { passive: false });

window.addEventListener('touchend', () => {
    if (event.touches.length < 2) {
        isPanning = false;
    }
});

window.addEventListener('click', () => {
    if (isPreviewOpen) return;
    if (hoveredNode) hoveredNode.toggle();
    // Special case for 'Close Preview' button? 
    // It's a DOM element, so it will handle its own click event BEFORE this window click if stopPropagation is used?
    // OR, window click catches it after.
    // BUT we added stopPropagation to the close button listener.
    // And isPreviewOpen is true, so checking it here is correct for grid clicks.
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

    // Update Nodes (for infinite mirror effect)
    nodesMap.forEach(node => node.update(camera));

    renderer.render(scene, camera);
}

animate();
