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
