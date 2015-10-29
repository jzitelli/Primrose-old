/* global WebVRApplication, CrapLoader, THREE, CANNON, URL_PARAMS, JSON_SCENE, SPE */

var application;
var options = {gravity: 0.3};

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

    application = new WebVRApplication("poolvr", avatar, scene, options);

    avatar.add(application.camera);
    application.scene.add(avatar);

    // leap motion tool tracking (the pool stick)
    var toolRoot = makeTool();
    avatar.add(toolRoot);

    application.start();
}

function setupMenu() {
    "use strict";
    var menu = new THREE.Object3D();
    return menu;
}
