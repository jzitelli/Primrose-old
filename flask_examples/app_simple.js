sceneModel = $.QueryString['sceneModel']
  || "flask_examples/models/scene.json";

var options = {gravity: 4, backgroundColor: 0x9fefcf};

options.backgroundSound = $.QueryString['backgroundSound']
  || 'examples/audio/title.ogg';

options.skyBoxPosition = qd['skyBoxPosition'];
if (options.skyBoxPosition) {
  options.skyBoxPosition = options.skyBoxPosition.map(
    function (item) { return parseFloat(item); }
  );
} else {
  options.skyBoxPosition = [0, 0, 0];
}

var skyBoxTexture = $.QueryString['skyBoxTexture']
  || "flask_examples/images/pana1.jpg";
if (skyBoxTexture) {
  options.skyBox = textured(
    shell(80, 12, 7, Math.PI * 2, Math.PI / 1.666),
    skyBoxTexture, true);
}

var floor;
var floorPosition = qd['floorPosition'];
if (floorPosition) {
  floorPosition = floorPosition.map(
    function (item) { return parseFloat(item); }
  );
} else {
  floorPosition = [0, 0.25, 0];
}
var floorLength    = $.QueryString['floorLength'];
var floorWidth     = $.QueryString['floorWidth'];
if (floorLength || floorWidth) {
  var floorTexture   = $.QueryString['floorTexture'];
  var floorTextureST = qd['floorTextureST'];
  if (floorTextureST) {
    floorTextureST = floorTextureST.map(
      function (item) { return parseFloat(item); }
    );
  } else if (!floorTexture) {
    floorTexture = 'examples/models/holodeck.png';
    floorTextureST = [floorLength, floorWidth];
  }
  else {
    floorTextureST = [1, 1];
  }
  floor = textured(
    quad(floorLength || 1, floorWidth || 1),
    floorTexture, false, 1, floorTextureST[0], floorTextureST[1]);
  floor.rotation.set(Math.PI / 2, 0, 0); //x = Math.PI / 2;
  floor.position.set(floorPosition[0], floorPosition[1], floorPosition[2]);
  options.floor = floor;
}

options.gridX = $.QueryString['gridX'];
options.gridY = $.QueryString['gridY'];
options.gridZ = $.QueryString['gridZ'];

/* global isOSX, Primrose, THREE, isMobile, requestFullScreen */

var DEBUG_VR = false;

function StartDemo ( ) {
  "use strict";
  var application = new TerrainApplication(
      "Simple App",
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
  application.addEventListener( "ready", function () {
    for(var i = 0; i < 5; ++i){
      btns.push(application.makeButton());
      btns[i].moveBy((i - 2) * 2, 0, -2);
    }
  } );

  var t = 0;
  application.addEventListener( "update", function ( dt ) {
    t += dt;
  } );

  application.start();
}
