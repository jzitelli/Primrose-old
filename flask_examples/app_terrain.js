var DEBUG_APP = $.QueryString['debug']; //1;

var backgroundSound = $.QueryString['backgroundSound'];

var sceneModel = $.QueryString['sceneModel'] || "flask_examples/models/scene2.json";

var skyBoxTexture = $.QueryString['skyBoxTexture'] || "flask_examples/images/axes_1_b.png";
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
var skyBox = textured(
    shell(70, 12, 7, Math.PI * 2, Math.PI / 1.666),
    skyBoxTexture, true);

var options = {
    backgroundSound: backgroundSound,
    fog: new THREE.Fog(0x00ff00),
    backgroundColor: 0x5fafbf,
    gravity: 0.08,
    drawDistance: 1000,
    dtNetworkUpdate: 10,
    skyBox: skyBox,
    skyBoxPosition: skyBoxPosition,
    editors: [{
        id: 'editor0',
        w: 2, h: 2, x: 0, y: 8, z: -3,
        rx: 0, ry: 0, rz: 0,
        options: {
            filename: "editor0.js"
        },
        scale: 3
    }, {
        id: 'editor1',
        w: 2, h: 2, x: -8, y: 4, z: 0,
        rx: 0, ry: Math.PI / 4, rz: 0,
        options: {
            filename: "editor1.py"
        },
        scale: 2,
        hudx: -4,
        hudy: 0.5,
        hudz: -3
    }, {
        id: 'editor2',
        w: 4, h: 4, x: 8, y: 6, z: 0,
        rx: 0, ry: -Math.PI / 4, rz: 0,
        options: {
            filename: "terrain.js"
        },
        scale: 2,
    }]
};

/* global isOSX, Primrose, THREE, isMobile, requestFullScreen */
var DEBUG_VR = false;

function StartDemo() {
    "use strict";
    var application = new TerrainApplication(
        "Terrain Demo",
        sceneModel,
        "flask_examples/models/button.json", {
            maxThrow: 0.1,
            minDeflection: 10,
            colorUnpressed: 0x7f0000,
            colorPressed: 0x007f00,
            toggle: true
        },
        3, 1.1,
        options
    );

    var btns = [];
    application.addEventListener("ready", function() {
        for (var i = 0; i < 5; ++i) {
            btns.push(application.makeButton());
            btns[i].moveBy((i - 2) * 2, 0, -2);
        }
    });

    var t = 0;
    application.addEventListener("update", function(dt) {
        t += dt;
    });

    application.start();
    if (DEBUG_APP) {
        $("#main").hide();
    }
}
