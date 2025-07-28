// Variables globales
let model, mixer, action;
const keys = {};
const velocity = new THREE.Vector3();
let moveVelocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let laberintoModel;
let mazeColliders = [];
let camera, scene, renderer;
let isOnGround = false;
const clock = new THREE.Clock();

// Inicialización
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

    addBasicLights();
    createTempGround();
    loadAssets();
}

function addBasicLights() {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0x404040, 3);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
    scene.add(hemisphereLight);
}

function createTempGround() {
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x2c3e50,
        roughness: 0.9,
        metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);
}

function loadAssets() {
    const loader = new THREE.GLTFLoader();

    // Laberinto
    loader.load('models/laberinto003.gltf', function (gltf) {
        laberintoModel = gltf.scene;
        laberintoModel.scale.set(2, 2, 2);
        scene.add(laberintoModel);
        updateLoadingStatus('Laberinto cargado');

        // Generar bounding boxes para colisiones
        laberintoModel.traverse((child) => {
            if (child.isMesh) {
                child.geometry.computeBoundingBox();
                const box = child.geometry.boundingBox.clone();
                box.applyMatrix4(child.matrixWorld);
                mazeColliders.push(box);
            }
        });

    }, undefined, function (error) {
        console.error('Error cargando laberinto:', error);
        updateLoadingStatus('Error con laberinto. Usando alternativa');
        createBackupMaze();
    });

    // Personaje
    loader.load('models/personaje001.gltf', function (gltf) {
        model = gltf.scene;
        if (!model) throw new Error('Modelo no definido');

        scene.add(model);
        model.position.set(0, 0, -0.1);
        model.scale.set(0.8, 0.8, 0.8);

        mixer = new THREE.AnimationMixer(model);
        if (gltf.animations && gltf.animations.length > 0) {
            action = mixer.clipAction(gltf.animations[0]);
            action.stop();
        }

        updateLoadingStatus('Personaje cargado');
        const l = document.getElementById('loading'); if (l) l.style.display = 'none';

    }, undefined, function (error) {
        console.error('Error cargando personaje:', error);
        updateLoadingStatus('Error con personaje. Usando cubo');
        createCubeCharacter();
    });

    setupControls();
}

function createCubeCharacter() {
    const geometry = new THREE.BoxGeometry(1, 2, 1);
    const material = new THREE.MeshStandardMaterial({
        color: 0xe74c3c,
        emissive: 0xff0000,
        emissiveIntensity: 0.2
    });
    model = new THREE.Mesh(geometry, material);
    model.castShadow = true;
    model.position.set(0, 1, 0);
    scene.add(model);
    const l = document.getElementById('loading'); if (l) l.style.display = 'none';
}

function updateLoadingStatus(message) {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.textContent = message;
    }
}

function setupControls() {
    window.addEventListener('keydown', (event) => {
        keys[event.code] = true;
        if (event.code === 'KeyR' && model) {
            model.position.set(0, 0, 0);
        }
    });

    window.addEventListener('keyup', (event) => {
        keys[event.code] = false;
    });

    window.addEventListener('resize', function () {
        const width = window.innerWidth;
        const height = window.innerHeight;
        if (renderer) renderer.setSize(width, height);
        if (camera) {
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }
    });
}

function checkCollision(newPosition) {
    if (!model) return false;
    const tempBox = new THREE.Box3().setFromObject(model);
    const delta = newPosition.clone().sub(model.position);
    tempBox.translate(delta);

    for (const box of mazeColliders) {
        if (box.intersectsBox(tempBox)) {
            return true;
        }
    }
    return false;
}

function updateCamera() {
    if (!model) return;
    const offset = new THREE.Vector3(0, 1.5, -3);
    offset.applyQuaternion(model.quaternion);
    const targetPos = model.position.clone().add(offset);

    camera.position.lerp(targetPos, 0.1);
    camera.lookAt(model.position.x, model.position.y + 1.2, model.position.z);
}

function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1);

    if (model) {
        const isMovingForward = keys['KeyW'] || keys['ArrowUp'];
        const isTurningLeft = keys['KeyA'] || keys['ArrowLeft'];
        const isTurningRight = keys['KeyD'] || keys['ArrowRight'];
        const speed = 1.2 * delta;
        const turnSpeed = 2.5 * delta;

        if (isTurningLeft) model.rotation.y += turnSpeed;
        if (isTurningRight) model.rotation.y -= turnSpeed;

        if (isMovingForward) {
            const forward = new THREE.Vector3(0, 0, 1);
            forward.applyQuaternion(model.quaternion);
            const newPos = model.position.clone().add(forward.clone().multiplyScalar(speed));
            if (!checkCollision(newPos)) {
                model.position.copy(newPos);
                model.position.y = 0;
            }
        }

        if ((isMovingForward || isTurningLeft || isTurningRight) && action && !action.isRunning()) {
            action.play();
        } else if (!isMovingForward && !isTurningLeft && !isTurningRight && action && action.isRunning()) {
            action.stop();
        }

        model.position.y = Math.max(model.position.y - 0 * delta * 60, 0);
    }

    if (mixer) mixer.update(delta);
    updateCamera();
    renderer.render(scene, camera);
}

// Iniciar
init();
animate();
