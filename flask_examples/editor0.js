console.log("editor0 demo");

log("editor0 demo");

var L = 30;

function surface(u, v) {
	return new THREE.Vector3(L * u, L * v, 7 * (Math.sin(-11*(1-u)) * Math.sin(9*v)));
}
var geom = new THREE.ParametricGeometry(surface, 64, 64);

var mesh = new THREE.Mesh(geom, new THREE.MeshLambertMaterial({side: THREE.DoubleSide}));

mesh.rotation.x += Math.PI / 2;
mesh.position.x -= L / 2;
mesh.position.z -= L / 2;
mesh.position.y -= 1;

scene.add(mesh);
