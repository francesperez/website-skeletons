let scene, camera, renderer, sphere, torus;
let planet;
let rings = [];
let ADD = .1;

let createSphere = function(){
    let geometry = new THREE.SphereGeometry(2,30,30);
    let material = new THREE.MeshBasicMaterial({color: 0x8d5524});
    sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    geometry = new THREE.TorusGeometry(2.8, 0.5, 2, 50);
    material = new THREE.MeshBasicMaterial({color: 0xffe39f});
    let ring = new THREE.Mesh(geometry, material);
    rings.push(ring);

    geometry = new THREE.TorusGeometry(3.9, 0.5, 2, 50);
    material = new THREE.MeshBasicMaterial({color: 0xffad60});
    ring = new THREE.Mesh(geometry, material);
    rings.push(ring);

    geometry = new THREE.TorusGeometry(5, 0.5, 2, 50);
    material = new THREE.MeshBasicMaterial({color: 0xeac086});
    ring = new THREE.Mesh(geometry, material);
    rings.push(ring);

    rings.forEach(ring => {
        ring.rotation.x = 1.4;

        ring.rotation.y = 0.5;
        scene.add(ring);
    })
}


let init = function (){
    //    Create the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    //    Create and locate the camera
    camera = new THREE.PerspectiveCamera(1000, window.innerWidth/window.innerHeight, 1, 1000);
    camera.position.z = 11;

    createSphere();


    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
};

let mainLoop = function(){
    camera.position.y += ADD;
    if(camera.position.y >= 4 || camera.position.y <= -4)
        ADD *= -1;

    renderer.render(scene, camera);
    requestAnimationFrame(mainLoop);
};

init();
mainLoop();
