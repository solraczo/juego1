// Configuración básica de la escena
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Cargador de modelos GLTF
const loader = new THREE.GLTFLoader();

// Variable para el modelo del personaje y sus animaciones
let characterModel;
let mixer;
let animations = {}; // Para guardar todas las animaciones por nombre
let currentAction; // Para la acción de animación actual

// Variables para el control del movimiento
const keys = {
    w: false,
    a: false,
    s: false,
    d: false
};
const moveSpeed = 0.1; // Velocidad de movimiento del personaje

// Cargar el modelo fijo (laberinto)
loader.load('models/laberinto003.gltf', function(gltf) {
    scene.add(gltf.scene);
}, undefined, function(error) {
    console.error(error);
});

// Cargar el modelo animado (personaje)
loader.load('models/personaje001.gltf', function(gltf) {
    characterModel = gltf.scene;
    scene.add(characterModel);

    // Posicionar el personaje al inicio (ajusta según necesites)
    characterModel.position.set(0, 0, 0);

    // Configurar la animación
    mixer = new THREE.AnimationMixer(characterModel);

    // Guardar todas las animaciones
    gltf.animations.forEach(clip => {
        animations[clip.name] = mixer.clipAction(clip);
    });

    // Reproducir la primera animación por defecto (quizás una animación "idle")
    if (gltf.animations.length > 0) {
        currentAction = animations[gltf.animations[0].name];
        currentAction.play();
    }

}, undefined, function(error) {
    console.error(error);
});

// Posición inicial de la cámara (se ajustará con el personaje)
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0); // La cámara mirará al origen por ahora

// No usaremos OrbitControls si la cámara sigue al personaje,
// pero si quieres una vista de depuración puedes mantenerlo y alternar.
// const controls = new THREE.OrbitControls(camera, renderer.domElement);
// controls.enableDamping = true;
// controls.dampingFactor = 0.25;
// controls.enableZoom = true;
// controls.minDistance = 1;
// controls.maxDistance = 50;
// controls.target.set(0, 2, 0);

// Cargar el HDRI
const rgbeLoader = new THREE.RGBELoader();
rgbeLoader.load('models/minedump_flats_2k.hdr', function(texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    scene.background = texture;
});

// --- Manejo de eventos del teclado ---
document.addEventListener('keydown', (event) => {
    switch (event.key.toLowerCase()) {
        case 'w':
            keys.w = true;
            break;
        case 'a':
            keys.a = true;
            break;
        case 's':
            keys.s = true;
            break;
        case 'd':
            keys.d = true;
            break;
    }
});

document.addEventListener('keyup', (event) => {
    switch (event.key.toLowerCase()) {
        case 'w':
            keys.w = false;
            break;
        case 'a':
            keys.a = false;
            break;
        case 's':
            keys.s = false;
            break;
        case 'd':
            keys.d = false;
            break;
    }
});

// --- Funciones para manejar animaciones ---
function playAnimation(animationName) {
    if (currentAction && currentAction !== animations[animationName]) {
        currentAction.fadeOut(0.2); // Fundido de salida
    }
    currentAction = animations[animationName];
    currentAction.reset().fadeIn(0.2).play(); // Fundido de entrada y reproducción
}

// Bucle de animación
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    if (mixer) {
        mixer.update(delta);
    }

    // --- Lógica de movimiento del personaje ---
    if (characterModel) {
        let moved = false;
        if (keys.w) {
            characterModel.position.z -= moveSpeed;
            moved = true;
        }
        if (keys.s) {
            characterModel.position.z += moveSpeed;
            moved = true;
        }
        if (keys.a) {
            characterModel.position.x -= moveSpeed;
            moved = true;
        }
        if (keys.d) {
            characterModel.position.x += moveSpeed;
            moved = true;
        }

        // Controlar la animación según el movimiento
        if (moved) {
            // Asumiendo que tienes una animación llamada "caminar" o similar
            // Necesitarías el nombre exacto de tu animación de caminar.
            // Puedes imprimir gltf.animations[0].name al cargar el modelo para verificar.
            if (animations['caminar1'] && currentAction !== animations['caminar1']) { // Reemplaza 'caminar1' con el nombre de tu animación de caminar
                playAnimation('caminar1'); // Reproduce la animación de caminar
            }
        } else {
            // Si no hay movimiento, reproducir una animación de "idle" o la primera animación
            if (animations[gltf.animations[0].name] && currentAction !== animations[gltf.animations[0].name]) {
                playAnimation(gltf.animations[0].name); // Reproduce la animación por defecto (idle)
            }
        }

        // --- Cámara siguiendo al personaje ---
        // Puedes ajustar estos valores para cambiar qué tan cerca o lejos está la cámara
        const cameraOffset = new THREE.Vector3(0, 2, 5); // Offset relativo al personaje
        const targetPosition = new THREE.Vector3();
        characterModel.getWorldPosition(targetPosition); // Obtiene la posición absoluta del personaje

        camera.position.copy(targetPosition).add(cameraOffset);
        camera.lookAt(targetPosition); // La cámara siempre mira al personaje
    }

    // controls.update(); // Solo si sigues usando OrbitControls para debug
    renderer.render(scene, camera);
}

animate();

// Ajustar el tamaño de la ventana
window.addEventListener('resize', function() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});
