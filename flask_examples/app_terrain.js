// see http://stackoverflow.com/a/3855394:
(function($) {
    $.QueryString = (function(a) {
        if (a == "") return {};
        var b = {};
        for (var i = 0; i < a.length; ++i)
        {
            var p=a[i].split('=');
            if (p.length != 2) continue;
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
        }
        return b;
    })(window.location.search.substr(1).split('&'))
})(jQuery);

var qd = {};
location.search.substr(1).split("&").forEach(function(item) {var k = item.split("=")[0], v = decodeURIComponent(item.split("=")[1]); (k in qd) ? qd[k].push(v) : qd[k] = [v]});






var worldWidth = 256, worldDepth = 256,
worldHalfWidth = worldWidth / 2, worldHalfDepth = worldDepth / 2;

var clock = new THREE.Clock();


function generateHeight( width, height ) {

  var size = width * height, data = new Uint8Array( size ),
  perlin = new ImprovedNoise(), quality = 1, z = Math.random() * 100;

  for ( var j = 0; j < 4; j ++ ) {

    for ( var i = 0; i < size; i ++ ) {

      var x = i % width, y = ~~ ( i / width );
      data[ i ] += Math.abs( perlin.noise( x / quality, y / quality, z ) * quality * 1.75 );

    }

    quality *= 5;

  }

  return data;

}

function generateTexture( data, width, height ) {

  var canvas, canvasScaled, context, image, imageData,
  level, diff, vector3, sun, shade;

  vector3 = new THREE.Vector3( 0, 0, 0 );

  sun = new THREE.Vector3( 1, 1, 1 );
  sun.normalize();

  canvas = document.createElement( 'canvas' );
  canvas.width = width;
  canvas.height = height;

  context = canvas.getContext( '2d' );
  context.fillStyle = '#000';
  context.fillRect( 0, 0, width, height );

  image = context.getImageData( 0, 0, canvas.width, canvas.height );
  imageData = image.data;

  for ( var i = 0, j = 0, l = imageData.length; i < l; i += 4, j ++ ) {

    vector3.x = data[ j - 2 ] - data[ j + 2 ];
    vector3.y = 2;
    vector3.z = data[ j - width * 2 ] - data[ j + width * 2 ];
    vector3.normalize();

    shade = vector3.dot( sun );

    imageData[ i ] = ( 96 + shade * 128 ) * ( 0.5 + data[ j ] * 0.007 );
    imageData[ i + 1 ] = ( 32 + shade * 96 ) * ( 0.5 + data[ j ] * 0.007 );
    imageData[ i + 2 ] = ( shade * 96 ) * ( 0.5 + data[ j ] * 0.007 );
  }
  context.putImageData( image, 0, 0 );

  // Scaled 4x
  canvasScaled = document.createElement( 'canvas' );
  canvasScaled.width = width * 4;
  canvasScaled.height = height * 4;
  context = canvasScaled.getContext( '2d' );
  context.scale( 4, 4 );
  context.drawImage( canvas, 0, 0 );
  image = context.getImageData( 0, 0, canvasScaled.width, canvasScaled.height );
  imageData = image.data;
  for ( var i = 0, l = imageData.length; i < l; i += 4 ) {
    var v = ~~ ( Math.random() * 5 );
    imageData[ i ] += v;
    imageData[ i + 1 ] += v;
    imageData[ i + 2 ] += v;
  }
  context.putImageData( image, 0, 0 );
  return canvasScaled;
}

var data = generateHeight( worldWidth, worldDepth );
var geometry = new THREE.PlaneBufferGeometry( 7500, 7500, worldWidth - 1, worldDepth - 1 );
geometry.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) );
var vertices = geometry.attributes.position.array;

var datamin = Math.min.apply(Math, data),
    datamax = Math.max.apply(Math, data);
console.log("datamax, datamin:", datamax, datamin);

for ( var i = 0, j = 0, l = vertices.length; i < l; i ++, j += 3 ) {
  vertices[ j + 1 ] = data[ i ]; // * 10;
}
var texture = new THREE.Texture( generateTexture( data, worldWidth, worldDepth ), THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping );
texture.needsUpdate = true;
var terrain = new THREE.Mesh(
  geometry,
  new THREE.MeshLambertMaterial( { side: THREE.DoubleSide, map: texture } )); //, color: 0xefef00 } ));
terrain.scale.set(0.1, 0.1, 0.1);
terrain.position.y -= 0.4; //set(0, 0.1, 0);

  //color: 0xefef00 } )); //map: texture } ) );













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
  shell(200, 12, 7, Math.PI * 2, Math.PI / 1.666),
  skyBoxTexture, true);

var floorLength    = $.QueryString['floorLength'];
var floorWidth     = $.QueryString['floorWidth'];
var floorTexture   = $.QueryString['floorTexture'];
var floorTextureST = qd['floorTextureST'];
if (floorTextureST) {
  floorTextureST = floorTextureST.map(
    function (item) { return parseFloat(item); }
  );
} else if (!floorTexture) {
  floorTexture = 'examples/models/holodeck.png';
  floorTextureST = [floorLength, floorWidth];
} else {
  floorTextureST = [1, 1];
}
var floorPosition = qd['floorPosition'];
if (floorPosition) {
  floorPosition = floorPosition.map(
    function (item) { return parseFloat(item); }
  );
} else {
  floorPosition = [0, 0.25, 0];
}
var floor;
if (floorLength || floorWidth) {
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
       floor: floor,
       terrain: terrain}
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
