function addHands(scene) {
    var leapController = new Leap.Controller({frameEventName: 'animationFrame'});
    leapController.connect();
    var palm0 = new THREE.Mesh(new THREE.SphereBufferGeometry(0.025));
    var leapRoot = new THREE.Object3D();
    leapRoot.position.y -= 0.2;
    leapRoot.position.z -= 1.3;
    scene.add(leapRoot);
    leapRoot.add(palm0);
    var palm1 = palm0.clone();
    leapRoot.add(palm1);
    var palms = [palm0, palm1];
    var tips = [[], []];
    for (var i = 0; i < 5; ++i) {
        var tip = new THREE.Mesh(new THREE.SphereBufferGeometry(0.005));
        tips[0].push(tip);
        leapRoot.add(tip);
        tip = tip.clone();
        tips[1].push(tip);
        leapRoot.add(tip);
    }
    leapController.on('frame', onFrame);
    function onFrame(frame)
    {
        frame.hands.forEach(function (hand, i) {
            palms[i].position.set(hand.palmPosition[0] / 1000, hand.palmPosition[1] / 1000, hand.palmPosition[2] / 1000);
            hand.fingers.forEach(function (finger, j) {
                tips[i][j].position.set(finger.tipPosition[0] / 1000, finger.tipPosition[1] / 1000, finger.tipPosition[2] / 1000);
            });
        });
    }
}
