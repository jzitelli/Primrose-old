function GFXTablet(scene) {
    "use strict"
    var socket = new WebSocket('ws://' + document.domain + ':' + location.port + '/gfxtablet');
    var paintableMaterial
    var gfxtabletCanvas;
    socket.onopen = function () {
        gfxtabletCanvas = document.createElement('canvas');
        gfxtabletCanvas.width = 2560;
        gfxtabletCanvas.height = 1600;
        gfxtabletCanvas.getContext('2d').fillRect(0, 0, gfxtabletCanvas.width, gfxtabletCanvas.height);
        var aspect = gfxtabletCanvas.width / gfxtabletCanvas.height;
        var canvasMap = new THREE.Texture(gfxtabletCanvas, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping,
            THREE.LinearFilter, THREE.LinearFilter);
        paintableMaterial = new THREE.MeshBasicMaterial({color: 0xffffff, map: canvasMap});
        var canvasMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2*aspect, 2), paintableMaterial);
        scene.add(canvasMesh);
        paintableMaterial.map.needsUpdate = true;
        paintableMaterial.needsUpdate = true;
    };
    function circle(x, y, r, c, o, ctx) {
        var opacity = o || 0.8;
        ctx.beginPath();
        var rad = ctx.createRadialGradient(x, y, r/2, x, y, r);
        rad.addColorStop(0, 'rgba('+c+','+opacity+')');
        rad.addColorStop(0.5, 'rgba('+c+','+opacity+')');
        rad.addColorStop(1, 'rgba('+c+',0)');
        ctx.fillStyle = rad;
        ctx.arc(x, y, r, 0, Math.PI*2, false);
        ctx.fill();
        ctx.closePath();
    }
    socket.onmessage = function (message) {
        var data = JSON.parse(message.data);
        if (data.p > 0) {
            var image = paintableMaterial.map.image;
            var ctx = image.getContext('2d');
            circle(gfxtabletCanvas.width * data.x, 
                gfxtabletCanvas.height * data.y,
                2 + 20*data.p, '255,0,0', 0.1 + 0.9 * data.p, ctx);
            paintableMaterial.map.needsUpdate = true;
            paintableMaterial.needsUpdate = true;
        }
        // if (data.button !== undefined) {
        //     console.log(data.x + ' ' + data.y + ' ' + data.p + ' ' + data.button + ' ' + data.button_down);
        // }
    };
}
