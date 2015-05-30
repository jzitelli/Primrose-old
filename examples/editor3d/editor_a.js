log("Hello world!");

var box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5),
	new THREE.MeshLambertMaterial({
		map: THREE.ImageUtils.loadTexture("images/crochet.png")
	}));

box.position.y = 0.75;
scene.add(box);

var radius = 3,
	angle = 0,
	dAngle = Math.PI / 360;

setInterval(function() {
	box.position.x = radius * Math.cos(angle);
	box.position.z = radius * Math.sin(angle);
	angle += dAngle;
}, 5);

// focus on this window and hit CTRL+SHIFT+SPACE (Windows/Linux) or CMD+OPT+E (OS X) to execute.