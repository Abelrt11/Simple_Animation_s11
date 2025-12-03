import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Ammo from "ammojs-typed";
import * as TWEEN from "@tweenjs/tween.js";

// Globales
let scene, camera, renderer, controls;
let physicsWorld;
let rigidBodies = [];
let tmpTransform;
const clock = new THREE.Clock();

const gravityConstant = 9.8;
let objetos = [];

// Parámetros del muro
const brickLength = 1.2;
const brickDepth = 0.6;
const brickHeight = 0.6;
const brickMass = 0.8;

const numBricksLength = 6;
const numBricksHeight = 6;
const wallHeight = numBricksHeight * brickHeight;

const wallCenterX = 0;
const wallCenterZ = 0;

// Rampa
const rampLength = 16;
const rampWidth = 2;
const rampThickness = 0.3;
const rampMass = 5;
const rampHeight = wallHeight + rampThickness * 0.5 + 0.5;
let rampMesh;

// Animación de los cubos
let cubeAnim = {
  initialized: false,
  startX: 0,
  endX: 0,
  y: 0,
  z: 0,
  spacing: 1.0,
  virtualRadius: 0.4,
  time: 0,
  duration: 6,
};

// Boca del cañón
let cannonMuzzlePos = new THREE.Vector3();

// Inicialización Ammo
Ammo(Ammo).then(start);

function start() {
  initGraphics();
  initPhysics();
  createScene();
  createRollingCubes();
  scheduleCannonShots();
  animationLoop();
}

// Gráficos
function initGraphics() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.2,
    2000
  );
  camera.position.set(18, 10, 20);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(wallCenterX, rampHeight + 1, wallCenterZ);
  controls.update();

  const ambientLight = new THREE.AmbientLight(0x666666);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(-10, 20, 10);
  dirLight.castShadow = true;
  const d = 30;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 80;
  dirLight.shadow.mapSize.set(2048, 2048);
  scene.add(dirLight);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Física
function initPhysics() {
  const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
  const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
  const broadphase = new Ammo.btDbvtBroadphase();
  const solver = new Ammo.btSequentialImpulseConstraintSolver();

  physicsWorld = new Ammo.btDiscreteDynamicsWorld(
    dispatcher,
    broadphase,
    solver,
    collisionConfiguration
  );
  physicsWorld.setGravity(new Ammo.btVector3(0, -gravityConstant, 0));

  tmpTransform = new Ammo.btTransform();
}

function createRigidBody(mesh, shape, mass, pos, quat) {
  const transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
  transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));

  const motionState = new Ammo.btDefaultMotionState(transform);

  const localInertia = new Ammo.btVector3(0, 0, 0);
  if (mass > 0) {
    shape.calculateLocalInertia(mass, localInertia);
  }

  const rbInfo = new Ammo.btRigidBodyConstructionInfo(
    mass,
    motionState,
    shape,
    localInertia
  );
  const body = new Ammo.btRigidBody(rbInfo);

  mesh.userData.physicsBody = body;
  physicsWorld.addRigidBody(body);

  if (mass > 0) {
    rigidBodies.push(mesh);
    body.setActivationState(4);
  }

  return body;
}

// Escena: suelo, tierra, muro, rampa y cañón
function createScene() {
  createGround();
  createSideTerrain();
  createBrickWall();
  createRamp();
  createCubeCannon();
}

function createGround() {
  const groundSize = { x: 60, y: 1, z: 40 };

  const geom = new THREE.BoxGeometry(groundSize.x, groundSize.y, groundSize.z);
  const mat = new THREE.MeshPhongMaterial({ color: 0x228b22 });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.receiveShadow = true;
  mesh.position.set(0, -0.5, 0);
  scene.add(mesh);

  const shape = new Ammo.btBoxShape(
    new Ammo.btVector3(
      groundSize.x * 0.5,
      groundSize.y * 0.5,
      groundSize.z * 0.5
    )
  );
  shape.setMargin(0.05);

  const pos = mesh.position.clone();
  const quat = mesh.quaternion.clone();
  createRigidBody(mesh, shape, 0, pos, quat);
}

// Tierra a ambos lados del puente
function createSideTerrain() {
  const landThickness = 2;
  const landDepth = 12;
  const landWidth = 8;

  const rampTopY = rampHeight + rampThickness * 0.5;
  const centerY = rampTopY - landThickness / 2;

  const landGeom = new THREE.BoxGeometry(landWidth, landThickness, landDepth);
  const landMat = new THREE.MeshPhongMaterial({ color: 0x8b7765 });

  const startX = wallCenterX - rampLength * 0.5;
  const endX = wallCenterX + rampLength * 0.5;
  const z = wallCenterZ;

  const leftLand = new THREE.Mesh(landGeom, landMat);
  leftLand.castShadow = true;
  leftLand.receiveShadow = true;
  leftLand.position.set(startX - landWidth / 2, centerY, z);
  scene.add(leftLand);

  const rightLand = new THREE.Mesh(landGeom, landMat);
  rightLand.castShadow = true;
  rightLand.receiveShadow = true;
  rightLand.position.set(endX + landWidth / 2, centerY, z);
  scene.add(rightLand);
}

function createBrickWall() {
  const halfL = brickLength * 0.5;
  const halfD = brickDepth * 0.5;
  const halfH = brickHeight * 0.5;

  const brickGeometry = new THREE.BoxGeometry(
    brickLength,
    brickHeight,
    brickDepth
  );

  for (let y = 0; y < numBricksHeight; y++) {
    const verticalOffset = y * brickHeight;
    const rowOffset = y % 2 === 0 ? 0 : halfL;

    for (let x = 0; x < numBricksLength; x++) {
      const brick = new THREE.Mesh(
        brickGeometry,
        new THREE.MeshPhongMaterial({ color: 0xb22222 })
      );
      brick.castShadow = true;
      brick.receiveShadow = true;

      const xPos =
        wallCenterX +
        (x * brickLength - (numBricksLength - 1) * halfL) +
        rowOffset;
      const yPos = halfH + verticalOffset;
      const zPos = wallCenterZ;

      brick.position.set(xPos, yPos, zPos);
      scene.add(brick);

      const shape = new Ammo.btBoxShape(
        new Ammo.btVector3(halfL, halfH, halfD)
      );
      shape.setMargin(0.05);

      const pos = brick.position.clone();
      const quat = brick.quaternion.clone();

      createRigidBody(brick, shape, brickMass, pos, quat);
    }
  }
}

function createRamp() {
  const geom = new THREE.BoxGeometry(rampLength, rampThickness, rampWidth);
  const mat = new THREE.MeshPhongMaterial({ color: 0x8b4513 });

  rampMesh = new THREE.Mesh(geom, mat);
  rampMesh.castShadow = true;
  rampMesh.receiveShadow = true;

  rampMesh.position.set(wallCenterX, rampHeight, wallCenterZ);
  scene.add(rampMesh);

  const shape = new Ammo.btBoxShape(
    new Ammo.btVector3(rampLength * 0.5, rampThickness * 0.5, rampWidth * 0.5)
  );
  shape.setMargin(0.05);

  const pos = rampMesh.position.clone();
  const quat = rampMesh.quaternion.clone();

  createRigidBody(rampMesh, shape, rampMass, pos, quat);
}

// Cañón de bolas rojas
function createCubeCannon() {
  const muzzleZ = wallCenterZ - 15;
  const muzzleX = wallCenterX;
  const muzzleY = rampHeight + 0.5;

  const baseGeom = new THREE.BoxGeometry(4.0, 1.0, 4.0);
  const baseMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
  const baseMesh = new THREE.Mesh(baseGeom, baseMat);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  baseMesh.position.set(muzzleX, muzzleY - 1.0, muzzleZ - 2.0);
  scene.add(baseMesh);

  const barrelLength = 6;
  const barrelGeom = new THREE.CylinderGeometry(0.3, 0.3, barrelLength, 16);
  const barrelMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
  const barrelMesh = new THREE.Mesh(barrelGeom, barrelMat);
  barrelMesh.castShadow = true;
  barrelMesh.receiveShadow = true;
  barrelMesh.rotation.x = Math.PI / 2;
  const barrelCenterZ = muzzleZ - barrelLength / 2;
  barrelMesh.position.set(muzzleX, muzzleY, barrelCenterZ);
  scene.add(barrelMesh);

  const ringGeom = new THREE.TorusGeometry(0.35, 0.08, 8, 16);
  const ringMat = new THREE.MeshPhongMaterial({ color: 0xff0000 });
  const ringMesh = new THREE.Mesh(ringGeom, ringMat);
  ringMesh.castShadow = true;
  ringMesh.receiveShadow = true;
  ringMesh.rotation.set(0, 0, 0);
  ringMesh.position.set(muzzleX, muzzleY, muzzleZ);
  scene.add(ringMesh);

  cannonMuzzlePos.set(muzzleX, muzzleY, muzzleZ);
}

// Creador de cubos
function Cubo(px, py, pz, sx, sy, sz) {
  const geometry = new THREE.BoxGeometry(sx, sy, sz);
  const material = new THREE.MeshNormalMaterial();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(px, py, pz);
  scene.add(mesh);
  objetos.push(mesh);
}

// Cubos rodando desde tierra izquierda a tierra derecha
function createRollingCubes() {
  objetos = [];

  const cubeSize = 0.8;
  const spacing = 1.0;

  const y = rampHeight + rampThickness * 0.5 + cubeSize * 0.5;
  const z = wallCenterZ;

  const landWidth = 8;
  const startXBridge = wallCenterX - rampLength * 0.5;
  const endXBridge = wallCenterX + rampLength * 0.5;

  const leftLandCenterX = startXBridge - landWidth / 2;
  const rightLandCenterX = endXBridge + landWidth / 2;

  const startX = leftLandCenterX;
  const endX = rightLandCenterX;

  Cubo(startX - 1.5 * spacing, y, z, cubeSize, cubeSize, cubeSize);
  Cubo(startX - 0.5 * spacing, y, z, cubeSize, cubeSize, cubeSize);
  Cubo(startX + 0.5 * spacing, y, z, cubeSize, cubeSize, cubeSize);
  Cubo(startX + 1.5 * spacing, y, z, cubeSize, cubeSize, cubeSize);

  cubeAnim.initialized = true;
  cubeAnim.startX = startX;
  cubeAnim.endX = endX;
  cubeAnim.y = y;
  cubeAnim.z = z;
  cubeAnim.spacing = spacing;
  cubeAnim.virtualRadius = cubeSize * 0.5;
  cubeAnim.time = 0;
  cubeAnim.duration = 6;
}

// Disparos del cañón
function scheduleCannonShots() {
  setTimeout(() => shootFromCannon(0), 4000);
  setTimeout(() => shootFromCannon(0.5), 6500);
  setTimeout(() => shootFromCannon(-0.5), 9000);
}

function shootFromCannon(spreadX) {
  if (!cannonMuzzlePos) return;

  const radius = 0.5;
  const geo = new THREE.SphereGeometry(radius, 24, 24);
  const mat = new THREE.MeshPhongMaterial({ color: 0xff0000 });

  const ballMesh = new THREE.Mesh(geo, mat);
  ballMesh.castShadow = true;
  ballMesh.receiveShadow = true;

  ballMesh.position.set(
    cannonMuzzlePos.x + spreadX,
    cannonMuzzlePos.y,
    cannonMuzzlePos.z
  );
  scene.add(ballMesh);

  const shape = new Ammo.btSphereShape(radius);
  shape.setMargin(0.05);

  const pos = ballMesh.position.clone();
  const quat = new THREE.Quaternion(0, 0, 0, 1);
  const mass = 3;

  const body = createRigidBody(ballMesh, shape, mass, pos, quat);

  body.setLinearVelocity(new Ammo.btVector3(spreadX * 3, 0, 20));
}

// Bucle de animación principal
function animationLoop() {
  requestAnimationFrame(animationLoop);

  const deltaTime = clock.getDelta();

  updatePhysics(deltaTime);
  TWEEN.update();
  updateCubeAnimation(deltaTime);

  camera.lookAt(new THREE.Vector3(wallCenterX, rampHeight + 1, wallCenterZ));
  renderer.render(scene, camera);
}

function updatePhysics(deltaTime) {
  if (!physicsWorld) return;

  physicsWorld.stepSimulation(deltaTime, 10);

  for (let i = 0; i < rigidBodies.length; i++) {
    const objThree = rigidBodies[i];
    const body = objThree.userData.physicsBody;
    const motionState = body.getMotionState();
    if (motionState) {
      motionState.getWorldTransform(tmpTransform);
      const p = tmpTransform.getOrigin();
      const q = tmpTransform.getRotation();
      objThree.position.set(p.x(), p.y(), p.z());
      objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
    }
  }
}

// Actualización de la animación de los cubos
function updateCubeAnimation(deltaTime) {
  if (!cubeAnim.initialized || objetos.length === 0) return;

  cubeAnim.time += deltaTime;

  let tNorm = cubeAnim.time / cubeAnim.duration;
  if (tNorm > 1) tNorm = 1;

  const distanceTotal = cubeAnim.endX - cubeAnim.startX;
  const distance = distanceTotal * tNorm;
  const currentX = cubeAnim.startX + distance;

  const angle = distance / cubeAnim.virtualRadius;

  let id = 0;
  for (let obj of objetos) {
    const offset = (id - 1.5) * cubeAnim.spacing;
    obj.position.x = currentX + offset;
    obj.position.y = cubeAnim.y;
    obj.position.z = cubeAnim.z;

    obj.rotation.z = -angle;

    id++;
  }
}
