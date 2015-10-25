/* global WebVRApplication, CrapLoader, THREE, CANNON, URL_PARAMS, JSON_SCENE, SPE */

var application;
var options = ( function () {
    "use strict";
    var backgroundColor = 0x000121;
    var options = {
        backgroundColor: backgroundColor,
        shadowMap: true
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
var avatarModel = "models/aPerson.dae";

function onLoad() {
    "use strict";
    var avatar = new THREE.Object3D();
    avatar.name = "user_00000000";

    var scene;
    if (JSON_SCENE) {
        scene = CrapLoader.parse(JSON_SCENE);
    } else {
        scene = new THREE.Scene();
    }

    application = new WebVRApplication("webvrBilliards", avatar, scene, options);

    CrapLoader.load(avatarModel, function(loaded) {
        loaded.traverse(function(obj) {
            if (obj instanceof THREE.Mesh) {
                var mesh = obj;
                mesh.castShadow = false;
                mesh.receiveShadow = false;
                if (mesh.material instanceof THREE.MeshFaceMaterial) {
                    mesh.material.materials.forEach(function(e, i, a) {
                        e.shading = THREE.FlatShading;
                        e.needsUpdate = true;
                    });
                }
                avatar.add(mesh);
                if (avatar.boundingMesh) {
                    if (avatar.boundingMesh.geometry.boundingSphere.radius < obj.geometry.boundingSphere.radius) {
                        avatar.boundingMesh = obj;
                    }
                } else {
                    avatar.boundingMesh = obj;
                }
            }
        });

        avatar.add(application.camera);
        application.scene.add(avatar);

        // avatar.physics = new CANNON.Body({mass: 1,
        //     shape: new CANNON.Sphere(avatar.boundingMesh.geometry.boundingSphere.radius)});
        // avatar.physics.position.copy(avatar.position);
        // application.world.add(avatar.physics);
        // avatar.physics.graphics = avatar;

        // leap motion tool tracking (the pool stick)
        addTool(avatar);

        application.start();
    });

}

function setupMenu (avatar) {

}
