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
var pickingScene = new THREE.Scene();
var editors = [];
var editor_geoms = [];

function editor3d() {
  "use strict";
  var modA = isOSX ? "metaKey" : "ctrlKey",
      modB = isOSX ? "altKey" : "shiftKey",
      cmdPre = isOSX ? "CMD+OPT" : "CTRL+SHIFT",
      vrDisplay,
      vrSensor,
      vrEffect,
      renderer,
      gamepad,
      gotGP = false,
      pitch = 0,
      ctrls = findEverything();

  $("#main").hide();

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
      pitch = 0;
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

  function gotGamepads(gamepads) {
    for (var i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        gamepad = gamepads[i];
        if (gamepad.id.substring(0, 4) === "Xbox") {
          log("Gamepad connected at index %d", gamepad.index);
          gotGP = true;
          break;
        }
      }
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
      keyState = {},
      w1 = 3,
      h = 3,
      w2 = 3,
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

    var body = new THREE.Object3D();
    var camera = new THREE.PerspectiveCamera(50, ctrls.output.width /
      ctrls.output.height, 0.1, 1000);

    // TODO: investigate exclamation points??
    //var initial_contents = "// put javascript in me(exclamation points)";
    var initial_contents = "";

    var prim1 = new Primrose.TextBox("editor1", {
      tokenizer: Primrose.Grammars.JavaScript,
      size: new Primrose.Size(w1 * 1024, w1 * 1024),
      fontSize: (vrDisplay ? 40 : 20), // / window.devicePixelRatio,
      file: initial_contents,
      theme: Primrose.Themes.Dark
    });
    $.ajax({
        url: "/read?filename=editor_a.js",
        success: function (data) {
              prim1.overwriteText(data.value);
              prim1.drawText();
              log("loaded " + data.args.filename);
        }
    });
    editors.push(prim1);

    var prim2 = new Primrose.TextBox("editor2", {
      tokenizer: Primrose.Grammars.JavaScript,
      size: new Primrose.Size(w2 * 1024, w2 * 1024),
      fontSize: (vrDisplay ? 40 : 20), // / window.devicePixelRatio,
      file: initial_contents,
      theme: Primrose.Themes.Dark
    });
    $.ajax({
        url: "/read?filename=editor_b.js",
        success: function (data) {
              prim2.overwriteText(data.value);
              prim2.drawText();
              log("loaded " + data.args.filename);
        }
    });
    editors.push(prim2);

    var shellGeom = shell(w1, 5, 10),
      shellEditor = textured(shellGeom, prim1),
      shellEditorPicker = textured(shellGeom, prim1.getRenderer()
        .getPickingTexture()),
      flatGeom = quad(w2, h),
      flatEditor = textured(flatGeom, prim2),
      flatEditorPicker = textured(flatGeom, prim2.getRenderer()
        .getPickingTexture());

    pickingScene.add(shellEditorPicker);
    pickingScene.add(flatEditorPicker);

    editor_geoms.push(shellEditor);
    editor_geoms.push(flatEditor);

    var sky_texture = $("#skyTexture").val();
    var sky = textured(shell(50, 8, 4, Math.PI * 2, Math.PI), sky_texture);

    var fs = 1,
        ft = 1,
        floor_texture = $('#floorTexture').val();
    if (floor_texture === 'deck.png')
      fs = ft = 25;
    var floor = textured(box(25, 1, 25), floor_texture, fs, ft);
    floor.position.set(0, -3, 0);

    var gl = renderer.getContext();

    var body_arrow;

    body.position.set(0, 0, w1);
    flatEditor.position.x = flatEditorPicker.position.x = 4;

    body.add(camera);

    var directionalLight = new THREE.DirectionalLight(0xeeff11, 0.9);
    directionalLight.position.set(0.2, 1, 0);
    scene.add(directionalLight);

    directionalLight = new THREE.DirectionalLight(0x826f95, 0.9);
    directionalLight.position.set(-0.3, 0.4, 0.3);
    scene.add(directionalLight);

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

    var dir = new THREE.Vector3(0, 0, 0);
    body_arrow = new THREE.ArrowHelper(dir, body.position, 1, 0xffff00);
    scene.add(body_arrow);

    //var camera_helper = new THREE.CameraHelper(fakeCamera);
    //scene.add(camera_helper);

    window.addEventListener("gamepadconnected", function(e) {      
      gotGamepads(navigator.getGamepads());
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

    ctrls.floorTexture.addEventListener("change", function() {
      console.log("changing floor texture...");
      scene.remove(floor);
      floor_texture = $("#floorTexture").val();
      fs = ft = 1;
      if (floor_texture === 'deck.png')
        fs = ft = 25;
      floor = textured(box(25, 1, 25), floor_texture, fs, ft);
      floor.position.set(0, -3, 0);
      scene.add(floor);
    })

    ctrls.skyTexture.addEventListener("change", function() {
      console.log("changing sky background...");
      scene.remove(sky);
      sky_texture = $("#skyTexture").val();
      sky = textured(shell(50, 8, 4, Math.PI * 2, Math.PI), sky_texture);
      scene.add(sky);
    })

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

    function log(msg, color) {
      console.log(msg);
      textgeom_log(msg, color || 0xffaa33);
      // if ( currentEditor ) {
      //   currentEditor.overwriteText( msg );
      //   currentEditor.drawText( );
      // }
    }

    var textgeom_log_buffer = [];
    var textgeom_log_geoms = [];
    var textgeom_log_meshes = [];
    var buffsize = 10;
    function textgeom_log(msg, color) {
      // TODO: one geom per *unique* line
      textgeom_log_buffer.push(msg);
      var size = 0.5;
      var height = 0.1;
      var textgeom = new THREE.TextGeometry(msg, {
            size: size,
            height: height,
            font: 'janda manatee solid',
            weight: 'normal'
          });
      textgeom_log_geoms.push(textgeom);
      var mesh = new THREE.Mesh(textgeom,
          new THREE.MeshLambertMaterial({
            color: color || 0xffffff,
            transparent: false,
            side: THREE.DoubleSide
          }));
      scene.add(mesh);
      textgeom_log_meshes.push(mesh);

      if (textgeom_log_meshes.length > buffsize) {
        scene.remove(textgeom_log_meshes.shift());
      }

      for (var i = 0; i < textgeom_log_meshes.length; ++i) {
        mesh = textgeom_log_meshes[i];
        mesh.position.x = body.position.x - 10.0;
        mesh.position.z = body.position.z - 10.0;
        mesh.position.y = 2 + (textgeom_log_meshes.length - i - 1) * 1.25 * size;
      }
    }

    function keyDown(evt) {
      var exp;
      if (evt.keyCode === Primrose.Keys.ESCAPE) {
        vrEffect = null;
        refreshSize();
        for (var i = 0; i < editors.length; ++i) {
          editors[i].forceUpdate();
        }
      }
      if (currentEditor && currentEditor.isFocused()) {
        currentEditor.editText(evt);
      } else {
        keyState[evt.keyCode] = true;

        console.log("keydown: " + evt.keyCode);

        if (evt.keyCode === 84) { //Primrose.Keys.t) {
          var textbox = new Primrose.TextBox("editor" + editors.length+1, {
             tokenizer: Primrose.Grammars.JavaScript,
             size: new Primrose.Size(w2 * 1024, w2 * 1024),
             fontSize: (vrDisplay ? 40 : 20), // / window.devicePixelRatio,
             file: "log('eat poop " + editors.length + "');",
             theme: Primrose.Themes.Dark
           });
           var flatGeom = quad(w2, h);
           var flatEditor = textured(flatGeom, textbox);
           var flatEditorPicker = textured(flatGeom, textbox.getRenderer().getPickingTexture());
           flatEditor.position.copy(body.position);
           flatEditor.position.z -= 2;
           scene.add(flatEditor);
           pickingScene.add(flatEditorPicker);
           editors.push(textbox);
           editor_geoms.push(flatEditor);
        } else if (evt.keyCode === 80) {
          $("#main").toggle();
        //   plane_from_HMD();
        }

      }
      if (evt[modA] && evt[modB]) {
        if (evt.keyCode === 70) {
          goFullscreen();
          evt.preventDefault();
        } else if (currentEditor) {
          if ((isOSX && evt.keyCode === 69) || (!isOSX &&
              evt.keyCode ===
              32)) {
            try {
              eval(currentEditor.getLines().join(''));
            } catch (exp) {
              log(exp.message);
            }
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
            try {
              pointer.position.set(0, 0, 0);
              pointer.lookAt(obj.face.normal);
              pointer.position.copy(obj.point);
              currentObject = obj.object;
              for (var j = 0; j < editor_geoms.length; ++j) {
                if (currentObject === editor_geoms[j]) {
                  currentEditor = editors[j];
                  break;
                }
              }
              break;
            } catch (exp) {
            }
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
          pick("start");
        } else {
          for (var i = 0; i < editors.length; ++i) {
            editors[i].blur();
          }
        }
      } else {
        for (var i = 0; i < editors.length; ++i) {
          editors[i].blur();
        }
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
          camera.position.copy(state.position);
        }
        if (state.orientation) {
          camera.quaternion.copy(state.orientation);
          body.quaternion.copy(state.orientation);
        }
      }

      body.rotation.set(0, 0, 0, 0);
      body.rotateY(heading);
      body.rotateX(pitch);

      body_arrow.rotation.copy(body.rotation);
      body_arrow.rotateX(-Math.PI / 2);

      var cos, sin;
      cos = Math.cos(body.rotation.y);
      sin = Math.sin(body.rotation.y);

      if (gotGP) {
        var DEAD_THRESHOLD = 1 * 0.0666;

        // var lr = gamepad.axes[2];
        // if (lr > DEAD_THRESHOLD || lr < -DEAD_THRESHOLD) {
        //   body.rotateY(0.002 * lr * dt);
        //   cos = Math.cos(body.rotation.y);
        //   sin = Math.sin(body.rotation.y);
        // }

        var ws = gamepad.axes[1];
        var ad = gamepad.axes[0];
        var sf = Math.sqrt(ws*ws + ad*ad);
        if (sf > DEAD_THRESHOLD) {
          console.log(body.position.z);
          body.position.z -= dt * SPEED * cos;
          body.position.x -= dt * SPEED * sin;
        }
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

      body_arrow.position.copy(body.position);
      body_arrow.position.z -= 1.0;

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

  if (navigator.getGamepads) {
    gotGamepads(navigator.getGamepads());
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
