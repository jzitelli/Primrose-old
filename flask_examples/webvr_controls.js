WebVRApplication.prototype.displayMenu = function () {
	this.menuMesh.visible = true;
};
WebVRApplication.prototype.hideMenu = function () {
	this.menuMesh.visible = false;
};
WebVRApplication.prototype.mystery = function () {
	console.log("mystery");

};

WebVRApplication.prototype.shootCube = function() {
    if (this.scene) {
    	var scale = 1;
		var mesh = new THREE.Mesh(new THREE.BoxGeometry(scale, scale, scale), this.cubeMaterial);
		mesh.position.z -= 3;
        mesh.position.applyQuaternion(this.currentUser.quaternion);
        mesh.position.add(this.currentUser.position);
        mesh.castShadow = true;
        var body = this.makeCube(mesh, 1);
        body.velocity.copy(this.currentUser.velocity);
        var velocityScale = 3;
        body.velocity.x *= velocityScale;
        body.velocity.y *= velocityScale;
        body.velocity.z *= velocityScale;
    }
};

var dontwork = function () {
	var attributes = {
				size: {	type: 'f', value: [] },
				ca:   {	type: 'c', value: [] }
			};
	var uniforms = {
				amplitude: { type: "f", value: 1.0 },
				color:     { type: "c", value: new THREE.Color( 0xffffff ) },
				texture:   { type: "t", value: THREE.ImageUtils.loadTexture( "flask_examples/images/disc.png" ) },
			};
	uniforms.texture.value.wrapS = uniforms.texture.value.wrapT = THREE.RepeatWrapping;
	var shaderMaterial = new THREE.ShaderMaterial( {
				uniforms:       uniforms,
				attributes:     attributes,
				vertexShader:   document.getElementById( 'vertexshader' ).textContent,
				fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
				transparent:    true
			});
	var radius = 10, segments = 68, rings = 38;
	var geometry = new THREE.SphereGeometry( radius, segments, rings );

	var vc1 = geometry.vertices.length;

	var geometry2 = new THREE.BoxGeometry( 0.8 * radius, 0.8 * radius, 0.8 * radius, 10, 10, 10 );
	geometry.merge( geometry2 );

	var vertices = geometry.vertices;
	var vc2 = vertices.length;

	var values_size = new Float32Array(vc2);
	var values_color = new Float32Array(4*vc2);
	var vertices = new Float32Array(3*vc2);
	var bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
    bufferGeometry.addAttribute('size', new THREE.BufferAttribute(values_size, 1));
    bufferGeometry.addAttribute('ca', new THREE.BufferAttribute(values_color, 4));
    bufferGeometry.fromGeometry(geometry);
	sphere = new THREE.PointCloud( bufferGeometry, shaderMaterial );
	for ( var v = 0; v < vc2; v++ ) {
		values_size[ v ] = 10;
		values_color[ 4*v ] = 200;
		values_color[ 4*v+1 ] = 200;
		values_color[ 4*v+3 ] = 200;
		if ( v < vc1 ) {
			//values_color[ v ].setHSL( 0.01 + 0.1 * ( v / vc1 ), 0.99, ( vertices[ v ].y + radius ) / ( 4 * radius ) );
		} else {
			values_size[ v ] = 40;
			//values_color[ v ].setHSL( 0.6, 0.75, 0.25 + vertices[ v ].y / ( 2 * radius ) );
		}
	}
	this.scene.add( sphere );
};

var bufferParticles = function() {
    var particles = 50000; //500000;

    var geometry = new THREE.BufferGeometry();

    var positions = new Float32Array(particles * 3);
    var colors = new Float32Array(particles * 3);

    var color = new THREE.Color();

    var n = 5,
        n2 = n / 2; // particles spread in the cube

    for (var i = 0; i < positions.length; i += 3) {

        // positions

        var x = Math.random() * n - n2;
        var y = Math.random() * n - n2;
        var z = Math.random() * n - n2;

        positions[i] = x;
        positions[i + 1] = y;
        positions[i + 2] = z;

        // colors

        var vx = (x / n) + 0.5;
        var vy = (y / n) + 0.5;
        var vz = (z / n) + 0.5;

        color.setRGB(vx, vy, vz);

        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;

    }

    geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeBoundingSphere();
    //
    var material = new THREE.PointCloudMaterial({
        size: 0.0222,
        vertexColors: THREE.VertexColors
    });

    particleSystem = new THREE.PointCloud(geometry, material);
    this.scene.add(particleSystem);
};

var billboardParticles = function() {
    var geometry = new THREE.Geometry();
    var sprite = THREE.ImageUtils.loadTexture("flask_examples/images/ball.png");
    var colors = [];
    for (i = 0; i < 5000; i++) {
        var vertex = new THREE.Vector3();
        vertex.x = 50 * Math.random() - 25;
        vertex.y = 50 * Math.random() - 25;
        vertex.z = 50 * Math.random() - 25;
        geometry.vertices.push(vertex);
        colors[i] = new THREE.Color(0xffffff);
        colors[i].setHSL((vertex.x + 25) / 50, 1, 0.5);
    }
    geometry.colors = colors;
    material = new THREE.PointCloudMaterial({
        size: 1,
        map: sprite,
        vertexColors: THREE.VertexColors,
        alphaTest: 0.5,
        transparent: true
    });
    material.color.setHSL(1.0, 0.2, 0.7);
    particles = new THREE.PointCloud(geometry, material);
    this.scene.add(particles);
    // var animate = function (dt) {
    // 	requestAnimationFrame(animate);
    // 	WebVRApplication.prototype.animate.call(this, dt);
    // }.bind(this);
    // this.animate = animate;
};

var brushTexture = THREE.ImageUtils.loadTexture($.QueryString['brushTexture'] || "flask_examples/images/smokeparticle.png");
var brushSprite = new THREE.SpriteMaterial({
    map: brushTexture,
    color: 0xffffff
});
brushSprite = new THREE.Sprite(brushSprite);
WebVRApplication.prototype.lastPosition = new THREE.Vector3();
WebVRApplication.prototype.makeCurve = function () {

};

WebVRApplication.prototype.brushDown = function() {
    if (this.scene) {
        var sprite = brushSprite.clone();
        sprite.position.z -= 4;
        sprite.position.applyQuaternion(this.currentUser.quaternion);
        sprite.position.add(this.currentUser.position);
        sprite.scale.set(3, 3, 3);
        this.scene.add(sprite);
    }
};

brushTexture = THREE.ImageUtils.loadTexture("flask_examples/images/mana5.png");
var brushUpSprite = new THREE.SpriteMaterial({
    map: brushTexture,
    color: 0xffffff
});
WebVRApplication.prototype.brushUp = function() {
    // if (this.scene) {
    //     var sprite = new THREE.Sprite(brushUpSprite);
    //     sprite.position.z -= 4;
    //     sprite.position.applyQuaternion(this.currentUser.quaternion);
    //     sprite.position.add(this.currentUser.position);
    //     this.scene.add(sprite);
    // }
};

WebVRApplication.prototype.currentIndex = null;
WebVRApplication.prototype.selectNextObj = function() {
    function selectables() {
        var objs = [];
        this.scene.traverse(function(obj) {
            if (obj instanceof THREE.Mesh) {
                objs.push(obj);
                if (obj.boxHelper === undefined) {
                    obj.boxHelper = new THREE.BoxHelper(obj, this.currentMaterial);
                    this.scene.add(obj.boxHelper);
                }
                obj.boxHelper.visible = false;
            }
        }.bind(this));
        return objs;
    }
    var objs = selectables.call(this);
    if (this.currentIndex == null) {
        this.currentIndex = 0;
    } else {
        this.currentIndex = (this.currentIndex + 1) % objs.length;
    }
    this.currentObject = objs[this.currentIndex];
    if (this.currentObject.boxHelper) {
        this.currentObject.boxHelper.visible = true;
    }
};

var manaTexture = THREE.ImageUtils.loadTexture("flask_examples/images/mana3.png");
var manaSprite = new THREE.SpriteMaterial({
    map: manaTexture,
    color: 0xffffff,
    fog: true
});
manaSprite = new THREE.Sprite(manaSprite);
WebVRApplication.prototype.createObject = function() {
    if (this.scene) {
        var sprite = manaSprite.clone();
        sprite.position.z -= 3;
        sprite.position.applyQuaternion(this.currentUser.quaternion);
        sprite.position.add(this.currentUser.position);
        sprite.position.y += 1.5;
        this.scene.add(sprite);
        var radius = 0.5;
        var mass = 1;
        var body = this.makeBall(sprite, mass, radius);
        body.velocity.copy(this.currentUser.velocity);
        var velocityScale = 2;
        body.velocity.x *= velocityScale;
        body.velocity.y *= velocityScale;
        body.velocity.z *= velocityScale;
    }
};