var TextGeomLog = (function () {

    var options = {
        size: 0.5,
        height: 0,
        font: 'droid sans',
        weight: 'normal',
        curveSegments: 2
    };
    var logMaterial = new THREE.MeshBasicMaterial({
        color: 0x22ff11,
        side: THREE.DoubleSide
    });

    function TextGeomLog(scene, maxLines, camera) {
        this.scene = scene;
        this.maxLines = maxLines || 10;
        this.camera = camera;

        this.logMsgs = [];
        this.logMeshes = [];
        this.logDisplayed = [];
    }

    TextGeomLog.prototype.log = function (msg) {
        this.logMsgs.push(msg);
        var mesh;
        var index = this.logMsgs.slice(0, -1).indexOf(msg);
        if (index > -1) {
            mesh = this.logMeshes[index].clone();
        } else {
            var geometry = new THREE.TextGeometry(msg, options);
            mesh = new THREE.Mesh(geometry, logMaterial);
        }
        this.logMeshes.push(mesh);
        this.logDisplayed.push(mesh);
        this.scene.add(mesh);
        if (this.logDisplayed.length > this.maxLines) {
            mesh = this.logDisplayed.shift();
            this.scene.remove(mesh);
        }
        for (var i = 0; i < this.logDisplayed.length; ++i) {
            mesh = this.logDisplayed[i];
            mesh.position.x = this.camera.position.x - 10.0;
            mesh.position.z = this.camera.position.z - 10.0;
            mesh.position.y = 10 + (this.logDisplayed.length - i - 1) * 1.75 * options.size;
        }    
    };

    return TextGeomLog;
})();