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

// http://stackoverflow.com/a/3855394/1911963
(function($) {
    $.QueryString = (function(a) {
        if (a == "") return {};
        var b = {};
        for (var i = 0; i < a.length; ++i)
        {
            var p=a[i].split('=');
            if (p.length != 2) continue;
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
        }
        return b;
    })(window.location.search.substr(1).split('&'))
})(jQuery);


// http://stackoverflow.com/a/21747848/1911963
function getData(key) {
  try {
    return JSON.parse($('script[type="text/json"]#' + key).text());
  } catch (err) { // if we have not valid json or dont have it
    return null;
  } 
}

var scene = new THREE.Scene();
var pickingScene = new THREE.Scene();
var editors = [];
var editor_geoms = [];
var ctrls;
var sceneConfig;

function editor3d() {
  "use strict";
  var modA = isOSX ? "metaKey" : "ctrlKey",
      modB = isOSX ? "altKey" : "shiftKey",
      cmdPre = isOSX ? "CMD+OPT" : "CTRL+SHIFT",
      vrDisplay,
      vrSensor,
      vrEffect,
      renderer,
      pitch = 0;

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

  function gotVRDevices(devices) {
    for (var i = 0; i < devices.length; ++i) {
      var device = devices[i];
      if (device instanceof window.HMDVRDevice) {
        vrDisplay = device;
      } else if (device instanceof window.PositionSensorVRDevice) {
        vrSensor = device;
        window.vrSensor = vrSensor;
      }
      if (vrSensor && vrDisplay) {
        break;
      }
    }
    PrimroseDemo();
    vrMenuCreate();
  }

  var vrMenuMaterial = new THREE.MeshBasicMaterial({
          color: 0xffff00,
          useScreenCoordinates: false,
          shading: THREE.FlatShading
      });

  var vrMenuMesh;
  function vrMenuCreate() {
    // TODO: cool pixel shader
    vrMenuMesh = new THREE.Group();
    var selects = [ctrls.floorTexture, ctrls.skyTexture];
    for (var i = 0; i < Math.min(4, selects.length); ++i) {
      var geom = new THREE.TextGeometry(selects[i].value, { //options[i].value, {
            size: 0.5,
            height: 0.05,
            font: 'janda manatee solid',
            weight: 'normal'
          });
      var mesh = new THREE.Mesh(geom, vrMenuMaterial);
      mesh.position.copy(vrSensor.getState().position);
      mesh.position.y += 1 + i;
      mesh.position.z -= 1;
      vrMenuMesh.add(mesh);
    }
  }

  var showMenu = false;
  function vrMenuToggle() {
    if (showMenu) {
      scene.remove(vrMenuMesh);
      showMenu = false;
    } else {
      scene.add(vrMenuMesh);
      showMenu = true;
    }
  }

  // fps measure / profiler / optimizer
  // save current scene (e)
  // HMD pointer mode (p)
  // menu shortcut label
  // menu shortcut key

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
      w1 = 2,
      h = 2,
      w2 = 2,
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
    var bodyArrow;

    var camera = new THREE.PerspectiveCamera(50, ctrls.output.width /
      ctrls.output.height, 0.1, 1000);

    // TODO: investigate exclamation points??

    var configParam = $.QueryString["config"];
    console.log("url scene config: " + configParam);

    sceneConfig = getData(ctrls.sceneConfig.id);
    console.log("DOM scene config: " + sceneConfig);
    // TODO: fix
    var vrLog = $.QueryString["vr_log"] === 'true';
    console.log(vrLog);
    if (vrLog === null) {
      vrLog = sceneConfig.vr_log;
    }

    function log(msg, color) {
      console.log(msg + " (this msg also logged to vr console)");
      $.ajax({url: "log?string=" + msg}); //.replace('\n', '%0A')})
      if (vrLog) {
        textgeom_log(msg, color || 0x00ff00);
      }
      // if ( currentEditor ) {
      //   currentEditor.overwriteText( msg );
      //   currentEditor.drawText( );
      // }
    }
    function textGeomMesh(msg, color, size, height) {
      size = size || 0.5;
      height = height || size / 17;
      var font = 'janda manatee solid';
      var weight = 'normal';
      var textgeom = new THREE.TextGeometry(msg, {
            size: size,
            height: height,
            font: font,
            weight: weight
          });
      var material = new THREE.MeshLambertMaterial({
        color: color || 0xff0000,
        transparent: false,
        side: THREE.DoubleSide
        });
      var mesh = new THREE.Mesh(textgeom, material);
      return mesh;
    }
    var vrLogMaterial = new THREE.MeshLambertMaterial({
        color: 0x00ff00,
        transparent: false,
        side: THREE.DoubleSide
        });
    var textgeom_log_buffer = [];
    var textgeom_log_geoms = [];
    var textgeom_log_meshes = [];
    var buffsize = 10;
    function textgeom_log(msg, color) {
      // TODO: one geom per *unique* line
      textgeom_log_buffer.push(msg);
      var size = 0.5;
      var height = 0.5 / 20;
      var textgeom = new THREE.TextGeometry(msg, {
            size: size,
            height: height,
            font: 'janda manatee solid',
            weight: 'normal'
          });
      textgeom_log_geoms.push(textgeom);
      var material = new THREE.MeshLambertMaterial({color: color || 0x00ff00,
        side: THREE.DoubleSide});
      var mesh = new THREE.Mesh(textgeom, material);
      scene.add(mesh);
      textgeom_log_meshes.push(mesh);
      if (textgeom_log_meshes.length > buffsize) {
        scene.remove(textgeom_log_meshes.shift());
      }
      for (var i = 0; i < textgeom_log_meshes.length; ++i) {
        mesh = textgeom_log_meshes[i];
        mesh.position.x = body.position.x - 10.0;
        mesh.position.z = body.position.z - 10.0;
        mesh.position.y = 2 + (textgeom_log_meshes.length - i - 1) * 1.75 * size;
      }
    }

    for (var i = 0; i < ctrls.textBoxContainer.children.length; ++i) {
      var editorConfig = getData(ctrls.textBoxContainer.children[i].id);
      console.log(editorConfig);
      addTextBox(editorConfig);
    }

    var rev = 0;
    var sky_texture = $("#skyTexture").val();
    var sky = textured(shell(50, 8, 4, Math.PI * 2, Math.PI), sky_texture);
    scene.add(sky);

    // naming cpmnvetmatonm??
    var floorTexture = $("#floorTexture").val(); // $.QueryString["floor_texture"] || $("#floorTexture").val();
    var fs = 1,
        ft = 1;
    if (floorTexture === "deck.png")
      fs = ft = 25;
    var floorSize = $.QueryString["floor_size"] || $("#floorSize").val()  || [25, 25];
    log("setting floor size to: " + floorSize);
    var floorPos = $.QueryString["floor_position"] || [0, -3, 0];
    log("setting floor position to: " + floorPos);
    var floor = textured(box(floorSize[0], 1, floorSize[1]), floorTexture, fs, ft);
    floor.position.set(floorPos[0], floorPos[1], floorPos[2]); //-3, 0);
    //floor.position.copy(floorPos); //set(0, -3, 0);
    scene.add(floor);

    var gl = renderer.getContext();

    body.position.set(0, 0, w1);
    body.add(camera);

    var directionalLight = new THREE.DirectionalLight(0xeeff11, 0.9);
    directionalLight.position.set(0.2, 1, -3);
    scene.add(directionalLight);

    var pointLight = new THREE.PointLight(0x44ffff, 0.8);
    pointLight.position.y = 2;
    pointLight.position.z = 3;
    scene.add(pointLight);

    scene.add(fakeCamera);
    scene.add(body);
    scene.add(pointer);

    var body_arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 0), body.position, 1, 0xffff00);
    var axisHelper = new THREE.AxisHelper(1);
    var helpVisible = false;
    function toggleHelp() {
      if (helpVisible) {
        scene.remove(body_arrow);
        scene.remove(axisHelper);
        helpVisible = false
      } else {
        scene.add(body_arrow);
        scene.add(axisHelper);
        helpVisible = true;
      }
    }

    //var camera_helper = new THREE.CameraHelper(fakeCamera);
    //scene.add(camera_helper);

    // end PrimroseDemo scoped vars

    function saveScene(name) {
      var data = {name: name, rev: rev, sceneConfig: sceneConfig};
      $.post("/save", data).
      done(
        function (data) {
          console.log("saved " + name + " (version " + rev + ") to " + data.filename);
          rev += 1;
        }).
      fail(
        function () {
          console.log("problem saving");
      });
      // save other things...
    }

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

    // ctrls.controls.appendChild(prim1.operatingSystemSelect);
    // ctrls.controls.appendChild(prim1.keyboardSelect);
    // ctrls.controls.appendChild(prim1.themeSelect);

    ctrls.toggleLineNumbers.addEventListener("change", function() {
      for (var i = 0; i < editors.length; ++i) {
        editors[i].setShowLineNumbers(ctrls.toggleLineNumbers.checked);
      }
    });

    ctrls.toggleScrollBars.addEventListener("change", function() {
      for (var i = 0; i < editors.length; ++i) {
        editors[i].setShowScrollBars(ctrls.toggleScrollBars.checked);
      }
    });

    ctrls.floorTexture.addEventListener("change", function() {
      floorTexture = $("#floorTexture").val();
      log("changing floor texture to: " + floorTexture);
      fs = ft = 1;
      if (floorTexture === 'deck.png')
        fs = ft = 25;
      var newFloor = textured(box(floorSize[0], 1, floorSize[1]), floorTexture, fs, ft);
      scene.remove(floor); // TODO: probably a better way to change a texture...
      newFloor.position.set(floorPos[0], floorPos[1], floorPos[2]); //set(0, -3, 0);
      scene.add(newFloor);
    });

    ctrls.skyTexture.addEventListener("change", function() {
      sky_texture = $("#skyTexture").val();
      log("changing sky texture to: " + sky_texture);
      var newSky = textured(shell(50, 8, 4, Math.PI * 2, Math.PI), sky_texture);
      scene.remove(sky);
      scene.add(newSky);
    });

    // prim1.operatingSystemSelect.addEventListener("change", function() {
    //   prim2.setOperatingSystem(prim1.getOperatingSystem());
    // });

    // prim1.keyboardSelect.addEventListener("change", function() {
    //   prim2.setCodePage(prim1.getCodePage());
    // });

    // prim1.themeSelect.addEventListener("change", function() {
    //   prim2.setTheme(prim1.getTheme());
    // });

    var cmdLabels = document.querySelectorAll(".cmdLabel");
    for (var i = 0; i < cmdLabels.length; ++i) {
      cmdLabels[i].innerHTML = cmdPre;
    }

    setupKeyOption(ctrls.leftKey, "A", 65);
    setupKeyOption(ctrls.rightKey, "D", 68);
    setupKeyOption(ctrls.forwardKey, "W", 87);
    setupKeyOption(ctrls.backKey, "S", 83);

    setupKeyOption(ctrls.addTextBoxKey, "N", 78);
    setupKeyOption(ctrls.saveKey, "V", 86);
    setupKeyOption(ctrls.menuKey, "M", 86);
    setupKeyOption(ctrls.helpKey, "H", 72);
    setupKeyOption(ctrls.captureHMDKey, "C", 67);

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


    function addTextBox(editor) {
      var textbox = new Primrose.TextBox(editor.id, {
        tokenizer: Primrose.Grammars.JavaScript,
        size: new Primrose.Size(1024*editor.width, 1024*editor.height),
        fontSize: (vrDisplay ? 40 : 20), // / window.devicePixelRatio,
        file: editor.text,
        theme: Primrose.Themes.Dark
      });
      var flatGeom = quad(editor.width, editor.height);
      var flatEditor = textured(flatGeom, textbox);
      var flatEditorPicker = textured(flatGeom, textbox.getRenderer().getPickingTexture());
      flatEditor.position.copy(body.position);
      flatEditor.position.z -= 2;
      if (editor.position) {
        flatEditor.position.set(editor.position[0], editor.position[1], editor.position[2]);
      }
      scene.add(flatEditor);
      pickingScene.add(flatEditorPicker);
      editors.push(textbox);
      editor_geoms.push(flatEditor);
      if (editor.filename) {
        $.ajax({
          url: "/read?filename=" + editor.filename,
          success: function (data) {
                textbox.overwriteText(data.value);
                textbox.drawText();
                log("loaded " + data.args.filename);}});
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

        // n
        if (evt.keyCode === 78) {
          var params = {
            id: "newEditor" + (editors.length + 1),
            width: 1.2,
            height: 1.0,
            text: "log('hi');"
          };
          addTextBox(params);

        // m
        } else if (evt.keyCode === 77) {
          $("#main").toggle();
          vrMenuToggle();

        // v
        } else if (evt.keyCode === 86) {
          saveScene("testsavescene");

        // h
        } else if (evt.keyCode === 72) {
          toggleHelp();

        // c
        } else if (evt.keyCode === 67) {
          //captureHMDState();
        }

      }
      if (evt[modA] && evt[modB]) {
        if (evt.keyCode === 70) { // f
          goFullscreen();
          evt.preventDefault();
        } else if (currentEditor) {
          if ((isOSX && evt.keyCode === 69) || (!isOSX &&
              evt.keyCode ===
              32)) {
            try {
              log("trying javascript eval...");
              eval(currentEditor.getLines().join(''));
            } catch (exp) {
              log(exp.message);
              log("");
              log("trying python exec...");
              $.ajax({url: '/python_eval?pystr=' + currentEditor.getLines().join('%0A')})
              .done(function(data) {
                        var lines = data.out.split('\n');
                        for (var i = 0; i < lines.length; ++i) {
                          log(lines[i], 0x8822ee);
                        }
                        log("");
                        log("python returned:", 0x8822ee);
                        log(data.value, 0x8822ee);
                    })
              .fail(function (jqXHR, textStatus) {
                  log(textStatus);
              });
            }
            evt.preventDefault();
          } else if (evt.keyCode === 38) {
            currentEditor.increaseFontSize();
            evt.preventDefault();
          } else if (evt.keyCode === 40) {
            currentEditor.decreaseFontSize();
            evt.preventDefault();
          } else if (evt.keyCode === 69) { // e

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

      //body_arrow.rotation.copy(body.rotation);
      //body_arrow.rotateX(-Math.PI / 2);

      var cos, sin;
      cos = Math.cos(body.rotation.y);
      sin = Math.sin(body.rotation.y);

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

      //body_arrow.position.copy(body.position);
      //body_arrow.position.z -= 1.0;

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

  $("#main").hide();

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
