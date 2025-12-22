import './style.css'
import './firebase.js'
import * as THREE from 'three'
import World from './Experience/World.js'
const canvasContainer = document.querySelector('#canvas-container')
const scene = new THREE.Scene()
scene.fog = new THREE.Fog('#101010', 10, 50)
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.z = 30
const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
canvasContainer.appendChild(renderer.domElement)
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})
const world = new World(scene, camera, renderer)
const clock = new THREE.Clock()
const tick = () => {
  const elapsedTime = clock.getElapsedTime()
  const deltaTime = clock.getDelta()
  world.update(elapsedTime, deltaTime)
  renderer.render(scene, camera)
  window.requestAnimationFrame(tick)
}
tick()
