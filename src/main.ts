import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as Models from './models';

// Z up
THREE.Object3D.DEFAULT_UP = new THREE.Vector3(0, 0, 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff));

const light = new THREE.DirectionalLight(0xffffff, 1.5);
light.position.set(3, 3, 3);
scene.add(light);

const material = new THREE.MeshLambertMaterial({ color: 0xff00ff });

const axesHelper = new THREE.AxesHelper(1);
scene.add(axesHelper);

camera.position.set(-3, -5, 5);

function animate() {
  requestAnimationFrame(animate);

  controls.update();

  renderer.render(scene, camera);
}

animate();

//
// Input
//

const shedInput: Models.ShedInput = {
  user: {
    span: 6000,
    length: 8000,
    sideBays: 2,
    height: 3000,
    pitch: 22
  },
  calc: {
    column: Models.createC("C15024", 152, 64, 15.5, 2.4),
    sideGirt: Models.createTH("TH64", 64, 100, 1),
  }
}

//
// Output
//
const shedBim = Models.createShedBim(shedInput);
console.log(shedBim);

//
// Model
//

const allColumns = [...shedBim.columnsLeft, ...shedBim.columnsRight];

for (const column of allColumns) {
  const shape = Models.createShape(column.mat);
  const settings = {
    depth: column.line.distance() / 1000,
    bevelEnabled: false,
  };
  const geometry = new THREE.ExtrudeGeometry(shape, settings);
  const mesh = new THREE.Mesh(geometry, material);

  let mat4 = new THREE.Matrix4();
  mat4.setPosition(column.line.start.clone().divideScalar(1000));
  mat4.multiply(column.trans);

  mesh.applyMatrix4(mat4);

  scene.add(mesh);
}