let model, mixer, action;
let colliderBox; // Cubo invisible que representa la colisión del personaje
let mazeColliders = [];
let camera, scene, renderer;
const keys = {};
const clock = new THREE.Clock();

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

    addLights();
    createGround();
    createColliderBox();
    loadAssets();
}

function addLights() {
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    scene.add(dirLight);

    scene.add(new THREE.AmbientLight(0x404040, 3));
    scene.add(new THREE.HemisphereLight(0xffffbb, 0x080820, 1));
}

function createGround() {
    const geometry = new THREE.PlaneGeometry(50, 50);
    const material = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.9 });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
}

function createColliderBox() {
    const geometry = new THREE.BoxGeometry(1, 2, 1); // Tamaño del personaje
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, visible: false });
    colliderBox = new THREE.Mesh(geometry, material);
    colliderBox.position.set(0, 1, -5); // Altura y posición inicial
    scene.add(colliderBox);
}

function loadAssets() {
    const loader = new THREE.GLTFLoader();

    loader.load('models/laberinto003.gltf', (gltf) => {
        const laberintoModel = gltf.scene;
        laberintoModel.scale.set(2, 2, 2);
        scene.add(laberintoModel);

        laberintoModel.updateMatrixWorld(true);

        mazeColliders = [];

        laberintoModel.traverse((child) => {
            if (child.isMesh && child.geometry) {
                child.updateMatrixWorld(true);
                child.geometry.computeBoundingBox();
                const box = child.geometry.boundingBox.clone().applyMatrix4(child.matrixWorld);
                mazeColliders.push(box);

                // Visual debug
                const helper = new THREE.Box3Helper(box, 0xff0000);
                scene.add(helper);
            }
        });
    });

    loader.load('models/personaje001.gltf', (gltf) => {
        model = gltf.scene;
        model.scale.set(0.8, 0.8, 0.8);
        model.position.copy(colliderBox.position);
        scene.add(model);

        mixer = new THREE.AnimationMixer(model);
        if (gltf.animations.length > 0) {
            action = mixer.clipAction(gltf.animations[0]);
            action.stop();
        }
    });

    setupControls();
}

function setupControls() {
    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'KeyR') colliderBox.position.set(0, 1, -5);
    });
    window.addEventListener('keyup', (e) => keys[e.code] = false);

    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });
}

function checkCollision(newPos) {
    const tempBox = new THREE.Box3().setFromObject(colliderBox);
    const delta = newPos.clone().sub(colliderBox.position);
    tempBox.translate(delta);

    for (const box of mazeColliders) {
        if (box.intersectsBox(tempBox)) {
            console.log("🚫 Colisión con muro");
            return true;
        }
    }
    return false;
}

function updateCamera() {
    if (!colliderBox) return;
    const offset = new THREE.Vector3(0, 1.5, -3).applyQuaternion(colliderBox.quaternion);
    const target = colliderBox.position.clone().add(offset);
    camera.position.lerp(target, 0.1);
    camera.lookAt(colliderBox.position.x, colliderBox.position.y + 1.2, colliderBox.position.z);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    if (colliderBox) {
        const forward = keys['KeyW'] || keys['ArrowUp'];
        const left = keys['KeyA'] || keys['ArrowLeft'];
        const right = keys['KeyD'] || keys['ArrowRight'];
        const speed = 1.2 * delta;
        const turnSpeed = 2.5 * delta;

        if (left) colliderBox.rotation.y += turnSpeed;
        if (right) colliderBox.rotation.y -= turnSpeed;

        if (forward) {
            const dir = new THREE.Vector3(0, 0, 1).applyEuler(colliderBox.rotation);
            const newPos = colliderBox.position.clone().add(dir.multiplyScalar(speed));
            if (!checkCollision(newPos)) {
                colliderBox.position.copy(newPos);
            }
        }

        // Mueve el modelo visible al mismo lugar que el collider
        if (model) {
            model.position.copy(colliderBox.position);
            model.rotation.copy(colliderBox.rotation);

            if ((forward || left || right) && action && !action.isRunning()) action.play();
            if (!forward && !left && !right && action && action.isRunning()) action.stop();
        }
    }

    if (mixer) mixer.update(delta);
    updateCamera();
    renderer.render(scene, camera);
}

init();
animate();
