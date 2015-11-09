function addTool(parent, world, useTransform, transformOptions) {
    "use strict";
    var leapController = new Leap.Controller({frameEventName: 'animationFrame'});

    var toolRoot = new THREE.Object3D();
    var scale;
    if (useTransform) {
        transformOptions = transformOptions || {};
        leapController.use('transform', transformOptions).connect();
        scale = 1;
    }
    else {
        leapController.connect();
        scale = 0.001;
    }
    toolRoot.scale.set(scale, scale, scale);
    toolRoot.visible = false;
    parent.add(toolRoot);

    var radius = 0.016 / scale;
    var length = 0.5 / scale;
    var stickOffset = new THREE.Vector3(0, -0.3, -0.4);
    toolRoot.position.x = stickOffset.x;
    toolRoot.position.y = stickOffset.y;
    toolRoot.position.z = -length / 2 * scale + stickOffset.z;

    var stickGeom = new THREE.CylinderGeometry(radius, radius, length, 7, 1, false, 0, 2*Math.PI);
    stickGeom.translate(0, -length / 2, 0);
    var stickMaterial = new THREE.MeshBasicMaterial({color: 0xeebb99, side: THREE.DoubleSide});
    var stickMesh = new THREE.Mesh(stickGeom, stickMaterial);
    stickMesh.castShadow = true;
    toolRoot.add(stickMesh);

    var tipMaterial = new THREE.MeshBasicMaterial({color: 0x004488, side: THREE.DoubleSide});
    var tipMesh = new THREE.Mesh(new THREE.SphereBufferGeometry(radius), tipMaterial);
    tipMesh.castShadow = true;
    stickMesh.add(tipMesh);

    var tipBody = new CANNON.Body({mass: 0.2, type: CANNON.Body.KINEMATIC});
    tipBody.addShape(new CANNON.Sphere(radius * scale));
    world.addBody(tipBody);

    leapController.on('frame', onFrame);
    var UP = new THREE.Vector3(0, 1, 0);
    var direction = new THREE.Vector3();
    var position = new THREE.Vector3();
    var velocity = new THREE.Vector3();
    function onFrame(frame) {
        toolRoot.visible = false;
        if (frame.tools.length === 1) {
            toolRoot.visible = true;
            var tool = frame.tools[0];
            // stickMesh.position.set(tool.tipPosition[0], tool.tipPosition[1], tool.tipPosition[2]);
            stickMesh.position.set(tool.stabilizedTipPosition[0], tool.stabilizedTipPosition[1], tool.stabilizedTipPosition[2]);
            direction.set(tool.direction[0], tool.direction[1], tool.direction[2]);
            stickMesh.quaternion.setFromUnitVectors(UP, direction);

            position.set(0, 0, 0);
            stickMesh.localToWorld(position);
            tipBody.position.copy(position);

            velocity.set(tool.tipVelocity[0] * 0.001, tool.tipVelocity[1] * 0.001, tool.tipVelocity[2] * 0.001);
            velocity.applyQuaternion(parent.quaternion);
            tipBody.velocity.copy(velocity);
        }
    }
}
