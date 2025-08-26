let camera, scene, renderer;
const keys = {};
const clock = new THREE.Clock();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5); // posición inicial de la cámara

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    addLights();
    loadAssets();
    setupControls();
}

function addLights() {
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    scene.add(dirLight);

    scene.add(new THREE.AmbientLight(0x404040, 3));
    scene.add(new THREE.HemisphereLight(0xffffbb, 0x080820, 1));
}

function loadAssets() {
    const loader = new THREE.GLTFLoader();
    loader.load('models/laberinto003.gltf', (gltf) => {
        const laberintoModel = gltf.scene;
        laberintoModel.scale.set(2, 2, 2);
        laberintoModel.position.y = 0.05; // elevar un poquito para evitar conflicto con el suelo
        scene.add(laberintoModel);
    });
}

function setupControls() {
    window.addEventListener('keydown', (e) => keys[e.code] = true);
    window.addEventListener('keyup', (e) => keys[e.code] = false);

    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });
}

function moveCamera(delta) {
    const speed = 2 * delta; // velocidad de movimiento
    const turnSpeed = 1.5 * delta; // velocidad de rotación

    // Rotar cámara con flechas izquierda/derecha
    if (keys['ArrowLeft']) camera.rotation.y += turnSpeed;
    if (keys['ArrowRight']) camera.rotation.y -= turnSpeed;

    // Dirección hacia adelante (según orientación actual)
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0; // mantener en el plano horizontal
    forward.normalize();

    if (keys['KeyW'] || keys['ArrowUp']) camera.position.add(forward.multiplyScalar(speed));
    if (keys['KeyS'] || keys['ArrowDown']) camera.position.add(forward.multiplyScalar(-speed));

    // Movimiento lateral (strafe)
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

    if (keys['KeyA']) camera.position.add(right.multiplyScalar(-speed));
    if (keys['KeyD']) camera.position.add(right.multiplyScalar(speed));
}

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    moveCamera(delta);

    renderer.render(scene, camera);
}

init();
animate();
