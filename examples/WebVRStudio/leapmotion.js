function addHands(scene) {
    var leapController = new Leap.Controller({frameEventName: 'animationFrame'});
    leapController.connect();
    var leapRoot = new THREE.Object3D();
    leapRoot.position.y -= 0.2;
    leapRoot.position.z -= 0.666;
    scene.add(leapRoot);

    var palms = [];
    var palm = new THREE.Mesh(new THREE.SphereBufferGeometry(0.025));
    palm.scale.set(1, 0.5, 1);
    leapRoot.add(palm);
    palms.push(palm);
    var palm = palm.clone();
    leapRoot.add(palm);
    palms.push(palm);

    var tips = [[], []];
    var joints = [[], []];
    for (var i = 0; i < 5; ++i) {
        var tip = new THREE.Mesh(new THREE.SphereBufferGeometry(0.005));
        var joint = new THREE.Mesh(new THREE.SphereBufferGeometry(0.007));
        tips[0].push(tip);
        leapRoot.add(tip);
        joints[0].push(joint);
        leapRoot.add(joint);

        tip = tip.clone();
        joint = joint.clone();
        tips[1].push(tip);
        leapRoot.add(tip);
        joints[1].push(joint);
        leapRoot.add(joint);
    }

    leapController.on('frame', onFrame);
    function onFrame(frame)
    {
        frame.hands.forEach(function (hand, i) {
            palms[i].position.set(hand.palmPosition[0] / 1000, hand.palmPosition[1] / 1000, hand.palmPosition[2] / 1000);
            hand.fingers.forEach(function (finger, j) {
                tips[i][j].position.set(finger.tipPosition[0] / 1000, finger.tipPosition[1] / 1000, finger.tipPosition[2] / 1000);
                joints[i][j].position.set(finger.bones[1].nextJoint[0] / 1000, finger.bones[1].nextJoint[1] / 1000, finger.bones[1].nextJoint[2] / 1000);
                // finger.bones.forEach(function (bone, k) {
                // });
            });
        });
    }
}
