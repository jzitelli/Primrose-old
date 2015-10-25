function addHands(parent) {
    var leapController = new Leap.Controller({frameEventName: 'animationFrame'});
    leapController.connect();
    var leftRoot = new THREE.Object3D(),
        rightRoot = new THREE.Object3D();
    leftRoot.position.y = rightRoot.position.y = -0.25;
    leftRoot.position.z = rightRoot.position.z = -0.5;
    var scale = 0.001;
    leftRoot.scale.set(scale, scale, scale);
    rightRoot.scale.set(scale, scale, scale);
    leftRoot.visible = rightRoot.visible = false;
    parent.add(leftRoot);
    parent.add(rightRoot);

    var palms = [];
    var palm = new THREE.Mesh(new THREE.SphereBufferGeometry(0.025 / scale).scale(1, 0.5, 1));
    leftRoot.add(palm);
    palms.push(palm);
    palm = palm.clone();
    rightRoot.add(palm);
    palms.push(palm);

    var tips = [[], []];
    var joints = [[], []];

    for (var i = 0; i < 5; ++i) {

        var tip = new THREE.Mesh(new THREE.SphereBufferGeometry(0.005 / scale));
        var joint = new THREE.Mesh(new THREE.SphereBufferGeometry(0.007 / scale));

        tips[0].push(tip);
        leftRoot.add(tip);
        tip = tip.clone();
        tips[1].push(tip);
        rightRoot.add(tip);

        joints[0].push([joint]);
        leftRoot.add(joint);
        joint = joint.clone();
        joints[1].push([joint]);
        rightRoot.add(joint);

        joint = new THREE.Mesh(new THREE.SphereBufferGeometry(0.0055 / scale));
        joints[0][i].push(joint);
        leftRoot.add(joint);
        joint = joint.clone();
        joints[1][i].push(joint);
        rightRoot.add(joint);

    }

    leapController.on('frame', onFrame);
    function onFrame(frame) {
        frame.hands.forEach(function (hand, i) {
            palms[i].position.set(hand.palmPosition[0], hand.palmPosition[1], hand.palmPosition[2]);
            hand.fingers.forEach(function (finger, j) {
                tips[i][j].position.set(finger.tipPosition[0], finger.tipPosition[1], finger.tipPosition[2]);
                joints[i][j][0].position.set(finger.bones[1].nextJoint[0], finger.bones[1].nextJoint[1], finger.bones[1].nextJoint[2]);
                joints[i][j][1].position.set(finger.bones[2].nextJoint[0], finger.bones[2].nextJoint[1], finger.bones[2].nextJoint[2]);
            });
        });
        leftRoot.visible = false;
        rightRoot.visible = false;
        if (frame.hands.length == 1) {
            leftRoot.visible = true;
        } else
        if (frame.hands.length == 2) {
            leftRoot.visible = true;
            rightRoot.visible = true;
        }
    }
}

var addTool = (function () {
    var UP = new THREE.Vector3(0, 1, 0);
    var direction = new THREE.Vector3(0, 0, -1);
    function addTool(parent) {
        var leapController = new Leap.Controller({frameEventName: 'animationFrame'});
        leapController.connect();
        var scale = 0.001;
        var toolGeom = new THREE.CylinderGeometry(0.03 / scale, 0.03 / scale, 0.5 / scale, 5, 1, false, 0, 2*Math.PI);
        var toolMaterial = new THREE.MeshLambertMaterial({color: 0xeebbff});
        var toolMesh = new THREE.Mesh(toolGeom, toolMaterial);
        var toolRoot = new THREE.Object3D();
        toolRoot.position.set(0, 0, -3);
        toolRoot.scale.set(scale, scale, scale);
        toolRoot.add(toolMesh);
        parent.add(toolRoot);
        toolRoot.visible = false;
        leapController.on('frame', onFrame);
        function onFrame(frame) {
            if (frame.tools.length == 1) {
                var tool = frame.tools[0];
                //toolMesh.position.set(tool.tipPosition[0], tool.tipPosition[1], tool.tipPosition[2]);
                toolMesh.position.set(tool.stabilizedTipPosition[0], tool.stabilizedTipPosition[1], tool.stabilizedTipPosition[2]);
                direction.set(tool.direction[0], tool.direction[1], tool.direction[2]);
                toolMesh.quaternion.setFromUnitVectors(UP, direction);
                toolRoot.visible = true;
            } else {
                toolRoot.visible = false;
            }
        }
    }
    return addTool;
})();
