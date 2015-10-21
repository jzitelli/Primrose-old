/* global pyserver */
function GFXTablet(scene) {
    "use strict";
    if (pyserver.config.WEBSOCKETS.indexOf('/gfxtablet') == -1) {
        return;
    }
    var socket = new WebSocket('ws://' + document.domain + ':' + location.port + '/gfxtablet');
    var gfxtabletCanvas = document.createElement('canvas');
    gfxtabletCanvas.width = 2560;
    gfxtabletCanvas.height = 1600;
    var canvasMap = new THREE.Texture(gfxtabletCanvas, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping,
        THREE.LinearFilter, THREE.LinearFilter);
    var paintableMaterial = new THREE.MeshBasicMaterial({color: 0xffffff, map: canvasMap});
    gfxtabletCanvas.getContext('2d').fillRect(0, 0, gfxtabletCanvas.width, gfxtabletCanvas.height);
    var aspect = gfxtabletCanvas.width / gfxtabletCanvas.height;
    var scale = 2;
    var canvasMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(scale * aspect, scale), paintableMaterial);
    canvasMesh.position.z = -4;

    var cursorMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00});
    cursorMaterial.transparent = true;
    cursorMaterial.opacity = 0.25;
    var cursor = new THREE.Mesh(new THREE.CircleGeometry(0.02), cursorMaterial);
    canvasMesh.add(cursor);
    cursor.visible = false;
    cursor.position.z = 0.01;

    var image = paintableMaterial.map.image;
    var ctx = image.getContext('2d');

    socket.onopen = function () {
        scene.add(canvasMesh);
        // paintableMaterial.map.needsUpdate = true;
        // paintableMaterial.needsUpdate = true;
    };

    function drawStroke (points) {
        ctx.beginPath();
        for (var j = 0; j < points.length - 1; j++) {
            var start = points[j];
            var end = points[j + 1];
            ctx.moveTo(gfxtabletCanvas.width * start.x, gfxtabletCanvas.height
 * start.y);
            ctx.lineTo(gfxtabletCanvas.width * end.x, gfxtabletCanvas.height
 * end.y);
        }

        ctx.strokeStyle = 'rgba(0,255,100,1)'; //stroke.color;
        ctx.lineWidth = 3; //normalizeLineSize(stroke.size);
        //ctx.lineJoin = false; //stroke.join;
        //ctx.lineCap = stroke.cap;
        //ctx.miterLimit = stroke.miterLimit;
        ctx.closePath();
        ctx.stroke();
    }

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

    socket.onerror = function (error) {
        console.log("could not connect to GfxTablet WebSocket");
    };

    var points = [];
    socket.onmessage = function (message) {
        var data = JSON.parse(message.data);
        if (data.p > 0) {
            cursor.visible = false;
            points.push(data);
            // circle(gfxtabletCanvas.width * data.x,
            //     gfxtabletCanvas.height * data.y,
            //     2 + 50*data.p * data.p, '255,0,0', 0.1 + 0.9 * data.p, ctx);
            if (points.length >= 2) {
                drawStroke(points);
                paintableMaterial.map.needsUpdate = true;
                points.splice(0, points.length-1);
            }
        } else {
            if (data.button !== undefined) {
                drawStroke(points);
                paintableMaterial.map.needsUpdate = true;
                points.splice(0, points.length);
            }
            // draw brush cursor
            cursor.visible = true;
            cursor.position.x = -aspect * scale / 2 + aspect * scale * data.x;
            cursor.position.y = scale / 2 - scale * data.y;
        }
        // if (data.button !== undefined) {
        //     console.log(data.x + ' ' + data.y + ' ' + data.p + ' ' + data.button + ' ' + data.button_down);
        // }
    };
}
