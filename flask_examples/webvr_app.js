var DEBUG_MODE = $.QueryString['debug'];
var EMPTY_MODE = $.QueryString['empty'];
var WATER_MODE = $.QueryString['water'];
var TERRAIN_MODE = $.QueryString['terrain'];
var FOG_MODE = $.QueryString['fog'];
var LOG_MODE = $.QueryString['log'] || 1;
var VR_MODE = $.QueryString['vr'];

var options = {
    backgroundColor: $.QueryString['fogColor'] || $.QueryString['backgroundColor'] ||
        SPE.utils.randomColor(new THREE.Color(16768917), //"#ffeebb"), // 0x2122ee; // 0x000110;
                              new THREE.Vector3(1.1, 1.2, 1.3)).getHex(),
    gravity: $.QueryString['gravity'] || 0
};
if (FOG_MODE == 1) {
    options.fog = new THREE.FogExp2(fogColor, 0.015, 20, 800);
} else if (FOG_MODE == 2) {
    options.fog = new THREE.Fog(fogColor, 10, 1000);
}

//options.skyBox = makeSkyBox();

options.walkSpeed = 3;
options.floatSpeed = 0.9 * options.walkSpeed;

options.editors = [];

var avatarModel = $.QueryString['avatarModel'] || "flask_examples/models/avatar.dae";
var sceneModel = $.QueryString['sceneModel'] || "flask_examples/models/ConfigUtilDeskScene.json";

/* global isOSX, Primrose, THREE, isMobile, requestFullScreen */
var application;
function StartDemo() {
    //"use strict";
    var colladaLoader = new THREE.ColladaLoader();
    colladaLoader.load(avatarModel, function(loadedObj) {
        console.log("loaded collada avatarModel " + avatarModel);
        console.log(loadedObj);
        loadedObj.scene.traverse(function(obj) {
            if (obj instanceof THREE.Mesh) {
                var material = new THREE.MeshPhongMaterial({
                        shading: THREE.FlatShading,
                        color: 0x1122ee,
                        shininess: 25,
                        specular: 0xffeeee
                });
                options.avatarMesh = new THREE.Mesh(obj.geometry.clone(), material);
                options.avatarMesh.castShadow = true;
                options.avatarMesh.receiveShadow = true;
                options.avatarMesh.name = "avatarMesh";
                options.avatarMesh.geometry.computeBoundingSphere();
                options.avatarRadius = options.avatarMesh.geometry.boundingSphere.radius;
                options.avatarMesh.geometry.computeVertexNormals();
                options.avatarMesh.geometry.computeFaceNormals();
                var mesh = options.avatarMesh;
                options.avatarMesh = new THREE.Object3D();
                options.avatarMesh.add(mesh);
            }
        });

        application = new WebVRApplication("Demo", options);
        var t = 0;

        application.addEventListener("ready", function () {

            // webvr_terrain.call(application);

            webvr_mouse();

            application.textGeometryOptions = {
                size: 0.1,
                height: 0,
                font: 'droid sans',
                weight: 'normal',
                curveSegments: 2
            };
            application.menuMesh = new THREE.Object3D();
            application.menuMesh.add(new THREE.Mesh(new THREE.TextGeometry("hello", application.textGeometryOptions),
                new THREE.MeshBasicMaterial({color: 0xff2211})));
            application.menuMesh.position.z -= 3;
            application.options.avatarMesh.add(application.menuMesh);
            application.menuMesh.visible = false;

                if (WATER_MODE) {
                    // Load textures        
                    var waterNormals = new THREE.ImageUtils.loadTexture('flask_examples/images/waternormals.jpg');
                    waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;

                    // Create the water effect
                    application.ms_Water = new THREE.Water(application.renderer, application.camera, application.scene, {
                        textureWidth: 512,
                        textureHeight: 512,
                        waterNormals: waterNormals,
                        alpha: 1, //0.75,
                        sunDirection: new THREE.Vector3(0, -1, 0),
                        sunColor: 0xffffaa,
                        waterColor: 0x001e1f,
                        distortionScale: 8.0,
                        side: THREE.FrontSide,
                        castShadow: false
                    });
                    var aMeshMirror = new THREE.Mesh(
                        new THREE.PlaneBufferGeometry(500, 500, 1, 1),
                        application.ms_Water.material
                    );
                    aMeshMirror.add(application.ms_Water);
                    aMeshMirror.rotation.x = -Math.PI / 2;
                    application.scene.add(aMeshMirror);
                }

            if (options.skyBox) {
                application.scene.add(options.skyBox);
            }
        });

        application.addEventListener("update", function (dt) {
            t += dt;

                    if (application.ms_Water) {
            application.ms_Water.render();
            application.ms_Water.material.uniforms.time.value += 0.5 * dt;
        }
        });


        application.gamepad.addCommand({
            name: "selectNextObj",
            buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.A],
            commandDown: application.selectNextObj.bind(application),
            dt: 0.25
        });
        application.gamepad.addCommand({
            name: "brushDown",
            buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.rightTrigger],
            commandDown: application.brushDown.bind(application),
            commandUp: application.brushUp.bind(application),
            dt: 0.05
        });
        application.gamepad.addCommand({
            name: "createObject",
            buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.leftTrigger],
            commandDown: application.createObject.bind(application),
            dt: 0.1
        });
        application.gamepad.addCommand({
            name: "mystery",
            buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.up],
            commandDown: application.mystery.bind(application),
            dt: 1.0
        });
        application.gamepad.addCommand({
            name: "shoot",
            buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.rightBumper],
            commandDown: application.shootCube.bind(application),
            dt: 0.2
        });
        application.gamepad.addCommand({
            name: "displayMenu",
            buttons: [Primrose.Input.Gamepad.XBOX_BUTTONS.start],
            commandDown: application.displayMenu.bind(application),
            commandUp: application.hideMenu.bind(application),
            dt: 0.1
        });

        application.start();
    });
}
