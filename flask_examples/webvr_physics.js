WebVRApplication.prototype.setPhysicsParams = function () {
    this.groundMaterial = new CANNON.Material("groundMaterial");
    this.bodyMaterial = new CANNON.Material("bodyMaterial");
    this.bodyGroundContact = new CANNON.ContactMaterial(
        this.bodyMaterial,
        this.groundMaterial, {
            friction: 0.025,
            restitution: 0.3,
            contactEquationStiffness: 1e8,
            contactEquationRelaxation: 3,
            frictionEquationStiffness: 1e8,
            frictionEquationRegularizationTime: 3
        });
    this.bodyBodyContact = new CANNON.ContactMaterial(
        this.bodyMaterial,
        this.bodyMaterial, {
            friction: 0.025,
            restitution: 0.3,
            contactEquationStiffness: 1e8,
            contactEquationRelaxation: 3,
            frictionEquationStiffness: 1e8,
            frictionEquationRegularizationTime: 3
        });
    this.world.addContactMaterial(this.bodyGroundContact);
    this.world.addContactMaterial(this.bodyBodyContact);
};


WebVRApplication.prototype.addPhysicsBody = function (obj, body, shape, radius, skipObj) {
    body.addShape(shape);
    body.linearDamping = body.angularDamping = 0.25;
    if (skipObj) {
        body.position.set(obj.x, obj.y + radius / 2, obj.z);
    } else {
        obj.physics = body;
        body.graphics = obj;
        body.position.copy(obj.position);
        body.quaternion.copy(obj.quaternion);
    }
    this.world.add(body);
    return body;
};

WebVRApplication.prototype.shape2mesh = CANNON.Demo.shape2mesh;

WebVRApplication.prototype.makeBall = function (obj, mass, radius, skipObj) {
    var body = new CANNON.Body({
        mass: mass,
        material: this.bodyMaterial,
        fixedRotation: false
    });
    var shape = new CANNON.Sphere(radius ||
        obj.geometry.boundingSphere.radius);
    return this.addPhysicsBody(obj, body, shape, radius, skipObj);
};

WebVRApplication.prototype.makeCube = function (obj, mass, skipObj) {
	var scale = 1;
    var body = new CANNON.Body({
        mass: mass,
        material: this.bodyMaterial,
        fixedRotation: false
    });
    var shape = new CANNON.Box(new CANNON.Vec3(scale, scale, scale));
    obj.geometry.computeBoundingSphere();
    obj.castShadow = true;
    var radius = obj.geometry.boundingSphere.radius;
	this.scene.add(obj);
    return this.addPhysicsBody(obj, body, shape, radius, skipObj);
};

WebVRApplication.prototype.constructMesh = function (genotype) {

};

WebVRApplication.prototype.simulateEVC = function (genotype, world, T, dt) {
    var mesh = this.constructMesh(genotype);
    var body = this.constructBody(genotype);
    world.add(body);
    var t = 0;
    T = T || 1.0;
    while (t < T) {
        world.step(dt);
        t += dt;
    }
};
