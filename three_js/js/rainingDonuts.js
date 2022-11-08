let scene, camera, renderer;
let donuts = [];
let ADD = 0.1;
let rotate = .05


let randomINRange = function (from, to){
    let x = Math.random() * (to - from);
    return x + from;
}

let createDonut = function (){
    let geometry = new THREE.TorusGeometry(2, 0.6, 20, 20);
    let material = new THREE.MeshBasicMaterial({color: Math.random() * 0xffffff});

    let d = new THREE.Mesh(geometry, material);

    d.position.x = randomINRange(-15,15);
    d.position.z = randomINRange(-15,15);
    d.position.y = 15;
    scene.add(d);
    donuts.push(d);
}


let init = function (){
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x230202);
    camera = new THREE.PerspectiveCamera(100, window.innerWidth/window.innerHeight, 1, 1000);
    camera.position.z = 20;
    camera.position.y = -10;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
};


let mainLoop = function(){
    let x = Math.random();
    if(x < 0.07)
        createDonut();
    
    donuts.forEach(d => d.position.y -= ADD);
    donuts.forEach(d => d.rotation.x -= rotate);


    renderer.render(scene, camera);
    requestAnimationFrame(mainLoop);
};

init();
mainLoop();
