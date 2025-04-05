// Configuración básica de la escena
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Luz
const light = new THREE.AmbientLight(0x404040); // Luz ambiental
scene.add(light);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 1, 0).normalize();
scene.add(directionalLight);

// Cargador de modelos GLTF
const loader = new THREE.GLTFLoader();

// Cargar el modelo fijo
loader.load('models/laberinto001.gltf', function(gltf) {
    scene.add(gltf.scene);
}, undefined, function(error) {
    console.error(error);
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
    console.error(error);
});

// Posición de la cámara
camera.position.z = 5;

// Bucle de animación
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);

    if (mixer) {
        mixer.update(clock.getDelta());
    }

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
