function addTool(parent, world, scene, useTransform, transformOptions) {
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
    var stickGeom = new THREE.CylinderGeometry(radius, radius, length, 7, 1, false, 0, 2*Math.PI);
    stickGeom.translate(0, -length / 2, 0);
    toolRoot.position.z = -length / 2 * scale;
    var stickMaterial = new THREE.MeshBasicMaterial({color: 0xeebb99, side: THREE.DoubleSide});
    var stickMesh = new THREE.Mesh(stickGeom, stickMaterial);
    stickMesh.castShadow = true;
    toolRoot.add(stickMesh);

    var tipBody = new CANNON.Body({mass: 0.25, type: CANNON.Body.KINEMATIC});
    tipBody.addShape(new CANNON.Sphere(radius * scale));
    tipBody.mesh = new THREE.Mesh(new THREE.SphereBufferGeometry(radius * scale));
    tipBody.mesh.castShadow = true;
    scene.add(tipBody.mesh);
    if (world) {
        world.addBody(tipBody);
    }

    leapController.on('frame', onFrame);
    var UP = new THREE.Vector3(0, 1, 0);
    var direction = new THREE.Vector3();
    var position = new THREE.Vector3();
    function onFrame(frame) {
        toolRoot.visible = false;
        tipBody.mesh.visible = false;
        if (frame.tools.length === 1) {
            toolRoot.visible = true;
            tipBody.mesh.visible = true;
            var tool = frame.tools[0];
            stickMesh.position.set(tool.tipPosition[0], tool.tipPosition[1], tool.tipPosition[2]);
            // tool.stabilizedTipPosition[0], tool.stabilizedTipPosition[1], tool.stabilizedTipPosition[2]);
            direction.set(tool.direction[0], tool.direction[1], tool.direction[2]);
            stickMesh.quaternion.setFromUnitVectors(UP, direction);
            // avatar.updateMatrixWorld();
            position.copy(stickMesh.position);
            parent.localToWorld(position);
            tipBody.position.copy(position);
            tipBody.mesh.position.copy(position);
            tipBody.velocity.set(tool.tipVelocity[0], tool.tipVelocity[1], tool.tipVelocity[2]);
        }
    }
}
