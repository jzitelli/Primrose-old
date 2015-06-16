var sceneModel = $.QueryString['sceneModel']
  || "flask_examples/models/scene.json";
var skyBoxTexture = $.QueryString['skyBoxTexture']
  || "flask_examples/images/pana1.jpg";
var skyBoxPosition = qd['skyBoxPosition'];
if (skyBoxPosition) {
  skyBoxPosition = skyBoxPosition.map(
    function (item) { return parseFloat(item); }
  );
} else {
  skyBoxPosition = [0, 0, 0];
}
var skyBox = textured(
  shell(80, 12, 7, Math.PI * 2, Math.PI / 1.666),
  skyBoxTexture, true);


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
}


var gridX = $.QueryString['gridX'] || 0;
var gridY = $.QueryString['gridY'] || 0;
var gridZ = $.QueryString['gridZ'] || 0;


var backgroundSound = $.QueryString['backgroundSound'];


/* global isOSX, Primrose, THREE, isMobile, requestFullScreen */

var DEBUG_VR = false;

function StartDemo ( ) {
  "use strict";
  var application = new Primrose.VRApplication(
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
      {backgroundColor: 0x9fefcf,
       skyBox: skyBox,
       skyBoxPosition: skyBoxPosition,
       floor: floor}
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


  var audio3d = new Primrose.Output.Audio3D();
  function playSound(buffer, time) {
    var source = audio3d.context.createBufferSource();
    source.buffer = buffer;
    source.connect(audio3d.context.destination);
    source[source.start ? 'start' : 'noteOn'](time);
  }

  if (backgroundSound) {
    audio3d.loadBuffer(
      // TODO:
      // "flask_examples/sounds/backgroundmusic.ogg",
      //"examples/audio/game1.ogg",
      backgroundSound,
      null,
      function (buffer) {
        playSound(buffer, 0);
      }
    );
  }

  application.start();
}
