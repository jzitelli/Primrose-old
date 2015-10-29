/* global pyserver */
function GFXTablet(scene, width, height) {
    "use strict";
    if (pyserver.config.WEBSOCKETS.indexOf('/gfxtablet') == -1) {
        return;
    }
    width = width || 2560 / 2;
    height = height || 1600 / 2;
    var socket = new WebSocket('ws://' + document.domain + ':' + location.port + '/gfxtablet');
    var gfxtabletCanvas = document.createElement('canvas');
    gfxtabletCanvas.width = width;
    gfxtabletCanvas.height = height;
    var aspect = gfxtabletCanvas.width / gfxtabletCanvas.height;
    var texture = new THREE.Texture(gfxtabletCanvas, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping,
        THREE.LinearFilter, THREE.LinearFilter);
    var paintableMaterial = new THREE.MeshBasicMaterial({color: 0xffffff, map: texture});
    var image = paintableMaterial.map.image;
    var ctx = image.getContext('2d');
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.fillRect(0, 0, gfxtabletCanvas.width, gfxtabletCanvas.height);
    var scale = 2;
    var canvasMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(scale * aspect, scale), paintableMaterial);
    canvasMesh.position.z = -4;
    paintableMaterial.map.needsUpdate = true;

    var cursorMaterial = new THREE.MeshBasicMaterial({color: 0xeeff66});
    cursorMaterial.transparent = true;
    cursorMaterial.opacity = 0.25;
    var cursor = new THREE.Mesh(new THREE.CircleGeometry(0.02), cursorMaterial);
    canvasMesh.add(cursor);
    cursor.position.z = 0.01;
    cursor.visible = false;

    ctx.lineCap = 'round';
    //ctx.lineJoin = stroke.join;
    //ctx.miterLimit = stroke.miterLimit;

    function drawStroke (points) {
        if (points.length === 0)
            return;
        var start = points[0];
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,255,100,1)'; //stroke.color;
        ctx.lineWidth = 5; //normalizeLineSize(stroke.size);
        ctx.moveTo(gfxtabletCanvas.width * start.x, gfxtabletCanvas.height * start.y);
        for (var j = 1; j < points.length; j++) {
            var end = points[j];
            ctx.lineTo(gfxtabletCanvas.width * end.x, gfxtabletCanvas.height * end.y);
        }
        ctx.stroke();
    }

    function circle(x, y, r, c, o) {
        var opacity = o || 1;
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

    socket.onopen = function () {
        scene.add(canvasMesh);
    };
    socket.onerror = function (error) {
        console.log("could not connect to GfxTablet WebSocket");
    };
    var points = [];
    var stroking = false;
    socket.onmessage = function (message) {
        var data = JSON.parse(message.data);
        if (data.p > 0) {
            points.push(data);
            // circle(gfxtabletCanvas.width * data.x, gfxtabletCanvas.height * data.y,
            //     2 + 50*data.p * data.p, '255,0,0', 0.1 + 0.9 * data.p);
            if (points.length > 3) {
                drawStroke(points);
                paintableMaterial.map.needsUpdate = true;
                points.splice(0, 3);
            }
        }
        if (data.button !== undefined) {
            if (data.button_down === 0) {
                drawStroke(points);
                stroking = false;
                paintableMaterial.map.needsUpdate = true;
                points = [];
            } else {
                stroking = true;
            }
        }
        if (stroking) {
            cursor.visible = false;
        } else {
            cursor.visible = true;
            cursor.position.x = -aspect * scale / 2 + aspect * scale * data.x;
            cursor.position.y = scale / 2 - scale * data.y;
        }
    };
}
