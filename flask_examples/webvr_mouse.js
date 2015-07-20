function webvr_mouse() {
    window.addEventListener("wheel", mouseWheel);
    window.addEventListener("mousedown", mouseDown);
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseup", mouseUp);
    //application.scene.add(pointer);
    application.options.avatarMesh.add(pointer);
}

var pointer = new THREE.Mesh(new THREE.SphereBufferGeometry(0.04, 5, 7), new THREE.MeshBasicMaterial({
    color: 0xffeebb
}));
pointer.position.z -= 1;
var lastPointerX, lastPointerY;
var pointerX, pointerY;

function setPointer(x, y) {
    if (lastPointerX !== undefined) {
        var dx = x - lastPointerX,
            dy = y - lastPointerY,
            nextX = pointerX + dx,
            nextY = pointerY + dy;
/*        if (nextX < 0 || nextX > application.ctrls.frontBuffer.width) {
            dx = 0;
        }
        if (nextY < 0 || nextY > application.ctrls.frontBuffer.height) {
            dy = 0;
        }
*/
        pointerX += dx;
        pointerY += dy;

/*        application.mouse.set(
            2 * (pointerX / application.ctrls.frontBuffer.width) - 1, -2 * (pointerY / application.ctrls.frontBuffer.height) + 1);
*/
        pointer.position.x = x / application.ctrls.frontBuffer.width - 0.5; //pointerX / 100;
        pointer.position.y = -y / 1000; //pointerY / 100;
        // raycaster.setFromCamera(mouse, camera);
        // if (currentEditor) {
        //     lastEditor = currentEditor;
        // }
        // currentEditor = null;
        // var objects = raycaster.intersectObject(scene, true);
        // var found = false;
        // for (var i = 0; i < objects.length; ++i) {
        //     var obj = objects[i];
        //     if (obj.object.editor) {
        //         pointer.position.set(0, 0, 0);
        //         pointer.lookAt(obj.face.normal);
        //         pointer.position.copy(obj.point);
        //         currentEditor = obj.object.editor;
        //         found = true;
        //         break;
        //     }
        // }
        // if (!found) {
        //     pointer.position.copy(raycaster.ray.direction);
        //     pointer.position.multiplyScalar(3);
        //     pointer.position.add(raycaster.ray.origin);
        // }

    } else {
        pointerX = x;
        pointerY = y;
    }
    lastPointerX = x;
    lastPointerY = y;

    // var good = false;
    // if (currentEditor) {
    //     currentEditor.focus();
    //     good = true;
    // }

    // if (!good && lastEditor && lastEditor.focused) {
    //     lastEditor.blur();
    //     lastEditor = null;
    // }

}

function mouseWheel(evt) {
    application.selectNextObj();
    /*    if (lastEditor) {
        lastEditor.readWheel(evt);
    }
*/
}

function mouseDown(evt) {
    dragging = true;
    /*    if (!isPointerLocked()) {
        lastMouseX = evt.clientX;
        lastMouseY = evt.clientY;
    }

    setPointer(lastMouseX, lastMouseY);
    pick("start");
*/

//        application.showMenu();

}

var lastMouseX, lastMouseY;
function mouseMove(evt) {
    var rotating = evt.shiftKey; // || !editor.visible;
    /*    if (isPointerLocked()) {
        var dx = evt.movementX,
            dy = evt.movementY;
        if (dx === undefined) {
            dx = evt.mozMovementX;
            dy = evt.mozMovementY;
        }

        if (dx !== undefined) {
            if (rotating) {
                heading -= dx * 0.001;
                pitch += dy * 0.001;
            }
            if (lastMouseX === undefined) {
                lastMouseX = dx;
                lastMouseY = dy;
            } else {
                lastMouseX += dx;
                lastMouseY += dy;
            }
        }
    */
    var x = evt.clientX,
        y = evt.clientY;

    // if (lastMouseX !== undefined && rotating) {
    //     heading -= (x - lastMouseX) * 0.001;
    //     pitch += (y - lastMouseY) * 0.001;
    // }

    lastMouseX = x;
    lastMouseY = y;
    if (lastMouseX !== undefined) {
        setPointer(lastMouseX, lastMouseY);
    }
}

function mouseUp(evt) {
    dragging = false;
    /*    if (lastEditor && lastEditor.focused) {
        lastEditor.endPointer();
    } */
}