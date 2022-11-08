let scene, camera, renderer, cube, sphere, torus;
//This will adjust the speed
let ADD = 0.01;

let createCube = function(){
    let geometry = new THREE.BoxGeometry(1,1,1);
    let material = new THREE.MeshBasicMaterial({color: 0x00aa1cb});
    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
}

let createSphere = function(){
    //This is cutting parts of the sphere
    // let geometry = new THREE.SphereGeometry(.5,30,30, 0, Math.PI, 0, Math.PI/2);
    //This is the normal sphere. Adding numbers will modify the amount of vectors.
    let geometry = new THREE.SphereGeometry(.5,30,30);
    let material = new THREE.MeshBasicMaterial({color: 0xffffff, wireframe: true});
    sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
}

let createTorus = function(){
    //Parameters(radius, tube diameter(thickness), radial segment number, tubular segment, arc)
    let geometry = new THREE.TorusGeometry(2, .7, 50, 50, 10 );
    let material = new THREE.MeshBasicMaterial({color: 0xffffff, wireframe: true})
    torus = new THREE.Mesh(geometry, material);
    scene.add(torus);
}



let init = function (){
    //    Create the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xababab);
    //    Create and locate the camera
    camera = new THREE.PerspectiveCamera(100, window.innerWidth/window.innerHeight, 1, 1000);
    camera.position.z = 5;
    // let axis = new THREE.AxesHelper(5);
    // scene.add(axis);
    //     createCube();
        // createSphere();
        createTorus();
    //    Create and locate the objects on the scene
    //    Create the renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
};




//Here we are asking the browser to let us know when it refreshes itself. In each refresh the mainLoop function
// would be called again, creating an animation loop this way.
let mainLoop = function(){
    // cube.position.x += ADD;
    // cube.rotation.y -= ADD;
    // if (cube.position.x <= -2 || cube.position.x >= 2)
    //     ADD *= -1;
    // sphere.rotation.y += ADD;
    // sphere.rotation.x += ADD;
    // sphere.position.y += ADD;
    // if (sphere.position.y <= -.7 || sphere.position.y >= .7)
    //         ADD *= -1;
    torus.rotation.x += ADD;
    torus.rotation.y += ADD;




    //this function is activated every time the browser is refreshed.
    renderer.render(scene, camera);
    requestAnimationFrame(mainLoop);
};

init();
mainLoop();
