// Configuración básica de la escena
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Cargador de modelos GLTF
const loader = new THREE.GLTFLoader();

// Cargar el modelo fijo con manejo de errores
loader.load('models/laberinto003.gltf', function(gltf) {
    const model = gltf.scene;
    scene.add(model);

    // Verifica si las texturas se cargaron correctamente
    model.traverse(function(child) {
        if (child.isMesh) {
            if (child.material.map) {
                console.log('Textura cargada:', child.material.map);
            } else {
                console.warn('Advertencia: No se encontró textura para el material de', child);
            }
        }
    });
}, undefined, function(error) {
    console.error('Error al cargar el modelo laberinto003.gltf:', error);
});

// Cargar el modelo animado
let mixer;
loader.load('models/personaje001.gltf', function(gltf) {
    const model = gltf.scene;
    scene.add(model);

    // Configurar la animación
    mixer = new THREE.AnimationMixer(model);
    const action = mixer.clipAction(gltf.animations[0]); // Asumiendo que "caminar1" es la primera animación
    action.play();
}, undefined, function(error) {
    console.error('Error al cargar el modelo personaje001.gltf:', error);
});

// Posición de la cámara
camera.position.set(0, 5, 10); // Ajusta la posición inicial de la cámara para ver ambos modelos

// Configurar OrbitControls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Suaviza el movimiento
controls.dampingFactor = 0.25;
controls.enableZoom = true; // Permite el zoom
controls.minDistance = 1; // Distancia mínima de zoom
controls.maxDistance = 50; // Distancia máxima de zoom
controls.target.set(0, 2, 0); // Ajusta el target para centrar la vista en ambos modelos

// Cargar el HDRI
const rgbeLoader = new THREE.RGBELoader();
rgbeLoader.load('models/minedump_flats_2k.hdr', function(texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    scene.background = texture;
});

// Bucle de animación
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);

    if (mixer) {
        mixer.update(clock.getDelta());
    }

    controls.update(); // Actualiza los controles en cada frame
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
