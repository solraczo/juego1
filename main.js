// Variables globales
let model, mixer, action;
const keys = {};
const velocity = new THREE.Vector3();
let moveVelocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let laberintoModel;
let camera, scene, renderer;
let isOnGround = false;
const clock = new THREE.Clock(); // Mover la declaración de clock aquí

// Inicialización
function init() {
    // Crear escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Fondo azul cielo por defecto
    scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);

    // Crear cámara
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);

    // Crear renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Añadir luces básicas
    addBasicLights();

    // Crear suelo temporal
    createTempGround();

    // Cargar recursos
    loadAssets();
}

function addBasicLights() {
    // Luz direccional principal
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    // Luz ambiental
    const ambientLight = new THREE.AmbientLight(0x404040, 3);
    scene.add(ambientLight);

    // Luz hemisférica
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

// Función de respaldo para el laberinto
function createBackupMaze() {
    const wallGeometry = new THREE.BoxGeometry(1, 2, 0.2);
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });

    // Crear algunas paredes simples como un laberinto de respaldo
    laberintoModel = new THREE.Group();

    const wall1 = new THREE.Mesh(wallGeometry, wallMaterial);
    wall1.position.set(0, 1, -5);
    wall1.castShadow = true;
    wall1.receiveShadow = true;
    laberintoModel.add(wall1);

    const wall2 = new THREE.Mesh(wallGeometry, wallMaterial);
    wall2.rotation.y = Math.PI / 2;
    wall2.position.set(5, 1, 0);
    wall2.castShadow = true;
    wall2.receiveShadow = true;
    laberintoModel.add(wall2);

    const wall3 = new THREE.Mesh(wallGeometry, wallMaterial);
    wall3.position.set(0, 1, 5);
    wall3.castShadow = true;
    wall3.receiveShadow = true;
    laberintoModel.add(wall3);

    const wall4 = new THREE.Mesh(wallGeometry, wallMaterial);
    wall4.rotation.y = Math.PI / 2;
    wall4.position.set(-5, 1, 0);
    wall4.castShadow = true;
    wall4.receiveShadow = true;
    laberintoModel.add(wall4);

    scene.add(laberintoModel);
    updateLoadingStatus('Laberinto de respaldo creado.');
}

function loadAssets() {
    // Cargador de modelos GLTF
    const loader = new THREE.GLTFLoader();

    // Intentar cargar laberinto
    try {
        loader.load('models/laberinto003.gltf', function(gltf) {
            laberintoModel = gltf.scene;
            laberintoModel.scale.set(2, 2, 2); // Escala el laberinto al doble de tamaño
            scene.add(laberintoModel);
            updateLoadingStatus('Laberinto cargado');

        }, undefined, function(error) {
            console.error('Error cargando laberinto:', error);
            updateLoadingStatus('Error con laberinto. Usando alternativa');
            createBackupMaze(); // Llamar a la función de respaldo
        });
    } catch (e) {
        console.error('Error inicializando loader:', e);
        createBackupMaze(); // Llamar a la función de respaldo
    }

    // Cargar personaje
    try {
        loader.load('models/personaje001.gltf', function(gltf) {
            model = gltf.scene;
            if (!model) {
                throw new Error('Modelo no definido');
            }

            scene.add(model);
            model.position.set(0, 0, -0.1);
            model.scale.set(0.8, 0.8, 0.8); // Reducción a la mitad

            // Configurar animación
            mixer = new THREE.AnimationMixer(model);
            if (gltf.animations && gltf.animations.length > 0) {
                action = mixer.clipAction(gltf.animations[0]);
                action.stop(); // Inicia detenido
            }

            updateLoadingStatus('Personaje cargado');
            const l = document.getElementById('loading');
            if (l) l.style.display = 'none';

        }, undefined, function(error) {
            console.error('Error cargando personaje:', error);
            updateLoadingStatus('Error con personaje. Usando cubo');
            createCubeCharacter();
        });
    } catch (e) {
        console.error('Error cargando personaje:', e);
        createCubeCharacter();
    }

    // Configurar controles de teclado
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
    const l = document.getElementById('loading');
    if (l) l.style.display = 'none';
}

function updateLoadingStatus(message) {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.textContent = message;
    }
}

function setupControls() {
    // Eventos de teclado
    window.addEventListener('keydown', (event) => {
        keys[event.code] = true;

        // Reset posición con R
        if (event.code === 'KeyR' && model) {
            model.position.set(0, 0, 0); // O la posición inicial que desees
            model.rotation.set(0,0,0); // También puedes resetear la rotación
        }
    });

    window.addEventListener('keyup', (event) => {
        keys[event.code] = false;
    });

    // Ajustar el tamaño de la ventana
    window.addEventListener('resize', function() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        if (renderer) {
            renderer.setSize(width, height);
        }
        if (camera) {
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }
    });
}

function updateCamera() {
    if (!model) return;

    const offset = new THREE.Vector3(0, 1.5, -3); // detrás y más cerca
    offset.applyQuaternion(model.quaternion); // respeta la dirección del personaje
    const targetPos = model.position.clone().add(offset);

    camera.position.lerp(targetPos, 0.1);
    camera.lookAt(model.position.x, model.position.y + 1.2, model.position.z);
}

function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1); // Limita delta para evitar saltos grandes

    // Mover personaje si existe
    if (model) {
        const isMovingForward = keys['KeyW'] || keys['ArrowUp'];
        const isTurningLeft = keys['KeyA'] || keys['ArrowLeft'];
        const isTurningRight = keys['KeyD'] || keys['ArrowRight'];
        const speed = 3 * delta; // Ajusta la velocidad de movimiento
        const turnSpeed = 2.5 * delta; // velocidad de giro

        // Rotar personaje
        if (isTurningLeft) {
            model.rotation.y += turnSpeed;
        }
        if (isTurningRight) {
            model.rotation.y -= turnSpeed;
        }

        // Mover hacia adelante
        if (isMovingForward) {
            // Dirección adelante según rotación actual
            const forward = new THREE.Vector3(0, 0, 1);
            forward.applyQuaternion(model.quaternion);
            model.position.add(forward.multiplyScalar(speed));
            model.position.y = 0; // Mantener pegado al suelo si el terreno es plano
        }

        // Animación del personaje
        if (action) { // Asegúrate de que action exista
            if (isMovingForward || isTurningLeft || isTurningRight) {
                if (!action.isRunning()) {
                    action.reset().play(); // Reinicia y reproduce la animación
                }
                action.setEffectiveTimeScale(1); // Velocidad normal de la animación
            } else {
                if (action.isRunning()) {
                    // Puedes añadir un fade out si tienes una animación de "idle" para una transición suave
                    action.stop(); // Simplemente detiene si no hay movimiento
                }
            }
        }
        
        // Gravedad básica (si quieres que el personaje caiga de una plataforma, por ejemplo)
        // model.position.y -= 9.8 * delta; // Esto haría que caiga, necesitarías lógica de colisión con el suelo.
        // if (model.position.y < 0) {
        //     model.position.y = 0;
        //     isOnGround = true; // Actualiza el estado de estar en el suelo
        // } else {
        //     isOnGround = false;
        // }
    }

    // Actualizar animaciones
    if (mixer) {
        mixer.update(delta);
    }

    // Actualizar cámara
    updateCamera();

    // Renderizar escena
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// Iniciar todo
init();

// Iniciar bucle de animación
animate();