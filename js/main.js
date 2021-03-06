// global variables and usual functions

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
var textMesh, textMesh1, text;

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
var cameraHelpVector = new THREE.Vector3();
var cameraHelpBody = new THREE.Object3D();

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
        inputStream.currentPosition += 2;
        var pduType = inputStream.readUByte();
//        var disMessage = new dis.EntityStatePdu();
//        disMessage.initFromBinaryDIS(inputStream);

        switch (pduType)
        {
            case 1:
                inputStream.currentPosition = 0;
                var disMessage = new dis.EntityStatePdu();
                disMessage.initFromBinaryDIS(inputStream);
                //console.log("ESPDU");
      
                var entityID = JSON.stringify(disMessage.entityID.entity);
                
                //update timestamp here; if it is not likely to receive messages delete it from the simulation
                // where to check ??
//                remoteIDDictionary[entityID].espdu.timestamp = disMessage.timestamp;
                
                //needed for the old simulation; no more
//                if (entityID === "43" || entityID === "0" || entityID === "123")
//                    return;
               
                //create the connected entity for the first time!!
                if (remoteIDDictionary[entityID] === undefined) {
                    //coordinate conversion doesnt seem to work precisely
//                    var localCoordinates = rangeCoordinates.ECEFObjectToENU(disMessage.entityLocation);
                    var localCoordinates = disMessage.entityLocation;
                    var marking = disMessage.marking.getMarking();
//                    remoteIDDictionary[entityID].tankNameStr = marking.split("$").pop();
                    if (marking.substring(0,1)==="b")
                        remoteIDDictionary[entityID] = new RemoteTank('blue', scene, new THREE.Vector3(localCoordinates.x, localCoordinates.y, localCoordinates.z), manager, entitiesBoundingBox, selectables, Math.PI,marking.split("$").pop());
                    else{
                        switch (marking.substring(1,2)){
                            case 't':
                                remoteIDDictionary[entityID] = new RemoteTank('red', scene, new THREE.Vector3(localCoordinates.x, localCoordinates.y, localCoordinates.z), manager, entitiesBoundingBox, selectables);
                                break;
                            case 'i':
                                remoteIDDictionary[entityID] = new Infantry('red', scene, new THREE.Vector3(localCoordinates.x, localCoordinates.y, localCoordinates.z), manager, entitiesBoundingBox, selectables);
                                break;
                            case 'h':
                                remoteIDDictionary[entityID] = new Howitzer('red', scene, new THREE.Vector3(localCoordinates.x, localCoordinates.y, localCoordinates.z), manager, entitiesBoundingBox, selectables,false,true);
                                break;
                            default:
                                remoteIDDictionary[entityID] = new RemoteTank('red', scene, new THREE.Vector3(localCoordinates.x, localCoordinates.y, localCoordinates.z), manager, entitiesBoundingBox, selectables);
                        }

                    }                  
                    //for old sim, UAV will be deprecated
                    //if (entityID === "25") {
                    //    remoteIDDictionary[entityID] = new Uav('blue', scene, new THREE.Vector3(localCoordinates.x, localCoordinates.y, localCoordinates.z), manager, entitiesBoundingBox, selectables, Math.PI, true);
                    //} else {
                    //    remoteIDDictionary[entityID] = new RemoteTank('blue', scene, new THREE.Vector3(localCoordinates.x, localCoordinates.y, localCoordinates.z), manager, entitiesBoundingBox, selectables, Math.PI, true);
                    //}
                    //here you should initiate remote tank with the proper variables !!
                    remoteIDDictionary[entityID].espdu.entityID.entity = entityID;
                    //
                    //this will start counter in the update function to check connection status of the remote units
                    remoteIDDictionary[entityID].connected();
                    
                    remoteIDDictionary[entityID].remoteLocation = new THREE.Vector3(localCoordinates.x, localCoordinates.y, localCoordinates.z);
                    //remoteIDDictionary[entityID] = new RemoteTank('blue', scene, new THREE.Vector3(-160, 0, 258), manager, entitiesBoundingBox, selectables, Math.PI);
                    remoteUnitsNumber++;

                }
                else {

                    var myRemote = remoteIDDictionary[entityID];          
                    //update timestamp
                    myRemote.espdu.timestamp = disMessage.timestamp;
                    //the remote app may be open for a while
                    //myRemote.espdu.timestamp++;
                    //reset the timer
                    myRemote.connectionCounter = 0;
                    
                    
//                    var localCoordinates = rangeCoordinates.ECEFObjectToENU(disMessage.entityLocation);
                    var localCoordinates = disMessage.entityLocation;
                    var newRemoteLocation = new THREE.Vector3(localCoordinates.x, localCoordinates.y, localCoordinates.z);
                    if (entityID !== "25") {
                        
                        myRemote.espdu.entityAppearance = disMessage.entityAppearance;
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
                              myRemote.chassisMesh.position.set(localCoordinates.x, localCoordinates.y, localCoordinates.z);
                              myRemote.chassisMesh.rotation.set(disMessage.entityOrientation.phi, disMessage.entityOrientation.psi, disMessage.entityOrientation.theta);
                              
                              
                        }
                    } else {
                        var remoteOrientation = new THREE.Vector3();
                        remoteOrientation.x = disMessage.entityOrientation.psi;
                        remoteOrientation.y = disMessage.entityOrientation.phi;
                        remoteOrientation.z = disMessage.entityOrientation.theta;
                        remoteIDDictionary["25"].updateUAV(newRemoteLocation, remoteOrientation);
                    }
                }
                break;

            case 2:
                console.log("Fire PDU:", disMessage);
                break;

            case 3:
                inputStream.currentPosition = 0;
                var disMessage = new dis.DetonationPdu();
                disMessage.initFromBinaryDIS(inputStream);
                //receiving pdu
                var shooterID = JSON.stringify(disMessage.firingEntityID.entity);
                var shooter = remoteIDDictionary[shooterID];
                if(shooter === undefined) return;               

                //var targetID = JSON.stringify(disMessage.targetEntityID.entity);          

                switch(shooter.type){
                    case 'tank':
                        //if the shooter tank doesnt hit me than return
                        //if (tank.espdu.entityID.entity !== targetID) return;
                        for (var i = 0; i<tanks.length;++i){
                            if (tanks[i].espdu.entityID.entity === disMessage.targetEntityID.entity){
                                tanks[i].health -= 25; //usual tank damage
                                return;
                            }                                
                        }                        
                        break;
                    case 'how':
                        //detonation location
                        var detLoc = new THREE.Vector3(disMessage.locationInWorldCoordinates.x, disMessage.locationInWorldCoordinates.y,disMessage.locationInWorldCoordinates.z );
                         //-= this.damage * (this.effectRange - this.localVariable) / this.effectRange;
                        var damage = 25 * (20 - detLoc.distanceTo(tank.mesh.position)) / 20;
                        if (damage < 0) damage = 0;
                        tank.health -= damage;
                        break;
                    case 'inf':
                        if (tank.espdu.entityID.entity !==targetID) return;
                        tank.health -= 10; //usual infantry damage
                        break;  
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
//    return;
    //on every heartbeat, send one of the entities
        var index = heartBeatCounter % (tanks.length);
        var myEntity = tanks[index];

    //consider only blue selectable tanks
    //var myEntity = tanks[8];
    
    

    heartBeatCounter++;

    if (!myEntity || !myEntity.mesh || myEntity.remote ||myEntity.state === 'dead')
        return;
    
    //leave the coordinate systems conversion for a while

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
    
    //the health of the enemy should be sent also at every heartbeat
    //but the dead state should be sent immediately
    myEntity.setHealthBit(); //it manipulates myEntity.espdu.entityAppearance
    
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
    // for the network app dont check it
    return;
    
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