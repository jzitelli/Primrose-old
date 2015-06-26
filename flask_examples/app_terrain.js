var DEBUG_APP = $.QueryString['debug']; //1;

var walkSpeed = 3;
var avatarHeight = 3;

var sceneModel = $.QueryString['sceneModel'] || "flask_examples/models/ConfigUtilDeskScene.json";

var skyBoxTexture = $.QueryString['skyBoxTexture'] || "flask_examples/images/bg4.jpg"; //beach3.jpg";
var skyBoxPosition = qd['skyBoxPosition'];
if (skyBoxPosition) {
    skyBoxPosition = skyBoxPosition.map(
        function(item) {
            return parseFloat(item);
        }
    );
} else {
    skyBoxPosition = [0, 0, 0];
}

var skyBox;
// skyBox = textured(
//     shell(300, 12, 7, Math.PI * 2, Math.PI / 1.666),
//     skyBoxTexture, true);


// from http://stemkoski.github.io/Three.js/#skybox
var imagePrefix = "flask_examples/images/dawnmountain-";
var directions  = ["xpos", "xneg", "ypos", "yneg", "zpos", "zneg"];
var imageSuffix = ".png";
var images = directions.map(function (dir) { return imagePrefix + dir + imageSuffix; });
var textureCube = THREE.ImageUtils.loadTextureCube( images );

// see http://stackoverflow.com/q/16310880

var skyGeometry = new THREE.CubeGeometry( 800,800,800 );
var shader = THREE.ShaderLib[ "cube" ];
shader.uniforms[ "tCube" ].value = textureCube;
var skyMaterial = new THREE.ShaderMaterial( {
    fragmentShader: shader.fragmentShader,
    vertexShader: shader.vertexShader,
    uniforms: shader.uniforms,
    depthWrite: false,
    side: THREE.BackSide
} );

skyBox = new THREE.Mesh( skyGeometry, skyMaterial );


var w = 2;
var h = 2;

var fogColor = 0x2122ee; //0x000110;

var options = {
    //fog: new THREE.FogExp2(fogColor, 0.015, 20, 800),
    backgroundColor: fogColor,
    gravity: 0, //9.8,
    drawDistance: 2000,
    dtNetworkUpdate: 10,
    skyBox: skyBox,
    skyBoxPosition: skyBoxPosition,
    editors: [{
        id: 'editor0',
        w: w, h: h, x: 0, y: 8, z: -3,
        rx: 0, ry: 0, rz: 0,
        options: {
            filename: "editor0.js"
        },
        scale: 3
    }, {
        id: 'editor1',
        w: w, h: h, x: -8, y: 4, z: -2,
        rx: 0, ry: Math.PI / 4, rz: 0,
        options: {
            filename: "editor1.py"
        },
        scale: 3,
    }] //, {
    //     id: 'editor2',
    //     w: w, h: h, x: 8, y: 7, z: -3,
    //     rx: 0, ry: -Math.PI / 4, rz: 0,
    //     options: {
    //         filename: "terrain.js"
    //     },
    //     scale: 3
    // }]
};

/* global isOSX, Primrose, THREE, isMobile, requestFullScreen */
var DEBUG_VR = false;
var application;
var log;
function StartDemo() {
    "use strict";
    application = new TerrainApplication(
        "Terrain Demo",
        sceneModel,
        "flask_examples/models/button.json", {
            maxThrow: 0.1,
            minDeflection: 10,
            colorUnpressed: 0x7f0000,
            colorPressed: 0x007f00,
            toggle: true
        },
        avatarHeight, walkSpeed,
        options
    );
    log = application.log;

    var t = 0;
    application.addEventListener("update", function(dt) {
        t += dt;
    });

    application.start();
    if (DEBUG_APP) {
        $("#main").hide();
    }
}
