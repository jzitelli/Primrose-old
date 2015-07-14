var DEBUG_MODE = $.QueryString['debug'];
var EMPTY_MODE = $.QueryString['empty'];
var WATER_MODE = $.QueryString['water'];
var TERRAIN_MODE = $.QueryString['terrain'];
var FOG_MODE = $.QueryString['fog'];
var LOG_MODE = $.QueryString['log'] || 1;
var VR_MODE = $.QueryString['vr'];

var backgroundColor = $.QueryString['backgroundColor'] || SPE.utils.randomColor(new THREE.Color("#ffeebb"),
    new THREE.Vector3(1.1, 1.2, 1.3)).getHex(); // 0x2122ee; // 0x000110;
// 16768917; // pale mars/creamy sandish
var fogColor = $.QueryString['fogColor'] || backgroundColor;
var gravity = $.QueryString['gravity'] || 0;
var options = {
    backgroundColor: fogColor,
    gravity: gravity,
    drawDistance: 2000,
    dtNetworkUpdate: 10
};
if (FOG_MODE == 1) {
    options.fog = new THREE.FogExp2(fogColor, 0.015, 20, 800);
} else if (FOG_MODE == 2) {
    options.fog = new THREE.Fog(fogColor, 10, 1000);
}

function makeSkyBox() {
    // from http://stemkoski.github.io/Three.js/#skybox
    var imagePrefix = "flask_examples/images/dawnmountain-";
    var directions = ["xpos", "xneg", "ypos", "yneg", "zpos", "zneg"];
    var imageSuffix = ".png";
    var images = directions.map(function(dir) {
        return imagePrefix + dir + imageSuffix;
    });
    var textureCube = THREE.ImageUtils.loadTextureCube(images);
    // see http://stackoverflow.com/q/16310880
    var skyGeometry = new THREE.CubeGeometry(800, 800, 800);
    var shader = THREE.ShaderLib["cube"];
    shader.uniforms["tCube"].value = textureCube;
    var skyMaterial = new THREE.ShaderMaterial({
        fragmentShader: shader.fragmentShader,
        vertexShader: shader.vertexShader,
        uniforms: shader.uniforms,
        depthWrite: false,
        side: THREE.BackSide
    });
    return new THREE.Mesh(skyGeometry, skyMaterial);
}

//options.skyBox = makeSkyBox();

options.walkSpeed = 3;
options.floatSpeed = 3 * options.walkSpeed;

options.editors = [];

var avatarModel = $.QueryString['avatarModel'] || "wings_data/subvr_frame.dae";
var sceneModel = $.QueryString['sceneModel'] || "flask_examples/models/ConfigUtilDeskScene.json";
options.sceneScale = 0.0116;
options.scenePosition = new THREE.Vector3(0, -0.67, -2.2);

/* global isOSX, Primrose, THREE, isMobile, requestFullScreen */
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

        var application = new WebVRApplication("Demo", options);
        var t = 0;
        application.addEventListener("update", function (dt) {
            t += dt;
        });
        application.addEventListener("ready", function () {
            webvr_terrain.call(application);
            application.textGeometryOptions = {
                size: 0.1,
                height: 0,
                font: 'liberation mono', //'droid sans',
                weight: 'bold', //'normal',
                curveSegments: 2
            };
            application.menuMesh = new THREE.Object3D();
            application.menuMesh.add(new THREE.Mesh(new THREE.TextGeometry("hello", application.textGeometryOptions),
                new THREE.MeshBasicMaterial({color: 0xff2211}))));
            application.menuMesh.position.z -= 3;
            application.menuMesh.mass = 100.0;
            application.options.avatarMesh.add(application.menuMesh);
            application.menuMesh.visible = false;
        });
        application.start();

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
    });
}
