var textgeom = new THREE.TextGeometry("Hello World!", {
  size: 1.0,
  height: 0.4,
  font: 'janda manatee solid',
  weight: 'normal',
  bevelThickness: 0.03,
  bevelSize: 0.07,
  bevelEnabled: true
});

var mesh = new THREE.Mesh(textgeom,
  new THREE.MeshLambertMaterial({color: 0xff2345,
      transparent: false,
      side: THREE.DoubleSide
    }));

mesh.position.x = body.position.x + 0.2;
mesh.position.y = 0.25;
mesh.position.z = body.position.z + 2;
scene.add(mesh);

var radiusb = 3,
    angleb = 0,
    dAngleb = Math.PI / 360;

setInterval(function () {
  mesh.position.x = radiusb * Math.cos(angleb);
  mesh.position.z = radiusb * Math.sin(angleb);
  mesh.rotation.y = angleb / 2;
  angleb += dAngleb;}, 8);
