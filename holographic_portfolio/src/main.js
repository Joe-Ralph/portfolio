import './style.css';
import * as THREE from 'three';
import gsap from 'gsap';
import { analytics } from './firebase.js';

// --- CONFIGURATION & SOUND HOOKS ---

const CONFIG = {
    hexRadius: 10,       // Size of the hexagon
    gap: 2,              // Gap between hexagons
    colors: {
        default: 0x1a5082, // Light teal — visible as a tint at low opacity
        hover: 0x00ffff,   // Bright Cyan
        active: 0x00ffff,  // White/Bright for selection
        text: '#ffffff',
        glow: 0x00ffff     // Cyan Glow
    }
};

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function synthBeep(freq, type, duration, vol) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    filter.type = 'lowpass';
    filter.frequency.value = 2500;
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

const SOUNDS = {
    hover: () => {
        synthBeep(1200, 'sine', 0.05, 0.05); // Soft glassy tap
    },
    spawn: () => {
        synthBeep(1500, 'sine', 0.05, 0.075);
        setTimeout(() => synthBeep(2000, 'sine', 0.15, 0.075), 40); // Solid holographic ping
    },
    click: () => {
        synthBeep(800, 'triangle', 0.1, 0.075);
        setTimeout(() => synthBeep(1200, 'sine', 0.15, 0.075), 40); // Unfolding data sequence
    }
};

// --- THREE.JS SETUP ---

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020c18, 0.007); // Deep-space blue fog matches animated background

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(0, 0, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x000000, 0); // Fully transparent canvas — CSS background shows through
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

function createTextTexture(text, subText) {
    const canvas = document.createElement('canvas');
    const size = 512; // Higher res for sharper text
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, size, size);

    // Subtle cyan glow behind text
    ctx.shadowColor = 'rgba(0, 210, 255, 0.55)';
    ctx.shadowBlur = 12;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (subText) {
        // Draw Main Text
        ctx.font = 'bold 52px Sansation, Orbitron, sans-serif';
        ctx.fillStyle = CONFIG.colors.text;
        const words = text.split(' ');
        if (words.length > 2) {
            ctx.fillText(words.slice(0, Math.ceil(words.length / 2)).join(' '), size / 2, size / 2 - 58);
            ctx.fillText(words.slice(Math.ceil(words.length / 2)).join(' '), size / 2, size / 2 + 2);
        } else {
            ctx.fillText(text, size / 2, size / 2 - 28);
        }

        // Draw Sub Text
        ctx.font = '32px Sansation, Orbitron, sans-serif';
        ctx.fillStyle = '#88ddff'; // Slightly dimmed/cyan for subtext
        ctx.fillText(subText, size / 2, size / 2 + 58);
    } else {
        ctx.font = 'bold 52px Sansation, Orbitron, sans-serif';
        ctx.fillStyle = CONFIG.colors.text;
        const words = text.split(' ');
        if (words.length > 2) {
            ctx.fillText(words.slice(0, Math.ceil(words.length / 2)).join(' '), size / 2, size / 2 - 38);
            ctx.fillText(words.slice(Math.ceil(words.length / 2)).join(' '), size / 2, size / 2 + 38);
        } else {
            ctx.fillText(text, size / 2, size / 2);
        }
    }

    return new THREE.CanvasTexture(canvas);
}

function hexToPixel(q, r, radius) {
    const x = radius * (3 / 2 * q);
    const y = radius * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
    return { x, y };
}

// --- NODE CLASS ---

let panTipShown = false;
function triggerPanTip() {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (panTipShown || isTouchDevice) return;
    panTipShown = true;
    
    const tip = document.createElement('div');
    tip.innerText = "Tip: Right-click and drag to pan the view";
    Object.assign(tip.style, {
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '12px 24px',
        background: 'rgba(2, 8, 28, 0.75)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        color: '#00ffff',
        fontFamily: 'Sansation, Orbitron, sans-serif',
        fontSize: '14px',
        borderRadius: '8px',
        pointerEvents: 'none',
        opacity: '0',
        transition: 'opacity 0.6s ease',
        zIndex: '1000',
        boxShadow: '0 0 15px rgba(0, 255, 255, 0.15)',
        textAlign: 'center'
    });
    document.body.appendChild(tip);
    
    setTimeout(() => { tip.style.opacity = '1'; }, 500);
    setTimeout(() => { tip.style.opacity = '0'; }, 5500);
    setTimeout(() => { tip.remove(); }, 6200);
}

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

        // Determine if node is clickable
        this.isInteractive = (this.data.children && this.data.children.length > 0) || this.data.image || this.data.url || this.data.link || this.data.type === 'overflow';

        // Static Color (Uniform Light Blue Veil)
        this.defaultColor = new THREE.Color(CONFIG.colors.default);

        // Geometry & Material
        const geometry = new THREE.ShapeGeometry(createHexShape(CONFIG.hexRadius - 0.5));

        this.baseMaterial = new THREE.MeshBasicMaterial({
            color: this.defaultColor,
            transparent: true,
            opacity: this.isInteractive ? 0.22 : 0.15, // Non-interactive nodes are barely visible glass
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.NormalBlending
        });

        if (this.data.image) {
            // Fix UVs: ShapeGeometry auto-generates UVs from bounding box, which
            // is non-square for a hex (~1.15:1). Recompute to use uniform scale so
            // the texture is sampled with correct aspect ratio.
            const uvAttr = geometry.getAttribute('uv');
            const hexR = CONFIG.hexRadius - 0.5; // Same radius used for the shape
            for (let i = 0; i < uvAttr.count; i++) {
                const posX = geometry.getAttribute('position').getX(i);
                const posY = geometry.getAttribute('position').getY(i);
                // Map position [-hexR, hexR] → UV [0, 1] using same scale for both axes
                uvAttr.setXY(i, posX / (2 * hexR) + 0.5, posY / (2 * hexR) + 0.5);
            }
            uvAttr.needsUpdate = true;

            const loader = new THREE.TextureLoader();
            loader.load(this.data.image, (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;

                // Cover-fit: scale the texture so it fills the hex without gaps,
                // cropping the longer dimension and centering.
                const imageAspect = texture.image.width / texture.image.height;
                if (imageAspect > 1) {
                    // Landscape image: height fills, width is cropped
                    texture.repeat.set(1 / imageAspect, 1);
                    texture.offset.x = (1 - texture.repeat.x) / 2;
                } else {
                    // Portrait / square image: width fills, height is cropped
                    texture.repeat.set(1, imageAspect);
                    texture.offset.y = (1 - texture.repeat.y) / 2;
                }

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
            this.baseMaterial.color.setHex(0xffaa00);
            this.baseMaterial.opacity = 0.22;
        }

        const edges = new THREE.EdgesGeometry(geometry);
        const lineOpacity = this.isInteractive ? 0.65 : 0.5; // Dim border for non-interactive
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: lineOpacity });
        this.border = new THREE.LineSegments(edges, lineMaterial);

        this.mesh = new THREE.Mesh(geometry, this.baseMaterial);

        // Main Border
        this.mesh.add(this.border);

        // Glow Border (Extra layer for glow effect)
        const glowGeometry = new THREE.EdgesGeometry(geometry);
        const glowMaterial = new THREE.LineBasicMaterial({
            color: 0x00d4ff,
            transparent: true,
            opacity: this.isInteractive ? 0.35 : 0 // No glow halo for leaf nodes
        });
        const glowBorder = new THREE.LineSegments(glowGeometry, glowMaterial);
        glowBorder.scale.set(1.06, 1.06, 1.06);
        this.mesh.add(glowBorder);
        this.glowBorder = glowBorder;

        // Elevation shadow — dark hex behind the face, makes it feel like
        // a frosted glass tile hovering above the aurora background
        const shadowGeo = new THREE.ShapeGeometry(createHexShape(CONFIG.hexRadius + 0.8));
        const shadowMat = new THREE.MeshBasicMaterial({
            color: 0x010818,
            transparent: true,
            opacity: this.isInteractive ? 0.65 : 0.2, // Flatter shadow for leaf nodes
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.NormalBlending
        });
        const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
        shadowMesh.position.z = -4; // Set behind the hex face
        this.mesh.add(shadowMesh);
        this.shadowMesh = shadowMesh;

        // Label
        // Only show label if NOT standard image, or if explicitly requested.
        // But for "More..." node (overflow), definitely show label.

        if (!this.data.image || this.data.type === 'overflow') {
            const textTexture = createTextTexture(data.label, data.subLabel);
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
        // Target opacity varies by type
        let targetOpacity = this.isInteractive ? 0.22 : 0.05;
        if (this.data.image) targetOpacity = 1;
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
        if (!this.isInteractive) return; // Do nothing for leaf nodes

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
                gsap.to(this.baseMaterial, { opacity: 0.42, duration: 0.2 }); // Brighten on hover
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
                gsap.to(this.baseMaterial, { opacity: 0.22, duration: 0.2 }); // Return to glass opacity
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

        if (this.data.url || this.data.link) {
            window.open(this.data.url || this.data.link, '_blank');
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
        if (isPreviewOpen) return;
        
        if (hoveredNode) {
            hoveredNode.hover(false);
            hoveredNode = null;
        }

        this.createInfinityMirror();
        isPreviewOpen = true;

        // Show the close button immediately (before texture loads)
        let closeBtn = document.getElementById('preview-close-btn');
        if (!closeBtn) {
            closeBtn = document.createElement('button');
            closeBtn.id = 'preview-close-btn';
            closeBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            Object.assign(closeBtn.style, {
                position: 'fixed',
                top: '40px',
                right: '40px',
                width: '60px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: '9999',
                background: 'rgba(2, 8, 28, 0.5)',
                backdropFilter: 'blur(16px) saturate(160%)',
                webkitBackdropFilter: 'blur(16px) saturate(160%)',
                color: '#00ffff',
                border: '1px solid rgba(0, 255, 255, 0.35)',
                borderRadius: '50%',
                boxShadow: '0 0 20px rgba(0,255,255,0.2), inset 0 0 10px rgba(0,255,255,0.1)',
                cursor: 'none',
                transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
            });
            document.body.appendChild(closeBtn);
            closeBtn.addEventListener('mouseenter', () => {
                const cursor = document.querySelector('.custom-cursor');
                if (cursor) cursor.classList.add('cursor-hover');
                closeBtn.style.background = 'rgba(0, 255, 255, 0.15)';
                closeBtn.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.5), inset 0 0 20px rgba(0, 255, 255, 0.3)';
                closeBtn.style.transform = 'scale(1.1) rotate(90deg)';
                if (typeof SOUNDS !== 'undefined' && SOUNDS.hover) SOUNDS.hover();
            });
            closeBtn.addEventListener('mouseleave', () => {
                const cursor = document.querySelector('.custom-cursor');
                if (cursor) cursor.classList.remove('cursor-hover');
                closeBtn.style.background = 'rgba(2, 8, 28, 0.5)';
                closeBtn.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.2), inset 0 0 10px rgba(0, 255, 255, 0.1)';
                closeBtn.style.transform = 'scale(1) rotate(0deg)';
            });
        }
        closeBtn.style.transform = 'scale(1) rotate(0deg)';
        closeBtn.style.display = 'flex';

        this.isPreviewCancelled = false;

        closeBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.previewGroup) {
                this.closePreview();
            } else {
                this.isPreviewCancelled = true;
                isPreviewOpen = false;
                closeBtn.style.display = 'none';
                this.removeInfinityMirror();
            }
        };

        // Load a FRESH texture — no hex cover UV repeat/offset, so the image
        // is displayed uncropped at its natural aspect ratio
        const loader = new THREE.TextureLoader();
        loader.load(
            this.data.image,
            (texture) => {
                if (this.isPreviewCancelled) {
                    texture.dispose();
                    return;
                }
                
                texture.colorSpace = THREE.SRGBColorSpace;

                const imgAspect = texture.image.width / texture.image.height;

                // Build shape with the image's natural aspect ratio
                const planeH = 5;
                const planeW = planeH * imgAspect;
                
                const createRoundedRectShape = (width, height, radius) => {
                    const ctx = new THREE.Shape();
                    const x = -width / 2, y = -height / 2;
                    ctx.moveTo(x, y + radius);
                    ctx.lineTo(x, y + height - radius);
                    ctx.quadraticCurveTo(x, y + height, x + radius, y + height);
                    ctx.lineTo(x + width - radius, y + height);
                    ctx.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
                    ctx.lineTo(x + width, y + radius);
                    ctx.quadraticCurveTo(x + width, y, x + width - radius, y);
                    ctx.lineTo(x + radius, y);
                    ctx.quadraticCurveTo(x, y, x, y + radius);
                    return ctx;
                };

                const roundedImageShape = createRoundedRectShape(planeW, planeH, 0.4);
                const geometry = new THREE.ShapeGeometry(roundedImageShape);
                
                // Fix UVs so image isn't squashed or misaligned
                const uvAttr = geometry.getAttribute('uv');
                for (let i = 0; i < uvAttr.count; i++) {
                    const posX = geometry.getAttribute('position').getX(i);
                    const posY = geometry.getAttribute('position').getY(i);
                    uvAttr.setXY(i, (posX + planeW/2) / planeW, (posY + planeH/2) / planeH);
                }
                uvAttr.needsUpdate = true;

                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    side: THREE.DoubleSide
                });
                material.opacity = 0;

                const previewMesh = new THREE.Mesh(geometry, material);

                // Start at node world position
                const worldPos = new THREE.Vector3();
                this.mesh.getWorldPosition(worldPos);
                
                const previewGroup = new THREE.Group();
                previewGroup.position.copy(worldPos);
                previewGroup.quaternion.copy(camera.quaternion);
                
                // OS-style unfolding: start flattened
                previewGroup.scale.set(0.01, 0.01, 1);

                previewMesh.position.set(0, 0, 0);
                previewGroup.add(previewMesh);

                // Frame
                const frameShape = createRoundedRectShape(planeW + 0.15, planeH + 0.15, 0.45);
                const frameGeo = new THREE.EdgesGeometry(new THREE.ShapeGeometry(frameShape));
                const frameMat = new THREE.LineBasicMaterial({
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 0,
                    blending: THREE.AdditiveBlending
                });
                const frameMesh = new THREE.LineSegments(frameGeo, frameMat);
                previewGroup.add(frameMesh);

                // Backdrop for contrast
                const bgShape = createRoundedRectShape(planeW + 0.4, planeH + 0.4, 0.5);
                const bgGeo = new THREE.ShapeGeometry(bgShape);
                const bgMat = new THREE.MeshBasicMaterial({
                    color: 0x010818,
                    transparent: true,
                    opacity: 0,
                    depthWrite: false
                });
                const bgMesh = new THREE.Mesh(bgGeo, bgMat);
                bgMesh.position.z = -0.1;
                previewGroup.add(bgMesh);

                scene.add(previewGroup);
                this.previewGroup = previewGroup;
                this.previewMesh = previewMesh;

                // Compute target position (centred in front of camera)
                const dist = 20;
                const targetPos = new THREE.Vector3(0, 0, -dist);
                targetPos.applyMatrix4(camera.matrixWorld);

                // Fit within 80 % of screen while preserving aspect ratio
                const vFOV = THREE.MathUtils.degToRad(camera.fov);
                const screenH = 2 * Math.tan(vFOV / 2) * dist;
                const screenW = screenH * camera.aspect;
                const scaleH = (screenH * 0.8) / planeH;
                const scaleW = (screenW * 0.8) / planeW;
                const targetScale = Math.min(scaleH, scaleW);

                // Animate in using OS-style unfold
                const tl = gsap.timeline();
                
                // Step 1: Move to center while expanding horizontally to form a line
                tl.to(previewGroup.position, {
                    x: targetPos.x, y: targetPos.y, z: targetPos.z,
                    duration: 0.4, ease: 'power3.out'
                }, 0);
                tl.to(previewGroup.quaternion, {
                    x: camera.quaternion.x, y: camera.quaternion.y,
                    z: camera.quaternion.z, w: camera.quaternion.w,
                    duration: 0.4
                }, 0);
                tl.to(previewGroup.scale, {
                    x: targetScale,
                    duration: 0.3, ease: 'power3.out'
                }, 0);
                
                // Fade in frame during extension
                tl.to(frameMat, { opacity: 0.8, duration: 0.2 }, 0);
                
                // Step 2: Unfold vertically like a screen turning on/window expanding
                tl.to(previewGroup.scale, {
                    y: targetScale + 0.05, // Slight overshoot
                    z: targetScale,
                    duration: 0.3, ease: 'power3.out'
                }, 0.25);
                tl.to(previewGroup.scale, {
                    y: targetScale, // Settle
                    duration: 0.2, ease: 'power2.inOut'
                }, 0.55);
                
                // Fade in image and backdrop as it unfolds
                tl.to(bgMat, { opacity: 0.8, duration: 0.3 }, 0.2);
                tl.to(material, { opacity: 1, duration: 0.3 }, 0.25);
            },
            undefined,
            () => {
                // Texture failed to load
                console.warn('Preview image failed to load:', this.data.image);
                isPreviewOpen = false;
                closeBtn.style.display = 'none';
                this.removeInfinityMirror();
            }
        );
    }

    closePreview() {
        if (!this.previewGroup) return;

        const closeBtn = document.getElementById('preview-close-btn');
        if (closeBtn) closeBtn.style.display = 'none';

        // Animate back to node pos is cooler
        const worldPos = new THREE.Vector3();
        this.mesh.getWorldPosition(worldPos);

        gsap.to(this.previewGroup.position, {
            x: worldPos.x,
            y: worldPos.y,
            z: worldPos.z,
            duration: 0.4,
            ease: "power2.in"
        });

        // Fade out children materials
        this.previewGroup.children.forEach(child => {
            if (child.material) {
                 gsap.to(child.material, { opacity: 0, duration: 0.3 });
            }
        });

        gsap.to(this.previewGroup.scale, {
            x: 0, y: 0, z: 0,
            duration: 0.4,
            onComplete: () => {
                scene.remove(this.previewGroup);
                
                this.previewGroup.children.forEach(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (child.material.map) child.material.map.dispose();
                        child.material.dispose();
                    }
                });

                this.previewMesh = null;
                this.previewGroup = null;
                isPreviewOpen = false;
            }
        });
        
        this.removeInfinityMirror();
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



        // Overflow nodes expand inline — don't hide siblings that are already visible.
        // Only regular nodes should collapse/hide their siblings on expand.
        if (this.parent && this.data.type !== 'overflow') {
            this.parent.childrenNodes.forEach(sibling => {
                if (sibling !== this) {
                    if (sibling.expanded) sibling.collapse();
                    sibling.hide();
                }
            });
        }

        const itemsToDisplay = this.data.children;
        
        if (this.level === 1) {
            triggerPanTip();
        }

        const totalItems = itemsToDisplay.length;

        const availableSlots = [];

        // A slot is occupied if any visible node is there
        const isSlotOccupied = (q, r) => {
            for (let node of nodesMap.values()) {
                if (node.q === q && node.r === r) {
                    // Regular nodes collapse their siblings when expanded, freeing up that slot visually.
                    // Overflow ('...') nodes expand inline, meaning their siblings stay strictly visible!
                    const isHidingSibling = this.data.type !== 'overflow' && 
                                            this.parent && 
                                            this.parent.childrenNodes.includes(node) && 
                                            node !== this;
                                            
                    if (node.mesh.visible && !isHidingSibling) {
                        return true;
                    }
                }
            }
            return false;
        };

        const neighborsOffsets = [
            { q: +1, r: 0 }, { q: +1, r: -1 }, { q: 0, r: -1 },
            { q: -1, r: 0 }, { q: -1, r: +1 }, { q: 0, r: +1 }
        ];

        // Ensure newly placed children spawn contiguously (bunch together) instead of 
        // randomly surrounding the parent node. We do this by finding the relative 
        // coordinate of the parent node and beginning our placement rotation 
        // exactly ONE hex past it.
        let startIndex = 0;
        if (this.parent) {
            const pq = this.parent.q - this.q;
            const pr = this.parent.r - this.r;
            const parentIndex = neighborsOffsets.findIndex(off => off.q === pq && off.r === pr);
            if (parentIndex !== -1) {
                startIndex = (parentIndex + 1) % 6;
            }
        }

        // Search ONLY the 6 immediate neighbors iteratively around the node
        for (let i = 0; i < 6; i++) {
            const offset = neighborsOffsets[(startIndex + i) % 6];
            const nq = this.q + offset.q;
            const nr = this.r + offset.r;
            if (!isSlotOccupied(nq, nr)) {
                availableSlots.push({ q: nq, r: nr });
            }
        }

        const maxSlots = availableSlots.length;
        let displayCount = totalItems;
        let useOverflow = false;

        // If we have more items than available adjacent slots, reserve one for "More..."
        if (totalItems > maxSlots && maxSlots > 0) {
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
                if (this.shadowMesh) {
                    this.shadowMesh.geometry.dispose();
                    this.shadowMesh.material.dispose();
                }
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

const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (isTouchDevice) {
    const cursor = document.querySelector('.custom-cursor');
    if (cursor) cursor.style.display = 'none';
}

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
    if (!isTouchDevice) {
        const cursor = document.querySelector('.custom-cursor');
        if (cursor) {
            cursor.style.left = `${event.clientX}px`;
            cursor.style.top = `${event.clientY}px`;
        }
    }

    if (isPreviewOpen) {
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
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

window.addEventListener('touchstart', (event) => {
    if (isPreviewOpen) return;
    if (event.touches.length === 1) {
        isPanning = true;
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
        lastTouchX = touchStartX;
        lastTouchY = touchStartY;
        touchStartTime = Date.now();
        cameraStartPos.copy(camera.position);
    }
});

window.addEventListener('touchmove', (event) => {
    if (isPanning && event.touches.length === 1) {
        const currentX = event.touches[0].clientX;
        const currentY = event.touches[0].clientY;

        // Prevent native scroll only if they actually dragged significantly
        const dragDist = Math.hypot(currentX - touchStartX, currentY - touchStartY);
        if (dragDist > 5) {
            event.preventDefault();
        }

        const deltaX = currentX - lastTouchX;
        const deltaY = currentY - lastTouchY;

        const sensitivity = 0.2;
        camera.position.x -= deltaX * sensitivity;
        camera.position.y += deltaY * sensitivity; // Y is inverted in 3D space relative to screen

        lastTouchX = currentX;
        lastTouchY = currentY;
    }
}, { passive: false });

window.addEventListener('touchend', (event) => {
    isPanning = false;

    if (isPreviewOpen) return;

    const touchDuration = Date.now() - touchStartTime;
    const touch = event.changedTouches[0];
    const moveDist = Math.hypot(touch.clientX - touchStartX, touch.clientY - touchStartY);

    // If it was a quick tap with minimal finger travel (instead of a panning swipe)
    if (touchDuration < 300 && moveDist < 10) {
        // Manually update pointer normalized coordinates
        mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // Treat interacting nodes separately if applicable
        let targets = [...group.children];
        if (hoveredNode && hoveredNode.mesh.parent === scene) {
            targets.push(hoveredNode.mesh);
        }

        const intersects = raycaster.intersectObjects(targets);

        if (intersects.length > 0) {
            let object = intersects[0].object;
            while (!object.userData.node && object.parent) object = object.parent;
            
            const node = object.userData.node;
            if (node) {
                // Ensure local tracking is correct
                if (hoveredNode && hoveredNode !== node) {
                    hoveredNode.hover(false);
                }
                hoveredNode = node;
                
                // Trigger tap
                node.toggle();
                
                // Prevent synthetic mouse events (like un-cancelable duplicate physical clicks) 
                event.preventDefault();
            }
        } else {
            // Tap on empty space: clear
            if (hoveredNode) {
                hoveredNode.hover(false);
                hoveredNode = null;
            }
        }
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
    // Tilt tiles toward the cursor for a natural "card follow" parallax
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, mouse.y * 0.15, 0.05);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, mouse.x * -0.15, 0.05);

    // Update Nodes (for infinite mirror effect)
    nodesMap.forEach(node => node.update(camera));

    renderer.render(scene, camera);
}

animate();
