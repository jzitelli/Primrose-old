function CubeSnake(position) {
	var object = new THREE.Object3D();
	position = position || new THREE.Vector3(0, 0, -1);
	object.position.copy(position);
	var material = new THREE.MeshLambertMaterial({color: 0x225544});
	var mesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), material);
	mesh.castShadow = true;
	//object.add(mesh);
	var lastPosition = mesh.position;
	for (var i = 1; i < 30; ++i) {
		//var tail = mesh.clone();
		material = new THREE.MeshLambertMaterial({color: Math.floor(0x775544 * Math.random())});
		var tail = new THREE.Mesh(mesh.geometry.clone(), material);
		tail.scale.set(1 - Math.pow(0.84, i), 1 - Math.pow(0.92, i), 1 - Math.pow(0.84, i));
		tail.position.set(lastPosition.x - 0.8 * tail.scale.x, 0.1 * Math.sin(0.1 * i) * tail.scale.y, lastPosition.z);
		object.add(tail);
		lastPosition = tail.position;
		//tail.scale.set(0.84, 0.8, 0.84);
	}
	application.scene.add(object);
	object.t = 0;
	application.addEventListener("update", function (dt) {
		object.position.x -= 0.5 * dt;
		object.t += dt;
		for (var i = 0; i < object.children.length; ++i) {
			object.children[i].position.y = 0.5 * Math.sin(0.006 * i * i + 0.5 * i + 7.4 * object.t);
		}
	});
	return object;
}
