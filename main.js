
// === Juego 3D con personaje y laberinto funcional ===
let model, mixer, actionIdle, actionWalk;
const keys = {};
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let camera, scene, renderer, clock;
let jumping = false, jumpVelocity = 0;
let laberintoModel;

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    const hud = document.createElement('div');
    hud.innerHTML = 'WASD o Flechas | Espacio: Saltar | R: Reiniciar';
    hud.style = 'position:absolute;top:10px;left:10px;color:white;font-size:18px;z-index:1;';
    document.body.appendChild(hud);

    addLights();
    createGround();
    loadAssets();
    setupControls();
    clock = new THREE.Clock();
    animate();
}

function addLights() {
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(5, 10, 7);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    scene.add(dir);
    scene.add(new THREE.AmbientLight(0x404040, 3));
    scene.add(new THREE.HemisphereLight(0xffffbb, 0x080820, 1));
}

function createGround() {
    const g = new THREE.PlaneGeometry(50, 50);
    const m = new THREE.MeshStandardMaterial({ color: 0x2c3e50 });
    const ground = new THREE.Mesh(g, m);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    scene.add(ground);
}

function loadAssets() {
    const loader = new THREE.GLTFLoader();

    loader.load('models/laberinto003.gltf', gltf => {
        laberintoModel = gltf.scene;
        scene.add(laberintoModel);
    }, undefined, () => createBackupMaze());

    loader.load('models/personaje001.gltf', gltf => {
        model = gltf.scene;
        model.position.set(0, 1, 0);
        model.scale.set(0.8, 0.8, 0.8);
        model.traverse(o => { if (o.isMesh) o.castShadow = true; });
        scene.add(model);

        mixer = new THREE.AnimationMixer(model);
        if (gltf.animations.length > 1) {
            actionIdle = mixer.clipAction(gltf.animations[0]);
            actionWalk = mixer.clipAction(gltf.animations[1]);
            actionIdle.play();
        }
    }, undefined, () => createCubeCharacter());
}

function createCubeCharacter() {
    const geo = new THREE.BoxGeometry(1, 2, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0xe74c3c });
    model = new THREE.Mesh(geo, mat);
    model.position.set(0, 1, 0);
    scene.add(model);
}

function createBackupMaze() {
    const maze = new THREE.Group();
    const wallGeo = new THREE.BoxGeometry(20, 3, 1);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3498db });

    const wallNorth = new THREE.Mesh(wallGeo, wallMat);
    wallNorth.position.z = -10; maze.add(wallNorth);

    const wallSouth = new THREE.Mesh(wallGeo, wallMat);
    wallSouth.position.z = 10; maze.add(wallSouth);

    const wallEast = new THREE.Mesh(wallGeo, wallMat);
    wallEast.rotation.y = Math.PI / 2;
    wallEast.position.x = 10; maze.add(wallEast);

    const wallWest = new THREE.Mesh(wallGeo, wallMat);
    wallWest.rotation.y = Math.PI / 2;
    wallWest.position.x = -10; maze.add(wallWest);

    const innerWall = new THREE.Mesh(wallGeo, wallMat);
    innerWall.position.set(5, 1.5, 0);
    innerWall.scale.set(0.5, 1, 1);
    maze.add(innerWall);

    scene.add(maze);
}

function setupControls() {
    window.addEventListener('keydown', e => {
        keys[e.code] = true;
        if (e.code === 'KeyR' && model) model.position.set(0, 1, 0);
        if (e.code === 'Space' && !jumping) {
            jumping = true;
            jumpVelocity = 0.15;
        }
    });
    window.addEventListener('keyup', e => keys[e.code] = false);
    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });
}

const camOffset = new THREE.Vector3();
function updateCamera() {
    if (!model) return;
    camOffset.set(0, 3, 5).applyQuaternion(model.quaternion);
    const targetPos = model.position.clone().add(camOffset);
    camera.position.lerp(targetPos, 0.1);
    camera.lookAt(model.position.x, model.position.y + 1.5, model.position.z);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);
    if (mixer) mixer.update(delta);

    if (model) {
        direction.set(0, 0, 0);
        const speed = 5 * delta;
        if (keys['KeyW'] || keys['ArrowUp']) direction.z -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) direction.z += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) direction.x -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) direction.x += 1;

        const moving = direction.lengthSq() > 0;
        if (moving) {
            direction.normalize();
            velocity.copy(direction.multiplyScalar(speed));
            model.rotation.y = Math.atan2(velocity.x, velocity.z);
            model.position.x += velocity.x;
            model.position.z += velocity.z;
            if (actionWalk && !actionWalk.isRunning()) {
                actionIdle?.stop();
                actionWalk.play();
            }
        } else {
            if (actionWalk && actionWalk.isRunning()) {
                actionWalk.stop();
                actionIdle?.play();
            }
        }

        if (jumping) {
            model.position.y += jumpVelocity;
            jumpVelocity -= 0.01;
            if (model.position.y <= 0.5) {
                model.position.y = 0.5;
                jumping = false;
            }
        }
    }

    updateCamera();
    renderer.render(scene, camera);
}

init();
