import Particles from './Particles.js'
export default class World {
    constructor(scene, camera, renderer) {
        this.scene = scene
        this.camera = camera
        this.renderer = renderer
        this.particles = new Particles(this.scene)
    }
    update(elapsedTime, deltaTime) {
        if (this.particles) {
            this.particles.update(elapsedTime)
        }
    }
}
