// Variables globales
        let model, mixer, action;
        const keys = {};
        const velocity = new THREE.Vector3(); // No utilizada directamente en el movimiento actual, pero útil para futuras implementaciones
        let moveVelocity = new THREE.Vector3(); // No utilizada directamente en el movimiento actual
        const direction = new THREE.Vector3(); // No utilizada directamente en el movimiento actual
        let laberintoModel;
        let camera, scene, renderer;
        let isOnGround = false; // Variable para gestionar si el personaje está en el suelo (futuras implementaciones de gravedad/salto)
        const clock = new THREE.Clock(); // Reloj para calcular el delta time

        // Variables para colisiones
        const raycaster = new THREE.Raycaster();
        const collisionDistance = 0.5; // Distancia para detectar colisiones (ajustar según el tamaño del personaje)
        const characterHalfHeight = 0.9; // Mitad de la altura del personaje para el origen del rayo (asumiendo altura total de 1.8)
        const characterRadius = 0.4; // Radio aproximado del personaje para colisiones

        // Inicialización de la escena
        function init() {
            // Crear escena
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x87CEEB); // Fondo azul cielo por defecto
            scene.fog = new THREE.Fog(0xa0a0a0, 10, 50); // Niebla para efecto de profundidad

            // Crear cámara
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 5, 10); // Posición inicial de la cámara

            // Crear renderer
            renderer = new THREE.WebGLRenderer({
                antialias: true, // Suavizado de bordes
                alpha: true // Fondo transparente (si no hay background color)
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio); // Ajustar píxeles a la densidad de la pantalla
            renderer.shadowMap.enabled = true; // Habilitar sombras
            document.body.appendChild(renderer.domElement);

            // Añadir luces básicas a la escena
            addBasicLights();

            // Crear suelo temporal (útil si el laberinto no carga o no tiene un suelo integrado)
            createTempGround();

            // Cargar modelos (laberinto y personaje)
            loadAssets();

            // Configurar controles de teclado y manejo de redimensionamiento de ventana
            setupControls();
        }

        // Añade luces a la escena
        function addBasicLights() {
            // Luz direccional principal (simula el sol)
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(5, 10, 7);
            directionalLight.castShadow = true; // La luz proyecta sombras
            directionalLight.shadow.mapSize.width = 1024; // Resolución de las sombras
            directionalLight.shadow.mapSize.height = 1024;
            scene.add(directionalLight);

            // Luz ambiental (iluminación global, suave)
            const ambientLight = new THREE.AmbientLight(0x404040, 3);
            scene.add(ambientLight);

            // Luz hemisférica (simula luz del cielo y del suelo)
            const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
            scene.add(hemisphereLight);
        }

        // Crea un suelo plano temporal
        function createTempGround() {
            const groundGeometry = new THREE.PlaneGeometry(50, 50);
            const groundMaterial = new THREE.MeshStandardMaterial({
                color: 0x2c3e50, // Gris oscuro/azul
                roughness: 0.9,
                metalness: 0.1
            });
            const ground = new THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = -Math.PI / 2; // Rotar para que sea horizontal
            ground.position.y = 0;
            ground.receiveShadow = true; // El suelo recibe sombras
            scene.add(ground);
        }

        // Función de respaldo para el laberinto si el modelo GLTF falla al cargar
        function createBackupMaze() {
            const wallGeometry = new THREE.BoxGeometry(1, 2, 0.2); // Geometría de una pared
            const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Material color madera/tierra

            laberintoModel = new THREE.Group(); // Crear un grupo para el laberinto de respaldo

            // Ejemplo: Crear algunas paredes simples para un laberinto básico
            const wall1 = new THREE.Mesh(wallGeometry, wallMaterial);
            wall1.position.set(0, 1, -5);
            wall1.castShadow = true;
            wall1.receiveShadow = true;
            laberintoModel.add(wall1);

            const wall2 = new THREE.Mesh(wallGeometry, wallMaterial);
            wall2.rotation.y = Math.PI / 2; // Rotar para hacer una pared perpendicular
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

            scene.add(laberintoModel); // Añadir el grupo de laberinto a la escena
            updateLoadingStatus('Laberinto de respaldo creado.');
        }


        // Carga los modelos GLTF del laberinto y el personaje
        function loadAssets() {
            const loader = new THREE.GLTFLoader();

            // Intentar cargar el modelo del laberinto
            loader.load('models/laberinto003.gltf', function(gltf) {
                laberintoModel = gltf.scene;
                laberientoModel.scale.set(2, 2, 2); // Escala el laberinto al doble de tamaño
                scene.add(laberintoModel);

                // Asegúrate de que todas las mallas del laberinto puedan proyectar y recibir sombras
                // y que estén listas para la detección de colisiones.
                laberintoModel.traverse(function(child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        // Opcional: para depuración, puedes cambiar el material de las paredes
                        // child.material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
                    }
                });

                updateLoadingStatus('Laberinto cargado');

            }, undefined, function(error) {
                // Manejo de error si el laberinto no carga
                console.error('Error cargando laberinto:', error);
                updateLoadingStatus('Error con laberinto. Usando alternativa');
                createBackupMaze(); // Crea un laberinto de respaldo
            });

            // Cargar el modelo del personaje
            loader.load('models/personaje001.gltf', function(gltf) {
                model = gltf.scene;
                if (!model) {
                    throw new Error('Modelo de personaje no definido después de cargar');
                }

                scene.add(model);
                model.position.set(0, 0, -0.1); // Posición inicial del personaje
                model.scale.set(0.8, 0.8, 0.8); // Reducción de tamaño del personaje
                model.castShadow = true; // El personaje proyecta sombras

                // Configurar animaciones del personaje
                mixer = new THREE.AnimationMixer(model);
                if (gltf.animations && gltf.animations.length > 0) {
                    action = mixer.clipAction(gltf.animations[0]); // Toma la primera animación
                    action.stop(); // La animación comienza detenida
                }

                updateLoadingStatus('Personaje cargado');
                const loadingElement = document.getElementById('loading');
                if (loadingElement) loadingElement.style.display = 'none'; // Oculta el mensaje de carga

            }, undefined, function(error) {
                // Manejo de error si el personaje no carga
                console.error('Error cargando personaje:', error);
                updateLoadingStatus('Error con personaje. Usando cubo');
                createCubeCharacter(); // Crea un personaje de cubo de respaldo
            });
        }

        // Crea un personaje de cubo como respaldo si el modelo GLTF falla
        function createCubeCharacter() {
            const geometry = new THREE.BoxGeometry(1, 2, 1); // Cubo de 1x2x1 (ancho, alto, profundidad)
            const material = new THREE.MeshStandardMaterial({
                color: 0xe74c3c, // Rojo
                emissive: 0xff0000, // Color de emisión
                emissiveIntensity: 0.2 // Intensidad de emisión
            });
            model = new THREE.Mesh(geometry, material);
            model.castShadow = true;
            model.position.set(0, 1, 0); // Ajusta la posición para que esté sobre el suelo (y=1 para un cubo de alto 2)
            scene.add(model);
            const loadingElement = document.getElementById('loading');
            if (loadingElement) loadingElement.style.display = 'none';
        }

        // Actualiza el texto del estado de carga
        function updateLoadingStatus(message) {
            const loadingElement = document.getElementById('loading');
            if (loadingElement) {
                loadingElement.textContent = message;
            }
        }

        // Configura los eventos de control de teclado y el ajuste de ventana
        function setupControls() {
            // Eventos para presionar tecla
            window.addEventListener('keydown', (event) => {
                keys[event.code] = true;

                // Resetear posición del personaje con la tecla 'R'
                if (event.code === 'KeyR' && model) {
                    model.position.set(0, 0, 0); // Vuelve a la posición inicial
                    model.rotation.set(0, 0, 0); // También resetea la rotación
                }
            });

            // Eventos para soltar tecla
            window.addEventListener('keyup', (event) => {
                keys[event.code] = false;
            });

            // Ajustar el tamaño del renderizador y la cámara al redimensionar la ventana
            window.addEventListener('resize', function() {
                const width = window.innerWidth;
                const height = window.innerHeight;
                if (renderer) {
                    renderer.setSize(width, height);
                }
                if (camera) {
                    camera.aspect = width / height;
                    camera.updateProjectionMatrix(); // Actualiza la matriz de proyección de la cámara
                }
            });
        }

        // Actualiza la posición y orientación de la cámara para seguir al personaje
        function updateCamera() {
            if (!model) return;

            // Offset de la cámara relativo al personaje
            // x=0, y=1.5 (un poco más alto que el personaje), z=-3 (detrás del personaje)
            const offset = new THREE.Vector3(0, 1.5, -3);
            offset.applyQuaternion(model.quaternion); // Aplica la rotación del personaje al offset
            const targetPos = model.position.clone().add(offset); // Posición deseada de la cámara

            // Interpolar suavemente la posición actual de la cámara hacia la posición objetivo
            camera.position.lerp(targetPos, 0.1);
            // La cámara mira a un punto ligeramente por encima del personaje
            camera.lookAt(model.position.x, model.position.y + 1.2, model.position.z);
        }

        // Función de detección de colisiones usando Raycasting
        function checkCollisions(movementVector) {
            if (!model || !laberintoModel) return false; // Asegurarse de que los modelos existen

            // Obtener las mallas del laberinto para la colisión
            const mazeMeshes = [];
            laberintoModel.traverse(function(child) {
                if (child.isMesh) {
                    mazeMeshes.push(child);
                }
            });

            if (mazeMeshes.length === 0) return false; // Si no hay mallas en el laberinto, no hay colisión

            // Origen del rayo: desde el centro del personaje a la altura de su mitad
            const originPoint = new THREE.Vector3(model.position.x, model.position.y + characterHalfHeight, model.position.z);

            // Dirección del rayo: normalizar el vector de movimiento propuesto
            if (movementVector.lengthSq() === 0) return false; // No hay movimiento, no hay colisión
            const direction = movementVector.clone().normalize();

            // Configurar el raycaster
            raycaster.set(originPoint, direction);
            raycaster.far = characterRadius + collisionDistance; // La distancia máxima para detectar la colisión
                                                               // (radio del personaje + distancia de holgura)

            // Calcular intersecciones con las mallas del laberinto
            const intersections = raycaster.intersectObjects(mazeMeshes, true);

            // Si hay intersecciones y la más cercana está dentro de la distancia permitida
            if (intersections.length > 0 && intersections[0].distance < characterRadius + collisionDistance) {
                // Puedes imprimir detalles de la colisión para depurar
                // console.log('¡Colisión detectada!', intersections[0].object.name, intersections[0].distance);
                return true; // Hay colisión
            }

            return false; // No hay colisión
        }

        // Bucle principal de animación
        function animate() {
            requestAnimationFrame(animate); // Solicita el siguiente fotograma

            const delta = Math.min(clock.getDelta(), 0.1); // Calcula el tiempo transcurrido, limita para evitar saltos

            // Mover y animar al personaje si el modelo está cargado
            if (model) {
                const isMovingForward = keys['KeyW'] || keys['ArrowUp'];
                const isTurningLeft = keys['KeyA'] || keys['ArrowLeft'];
                const isTurningRight = keys['KeyD'] || keys['ArrowRight'];
                const speed = 3 * delta; // Velocidad de movimiento
                const turnSpeed = 2.5 * delta; // Velocidad de giro

                // Rotar personaje
                if (isTurningLeft) {
                    model.rotation.y += turnSpeed;
                }
                if (isTurningRight) {
                    model.rotation.y -= turnSpeed;
                }

                // Calcular el movimiento propuesto
                const proposedMovement = new THREE.Vector3();
                if (isMovingForward) {
                    const forward = new THREE.Vector3(0, 0, 1); // Vector "adelante" en el espacio local del modelo
                    forward.applyQuaternion(model.quaternion); // Transforma el vector "adelante" por la rotación del modelo
                    proposedMovement.copy(forward).multiplyScalar(speed); // Calcula el movimiento en la dirección
                }

                // --- Lógica de Colisión ---
                // Antes de aplicar el movimiento, verifica si chocaría con una pared
                if (checkCollisions(proposedMovement)) {
                    // Si hay colisión, el movimiento propuesto se anula
                    // console.log('Movimiento bloqueado por colisión.');
                    proposedMovement.set(0, 0, 0); // No mover el personaje
                }

                // Aplica el movimiento final (si no fue bloqueado por una colisión)
                model.position.add(proposedMovement);
                model.position.y = 0; // Mantiene el personaje pegado al suelo si el terreno es plano
                                     // (Considera una lógica de gravedad y colisión con el suelo más compleja si tu laberinto tiene desniveles)


                // Control de la animación del personaje
                if (action) { // Asegúrate de que la acción de animación existe
                    if (isMovingForward || isTurningLeft || isTurningRight) {
                        if (!action.isRunning()) {
                            action.reset().play(); // Reinicia y reproduce la animación (para evitar saltos)
                        }
                        action.setEffectiveTimeScale(1); // Velocidad normal de la animación
                    } else {
                        if (action.isRunning()) {
                            action.stop(); // Detiene la animación si no hay movimiento
                        }
                    }
                }
            }

            // Actualizar el mezclador de animaciones (si existe)
            if (mixer) {
                mixer.update(delta);
            }

            // Actualizar la posición y orientación de la cámara
            updateCamera();

            // Renderizar la escena desde la perspectiva de la cámara
            if (renderer && scene && camera) {
                renderer.render(scene, camera);
            }
        }

        // --- Iniciar la aplicación ---
        init(); // Llama a la función de inicialización para configurar todo
        animate(); // Inicia el bucle de animación
