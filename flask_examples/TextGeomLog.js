var TextGeomLog = (function () {

    var options = {
        size: 0.222,
        height: 0,
        font: 'liberation mono', //'droid sans',
        weight: 'bold', //'normal',
        curveSegments: 2
    };

    function TextGeomLog(scene, maxLines, camera, hud, color) {
        this.scene = scene;
        this.maxLines = maxLines || 10;
        this.camera = camera;
        this.hud = hud;
        this.logMsgs = [];
        this.logMeshes = [];
        this.logDisplayed = [];
        this.hudDisplayed = [];
        color = color || 0x22ff11;
        this.logMaterial = new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.DoubleSide
        });
    }

    TextGeomLog.prototype.log = function (msg) {
        msg = msg.toString();
        if (msg == "") return;
        var lines = msg.split('\n');
        for (var ii = 0; ii < lines.length; ++ii) {
            msg = lines[ii];
            if (msg == "") continue;
            this.logMsgs.push(msg);
            var mesh;
            var index = this.logMsgs.slice(0, -1).indexOf(msg);
            if (index > -1) {
                mesh = this.logMeshes[index].clone();
            } else {
                var geometry = new THREE.TextGeometry(msg, options);
                mesh = new THREE.Mesh(geometry, this.logMaterial);
            }
            this.logMeshes.push(mesh);
            if (this.hud) {
                var hudMesh = mesh;
                hudMesh.position.z = -14;
                hudMesh.position.x = -8;
                hudMesh.position.y = 0;
                this.hud.add(hudMesh);
                this.hudDisplayed.push(hudMesh);
                if (this.hudDisplayed.length > this.maxLines) {
                    hudMesh = this.hudDisplayed.shift();
                    this.hud.remove(hudMesh);
                }
                for (var i = 0; i < this.hudDisplayed.length; ++i) {
                    hudMesh = this.hudDisplayed[i];
                    hudMesh.position.y = (this.hudDisplayed.length - i - 1) * 1.75 * options.size;
                }
            } else {
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
            }
        }
    };

    return TextGeomLog;
})();