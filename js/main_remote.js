// global variables and usual functions
//var box;
var scene, camera, cameraFirst, cameraCount, controls;
var cameraDefaultPos;
var objects = [];
var mouse, raycaster, plane;
var geometry, material, cube;
var tank;
var tanks = [];

var myCanvas, w, h;
var container;
var shiftPressed = false;
var ctrlPressed = false;
var entitiesBoundingBox = [];
var selectables = [];

var sky, sunSphere;
var sunInclination;
var sunUp = true;
var sunMin = 0.5;
var sunMax = 1.5;

var collisions1, earthLevel;
var firstBlood = false;

var pointFront = new THREE.Vector3();
var toEarth = new THREE.Vector3(0, -1, 0);
var pointUp = new THREE.Vector3();

var sound;
var tank_fireBuffer, cannon_fireBuffer, tank_explosionBuffer, explosionBuffer, machinegunBuffer;

var winner;
var won = false;
var textMesh, textMesh1, text, tankName;

var composer;
var effectFXAA;

var manager = new THREE.LoadingManager();

var heartBeatCounter = 0;

var oneTime = true;
var remoteIDDictionary = {};
var rangeCoordinates = new dis.RangeCoordinates(36.6, -121.9, 1.0);
var remoteDistance = 3;
var remoteUnitsNumber = 0;
var myHow;
//var remoteRay = new THREE.Raycaster();
//var remoteLocation;


function networkSetup()
{

    // Compatiability checks--not all web browsers support Websockets.
    // Support is nearly universal these days, but there may be some
    // mook out there using IE7.

    if (window.WebSocket)
        websocket = new WebSocket(WEBSOCKET_URL);
    else if (Window.MozWebSocket)
        websocket = new MozWebSocket(WEBSOCKET_URL);
    else
        alert("This web browser does not support web sockets");

    // Set the format we want to use to receive binary messages
    websocket.binaryType = 'arraybuffer';

    // Attach functions to the the web socket for various events
    websocket.onopen = function (evt) {
        console.log("Opened websocket");
    };//console.log("websocket onopen");};
    websocket.onclose = function (evt) {
        console.log("websocket close", evt);
    };
    websocket.onerror = function (evt) {
        console.log("websocket error", evt.data);
    };

    /** Handle the messages sent from the server to us here. We receive binary
     * DIS from the server over the web socket.
     * @param {event} evt The receive event object. Contains the binary data to decode
     */
    websocket.onmessage = function (evt)
    {
        if (!plane)
            return;
        //console.log("Message from network: " + evt.data);

        //mandrake code is beginning
        // convert from binary to javascript object
        var inputStream = new dis.InputStream(evt.data);
        var disMessage = new dis.EntityStatePdu();
        disMessage.initFromBinaryDIS(inputStream);

        switch (disMessage.pduType)
        {
            case 1:
                //console.log("ESPDU");
                var entityID = JSON.stringify(disMessage.entityID.entity);
                var entityApp = JSON.stringify(disMessage.entityID.application);
                if (entityApp === "43" || entityApp === "0" || entityApp === "123")
                    return;
                
                if (remoteIDDictionary[entityID] === undefined) {
//                    var localCoordinates = rangeCoordinates.ECEFObjectToENU(disMessage.entityLocation);
                    var localCoordinates = disMessage.entityLocation;

                    if (entityApp === "25") {
                        remoteIDDictionary[entityApp] = new Uav('blue', scene, new THREE.Vector3(localCoordinates.x, localCoordinates.y, localCoordinates.z), manager, entitiesBoundingBox, selectables, Math.PI);
                    } else {
                        remoteIDDictionary[entityID] = new RemoteTank('blue', scene, new THREE.Vector3(localCoordinates.x, localCoordinates.y, localCoordinates.z), manager, entitiesBoundingBox, selectables, Math.PI);
                    }

                    remoteIDDictionary[entityID].remoteLocation = new THREE.Vector3(localCoordinates.x, localCoordinates.y, localCoordinates.z);
                    //remoteIDDictionary[entityID] = new RemoteTank('blue', scene, new THREE.Vector3(-160, 0, 258), manager, entitiesBoundingBox, selectables, Math.PI);
                    remoteUnitsNumber++;

                }
                else {

//                    var localCoordinates = rangeCoordinates.ECEFObjectToENU(disMessage.entityLocation);
                    var localCoordinates = disMessage.entityLocation;
                    var newRemoteLocation = new THREE.Vector3(localCoordinates.x, localCoordinates.y, localCoordinates.z);
                    if (entityID !== "25") {
                        var myRemote = remoteIDDictionary[entityID];

                        var dist = myRemote.remoteLocation.distanceTo(newRemoteLocation);
                        if (dist > remoteDistance) {

//                            myRemote.remoteLocation.set(localCoordinates.x, localCoordinates.y, localCoordinates.z);
//
//                            myRemote.remoteRay.set(myRemote.remoteLocation.clone().setY(50), toEarth);
//
//                            var collision = myRemote.remoteRay.intersectObject(plane);
//
//                            if (collision[0]) {
//                                myRemote.wayPoints = [];
//                                myRemote.wayPoints.push(collision[0].point);
//                            }
                              //try to teleport the tank every time
                              myRemote.chassisMesh.position.set(localCoordinates.x, localCoordinates.y, localCoordinates.z);
                              myRemote.chassisMesh.rotation.set(disMessage.entityOrientation.phi, disMessage.entityOrientation.psi, disMessage.entityOrientation.theta);
                        }
                    } else {
                        remoteIDDictionary["25"].updateUAV(newRemoteLocation);
                    }
                }
                break;

            case 2:
                console.log("Fire PDU:", disMessage);
                break;

            case 3:
                //console.log("Detonation PDU");
                //assessDamageToOurEntities(disMessage);
                //entityLocation

                var entityID = JSON.stringify(disMessage.exerciseID);
                entityID += 1;
                if (remoteIDDictionary[entityID] === undefined) {
                    //remoteIDDictionary[entityID] = new Ammo(251);
                    remoteIDDictionary[entityID] = "alreadyShot";
                    oneTime = true;
                }
                if(remoteIDDictionary[entityID] && oneTime)
                {   
                    
//                    var localCoordinates = rangeCoordinates.ECEFObjectToENU(disMessage.entityLocation);
                    var localCoordinates = disMessage.entityLocation;
                    //fix coordinate matching
                    var localVector = new THREE.Vector3(localCoordinates.x-5, localCoordinates.y-90, localCoordinates.z+5);
                    var minDist = 100000;
                    var target;

                    for (var tank in tanks) {
                        var dist = localVector.distanceTo(tanks[tank].chassisMesh.position);
                        if (dist < minDist) {
                            minDist = dist;
                            target = tanks[tank];
                        }
                    }

                    //hittin and cloudin
//                    target.cloud.cloud.position.copy(target.pos);
//                    target.cloud.cloud.visible = true;
//                    target.cloud.start();
//                    var myUav = remoteIDDictionary["25"];
//                    myUav.barrelCloud.cloud.position.copy(target.chassisMesh.position);
//                    myUav.barrelCloud.cloud.visible = true;
//                    myUav.barrelCloud.start();
                    myHow.blastCloud.cloud.position.copy(target.chassisMesh.position);
                    myHow.blastCloud.cloud.visible = true;
                    myHow.blastCloud.start();

                    //sound
                    var source = audioContext.createBufferSource(); // creates a sound source
                    source.buffer = explosionBuffer;
                    source.connect(audioContext.destination); // connect the source to the context's destination (the speakers)
                    if (controller.sound)
                        source.start(0);

                    setTimeout(function () {
//                        target.cloud.cloud.visible = false;
//                        target.cloud.stop();
                        myHow.blastCloud.cloud.visible = false;
                        myHow.blastCloud.stop();
                    }, 1500);

                    target.health -= 200;
                    //target.isAttackedBy = this.id;
                    oneTime = false;
                }

                break;

            default:
                break;
        }




    }; // End of onMessage()


} // end of initializeMessage

/**
 * Called periodicaly to send out an update of our position. Uses the
 * browser geolocation routines to set the PDUs location, which is useful
 * for mobile devices. If we have no local position fix, do not send out
 * an update.
 */
function heartbeat()
{

    //on every heartbeat, send one the entities
    var index = heartBeatCounter % (tanks.length);
    var myEntity = tanks[index];

    heartBeatCounter++;

    if (!myEntity || !myEntity.mesh || myEntity.remote ||myEntity.state === 'dead')
        return;

//    var range = new dis.RangeCoordinates(36.6, -121.9, 1);
    // three.js coordinate axis differ from ENU default
//    var disPosition = range.ENUtoECEF(-myEntity.pos.x, myEntity.pos.z, myEntity.pos.y);

    // bump timestamp
    myEntity.espdu.timestamp++;

//    myEntity.espdu.entityLocation.x = disPosition.x;
//    myEntity.espdu.entityLocation.y = disPosition.y;
//    myEntity.espdu.entityLocation.z = disPosition.z;
    
    myEntity.espdu.entityLocation.x = myEntity.pos.x;
    myEntity.espdu.entityLocation.y = myEntity.pos.y;
    myEntity.espdu.entityLocation.z = myEntity.pos.z;
    
     //add also orientation info
    myEntity.espdu.entityOrientation.phi = myEntity.chassisMesh.rotation.x;
    myEntity.espdu.entityOrientation.psi = myEntity.chassisMesh.rotation.y;
    myEntity.espdu.entityOrientation.theta = myEntity.chassisMesh.rotation.z;

    // Marshal out the PDU that represents the local browser's position
    // to the IEEE DIS binary format. We allocate a big buffer to write,
    // and if the actual data occupies less than that, trim to fit.

    var dataBuffer = new ArrayBuffer(1000); // typically 144 bytes, make it bigger for safety
    var outputStream = new dis.OutputStream(dataBuffer);
    myEntity.espdu.encodeToBinaryDIS(outputStream);

    // Trim to fit
    var trimmedData = dataBuffer.slice(0, outputStream.currentPosition);
    websocket.send(trimmedData);

    //heartBeatCounter++;

}

function allItemsLoaded() {
    $('.onepix-imgloader').fadeOut();
    // fade in content (using opacity instead of fadein() so it retains it's height.
    $('.loading-container > *:not(.onepix-imgloader)').fadeTo(8000, 100);

    controller.pause = false;
}

manager.onProgress = function (item, loaded, total) {
    console.log(item, loaded, total);
};
manager.onLoad = function () {
    console.log('all items loaded');
    allItemsLoaded();    
};
manager.onError = function () {
    console.log('there has been an error');
};


var terrainType = {
    0: 1,
    1: 2,
    2: 0,
    3: .5
};

var initSounds = function () {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();

    // ambient wind sound
    sound = new Audio();
    sound.addEventListener("canplaythrough", play, false);
    sound.src = "sounds/twincannon_redalert_short.mp3";
    sound.loop = true;
    function play() {
        var source = audioContext.createMediaElementSource(sound);
        var gain = audioContext.createGain();
        gain.gain.value = 0.1;
        // Connect source->panner->destination
        gain.connect(audioContext.destination);
        source.connect(gain);
        sound.play();
    }

//loading tank fire
    audioContext.decodeAudioData(
            Base64Binary.decodeArrayBuffer(tank_fire),
            function (_buffer) {
                tank_fireBuffer = _buffer;
            },
            function (err) {
                console.log("err(decodeAudioData): " + err);
            }
    );

//loading cannon fire
    audioContext.decodeAudioData(
            Base64Binary.decodeArrayBuffer(cannon_fire),
            function (_buffer) {
                cannon_fireBuffer = _buffer;
            },
            function (err) {
                console.log("err(decodeAudioData): " + err);
            }
    );
//loading tank eplosion
    audioContext.decodeAudioData(
            Base64Binary.decodeArrayBuffer(tank_explosion),
            function (_buffer) {
                tank_explosionBuffer = _buffer;
            },
            function (err) {
                console.log("err(decodeAudioData): " + err);
            }
    );

//loading eplosion
    audioContext.decodeAudioData(
            Base64Binary.decodeArrayBuffer(explosion),
            function (_buffer) {
                explosionBuffer = _buffer;
            },
            function (err) {
                console.log("err(decodeAudioData): " + err);
            }
    );

//loading machinegun
    audioContext.decodeAudioData(
            Base64Binary.decodeArrayBuffer(machinegun),
            function (_buffer) {
                machinegunBuffer = _buffer;
            },
            function (err) {
                console.log("err(decodeAudioData): " + err);
            }
    );


};

var initScene = function () {
    myCanvas = document.getElementsByTagName("canvas")[0];

    w = myCanvas.clientWidth;
    h = myCanvas.clientHeight;

    renderer = new THREE.WebGLRenderer({canvas: myCanvas});
    renderer.setSize(w, h);

    renderer.autoClearColor = false;
    //renderer.setClearColor(0x777777);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
            35, // Field of view
            w / h, // Aspect ratio
            0.1, // Near
            2000000   // Far
            );
    cameraFirst = new THREE.PerspectiveCamera(
            35, // Field of view
            w / h, // Aspect ratio
            0.1, // Near
            2000000   // Far
            );
    cameraCount = 0;
};
function initSky() {

    // Add Sky Mesh
    sky = new THREE.Sky();
    scene.add(sky.mesh);


    // Add Sun Helper
    sunSphere = new THREE.Mesh(new THREE.SphereGeometry(20000, 30, 30),
            new THREE.MeshBasicMaterial({color: 0xffffff, wireframe: false}));
    sunSphere.position.y = -700000;
    sunSphere.visible = true;
    scene.add(sunSphere);
    sunInclination = 0;


    var effectController = {
        turbidity: 10,
        reileigh: 2,
        mieCoefficient: 0.005,
        mieDirectionalG: 0.8,
        luminance: 1,
        inclination: 0, // elevation / inclination
        azimuth: 0.25, // Facing front,
        sun: !true
    };

    var distance = 400000;

    var uniforms = sky.uniforms;
    uniforms.turbidity.value = effectController.turbidity;
    uniforms.reileigh.value = effectController.reileigh;
    uniforms.luminance.value = effectController.luminance;
    uniforms.mieCoefficient.value = effectController.mieCoefficient;
    uniforms.mieDirectionalG.value = effectController.mieDirectionalG;

    var theta = Math.PI * (effectController.inclination - 0.5);
    var phi = 2 * Math.PI * (effectController.azimuth - 0.5);

    sunSphere.position.x = distance * Math.cos(phi);
    sunSphere.position.y = distance * Math.sin(phi) * Math.sin(theta);
    sunSphere.position.z = distance * Math.sin(phi) * Math.cos(theta);

    sunSphere.visible = effectController.sun;

    sky.uniforms.sunPosition.value.copy(sunSphere.position);

}
function sunUpdate(dt) {

    //.5-1.5/2.5-3.5/4.5-5.5 night
    if (sunInclination > sunMax) {
        sunMin += 2;
        sunMax += 2;
    }
    if (sunInclination > sunMin && sunInclination < sunMax) {
        sunUp = false;
        sunInclination += dt / 50;
    } else {
        sunUp = true;
        sunInclination += dt / 100;
    }
    var theta = Math.PI * (sunInclination - 0.5);
    var phi = 2 * Math.PI * (0.25 - 0.5);

    sunSphere.position.x = 400000 * Math.cos(phi);
    sunSphere.position.y = 400000 * Math.sin(phi) * Math.sin(theta);
    sunSphere.position.z = 400000 * Math.sin(phi) * Math.cos(theta);

    sky.uniforms.sunPosition.value.copy(sunSphere.position);

}
function checkWinner() {
    for (var i = 0; i < tanks.length; ++i) {
        if (tanks[i].side === "red" && tanks[i].state !== "dead")
            break;

        if (i === tanks.length - 1) {
            winner = "blue";
            won = true;
            console.log(winner);
        }
    }
    for (var i = 0; i < tanks.length; ++i) {
        if (tanks[i].side === "blue" && tanks[i].state !== "dead")
            break;
        if (i === tanks.length - 1) {
            winner = "red";
            won = true;
            console.log(winner);
        }
    }
    if (won) {
        if (winner === "red") {
            textMesh.visible = true;
            text = textMesh;
        }
        if (winner === "blue") {
            textMesh1.visible = true;
            text = textMesh1;
        }
        text.position.set(-40, 0, 100);
        controls.reset();
        camera.position.copy(new THREE.Vector3(-10, 18, 430));


    }
}
function addTree(x, y, z, manager) {
    var loadTrees = function (loaded) {

        var tree = loaded;
        for (var i = 2; i < tree.children.length; ++i) {


            tree.children[i].material.depthWrite = false;
            tree.children[i].material.transparent = true;
            tree.children[i].material.side = THREE.DoubleSide;
        }
        tree.position.set(x, y, z);
        scene.add(tree);



    };
    var loader = new THREE.ObjectLoader(manager);
    loader.load("models/terrain/trees.json", loadTrees);

}

function randomChoice(list) {
    var i = Math.floor(Math.random() * list.length);
    return list[i];
}

function angleBetweenQuats(qBefore, qAfter) {
    q1 = new THREE.Quaternion();
    q1.copy(qBefore);
    q1.inverse();
    q1.multiply(qAfter);
    var halfTheta = Math.acos(q1.w);
    return 2 * halfTheta;
}
THREE.Raycaster.prototype.setFromCameraNew = function (coords, camera) { // is not working on child cameras
    //camera is assumed perspective camera
    var vector = new THREE.Vector3();
    vector.setFromMatrixPosition(camera.matrixWorld);
    this.ray.origin.copy(vector);
    this.ray.direction.set(coords.x, coords.y, 0.5).unproject(camera).sub(vector).normalize();
}

function lookTowards(fromObject, toPosition, dTheta, goalDirection, tank, how) {
    var quat0 = new THREE.Quaternion();
    var eye = fromObject.position;
    quat0.setFromRotationMatrix(fromObject.matrix);
    var up = new THREE.Vector3(0, 1, 0);
    //var center = toPosition;
    if (goalDirection)
        var center = goalDirection;
    else
        //var center = new THREE.Vector3(toPosition.x,0,toPosition.z);
        var center = toPosition;
    var mat = new THREE.Matrix4();
    mat.lookAt(center, eye, up);
    var quat1 = new THREE.Quaternion();
    quat1.setFromRotationMatrix(mat);
    var deltaTheta = angleBetweenQuats(quat0, quat1);
    //console.log(deltaTheta);
    var frac = dTheta / deltaTheta;
    if (frac > 1)
        frac = 1;

    fromObject.quaternion.slerp(quat1, frac);
    if (tank && !tank.rotatedToTarget) {
        if (deltaTheta < 0.001 || isNaN(deltaTheta))
            tank.rotatedToTarget = true;
    }
    if (how && !tank.levitatedToTarget) {
        if (deltaTheta < 0.001 || isNaN(deltaTheta))
            tank.levitatedToTarget = true;
    }
}

function Ammos(id) {

    if (id === 251)
        this.remote = true;

    this.id = id;
    this.fired = false;
    this.maxDistance = 30.0;
    this.fireDistance = 0.0;
    this.toTarget = false;
    this.speed = 25.0;
    this.target = undefined;
    this.destroyedTarget = [];
    this.cube = new THREE.Object3D();
    //this.cloud = cloud1;
    var loader = new THREE.JSONLoader();
    var that = this;
    var onGeometry = function (geom, mats) {
        that.cube = new THREE.Mesh(geom, new THREE.MeshFaceMaterial(mats));
        that.cube.visible = false;
        that.cube.scale.set(.3, .3, .3);
        //that.cube.useQuaternion = true;
        scene.add(that.cube);
    };
    loader.load("models/tank/ammo.json", onGeometry);
    this.goal = new THREE.Vector3();
    this.reset = function () {
        this.cube.position.copy(new THREE.Vector3().setFromMatrixPosition(tank.barrelMesh.matrixWorld));
        this.fired = false;
        this.cube.visible = false;
        this.fireDistance = 0.0;

    };
}

function onDocumentMouseDown(event) {

    event.preventDefault();
    mouse.set((event.pageX / w) * 2 - 1, -(event.pageY / h) * 2 + 1);

    if (cameraCount % 2 === 1)
        raycaster.setFromCameraNew(mouse, cameraFirst);
    else
        raycaster.setFromCamera(mouse, camera);

    var planeIntersects = raycaster.intersectObjects(objects);
    var intersects = raycaster.intersectObjects(selectables);

    if (!ctrlPressed && event.button === 2) {
        tank = null;
        for (i = 0; i < tanks.length; ++i) {
            tanks[i].selectMesh.visible = false;

        }
        return;
    }
    if (intersects.length > 0) {

        for (i = 0; i < tanks.length; ++i) {
            tanks[i].selectMesh.visible = false;

            if (tanks[i].chassisMesh === intersects[0].object.object) {
                tank = tanks[i];
                tank.selectMesh.visible = true;
                //console.log("tank" + tank.id + " selected");

            }
        }

    }
    else if (shiftPressed && planeIntersects.length > 0 && event.button === 0) {
        if (tank) {
            tank.wayPoints.push(planeIntersects[0].point);
            this.wayPointsClicked += 1;
        }
    }
    else {
        if (!ctrlPressed && planeIntersects.length > 0 && event.button === 0) {

            if (tank) {
                tank.wayPoints = [];
                tank.wayPoints.push(planeIntersects[0].point);
            }
        }
    }

}
function onKeyDown(evt) {
    switch (evt.keyCode) {
        case 16: //shift key
            shiftPressed = true;
            break;
        case 17: //control key
            ctrlPressed = true;
            break;
    }
}

function onKeyUp(evt) {
    switch (evt.keyCode) {
        case 16: //shift key
            shiftPressed = false;
            break;
        case 17: //control key
            ctrlPressed = false;
            break;
    }
}