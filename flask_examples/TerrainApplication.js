var TerrainApplication = (function() {
    var logMaterial = new THREE.MeshBasicMaterial({
        color: 0x22ff00,
        side: THREE.DoubleSide
    });
    var scene;
    var camera;
    var hudGroup;

    var log_msgs = [];
    var log_meshes = [];
    var log_displayed = [];
    var buffsize = 10;

    function log(msg) {
        if (scene) {
            if (msg === "") return;
            var mesh;
            var size = 0.5;
            log_msgs.push(msg);
            if (log_msgs.slice(0, -1).indexOf(msg) > -1) {
                mesh = log_meshes[log_msgs.indexOf(msg)].clone();
            } else {
                var height = 0.0; //height || size / 17;
                var font = 'droid sans'; //'janda manatee solid';
                var weight = 'normal';
                var options = {
                    size: size,
                    height: height,
                    font: font,
                    weight: weight,
                    curveSegments: 3
                };
                var geometry = new THREE.TextGeometry(msg, options);
                mesh = new THREE.Mesh(geometry, logMaterial);
            }
            log_meshes.push(mesh);
            log_displayed.push(mesh);
/*            if (hudGroup) {
                hudGroup.add(mesh);
            }*/
            scene.add(mesh);
            if (log_displayed.length > buffsize) {
                mesh = log_displayed.shift();
                // if (hudGroup) {
                //     hudGroup.remove(mesh);
                // }
                scene.remove(mesh);
            }
            for (var i = 0; i < log_displayed.length; ++i) {
                mesh = log_displayed[i];
                mesh.position.x = camera.position.x - 10.0;
                mesh.position.z = camera.position.z - 10.0;
                mesh.position.y = 10 + (log_displayed.length - i - 1) * 1.75 * size;
            }
        }
    }

    function TerrainApplication(name, sceneModel, buttonModel, buttonOptions,
        avatarHeight, walkSpeed, options) {

        Primrose.VRApplication.call(this, name, sceneModel, buttonModel, buttonOptions,
            avatarHeight, walkSpeed, options);

        this.hudGroup = new THREE.Group();

        var audio3d = new Primrose.Output.Audio3D();
        function playSound(buffer, time) {
            var source = audio3d.context.createBufferSource();
            source.buffer = buffer;
            source.connect(audio3d.context.destination);
            source[source.start ? 'start' : 'noteOn'](time);
        }
        if (options.backgroundSound) {
            audio3d.loadBuffer(
                options.backgroundSound,
                null,
                function(buffer) {
                    playSound(buffer, 0);
                }
            );
        }


        this.keyboard.addCommand({
            name: "toggleHUD", buttons: [ Primrose.Input.Keyboard.Q ],
            commandDown: this.toggleHUD.bind( this ), dt: 0.25});
        this.keyboard.addCommand({
            name: "focusNearestEditor", buttons: [ Primrose.Input.Keyboard.F ],
            commandDown: this.focusNearestEditor.bind( this ), dt: 0.25});
        this.keyboard.addCommand({
            name: "focusNextEditor", buttons: [ Primrose.Input.Keyboard.N ],
            commandDown: this.focusNextEditor.bind( this ), dt: 0.25});
        this.keyboard.addCommand({
            name: "evalEditor", buttons: [ Primrose.Input.Keyboard.E ],
            commandDown: this.evalEditor.bind( this ), dt: 1.0});




        // 1 : A
        // 2 : 
        // 15: left arrow
        // 16: right arrow
        var xbox = [];
        xbox[1] = 'A';
        xbox[2] = 'B';
        xbox[3] = 'X';
        xbox[4] = 'Y';
        xbox[9] = 'back';
        xbox[10] = 'start';
        xbox[13] = 'up pad';
        xbox[14] = 'down pad';
        xbox[15] = 'left pad';
        xbox[16] = 'right pad';
        var butmap = {'A': 1, 'B': 2, 'X': 3, 'Y': 4, 'back': 9, 'start': 10};

        function printInstructions() {
            log("XBOX Instructions:");
            log(xbox[1] + ": jump");
            log(xbox[14] + ": exit editor");
            log(xbox[16] + ": enter next editor");
            log(xbox[15] + ": enter previous editor");
            log(xbox[9] + ": zero VR sensor");
            log(xbox[3] + ": toggle HUD");
            log(xbox[2] + ": evaluate/execute current editor");
        }

        this.gamepad.addCommand({
            name: "jump", buttons: [ 1 ], //{toggle: false} ], //{index: 0, toggle: false}
            commandDown: this.jump.bind( this ), dt: 0.5 });

        this.gamepad.addCommand({
            name: "blurEditor", buttons: [ 14 ],
            commandDown: this.blurEditor.bind( this ), dt: 0.25});

        this.gamepad.addCommand({
            name: "focusNextEditor", buttons: [ 16 ],
            commandDown: this.focusNextEditor.bind( this ), dt: 0.25});

        this.gamepad.addCommand({
            name: "focusPrevEditor", buttons: [ 15 ],
            commandDown: this.focusPrevEditor.bind( this ), dt: 0.25});

        this.gamepad.addCommand({
            name: "evalEditor", buttons: [ 2 ], //{toggle: false} ], //{index: 0, toggle: false}
            commandDown: this.evalEditor.bind( this ), dt: 1.0 });

        this.gamepad.addCommand({
            name: "toggleHUD", buttons: [ 3 ],
            commandDown: this.toggleHUD.bind( this ), dt: 0.25});

        this.gamepad.addCommand({
            name: "zeroSensor", buttons: [ 9 ],
            commandDown: this.zero.bind( this ), dt: 1});

        // this.gamepad.addCommand({
        //     name: "enterVR", buttons: [ 13 ],
        //     commandDown: this.enterVR.bind( this ), dt: 1});



        var pointerX, pointerY;
        // do more things...
        this.setPointer = function (x, y) {
            pointerX = x;
            pointerY = ctrls.output.height - y;
            mouse.set(2 * (x / ctrls.output.width) - 1, -2 * (y /
                ctrls.output.height) + 1);
            raycaster.setFromCamera(mouse, camera);
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
                        } catch (exp) {}
                    }
                }
            }
        }

        function waitForResources(t) {
            this.lt = t;
            if (this.camera && this.scene && this.currentUser &&
                this.buttonFactory.template) {
                this.setSize();

                if (this.passthrough) {
                    this.camera.add(this.passthrough.mesh);
                }

                scene = this.scene;
                camera = this.camera;
                hudGroup = this.hudGroup;

                this.animate = this.animate.bind(this);

                if (this.floor) {
                    this.scene.add(this.floor);
                }
                if (this.skyBox) {
                    this.scene.add(this.skyBox);
                }
                if (this.terrain) {
                    this.scene.add(this.terrain);
                }
                if (this.pointer) {
                    this.scene.add(this.pointer);
                }
                if (this.hudGroup) {
                    this.scene.add(this.hudGroup);
                }

                if (this.options.editors) {
                    for (var i = 0; i < this.options.editors.length; ++i) {
                        var editorConfig = this.options.editors[i];
                        editorConfig.options = editorConfig.options || {};
                        editorConfig.options.autoBindEvents = true;
                        //editorConfig.options.keyEventSource = window;
                        var mesh = makeEditor(this.scene, this.pickingScene,
                            editorConfig.id,
                            editorConfig.w, editorConfig.h,
                            editorConfig.x, editorConfig.y, editorConfig.z,
                            editorConfig.rx, editorConfig.ry, editorConfig.rz,
                            editorConfig.options);
                        if (editorConfig.scale) {
                            mesh.scale.x *= editorConfig.scale;
                            mesh.scale.y *= editorConfig.scale;
                            mesh.scale.z *= editorConfig.scale;
                        }
                        var editor = mesh.editor;
                        this.currentEditor = editor;
                        if (editorConfig.options.filename) {
                            $.ajax({
                                url: "/read?filename=" + editorConfig.options.filename
                            }).
                            done(function(data) {
                                console.log("loaded " + data.args.filename);
                                this.value = '' + data.value;
                            }.bind(editor)).
                            fail(function() {
                                console.log("problem!!!");
                            });
                        }

                        this.editors.push(mesh.editor);
                        if (editorConfig.hudx || editorConfig.hudy || editorConfig.hudz) {
                            var hudMesh = mesh.clone();
                            hudMesh.position.set(
                                editorConfig.hudx || 0,
                                editorConfig.hudy || 0,
                                editorConfig.hudz || 0
                            );
                            this.hudGroup.add(hudMesh);
                            this.hudEditors.push(mesh.editor);
                        }
                        this.currentEditor = mesh.editor;
                    }
                }
                printInstructions();
                this.fire("ready");

                requestAnimationFrame(this.animate);
            } else {
                requestAnimationFrame(waitForResources.bind(this));
            }
        }
        this.start = function() {
            requestAnimationFrame(waitForResources.bind(this));
        };
    }
    inherit(TerrainApplication, Primrose.VRApplication);

    TerrainApplication.prototype.evalEditor = function() {
        if (this.currentEditor) {
            this.currentEditor.blur();
            console.log("editor contents to eval:");
            console.log(this.currentEditor.getLines().join(''));
            try {
                console.log("trying javascript eval...");
                eval(this.currentEditor.getLines().join(''));
            } catch (exp) {
                log("caught javascript exception:");
                log(exp.message);
                console.log("trying python exec...");
                $.ajax({
                    url: '/python_eval?pystr=' + this.currentEditor.getLines().join('%0A')
                })
                .done(function(data) {
                        var lines = data.out.split('\n');
                        for (var i = 0; i < lines.length; ++i) {
                            log(lines[i]);
                        }
                        log("python returned:");
                        log(data.value);
                    })
                    .fail(function(jqXHR, textStatus) {
                        console.log(textStatus);
                    });
            }
        }
    };

  TerrainApplication.prototype.blurEditor = function () {
    if (this.currentEditor) {
      this.currentEditor.blur();
    }
  };

  TerrainApplication.prototype.focusNearestEditor = function () {
    if (this.currentEditor) {
      if (this.currentEditor.focused) {
        this.currentEditor.blur();
      } else {
        this.currentEditor.focus();
        this.currentUser.velocity.set(0,0,0);
      }
    }
    // for (var i = 0; i < this.editors.length; ++i) {
    // }
  };

  TerrainApplication.prototype.focusNextEditor = function () {
    if (this.currentEditor) {
      this.currentEditor.blur();
    }
    for (var i = 0; i < this.editors.length; ++i) {
      var editor = this.editors[i];
      if (editor === this.currentEditor) {
        if (i === this.editors.length - 1) {
          this.currentEditor = this.editors[0];
        } else {
          this.currentEditor = this.editors[i+1];
        }
        break;
      }
    }
    this.focusNearestEditor();
  };

  TerrainApplication.prototype.focusPrevEditor = function () {
    if (this.currentEditor) {
      this.currentEditor.blur();
    }
    for (var i = 0; i < this.editors.length; ++i) {
      var editor = this.editors[i];
      if (editor === this.currentEditor) {
        if (i === 0) {
          this.currentEditor = this.editors[this.editors.length-1];
        } else {
          this.currentEditor = this.editors[i-1];
        }
        break;
      }
    }
    this.focusNearestEditor();
  };

  TerrainApplication.prototype.toggleHUD = function () {
    if (this.hudGroup) {
      this.hudGroup.visible = !this.hudGroup.visible;
      if (this.hudGroup.visible) {
        $("#main").hide();
      }
    }
  };

  TerrainApplication.prototype.enterVR = function () {
    log("TODO: enterVR via gamepad");
    // requestFullScreen( this.ctrls.frontBuffer, this.vrDisplay );
    // this.inVR = true;
    // this.setSize();
  };

  return TerrainApplication;
})();
