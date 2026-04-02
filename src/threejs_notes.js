import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

//TEXTURES
let loader = new THREE.TextureLoader();
let color = loader.load('/texture/paper_0025_color_1k.jpg');
let roughness = loader.load('/texture/paper_0025_roughness_1k.jpg');
let normal = loader.load('/texture/paper_0025_normal_opengl_1k.png');
color.colorSpace = THREE.SRGBColorSpace;
// let roughness = loader.load('./texture/paper_0025_roughness_1k');

const geometry = new THREE.BoxGeometry( 3, 1.8, 2, 100, 100 );
const material = new THREE.MeshStandardMaterial( { map: color, roughnessMap: roughness, normalMap: normal } );
// const material = new THREE.MeshStandardMaterial( { color: 'red'} );
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );


camera.position.z = 5;
const canvas = document.querySelector('canvas');
const renderer = new THREE.WebGLRenderer({canvas});
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild( renderer.domElement );

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5,5,5);
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 1, 100);
pointLight.position.set(0, 5, 0);
scene.add(pointLight);

// LIGHT HELPERS (AmbientLight has no visual helper)
const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 1, 0x00ff00);
scene.add(directionalLightHelper);

const pointLightHelper = new THREE.PointLightHelper(pointLight, 0.4, 0x00ffff);
scene.add(pointLightHelper);

const controls = new OrbitControls( camera, renderer.domElement );
controls.enableDamping = true;


// making it responsive 
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  // note: whenever you change something regarding camera ALWAYS UPDATE PROJECTION MATRIX
  camera.updateProjectionMatrix();
})

function animate( time ) {
  controls.update();
  renderer.render( scene, camera );
  cube.rotation.x = time / 2000;
cube.rotation.y = time / 1000;
}
renderer.setAnimationLoop( animate );