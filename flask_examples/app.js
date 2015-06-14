$.urlParam = function(name){
    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
    if (results==null){
       return null;
    }
    else{
       return results[1] || 0;
    }
}

var backgroundSound = $.urlParam('backgroundSound');

/* global isOSX, Primrose, THREE, isMobile, requestFullScreen */

var DEBUG_VR = false;

function StartDemo ( ) {
  "use strict";
  var application = new Primrose.VRApplication(
      "terrain demo",
      "flask_examples/models/scene.json",
      "flask_examples/models/button.json", {
        maxThrow: 0.1,
        minDeflection: 10,
        colorUnpressed: 0x7f0000,
        colorPressed: 0x007f00,
        toggle: true
      },
      3, 1.1, {
        backgroundColor: 0xafbfff
      }
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
