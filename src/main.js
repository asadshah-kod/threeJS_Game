import * as THREE from "three";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const loader = new GLTFLoader();
let model = null;
let carHalfWidth = 80;
let carHalfDepth = 120;
let currentLane = 1;
let targetLane = 1;
let laneSpacing = 360;
let laneCenters = [-laneSpacing, 0, laneSpacing];
const obstacleHalfWidth = 100; // Box width is 200
const obstacleHalfDepth = 250; // Box depth is 500

const recalcLanes = () => {
  // Keep enough horizontal spacing between car and obstacle widths
  laneSpacing = Math.max(300, obstacleHalfWidth + carHalfWidth + 80);
  laneCenters = [-laneSpacing, 0, laneSpacing];
};

loader.load( '/model/old_rusty_car.glb', function ( gltf ) {
  model = gltf.scene;
  model.position.set(0, -2.5, 0);

  const carBounds = new THREE.Box3().setFromObject(model);
  const carSize = new THREE.Vector3();
  carBounds.getSize(carSize);
  carHalfWidth = THREE.MathUtils.clamp(carSize.x * 0.45, 40, 160);
  carHalfDepth = THREE.MathUtils.clamp(carSize.z * 0.45, 60, 220);
  recalcLanes();

  scene.add( model );

}, undefined, function ( error ) {

  console.error( error );

} );

// Lighting
// const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
// directionalLight.position.set(5, 5, 5);
// scene.add(directionalLight);

// const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
// scene.add(ambientLight);

// camera.position.z = 1000;
const canvas = document.querySelector('canvas');
const renderer = new THREE.WebGLRenderer({canvas, antialias: true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
document.body.appendChild( renderer.domElement );

const textureLoader = new THREE.TextureLoader();
const backgroundTexture = textureLoader.load(
  '/asphault.webp',
  (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.background = texture;
  },
  undefined,
  (error) => console.error('Background texture failed to load:', error)
);

// Add ground plane
const groundGeometry = new THREE.PlaneGeometry(200, 200);
const groundMaterial = new THREE.MeshStandardMaterial({ 
  map: backgroundTexture,
  roughness: 0.8,
  metalness: 0.2
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -3;
scene.add(ground);

const pmremGenerator = new THREE.PMREMGenerator( renderer );
pmremGenerator.compileEquirectangularShader();

const hdriLoader = new RGBELoader()
hdriLoader.load( '/derelict_airfield_01_1k.hdr', function ( texture ) {
  const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
  scene.environment = envMap;
  texture.dispose();
  pmremGenerator.dispose();
} );

let textLoader = new THREE.TextureLoader();
let color = textLoader.load('/texture/paper_0025_color_1k.jpg');
let roughness = textLoader.load('/texture/paper_0025_roughness_1k.jpg');
let normal = textLoader.load('/texture/paper_0025_normal_opengl_1k.png');
color.colorSpace = THREE.SRGBColorSpace;

const geometry = new THREE.BoxGeometry( 200, 100, 500, 100, 100 );
const material = new THREE.MeshStandardMaterial( { map: color, roughnessMap: roughness, normalMap: normal } );
const obstacles = [];
const spawnZ = -2600;
const despawnZ = 1200;
const baseObstacleSpeed = 900;
let obstacleSpeed = baseObstacleSpeed;

for (let i = 0; i < 3; i++) {
  const obstacle = new THREE.Mesh(geometry, material);
  obstacle.visible = false;
  obstacle.userData.active = false;
  obstacle.userData.lane = 1;
  obstacles.push(obstacle);
  scene.add(obstacle);
}

const spawnWave = () => {
  const inactive = obstacles.filter((o) => !o.userData.active);
  if (inactive.length === 0) return;

  // Max 2 active obstacles at a time
  const activeCount = obstacles.length - inactive.length;
  if (activeCount >= 2) return;

  const spawnCount = Math.min(2 - activeCount, 1 + Math.floor(Math.random() * 2), inactive.length);
  const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);

  for (let i = 0; i < spawnCount; i++) {
    const obstacle = inactive[i];
    const lane = lanes[i];
    obstacle.position.set(laneCenters[lane], 50, spawnZ);
    obstacle.userData.active = true;
    obstacle.userData.lane = lane;
    obstacle.visible = true;
  }
};


camera.position.set(0, 500, 1100);

// const canvas = document.querySelector('canvas');
// const renderer = new THREE.WebGLRenderer({canvas});
// renderer.setSize( window.innerWidth, window.innerHeight );
// document.body.appendChild( renderer.domElement );

const clock = new THREE.Clock();
let spawnTimer = 0;
const initialSpawnInterval = 1.2;
let gameOver = false;
let gameTime = 0;
let score = 0;

const hud = document.createElement('div');
hud.style.position = 'fixed';
hud.style.top = '14px';
hud.style.left = '14px';
hud.style.color = '#ffffff';
hud.style.fontFamily = 'Arial, sans-serif';
hud.style.fontSize = '18px';
hud.style.fontWeight = '700';
hud.style.textShadow = '0 2px 6px rgba(0,0,0,0.9)';
hud.style.zIndex = '10';
document.body.appendChild(hud);

const updateHud = () => {
  hud.textContent = gameOver ? `Score: ${score} | GAME OVER (Press R to restart)` : `Score: ${score}`;
};

const resetGame = () => {
  gameOver = false;
  gameTime = 0;
  score = 0;
  obstacleSpeed = baseObstacleSpeed;
  spawnTimer = 0;
  currentLane = 1;
  targetLane = 1;

  for (const obstacle of obstacles) {
    obstacle.visible = false;
    obstacle.userData.active = false;
    obstacle.position.set(0, 50, spawnZ);
  }

  if (model) {
    model.position.x = laneCenters[1];
  }

  // Spawn immediately when game starts/restarts
  spawnWave();
  updateHud();
};

updateHud();

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') {
    targetLane = Math.max(0, targetLane - 1);
  } else if (event.key === 'ArrowRight') {
    targetLane = Math.min(2, targetLane + 1);
  } else if ((event.key === 'r' || event.key === 'R') && gameOver) {
    resetGame();
  }
});

function animate() {
  requestAnimationFrame( animate );

  const delta = clock.getDelta();

  if (model) {
    model.rotation.y = Math.PI;

    const targetX = laneCenters[targetLane];
    const laneMoveSpeed = 700;
    const dx = targetX - model.position.x;
    const step = laneMoveSpeed * delta;
    if (Math.abs(dx) <= step) {
      model.position.x = targetX;
      currentLane = targetLane;
    } else {
      model.position.x += Math.sign(dx) * step;
    }

    if (!gameOver) {
      gameTime += delta;
      obstacleSpeed = Math.min(baseObstacleSpeed + gameTime * 45, 1800);
      spawnTimer += delta;

      const spawnInterval = Math.max(0.45, initialSpawnInterval - gameTime * 0.02);
      const activeCount = obstacles.filter((o) => o.userData.active).length;
      if (spawnTimer >= spawnInterval && activeCount < 2) {
        spawnWave();
        spawnTimer = 0;
      }

      for (const obstacle of obstacles) {
        if (!obstacle.userData.active) continue;

        obstacle.position.z += obstacleSpeed * delta;

        if (obstacle.position.z > despawnZ) {
          obstacle.userData.active = false;
          obstacle.visible = false;
          score += 1;
          updateHud();
          continue;
        }

        const dx = Math.abs(obstacle.position.x - model.position.x);
        const dz = Math.abs(obstacle.position.z - model.position.z);
        const overlapX = dx < (obstacleHalfWidth + carHalfWidth);
        const overlapZ = dz < (obstacleHalfDepth + carHalfDepth);

        if (overlapX && overlapZ) {
          gameOver = true;
          console.log('Collision detected');
          updateHud();
        }
      }
    }
  }

  renderer.render( scene, camera );
}
animate();
resetGame();

// making it responsive
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  camera.aspect = window.innerWidth / window.innerHeight;
  // note: whenever you change something regarding camera ALWAYS UPDATE PROJECTION MATRIX
  camera.updateProjectionMatrix();
})
