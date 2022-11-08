let sphere;
let makeASphere = function(radius, pilength, thetalength) {
    let geometry = new THREE.SphereGeometry(radius, pilength, thetalength);
    let material = new THREE.MeshBasicMaterial({color: 0x8d5524});
    sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere)
}
