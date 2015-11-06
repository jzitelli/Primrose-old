/* global WebVRApplication, CrapLoader, THREE, CANNON, URL_PARAMS, JSON_SCENE */

var application;
var options = {
    gravity: 9.8,
    shadowMap: true
};
var avatar = new THREE.Object3D();
avatar.position.y = 1.2;
avatar.position.z = 2;
var scene;
if (JSON_SCENE) {
    scene = CrapLoader.parse(JSON_SCENE);
} else {
    scene = new THREE.Scene();
}

function onLoad() {
    "use strict";

    var spotLight = new THREE.SpotLight(0xffffff);
    spotLight.position.set(0, 3, 0);
    spotLight.castShadow = true;
    spotLight.shadowCameraNear = 0.02;
    spotLight.shadowCameraFar = 3;
    spotLight.shadowCameraFov = 90;
    scene.add(spotLight);

    application = new WebVRApplication("poolvr", avatar, scene, options);

    avatar.add(application.camera);
    application.scene.add(avatar);

    // leap motion tool tracking (the pool stick)
    var toolRoot = makeTool();
    avatar.add(toolRoot);
    toolRoot.position.set(0, -0.5, -0.75);

    application.start();
}

function setupMenu() {
    "use strict";
    var menu = new THREE.Object3D();
    return menu;
}

var makeTool = (function () {
    var UP = new THREE.Vector3(0, 1, 0);
    var direction = new THREE.Vector3();
    var position = new THREE.Vector3();
    function makeTool() {
        var leapController = new Leap.Controller({frameEventName: 'animationFrame'});
        leapController.connect();
        var scale = 0.001;
        var radius = 0.016;
        var length = 0.5;
        var stickGeom = new THREE.CylinderGeometry(radius / scale, radius / scale, length / scale, 7, 1, false, 0, 2*Math.PI);
        stickGeom.translate(0, -length / 2, 0);
        var stickMaterial = new THREE.MeshLambertMaterial({color: 0xeebb99});
        var stickMesh = new THREE.Mesh(stickGeom, stickMaterial);
        stickMesh.castShadow = true;
        var toolRoot = new THREE.Object3D();
        toolRoot.scale.set(scale, scale, scale);
        toolRoot.add(stickMesh);
        toolRoot.visible = false;
        var tipBody = new CANNON.Body({mass: 0.5, type: CANNON.Body.KINEMATIC});
        tipBody.addShape(new CANNON.Sphere(radius));
        tipBody.mesh = new THREE.Mesh(new THREE.SphereBufferGeometry(radius));
        tipBody.mesh.castShadow = true;
        application.scene.add(tipBody.mesh);
        application.world.addBody(tipBody);
        leapController.on('frame', onFrame);
        function onFrame(frame) {
            if (frame.tools.length == 1) {
                var tool = frame.tools[0];
                stickMesh.position.set(tool.tipPosition[0], tool.tipPosition[1], tool.tipPosition[2]); // tool.stabilizedTipPosition[0], tool.stabilizedTipPosition[1], tool.stabilizedTipPosition[2]);
                direction.set(tool.direction[0], tool.direction[1], tool.direction[2]);
                stickMesh.quaternion.setFromUnitVectors(UP, direction);
                toolRoot.visible = true;
                tipBody.mesh.visible = true;
                avatar.updateMatrixWorld();
                position.set(0, 0, 0);
                stickMesh.localToWorld(position);
                tipBody.position.copy(position);
                tipBody.mesh.position.copy(position);
                tipBody.velocity.set(tool.tipVelocity[0] * scale, tool.tipVelocity[1] * scale, tool.tipVelocity[2] * scale);
            } else {
                toolRoot.visible = false;
                tipBody.mesh.visible = false;
            }
        }
        return toolRoot;
    }
    return makeTool;
})();
