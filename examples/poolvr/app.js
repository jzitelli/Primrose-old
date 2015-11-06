/* global WebVRApplication, CrapLoader, THREE, CANNON, URL_PARAMS, JSON_SCENE, SPE */

var application;
var options = {
    gravity: 9.8,
    shadowMap: true
};

function onLoad() {
    "use strict";
    var avatar = new THREE.Object3D();
    avatar.position.y = 1.2;
    avatar.position.z = 2;

    var scene;
    if (JSON_SCENE) {
        scene = CrapLoader.parse(JSON_SCENE);
    } else {
        scene = new THREE.Scene();
    }
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
    //CrapLoader.CANNONize(toolRoot, application.world);

    application.start();
}

function setupMenu() {
    "use strict";
    var menu = new THREE.Object3D();
    return menu;
}
