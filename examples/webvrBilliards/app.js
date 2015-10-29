/* global WebVRApplication, CrapLoader, THREE, CANNON, URL_PARAMS, JSON_SCENE, SPE */

var application;
var options = {};

function onLoad() {
    "use strict";
    var avatar = new THREE.Object3D();
    avatar.position.z = 2;

    var scene;
    if (JSON_SCENE) {
        scene = CrapLoader.parse(JSON_SCENE);
    } else {
        scene = new THREE.Scene();
    }

    application = new WebVRApplication("poolvr", avatar, scene, options);

    avatar.add(application.camera);
    application.scene.add(avatar);

    // leap motion tool tracking (the pool stick)
    addTool(avatar);

    application.start();
}

function setupMenu (avatar) {

}
