/* global WebVRApplication, CrapLoader, THREE, CANNON, URL_PARAMS, JSON_SCENE, SPE */

var application;
var options = ( function () {
    "use strict";
    var backgroundColor = 0x000121;
    var options = {
        backgroundColor: backgroundColor,
        gravity: 0.17
    };
    var FOG_MODE = URL_PARAMS.fog || 2;
    var fogColor = URL_PARAMS.fogColor || 0x0c0501 || 0x000121 || options.backgroundColor;
    if (FOG_MODE == 2) {
        options.fog = new THREE.FogExp2(fogColor, 0.09, 18, 600); // 0.14
        options.backgroundColor = fogColor;
    } else if (FOG_MODE) {
        options.fog = new THREE.Fog(fogColor, 5, 80);
        options.backgroundColor = fogColor;
    }
    return options;
} )();

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

    application = new WebVRApplication("webvrBilliards", avatar, scene, options);

    avatar.add(application.camera);
    application.scene.add(avatar);

    // leap motion tool tracking (the pool stick)
    addTool(avatar);

    application.start();
}

function setupMenu (avatar) {

}
