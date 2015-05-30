/*
 * Copyright (C) 2015 Sean
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/*global THREE, qp, Primrose, Assert */

var scene = new THREE.Scene();

function editor3d() {
  "use strict";
  var modA = isOSX ? "metaKey" : "ctrlKey",
      modB = isOSX ? "altKey" : "shiftKey",
      cmdPre = isOSX ? "CMD+OPT" : "CTRL+SHIFT",
      vrDisplay,
      vrSensor,
      vrEffect,
      renderer,
      ctrls = findEverything();


  function clearKeyOption(evt) {
    this.value = "";
    this.dataset.keycode = "";
  }

  function setKeyOption(evt) {
    this.dataset.keycode = evt.keyCode;
    this.value = this.value || Primrose.Keys[evt.keyCode];
    this.value = this.value.toLowerCase()
      .replace("arrow", " arrow");
    this.blur();
  }

  function setupKeyOption(elem, char, code) {
    elem.value = char.toLowerCase();
    elem.dataset.keycode = code;
    elem.addEventListener("keydown", clearKeyOption);
    elem.addEventListener("keyup", setKeyOption);
  }

  function goFullscreen() {
    var elem = ctrls.output;
    if (vrDisplay) {
      if (!vrEffect) {
        vrEffect = new THREE.VREffect(renderer, vrDisplay);
      }
      if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen({
          vrDisplay: vrDisplay
        });
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen({
          vrDisplay: vrDisplay
        });
      }
    } else {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen(window.Element.ALLOW_KEYBOARD_INPUT);
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    }

    if (elem.requestPointerLock) {
      elem.requestPointerLock();
    } else if (elem.webkitRequestPointerLock) {
      elem.webkitRequestPointerLock();
    } else if (elem.mozRequestPointerLock) {
      elem.mozRequestPointerLock();
    }
  }

  function gotVRDevices(devices) {
    for (var i = 0; i < devices.length; ++i) {
      var device = devices[i];
      if (device instanceof window.HMDVRDevice) {
        vrDisplay = device;
      } else if (device instanceof window.PositionSensorVRDevice) {
        vrSensor = device;
      }
      if (vrSensor && vrDisplay) {
        break;
      }
    }
    PrimroseDemo();
  }

  function PrimroseDemo(err) {
    if (err) {
      console.error(err);
    }

    var lt = 0,
      dragging = false,
      lastMouseX,
      lastMouseY,
      lastTouchX,
      lastTouchY,
      touchCount = 0,
      pointerX,
      pointerY,
      currentObject,
      currentEditor,
      touchDrive = 0,
      touchStrafe = 0,
      SPEED = 0.0015,
      heading = 0,
      pitch = 0,
      keyState = {},
      w1 = 2,
      h = 1.25,
      w2 = 2,
      pickingScene = new THREE.Scene(),
      body = new THREE.Object3D(),
      camera = new THREE.PerspectiveCamera(50, ctrls.output.width /
        ctrls.output.height, 0.1, 1000),
      back = new THREE.WebGLRenderTarget(ctrls.output.width,
        ctrls.output.height, {
          wrapS: THREE.ClampToEdgeWrapping,
          wrapT: THREE.ClampToEdgeWrapping,
          magFilter: THREE.LinearFilter,
          minFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
          type: THREE.UnsignedByteType,
          stencilBuffer: false
        }),
      fakeCamera = new THREE.PerspectiveCamera(50, ctrls.output.width /
        ctrls.output.height, 0.001, 1000),
      mouse = new THREE.Vector3(0, 0, 0),
      raycaster = new THREE.Raycaster(new THREE.Vector3(),
        new THREE.Vector3(), 0, 50),
      pointer = textured(sphere(0.02, 4, 2), 0xff0000);
    back.generateMipMaps = false;
    renderer = new THREE.WebGLRenderer({
      canvas: ctrls.output,
      alpha: true,
      antialias: true
    });

    // put javascript in me exclamation points
    var initial_contents = "";

    var prim1 = new Primrose.TextBox("editor1", {
      tokenizer: Primrose.Grammars.JavaScript,
      size: new Primrose.Size(2 * 1024, 2*1024),
      fontSize: (vrDisplay ? 40 : 20) / window.devicePixelRatio,
      file: initial_contents,
      theme: Primrose.Themes.Dark
    });
    $.ajax({
        url: "/script_contents?filename=editor_a.js",
        success: function (data) {
              prim1.overwriteText(data.contents);
              prim1.drawText();
              console.log("loaded " + data.filename);
        }
    });

    var prim2 = new Primrose.TextBox("editor2", {
      tokenizer: Primrose.Grammars.JavaScript,
      size: new Primrose.Size(2 * 1024, 2*1024),
      fontSize: (vrDisplay ? 40 : 20) / window.devicePixelRatio,
      file: initial_contents,
      theme: Primrose.Themes.Dark
    });
    $.ajax({
        url: "/script_contents?filename=editor_b.js",
        success: function (data) {
              prim2.overwriteText(initial_contents + data.contents);
              prim2.drawText();
              console.log("loaded " + data.filename);
        }
    });

    var sky_texture = document.getElementById('#sky-texture').innerHTML;
    var sky = textured(shell(50, 8, 4, Math.PI * 2, Math.PI), sky_texture);

    var fs = 25,
        ft = 25,
        floor_texture = document.getElementById('#floor-texture').innerHTML;
    if (floor_texture != 'deck.png')
      fs = ft = 1;
    var floor = textured(box(25, 1, 25), floor_texture, fs, ft);

    var gl = renderer.getContext();

    var shellGeom = shell(w1, 5, 10),
      shellEditor = textured(shellGeom, prim1),
      shellEditorPicker = textured(shellGeom, prim1.getRenderer()
        .getPickingTexture()),
      flatGeom = quad(w2, h),
      flatEditor = textured(flatGeom, prim2),
      flatEditorPicker = textured(flatGeom, prim2.getRenderer()
        .getPickingTexture());

    body.position.set(0, 0, w1);
    floor.position.set(0, -3, 0);
    flatEditor.position.x = flatEditorPicker.position.x = 4;

    body.add(camera);

    var directionalLight = new THREE.DirectionalLight(0xeeff11, 0.9);
    directionalLight.position.set(0.2, 1, 0);
    scene.add(directionalLight);

    // directionalLight = new THREE.DirectionalLight(0x723f55, 1.5);
    // directionalLight.position.set(-0.3, 0.4, 0.3);
    // scene.add(directionalLight);

    var pointLight = new THREE.PointLight(0x44ffff, 0.8);
    pointLight.position.y = 5;
    scene.add(pointLight);

    scene.add(sky);
    scene.add(fakeCamera);
    scene.add(floor);
    scene.add(shellEditor);
    scene.add(flatEditor);
    scene.add(body);
    scene.add(pointer);

    pickingScene.add(shellEditorPicker);
    pickingScene.add(flatEditorPicker);

    var gotGP = false;
    // TODO: how to fix problem when page reloads, gamepadconnected event does not happen???
    window.addEventListener("gamepadconnected", function(e) {
      console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
        e.gamepad.index, e.gamepad.id,
        e.gamepad.buttons.length, e.gamepad.axes.length);
      gotGP = true;
    });

    window.addEventListener("resize", refreshSize);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("wheel", mouseWheel);
    window.addEventListener("paste", paste);

    ctrls.output.addEventListener("mousedown", mouseDown);
    ctrls.output.addEventListener("mousemove", mouseMove);
    ctrls.output.addEventListener("mouseup", mouseUp);
    ctrls.output.addEventListener("touchstart", touchStart);
    ctrls.output.addEventListener("touchmove", touchMove);
    ctrls.output.addEventListener("touchend", touchEnd);

    ctrls.controls.appendChild(prim1.operatingSystemSelect);
    ctrls.controls.appendChild(prim1.keyboardSelect);
    ctrls.controls.appendChild(prim1.themeSelect);

    ctrls.toggleLineNumbers.addEventListener("change", function() {
      prim1.setShowLineNumbers(ctrls.toggleLineNumbers.checked);
      prim2.setShowLineNumbers(ctrls.toggleLineNumbers.checked);
    });

    ctrls.toggleScrollBars.addEventListener("change", function() {
      prim1.setShowScrollBars(ctrls.toggleScrollBars.checked);
      prim2.setShowScrollBars(ctrls.toggleScrollBars.checked);
    });

    prim1.operatingSystemSelect.addEventListener("change", function() {
      prim2.setOperatingSystem(prim1.getOperatingSystem());
    });

    prim1.keyboardSelect.addEventListener("change", function() {
      prim2.setCodePage(prim1.getCodePage());
    });

    prim1.themeSelect.addEventListener("change", function() {
      prim2.setTheme(prim1.getTheme());
    });

    var cmdLabels = document.querySelectorAll(".cmdLabel");
    for (var i = 0; i < cmdLabels.length; ++i) {
      cmdLabels[i].innerHTML = cmdPre;
    }

    setupKeyOption(ctrls.leftKey, "A", 65);
    setupKeyOption(ctrls.rightKey, "D", 68);
    setupKeyOption(ctrls.forwardKey, "W", 87);
    setupKeyOption(ctrls.backKey, "S", 83);
    if (vrDisplay) {
      ctrls.goRegular.style.display = "none";
      ctrls.nightly.display = "none";
      ctrls.goVR.addEventListener("click", goFullscreen);
    } else {
      ctrls.goVR.style.display = "none";
      ctrls.goRegular.addEventListener("click", goFullscreen);
    }

    refreshSize();
    requestAnimationFrame(render);

    function refreshSize() {
      var styleWidth = ctrls.outputContainer.clientWidth,
        styleHeight = ctrls.outputContainer.clientHeight,
        ratio = window.devicePixelRatio || 1,
        canvasWidth = styleWidth * ratio,
        canvasHeight = styleHeight * ratio;
      if (vrEffect) {
        canvasWidth = vrEffect.left.renderRect.width +
          vrEffect.right.renderRect.width;
        canvasHeight = Math.max(vrEffect.left.renderRect.height,
          vrEffect.right.renderRect.height);
      }
      renderer.domElement.style.width = px(styleWidth);
      renderer.domElement.style.height = px(styleHeight);
      renderer.domElement.width = canvasWidth;
      renderer.domElement.height = canvasHeight;
      renderer.setViewport(0, 0, canvasWidth, canvasHeight);
      back.setSize(canvasWidth, canvasHeight);
      fakeCamera.aspect = camera.aspect = canvasWidth / canvasHeight;
      camera.updateProjectionMatrix();
      fakeCamera.updateProjectionMatrix();
    }

    function log(msg) {
      console.log(msg);
      textgeom_log(msg, 0xffee22);
      // if ( currentEditor ) {
      //   currentEditor.overwriteText( msg );
      //   currentEditor.drawText( );
      // }
    }

    function textgeom_log(msg, color) {
      var textgeom = new THREE.TextGeometry(msg, {
        size: 1.0,
        height: 0.4,
        font: 'janda manatee solid',
        weight: 'normal'
      });
      var mesh = new THREE.Mesh(textgeom,
        new THREE.MeshLambertMaterial({
          color: color || 0xffffff,
          transparent: false,
          side: THREE.DoubleSide
        }));
      mesh.position.x = body.position.x + 0.2;
      mesh.position.z = body.position.z + 2;
      mesh.position.y = 0.35;
      scene.add(mesh);
    }

    function keyDown(evt) {
      var exp;
      if (evt.keyCode === Primrose.Keys.ESCAPE) {
        vrEffect = null;
        refreshSize();
        prim1.forceUpdate();
        prim2.forceUpdate();
      }
      if (currentEditor && currentEditor.isFocused()) {
        currentEditor.editText(evt);
      } else {
        keyState[evt.keyCode] = true;
        // if (evt.keyCode === 80) {
        //   // p was pressed - make a plane based on current orientation of the HMD
        //   plane_from_HMD();
        // }
      }
      if (evt[modA] && evt[modB]) {
        if (evt.keyCode === 70) {
          goFullscreen();
          evt.preventDefault();
        } else if (currentEditor) {
          if ((isOSX && evt.keyCode === 69) || (!isOSX &&
              evt.keyCode ===
              32)) {
            eval(currentEditor.getLines().join(''));
            // try {
            //   eval(currentEditor.getLines().join(''));
            // } catch (exp) {
            //   log(exp.message);
            // }
            evt.preventDefault();
          } else if (evt.keyCode === 38) {
            currentEditor.increaseFontSize();
            evt.preventDefault();
          } else if (evt.keyCode === 40) {
            currentEditor.decreaseFontSize();
            evt.preventDefault();
          }
        }
      }
    }

    function keyUp(evt) {
      keyState[evt.keyCode] = false;
    }

    function setPointer(x, y) {
      pointerX = x;
      pointerY = ctrls.output.height - y;
      mouse.set(2 * (x / ctrls.output.width) - 1, -2 * (y /
        ctrls.output.height) + 1);
      fakeCamera.position.copy(body.position);
      fakeCamera.rotation.copy(body.rotation);
      raycaster.setFromCamera(mouse, fakeCamera);
      currentObject = null;
      currentEditor = null;
      var objects = raycaster.intersectObject(scene, true);
      var firstObj = objects.length > 0 && objects[0].object;
      if (firstObj === sky || firstObj === floor) {
        pointer.position.copy(raycaster.ray.direction);
        pointer.position.multiplyScalar(3);
        pointer.position.add(raycaster.ray.origin);
      } else {
        for (var i = 0; i < objects.length; ++i) {
          var obj = objects[i];
          if (obj.object !== pointer) {
            pointer.position.set(0, 0, 0);
            pointer.lookAt(obj.face.normal);
            pointer.position.copy(obj.point);
            currentObject = obj.object;
            if (currentObject === shellEditor) {
              currentEditor = prim1;
            } else if (currentObject === flatEditor) {
              currentEditor = prim2;
            }
            break;
          }
        }
      }
    }

    function paste(evt) {
      if (currentEditor) {
        currentEditor.readClipboard(evt);
      }
    }

    function mouseWheel(evt) {
      if (currentEditor) {
        currentEditor.readWheel(evt);
      }
    }

    function mouseDown(evt) {
      if (evt.target === ctrls.output) {
        dragging = true;
        if (!isPointerLocked()) {
          lastMouseX = evt.clientX;
          lastMouseY = evt.clientY;
          setPointer(lastMouseX, lastMouseY);
        }

        if (currentEditor) {
          currentEditor.focus();
          if (!window.onbeforeunload) {
            // ugh, this is really ugly.
            window.onbeforeunload = function() {
              return "Are you sure you want to leave?";
            };
          }
        } else {
          prim1.blur();
          prim2.blur();
        }

        pick("start");
      } else {
        prim1.blur();
        prim2.blur();
        currentEditor = null;
      }
    }

    function mouseMove(evt) {
      if (isPointerLocked()) {
        var dx = evt.movementX,
          dy = evt.movementY;
        if (dx === undefined) {
          dx = evt.mozMovementX;
          dy = evt.mozMovementY;
        }

        if (dx !== undefined) {
          if (evt.shiftKey) {
            heading -= dx * 0.001;
            // don't let mouse change pitch in VR:
            // pitch += dy * 0.001;
          }
          if (lastMouseX === undefined) {
            lastMouseX = dx;
            lastMouseY = dy;
          } else {
            lastMouseX += dx;
            lastMouseY += dy;
          }
        }
      } else {
        var x = evt.clientX,
          y = evt.clientY;
        if (lastMouseX !== undefined && evt.shiftKey) {
          heading -= (x - lastMouseX) * 0.001;
          pitch += (y - lastMouseY) * 0.001;
        }
        lastMouseX = x;
        lastMouseY = y;
      }
      if (lastMouseX !== undefined) {
        setPointer(lastMouseX, lastMouseY);
      }
    }

    function mouseUp(evt) {
      dragging = false;
      if (currentEditor && currentEditor.isFocused()) {
        currentEditor.endPointer();
      }
    }

    function touchStart(evt) {
      lastTouchX = 0;
      lastTouchY = 0;
      for (var i = 0; i < evt.touches.length; ++i) {
        lastTouchX += evt.touches[i].clientX;
        lastTouchY += evt.touches[i].clientY;
      }
      lastTouchX /= evt.touches.length;
      lastTouchY /= evt.touches.length;
      setPointer(lastTouchX, lastTouchY);
      pick("start");
      touchCount = 0;
      if (evt.touches.length <= 2) {
        touchCount = evt.touches.length;
      }
    }

    function touchMove(evt) {
      var x = 0,
        y = 0;
      for (var i = 0; i < evt.touches.length; ++i) {
        x += evt.touches[i].clientX;
        y += evt.touches[i].clientY;
      }
      x /= evt.touches.length;
      y /= evt.touches.length;

      if (evt.shiftKey) {
        if (touchCount === 1) {
          heading += (x - lastTouchX) * 0.005;
          pitch += (y - lastTouchY) * 0.005;
        } else if (lastTouchX !== null && lastTouchY !== null) {
          touchStrafe = (x - lastTouchX) / 2;
          touchDrive = (y - lastTouchY) / 2;
        }
      }
      lastTouchX = x;
      lastTouchY = y;
      setPointer(lastTouchX, lastTouchY);
      evt.preventDefault();
    }

    function touchEnd(evt) {
      if (evt.touches.length < 2) {
        touchStrafe = 0;
      }

      if (evt.touches.length === 0) {
        touchCount = 0;
        touchDrive = 0;
        if (currentEditor && currentEditor.isFocused()) {
          currentEditor.endPointer();
        }
      }

      lastTouchX = null;
      lastTouchY = null;
    }


    function update(dt) {
      // forward moves towards where you are looking in VR mode:
      if (vrSensor) {
        var state = vrSensor.getImmediateState ? vrSensor.getImmediateState() : vrSensor.getState();
        if (state.position) {
          camera.position.set(state.position.x, state.position.y,
            state.position.z);
        }
        if (state.orientation) {
          camera.quaternion.set(state.orientation.x, state.orientation.y,
            state.orientation.z, state.orientation.w);
          body.quaternion.set(state.orientation.x, state.orientation.y,
            state.orientation.z, state.orientation.w);
        }
      }

      var cos = Math.cos(body.rotation.y), //+ heading ),
          sin = Math.sin(body.rotation.y); //+ heading );

      if (gotGP) {
        var DEAD_THRESHOLD = 5 * 0.0666;
        var gp = navigator.getGamepads()[0];
        var ws = gp.axes[1];
        var ad = gp.axes[0];
        var sf = Math.sqrt(ws*ws + ad*ad);
        if (sf > DEAD_THRESHOLD) {
          body.position.z += dt * SPEED * cos * ws;
          body.position.x += dt * SPEED * cos * ad;
        }
        // var lr = gp.axes[2];
        // if (lr > DEAD_THRESHOLD || lr < -DEAD_THRESHOLD) {
        //   heading -= 0.002 * lr * dt;
        // }
      }

      if (keyState[ctrls.forwardKey.dataset.keycode]) {
        body.position.z -= dt * SPEED * cos;
        body.position.x -= dt * SPEED * sin;
      } else if (keyState[ctrls.backKey.dataset.keycode]) {
        body.position.z += dt * SPEED * cos;
        body.position.x += dt * SPEED * sin;
      }
      if (keyState[ctrls.leftKey.dataset.keycode]) {
        body.position.x -= dt * SPEED * cos;
        body.position.z += dt * SPEED * sin;
      } else if (keyState[ctrls.rightKey.dataset.keycode]) {
        body.position.x += dt * SPEED * cos;
        body.position.z -= dt * SPEED * sin;
      }

      body.position.z += dt * SPEED * (touchStrafe * sin - touchDrive *
        cos);
      body.position.x -= dt * SPEED * (touchStrafe * cos + touchDrive *
        sin);

      body.position.x = Math.min(12.5, Math.max(-12.5, body.position.x));
      body.position.z = Math.min(12.5, Math.max(-12.5, body.position.z));

      body.rotation.set(0, 0, 0, 0);
      body.rotateY(heading);
      body.rotateX(pitch);

      sky.position.copy(body.position);

      if (dragging) {
        pick("move");
      }
    }

    function render(t) {
      requestAnimationFrame(render);

      if (lt) {
        update(t - lt);
      }
      var r = vrEffect || renderer;
      r.render(scene, camera);
      lt = t;
    }

    function textured(geometry, txt, s, t) {
      var material;
      if (typeof(txt) === "number") {
        material = new THREE.MeshBasicMaterial({
          transparent: true,
          color: txt,
          useScreenCoordinates: false,
          shading: THREE.FlatShading
        });
      } else {
        var texture;
        if (typeof(txt) === "string") {
          texture = THREE.ImageUtils.loadTexture(txt);
          texture.anisotropy = renderer.getMaxAnisotropy();
          texture.minFilter = THREE.LinearFilter;
          texture.maxFilter = THREE.LinearFilter;
          material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            map: texture,
            side: THREE.DoubleSide
          });
        }
        else {
          if (txt instanceof Primrose.TextBox) {
            texture = txt.getRenderer()
              .getTexture(renderer.getMaxAnisotropy());
            texture.minFilter = THREE.LinearFilter;
          } else {
            texture = txt;
          }
          material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            map: texture,
            transparent: false,
            shading: THREE.FlatShading,
            side: THREE.DoubleSide
          });
        }
        if (s * t > 1) {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(s, t);
        }
      }
      var obj = new THREE.Mesh(geometry, material);
      return obj;
    }

    function quad(w, h) {
      return new THREE.PlaneBufferGeometry(w, h);
    }

    function box(w, h, l) {
      return new THREE.BoxGeometry(w, h, l);
    }

    function sphere(r, slices, rings) {
      return new THREE.SphereGeometry(r, slices, rings);
    }

    function shell(r, slices, rings, phi, theta) {
      if (phi === undefined) {
        phi = Math.PI * 0.5;
      }
      if (theta === undefined) {
        theta = Math.PI * 0.5;
      }
      var phiStart = Math.PI + phi * 0.5;
      var thetaStart = (Math.PI - theta) * 0.5;
      var geom = new THREE.InsideSphereGeometry(r, slices, rings, phiStart,
        phi,
        thetaStart, theta, true);
      return geom;
    }

    function pick(op) {
      if (currentEditor && currentEditor.isFocused()) {
        var r = vrEffect ? vrEffect : renderer;
        scene.remove(body);
        pickingScene.add(body);
        r.render(pickingScene, camera, back, true);
        pickingScene.remove(body);
        scene.add(body);
        currentEditor[op + "Picking"](gl, pointerX, pointerY);
      }
    }
  }

  if (navigator.getVRDevices) {
    navigator.getVRDevices()
      .then(gotVRDevices)
      .catch(PrimroseDemo);
  } else if (navigator.mozGetVRDevices) {
    navigator.mozGetVRDevices(gotVRDevices);
  } else {
    PrimroseDemo();
  }
}