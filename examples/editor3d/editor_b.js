log('editor B!');
var textgeom = new THREE.TextGeometry('Hello World!', {
  size: 1,
  height: 0.2,
  curveSegments: 3,
  font: 'janda manatee solid',
  weight: 'normal',
  bevelThickness: 0.04,
  bevelSize: 0.08,
  bevelEnabled: true
});

//var textgeom = new THREE.TextGeometry('asdfasdfasgdsfgsdhsdg',
//    {size: 1, height: 0.2, font: 'helvetiker', weight: 'normal'});

var mesh = new THREE.Mesh(textgeom,
  new THREE.MeshLambertMaterial({
    color: 0x1234ff
  }));

mesh.position.y = 0.25;
mesh.position.z = 4;

scene.add(mesh);

var radiusb = 3,
    angleb = 0,
    dAngleb = Math.PI / 360;

setInterval(function () {
  mesh.position.x = radiusb * Math.cos(angleb);
  mesh.position.z = radiusb * Math.sin(angleb);
  mesh.rotation.y = angleb / 2;
  angleb += dAngleb;
}, 8);

// focus on this window and hit CTRL+SHIFT+SPACE (Windows/Linux) or CMD+OPT+E (OS X) to execute.
