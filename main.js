
// === Juego 3D básico con personaje controlable ===
let model, mixer, actions = {}, activeAction;
const keys = {};
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let camera, scene, renderer, clock;
let jumping = false, jumpVelocity = 0;

// Escena
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // HUD
    const hud = document.createElement('div');
    hud.innerHTML = 'WASD para moverse | ESPACIO para saltar | R para reiniciar';
    hud.style = 'position:absolute;top:10px;left:10px;color:white;font-size:18px;z-index:1;';
    document.body.appendChild(hud);

    addLights();
    addGround();
    loadModel();
    setupControls();

    clock = new THREE.Clock();
    animate();
}

function addLights() {
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0x404040, 3));
    scene.add(new THREE.HemisphereLight(0xffffbb, 0x080820, 1));
}

function addGround() {
    const geo = new THREE.PlaneGeometry(50, 50);
    const mat = new THREE.MeshStandardMaterial({ color: 0x2c3e50 });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
}

function loadModel() {
    const loader = new THREE.GLTFLoader();
    loader.load('models/personaje001.gltf', (gltf) => {
        model = gltf.scene;
        model.position.set(0, 1, 0);
        model.scale.set(0.8, 0.8, 0.8);
        model.traverse(o => { if (o.isMesh) o.castShadow = true; });
        scene.add(model);

        mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach((clip, i) => {
            const name = i === 0 ? 'idle' : 'walk';
            actions[name] = mixer.clipAction(clip);
        });
        setAction('idle');
    });
}

function setAction(name) {
    if (activeAction !== actions[name]) {
        if (activeAction) activeAction.fadeOut(0.3);
        activeAction = actions[name];
        if (activeAction) {
            activeAction.reset().fadeIn(0.3).play();
        }
    }
}

function setupControls() {
    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'KeyR' && model) model.position.set(0, 1, 0);
        if (e.code === 'Space' && !jumping) {
            jumping = true;
            jumpVelocity = 0.15;
        }
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });
    window.addEventListener('resize', () => {
        const w = window.innerWidth, h = window.innerHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    });
}

const camTarget = new THREE.Vector3();
function updateCamera() {
    if (!model) return;
    const offset = new THREE.Vector3(0, 3, 5).applyQuaternion(model.quaternion);
    camTarget.copy(model.position).add(offset);
    camera.position.lerp(camTarget, 0.1);
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

        if (direction.lengthSq() > 0) {
            direction.normalize();
            velocity.copy(direction.multiplyScalar(speed));
            model.rotation.y = Math.atan2(velocity.x, velocity.z);
            model.position.x += velocity.x;
            model.position.z += velocity.z;
            setAction('walk');
        } else {
            setAction('idle');
        }

        // Salto y gravedad
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
