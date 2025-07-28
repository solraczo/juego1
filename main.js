let model, mixer, action;
const keys = {};
let laberintoModel;
let mazeColliders = [];
let camera, scene, renderer;
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

function loadAssets() {
    const loader = new THREE.GLTFLoader();

    // Laberinto
    loader.load('models/laberinto003.gltf', (gltf) => {
        laberintoModel = gltf.scene;
        laberintoModel.scale.set(2, 2, 2);
        scene.add(laberintoModel);

        // Asegura que todas las matrices estén correctas
        laberintoModel.updateMatrixWorld(true);

        mazeColliders = [];

        laberintoModel.traverse((child) => {
            if (child.isMesh && child.geometry) {
                child.updateMatrixWorld(true); // CRUCIAL
                child.geometry.computeBoundingBox();

                const box = child.geometry.boundingBox.clone();
                box.applyMatrix4(child.matrixWorld);
                mazeColliders.push(box);

                // Visualizar colisiones
                const helper = new THREE.Box3Helper(box, 0xff0000);
                scene.add(helper);
            }
        });
    });

    // Personaje
    loader.load('models/personaje001.gltf', (gltf) => {
        model = gltf.scene;
        model.scale.set(0.8, 0.8, 0.8);
        model.position.set(0, 0, -5);
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
        if (e.code === 'KeyR' && model) model.position.set(0, 0, 0);
    });
    window.addEventListener('keyup', (e) => keys[e.code] = false);

    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });
}

function checkCollision(newPos) {
    if (!model) return false;

    const tempBox = new THREE.Box3().setFromObject(model);
    const delta = newPos.clone().sub(model.position);
    tempBox.translate(delta);

    for (const box of mazeColliders) {
        if (box.intersectsBox(tempBox)) {
            console.log("Colisión detectada");
            return true;
        }
    }
    return false;
}

function updateCamera() {
    if (!model) return;
    const offset = new THREE.Vector3(0, 1.5, -3).applyQuaternion(model.quaternion);
    const target = model.position.clone().add(offset);
    camera.position.lerp(target, 0.1);
    camera.lookAt(model.position.x, model.position.y + 1.2, model.position.z);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    if (model) {
        const forward = keys['KeyW'] || keys['ArrowUp'];
        const left = keys['KeyA'] || keys['ArrowLeft'];
        const right = keys['KeyD'] || keys['ArrowRight'];
        const speed = 1.2 * delta;
        const turnSpeed = 2.5 * delta;

        if (left) model.rotation.y += turnSpeed;
        if (right) model.rotation.y -= turnSpeed;

        if (forward) {
            const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(model.quaternion);
            const newPos = model.position.clone().add(dir.multiplyScalar(speed));
            if (!checkCollision(newPos)) {
                model.position.copy(newPos);
                model.position.y = 0;
            }
        }

        if ((forward || left || right) && action && !action.isRunning()) action.play();
        if (!forward && !left && !right && action && action.isRunning()) action.stop();
    }

    if (mixer) mixer.update(delta);
    updateCamera();
    renderer.render(scene, camera);
}

init();
animate();
