/* global WebVRApplication, CrapLoader, THREE, CANNON, URL_PARAMS, JSON_SCENE */

var application;
var options = {
    gravity: 9.8,
    shadowMap: true
};

var scene = CrapLoader.parse(JSON_SCENE);

var avatar = new THREE.Object3D();
// TODO:
// avatar.position.y = 1.2;
// avatar.position.z = 2;
scene.children.forEach(function (c) {c.position.y -= 1.4;}); //

function onLoad() {
    "use strict";
    var spotLight = new THREE.SpotLight(0xffffff);
    spotLight.position.set(0, 3, 0);
    spotLight.castShadow = true;
    spotLight.shadowCameraNear = 0.02;
    spotLight.shadowCameraFar = 4;
    spotLight.shadowCameraFov = 90;
    scene.add(spotLight);

    application = new WebVRApplication("poolvr", avatar, scene, options);

    // TODO:
    // avatar.add(application.camera);
    application.scene.add(application.camera); //

    application.scene.add(avatar);

    addHands(avatar, {vr: true, effectiveParent: application.camera});

    // leap motion tool tracking (the pool stick)
    // var toolRoot = makeTool();
    // avatar.add(toolRoot);
    // toolRoot.position.set(0, -0.5, -0.75);

    application.start();
}

function setupMenu() {
    "use strict";
    var menu = new THREE.Object3D();
    return menu;
}
