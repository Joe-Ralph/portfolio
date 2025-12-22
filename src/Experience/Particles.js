import * as THREE from 'three'
export default class Particles {
    constructor(scene) {
        this.scene = scene
        this.count = 4000
        this.sizes = {
            width: window.innerWidth,
            height: window.innerHeight
        }
        this.params = {
            count: 16100,
            transitionSpeed: 0.02,
            rotationSpeed: 1.09,
            sphereRadius: 12.5,
            particleSize: 235,
            sphereNoise: 1.5,
            tiltX: 0.5,
            tiltZ: -3.14159,
            wobbleStrength: 100.0
        }
        this.mouseDelta = new THREE.Vector2(0, 0)
        this.wobble = new THREE.Vector2(0, 0)
        this.createParticles()
        this.setupMouse()
    }
    createParticles() {
        if (this.points) {
            this.geometry.dispose()
            this.material.dispose()
            this.scene.remove(this.points)
        }
        this.geometry = new THREE.BufferGeometry()
        const count = this.params.count
        const positions = new Float32Array(count * 3)
        const randoms = new Float32Array(count * 3)
        const colors = new Float32Array(count * 3)
        const scales = new Float32Array(count)
        const colorPalette = [
            new THREE.Color('#00ffff'),
            new THREE.Color('#ff00ff'),
            new THREE.Color('#00ccff')
        ]
        for (let i = 0; i < count; i++) {
            const i3 = i * 3
            positions[i3] = (Math.random() - 0.5) * 100
            positions[i3 + 1] = (Math.random() - 0.5) * 60
            positions[i3 + 2] = (Math.random() - 0.5) * 20
            randoms[i3] = Math.random()
            randoms[i3 + 1] = Math.random()
            randoms[i3 + 2] = Math.random()
            const color = colorPalette[Math.floor(Math.random() * colorPalette.length)]
            colors[i3] = color.r
            colors[i3 + 1] = color.g
            colors[i3 + 2] = color.b
            scales[i] = Math.random()
        }
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        this.geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 3))
        this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
        this.geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))
        this.initialPositions = Float32Array.from(positions)
        this.material = new THREE.ShaderMaterial({
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
            transparent: true,
            vertexShader: `
uniform float uPixelRatio;
uniform float uSize;
attribute float aScale;
varying vec3 vColor;
void main() {
vec4 modelPosition = modelMatrix * vec4(position, 1.0);
vec4 viewPosition = viewMatrix * modelPosition;
vec4 projectionPosition = projectionMatrix * viewPosition;
gl_Position = projectionPosition;
gl_PointSize = uSize * aScale * uPixelRatio;
gl_PointSize *= (1.0 / - viewPosition.z);
vColor = color;
}
`,
            fragmentShader: `
varying vec3 vColor;
void main() {
float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
float strength = 0.05 / distanceToCenter - 0.1;
gl_FragColor = vec4(vColor, strength);
}
`,
            uniforms: {
                uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
                uSize: { value: 150.0 }
            }
        })
        this.points = new THREE.Points(this.geometry, this.material)
        this.scene.add(this.points)
    }
    setupMouse() {
        this.mouse = new THREE.Vector2()
        this.previousMouse = new THREE.Vector2()
        this.hoverState = 0
        this.targetHoverState = 0
        window.addEventListener('mousemove', (event) => {
            this.previousMouse.copy(this.mouse)
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
            this.mouse.y = - (event.clientY / window.innerHeight) * 2 + 1
        })
        window.addEventListener('click', () => {
            this.targetHoverState = 1 - this.targetHoverState
        })
        document.body.addEventListener('mouseenter', () => {
            this.targetHoverState = 1
        })
        document.body.addEventListener('mouseleave', () => {
            this.targetHoverState = 0
            this.mouse.x = 0
            this.mouse.y = 0
        })
        window.addEventListener('touchstart', (event) => {
            if (event.touches.length > 0) {
                event.preventDefault()
                this.targetHoverState = 1
                const touch = event.touches[0]
                this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1
                this.mouse.y = - (touch.clientY / window.innerHeight) * 2 + 1
                this.previousMouse.copy(this.mouse)
            }
        }, { passive: false })
        window.addEventListener('touchmove', (event) => {
            if (event.touches.length > 0) {
                event.preventDefault()
                const touch = event.touches[0]
                this.previousMouse.copy(this.mouse)
                this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1
                this.mouse.y = - (touch.clientY / window.innerHeight) * 2 + 1
            }
        }, { passive: false })
        window.addEventListener('touchend', () => {
            this.targetHoverState = 0
        })
    }
    update(elapsedTime) {
        if (!this.material) return
        this.material.uniforms.uSize.value = this.params.particleSize
        this.hoverState += (this.targetHoverState - this.hoverState) * this.params.transitionSpeed
        this.mouseDelta.x = this.mouse.x - this.previousMouse.x
        this.mouseDelta.y = this.mouse.y - this.previousMouse.y
        this.previousMouse.x += (this.mouse.x - this.previousMouse.x) * 0.1
        this.previousMouse.y += (this.mouse.y - this.previousMouse.y) * 0.1
        const currentDeltaX = (this.mouse.x - this.previousMouse.x)
        const currentDeltaY = (this.mouse.y - this.previousMouse.y)
        this.wobble.x += (currentDeltaX * 5.0 - this.wobble.x) * 0.1
        this.wobble.y += (currentDeltaY * 5.0 - this.wobble.y) * 0.1
        const positions = this.geometry.attributes.position.array
        const initialPositions = this.initialPositions
        const count = this.params.count
        for (let i = 0; i < count; i++) {
            const i3 = i * 3
            const time = Date.now() * 0.0001
            const isMobile = this.sizes.width < 768
            const spread = isMobile ? 25.0 : 50.0
            const flowZMultiplier = isMobile ? 1.1 : 1.9
            const flowX = (Math.sin(time + i) * (spread + Math.cos(time * 2.0 + i)))
            const flowY = (Math.cos(time + i) * (spread + Math.sin(time * 2.0 + i)))
            const flowZ = (Math.cos(time + i * flowZMultiplier) * (spread + Math.sin(time * 2.0 + i * flowZMultiplier)))
            const randomOffset = this.geometry.attributes.aRandom.array[i3]
            const noise = (randomOffset - 0.5) * this.params.sphereNoise
            const sphereRadius = this.params.sphereRadius + noise
            let theta = (initialPositions[i3] * 0.5) + elapsedTime * this.params.rotationSpeed
            let phi = Math.acos(2 * this.geometry.attributes.aRandom.array[i3] - 1)
            let sx = sphereRadius * Math.sin(phi) * Math.cos(theta)
            let sy = sphereRadius * Math.sin(phi) * Math.sin(theta)
            let sz = sphereRadius * Math.cos(phi)
            let tiltAngleZ = this.params.tiltZ
            let rotatedX = sx * Math.cos(tiltAngleZ) - sy * Math.sin(tiltAngleZ)
            let rotatedY = sx * Math.sin(tiltAngleZ) + sy * Math.cos(tiltAngleZ)
            let rotatedZ = sz
            let tiltAngleX = this.params.tiltX
            let finalX = rotatedX
            let finalY = rotatedY * Math.cos(tiltAngleX) - rotatedZ * Math.sin(tiltAngleX)
            let finalZ = rotatedY * Math.sin(tiltAngleX) + rotatedZ * Math.cos(tiltAngleX)
            const distance = 30
            const vFov = 75 * Math.PI / 180
            const height = 2 * Math.tan(vFov / 2) * distance
            const width = height * (window.innerWidth / window.innerHeight)
            const mouseXWorld = this.mouse.x * (width / 2)
            const mouseYWorld = this.mouse.y * (height / 2)
            const wobbleMagnitude = Math.sqrt(this.wobble.x * this.wobble.x + this.wobble.y * this.wobble.y)
            const chaosLevel = wobbleMagnitude * this.params.wobbleStrength * 0.1
            let dirX = 0
            let dirY = 0
            if (wobbleMagnitude > 0.001) {
                dirX = this.wobble.x / wobbleMagnitude
                dirY = this.wobble.y / wobbleMagnitude
            }
            const rX = (this.geometry.attributes.aRandom.array[i3] - 0.5) * 2
            const rY = (this.geometry.attributes.aRandom.array[i3 + 1] - 0.5) * 2
            const rZ = (this.geometry.attributes.aRandom.array[i3 + 2] - 0.5) * 2
            const chaosX = (rX - dirX * 2.0) * chaosLevel * width * 0.02
            const chaosY = (rY - dirY * 2.0) * chaosLevel * height * 0.02
            const chaosZ = rZ * chaosLevel * 10.0
            const sphereX = mouseXWorld + finalX + chaosX
            const sphereY = mouseYWorld + finalY + chaosY
            const sphereZ = finalZ + chaosZ
            positions[i3] = flowX * (1 - this.hoverState) + sphereX * this.hoverState
            positions[i3 + 1] = flowY * (1 - this.hoverState) + sphereY * this.hoverState
            positions[i3 + 2] = flowZ * (1 - this.hoverState) + sphereZ * this.hoverState
        }
        this.geometry.attributes.position.needsUpdate = true
    }
}
