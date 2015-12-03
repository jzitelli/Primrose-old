var makeCube = (function() {
    var cubeMaterial = new THREE.MeshLambertMaterial({
        color: 0xffeebb,
        shading: THREE.FlatShading
    });
    var cubeMesh = new THREE.Mesh(new THREE.BufferGeometry().fromGeometry(new THREE.BoxGeometry(1, 1, 1)),
        cubeMaterial);
    cubeMesh.geometry.computeBoundingBox();
    function makeCube(position, quaternion, scale, velocity) {
        var mesh = cubeMesh.clone();
        mesh.position.copy(position);
        if (quaternion) {
            mesh.quaternion.copy(quaternion);
        }
        if (scale) {
            mesh.scale.copy(scale);
        }
        mesh.userData = {
            cannonData: {
                mass: 0.5,
                shapes: ['Box']
            }
        };
        CrapLoader.CANNONize(mesh, application.world);
        mesh.body.velocity.copy(velocity);
        application.scene.add(mesh);
    }
    return makeCube;
})();

function shootCube() {
    var position = new THREE.Vector3(0.5, 0.71, -1.23);
    position = avatar.localToWorld(position);
    var scale = new THREE.Vector3(0.12, 0.12, 0.12);
    var velocity = new THREE.Vector3(-0.1, -0.1, -4);
    velocity.applyQuaternion(avatar.quaternion);
    makeCube(position, avatar.quaternion, scale, velocity);
}
