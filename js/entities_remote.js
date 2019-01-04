
var entityProto = {
    nextID: 1,
    closeEnough: .7,
    intersectsEntity: 1,
    minDistance: Infinity,
    distance: null,
    localVariable: null,
    minRange: 0,
    isAttackedBy: null,
    ray: new THREE.Raycaster(),
    ray1: new THREE.Raycaster(),
    connectionTimer : null,
    connectionCounter : 0,
    detonationCounter: 0,
    //detonationSender:null,
    remote : false,
    tankName : null,//change the color later
    tankNameStr : null,
    init: function () {
        this.id = this.nextID;
        entityProto.nextID += 1;

        this.createESPDU(this.id, this.side, this.type, this.applicationNumber);
        this.terrainMaterial = 0;
        this.normalY = 1;
        this.wayPoints = [];
        this.goal;
        this.turretMesh = new THREE.Object3D();
        this.barrelMesh = new THREE.Object3D();

        this.pos = null;

        var material = new THREE.LineBasicMaterial({color: 0xff0000});
        var geometry = new THREE.Geometry();
        for (var i = 0; i < 10; ++i) {
            geometry.vertices.push(new THREE.Vector3()
                    );
        }
        this.line = new THREE.Line(geometry, material);
        this.line.geometry.verticesNeedUpdate = true;
        this.line.visible = false;
        scene.add(this.line);
        this.wayPointsClicked = 0;

        this.state = 'idle';
        this.target = null;

        this.rotatedToTarget = false;
        this.reloading = false;
        this.shooting = false;
        this.shotAtPos = new THREE.Vector3();
        this.shotAmmo = null;
        this.shotToTarget = null;
        this.shotFromPos = new THREE.Vector3();

        this.goal2;

        this.cloud = {cloud: new THREE.Object3D()};
        this.cloud.cloud.visible = false;

        var that = this;
        function particlesLoaded(mapA) {

            that.cloud.cloud.position.set(5, 5, 5);
            scene.add(that.cloud.cloud);
            that.cloud.cloud.visible = false;

            that.cloud = new SpriteParticleSystem({
                cloud: that.cloud.cloud,
                rate: 30,
                num: 30,
                texture: mapA,
                //scaleR:[0.1,.2],
                scaleR: [0.01, .05],
                speedR: [0, 0.5],
                rspeedR: [-0.1, 0.3],
                lifespanR: [1, 4],
                terminalSpeed: 20
            });
        }

        THREE.ImageUtils.loadTexture("images/tank_explode.png", undefined, particlesLoaded);


        tanks.push(this);

    },
    connected : function () {
        var that = this;
        this.connectionTimer = setInterval(function(){that.connectionCounter++;},100);
    },
    healthBit:function(){
        //for states that effect entity state appearance
//        *  Damage           3-4          0=no damage, 1=slight, 2=moderate, 3=destroyed
        if (this.health < this.armor)//meaning it has taken damage
        {
            if (this.health > this.armor*0.75){
                return 1; //slight damage
            }
            else if (this.health >this.armor*0.5){
                return 2; //moderate damage
            }else return 3;//destroyed
        }else return 0; // no damage
    },
    setHealthBit:function(){
        var eA = new dis.DisAppearance(this.espdu.entityAppearance);
        var damage = this.healthBit();
        switch (damage){
            case 1:
                this.espdu.entityAppearance=eA.bit_set(eA.entityAppearance,3);
                break;
            case 2:
                this.espdu.entityAppearance=eA.bit_set(eA.entityAppearance,4);
                break;
            case 3:
                eA.entityAppearance=eA.bit_set(eA.entityAppearance,3);
                this.espdu.entityAppearance=eA.bit_set(eA.entityAppearance,4);
                break;            
        }
//        entityAppearance.set_bit(0,)
    },
    createDPDU:function (location, targetID){
        
        //create a detonation pdu
        this.dpdu = new dis.DetonationPdu();
        //increase the timestamp starting from zero
        this.dpdu.timestamp++;
        //this is the firing entity
        this.dpdu.firingEntityID = this.espdu.entityID;

        if (targetID){
            //change here
            //define the enemy entity
            this.dpdu.targetEntityID.site = targetID.site;
            this.dpdu.targetEntityID.application = targetID.application;
            this.dpdu.targetEntityID.entity = targetID.entity;
        }       
        //location of the detonation
        this.dpdu.locationInWorldCoordinates.x = location.x;
        this.dpdu.locationInWorldCoordinates.y = location.y;
        this.dpdu.locationInWorldCoordinates.z = location.z;        
        
    },
    sendDPDU: function (){
        //to count messages of the same type sent 
        this.detonationCounter++;
        
        //if the message is sent more than x times return
        var x = 1;
        if(this.detonationCounter > x){
//            clearInterval(this.detonationSender);
            this.detonationCounter = 0;
            return;
        }
        
        var dataBuffer = new ArrayBuffer(1000); // typically 144 bytes, make it bigger for safety
        var outputStream = new dis.OutputStream(dataBuffer);
        this.dpdu.encodeToBinaryDIS(outputStream);

        // Trim to fit
        var trimmedData = dataBuffer.slice(0, outputStream.currentPosition);
        websocket.send(trimmedData);
        
        //send the same detonation message every 50 ms till to counter
        var that = this;
        //this.detonationSender = setInterval(that.sendDPDU(),50);
        setTimeout(that.sendDPDU(),50);
    },
    createESPDU: function (id, side, type, appNr) {
        //for dis pdu
        this.espdu = new dis.EntityStatePdu();
//        this.espdu.marking.setMarking(side + type + id);
        this.espdu.marking.setMarking(side[0]+type[0]+"$"+ this.tankNameStr+"&");
        // Entity ID
        this.espdu.entityID.site = 53;
        this.espdu.entityID.application = appNr;
        this.espdu.entityID.entity = Math.round(Math.random() * 16000); // Unique (ish) ID

        // What type of entity this is--in this case a dismounted infantry guy
        this.espdu.entityType.entityKind = 3;   // life form
        this.espdu.entityType.domain = 1;       // land
        this.espdu.entityType.country = 225;    // Turkey
        this.espdu.entityType.cat = 1;          // dismounted infantry
        this.espdu.entityType.subcategory = 17; // Mini-14! A-Team roolz!
        this.espdu.entityType.specific = 1;     // number of people

        this.espdu.timestamp = 1;               // Timestamp is bogus--should fix this. Just needs to be incremented at a miminim
    },
    loadModel: function (model00Url, model00Pos, model01Url, model01Pos, model02Url, model02Pos, scene, yRotation, collid, manager, selectables, barrelCloud) {

        var that = this;
        var loader = new THREE.JSONLoader();
        loader.imageLoader = new THREE.ImageLoader(manager);

        var onGeometry = function (geom, mats) {

            that.chassisMesh = new THREE.Mesh(geom, new THREE.MeshFaceMaterial(mats));
            that.chassisMesh.position.set(model00Pos.x, model00Pos.y, model00Pos.z);

            //try to align it with the terrain height as soon as it is generated
            if (that.type !== 'uav') {
                pointUp.copy(that.chassisMesh.position);
                pointUp.setY(that.chassisMesh.position.y + 50);

                that.ray1.set(pointUp, toEarth);
                earthLevel = that.ray1.intersectObject(plane);

                if (earthLevel[0])
                    that.chassisMesh.position.y = earthLevel[0].point.y;
            } else {
                that.chassisMesh.scale.set(5, 5, 5);
            }
            if (yRotation)
                that.chassisMesh.rotation.y = yRotation;
            that.chassisMesh.castShadow = true;
            that.mesh = that.chassisMesh;

            that.boundingBox = new THREE.BoundingBoxHelper(that.mesh, 0xff0000);
            scene.add(that.boundingBox);

            that.healthBar = new THREE.Mesh(new THREE.BoxGeometry(2, .2, .2), new THREE.MeshBasicMaterial({color: 0x0000ff}));
            that.healthBar.position.y = 2.5;
            that.mesh.add(that.healthBar);            
            that.pos = that.chassisMesh.position;
            //add the name here
            //but only to the blue ONE
            //add camera Helper here
            if ( that.side === 'blue'){
                if (!that.remote){
                    that.tankNameStr = askName();                    
                }  
                that.espdu.marking.setMarking(that.espdu.marking.getMarking().split("$")[0]+"$"+that.tankNameStr);
                var textGeo = new THREE.TextGeometry(that.tankNameStr.split("&")[0], {
                    font: 'helvetiker',
                    size: 3,
                    height: 2
                    }); 
                that.tankName = new THREE.Mesh(textGeo, new THREE.MeshPhongMaterial({color: new THREE.Color( Math.random(), Math.random(), Math.random() ), shading: THREE.FlatShading}));
                that.tankName.scale.set(0.25,0.25,0.25);
                that.tankName.position.y = 3;
                //adjust the position of text to the middle
                var nameLength = that.tankNameStr.length;
                if (nameLength > 10) nameLength = 10;
                that.tankName.position.x = -nameLength/4;
                that.mesh.add(that.tankName);
            }
            if(!that.remote){
                that.mesh.add(cameraHelpBody);
                cameraHelpBody.position.set(0,20,-50);
            }
            
            that.wayPoints.push(that.pos);
            collid.push(that.boundingBox);
            if (that.side === "blue" && !that.remote)
                selectables.push(that.boundingBox);

            scene.add(that.chassisMesh);

            if (model01Url) {
                if (that.side === 'red')
                    loader.load(model01Url, onGeometryTurret, "models/tank/red");
                else
                    loader.load(model01Url, onGeometryTurret);
            }

            loader.load("models/tank/selected.json", onGeometrySel);
        };
        var onGeometryTurret = function (geom, mats) {
            that.turretMesh = new THREE.Mesh(geom, new THREE.MeshFaceMaterial(mats));
            that.chassisMesh.add(that.turretMesh);

            that.turretMesh.position.set(model01Pos.x, model01Pos.y, model01Pos.z);
            if (model02Url) {
                if (that.side === 'red')
                    loader.load(model02Url, onGeometryBarrel, "models/tank/red");
                else
                    loader.load(model02Url, onGeometryBarrel);
            }
        };
        var onGeometryBarrel = function (geom, mats) {
            that.barrelMesh = new THREE.Mesh(geom, new THREE.MeshFaceMaterial(mats));
            //that.barrelMesh.position.set(0,1.46306-1.50835,0.64304);
            that.barrelMesh.position.set(model02Pos.x, model02Pos.y, model02Pos.z);
            that.turretMesh.add(that.barrelMesh);
            if (barrelCloud) {
                barrelCloud.position.set(0, 0, 2);
                that.barrelMesh.add(barrelCloud);
            }
        };


        var onGeometrySel = function (geom, mats) {
            that.selectMesh = new THREE.Mesh(geom, new THREE.MeshFaceMaterial(mats));
            mats[0].depthWrite = false;  // important --> particle system over transparent object
            that.selectMesh.visible = false;
            that.chassisMesh.add(that.selectMesh);
        };
        if (this.type !== 'uav' && this.side === 'red')
            loader.load(model00Url, onGeometry, "models/tank/red");
        else
            loader.load(model00Url, onGeometry);


    },
    getClosestTarget: function () {
        var range;
        if (!sunUp)
            range = this.range * 2 / 3;
        else
            range = this.range;
        if (this.isAttackedBy && tanks[this.isAttackedBy - 1].state === "dead")
            this.isAttackedBy = null;
        this.minDistance = Infinity;
        this.target = null;
        for (var i = 0; i < tanks.length; ++i) {
            if (!tanks[i].mesh)
                break;
            if (tanks[i].side === this.side || tanks[i].type !== this.type || tanks[i].state === 'dead')
                continue;
            this.distance = this.pos.distanceTo(tanks[i].pos);
            if (this.distance < range && this.distance > this.minRange && this.minDistance > this.distance) {
                this.target = tanks[i];
                this.state = 'engaged';
                this.minDistance = this.distance;
            }

        }
        if (!this.target) {
            this.minDistance = Infinity;
            for (var i = 0; i < tanks.length; ++i) {
                if (!tanks[i].mesh)
                    break;
                this.distance = this.pos.distanceTo(tanks[i].pos);
                if (tanks[i].side === this.side || tanks[i].state === 'dead')
                    continue;
                if (this.distance < range && this.distance > this.minRange && this.minDistance > this.distance) {
                    this.target = tanks[i];
                    this.state = 'engaged';
                    this.minDistance = this.distance;
                }

            }
        }

        if (this.target === null) {
            this.state = 'idle';
            lookTowards(this.turretMesh, new THREE.Vector3(0, 1.18, 10), .01);
            if (this.type === "how")
                lookTowards(this.barrelMesh, new THREE.Vector3(0, 1.18, 10), .01);
        }

    },
    move: function (dt) {
        for (var i = 0; i < entitiesBoundingBox.length; ++i) {
            if (!this.boundingBox.box.equals(entitiesBoundingBox[i].box) && this.boundingBox.box.isIntersectionBox(entitiesBoundingBox[i].box)) {
                this.intersectsEntity = 0;
                break;
            } else
                this.intersectsEntity = 1;
        }
        ;

        //if this is a remote object dont check collision
        if (this.remote)
            this.intersectsEntity = 1; //don't collide

        // the point in front of the entity
        pointFront.set(0, .4, 2);
        this.mesh.localToWorld(pointFront);

        this.ray.set(pointFront, toEarth);
        collisions1 = this.ray.intersectObject(plane);

        //the point above the entity mesh
        pointUp.copy(this.mesh.position);
        pointUp.setY(this.mesh.position.y + 10);
        this.ray1.set(pointUp, toEarth);
        earthLevel = this.ray1.intersectObject(plane);

        var dTheta = dt * this.rotationSpeed;

        if (collisions1[0]) {
            // taking the direction of a vector which is perpendicular to the plane
            var vec = new THREE.Vector3();
            vec.subVectors(this.goal, collisions1[0].point);
            vec.projectOnPlane(collisions1[0].face.normal);
            var goalDirection = new THREE.Vector3().addVectors(collisions1[0].point, vec.multiplyScalar(100));
            //this.goal2 = undefined;

            this.terrainMaterial = collisions1[0].face.materialIndex;
            //if (this.normal !== collisions[0].face.normal)
            this.goal2 = goalDirection;
            this.normalY = collisions1[0].face.normal.clone().y;

            var yDir = this.goal2.clone();
            yDir.normalize();

            if (this.goal.y - this.pos.y < .01 && this.normalY === 1)
                this.goal2 = null;
            if (yDir.y > 0)
                this.normalY = Math.pow(this.normalY, 6);

        }

        if (this.mesh.position.distanceTo(this.goal) > 2)
            lookTowards(this.mesh, this.goal, dTheta, this.goal2);
        this.mesh.translateZ(dt * this.speed * terrainType[this.terrainMaterial] * this.normalY * this.intersectsEntity);
        if (earthLevel[0])
            this.mesh.position.y = earthLevel[0].point.y;


    },
    updateLines: function (dt) {
        if (!this.selectMesh || this.state === "dead")
            return;
        if (this.selectMesh.visible)
            this.line.visible = controller.wayPoints;
        else
            this.line.visible = false;
        var lineHeight = 2;
        var vectora = this.pos.clone();
        vectora.y = vectora.y + lineHeight;
        if (this.wayPoints[0]) {

            this.line.geometry.vertices[0] = vectora;
            for (var i = 0; i < this.wayPoints.length; ++i) {
                var vector = this.wayPoints[i].clone();
                vector.y = vector.y + lineHeight;
                this.line.geometry.vertices[i + 1] = vector;
            }

            for (var i = 0; i < 9 - this.wayPoints.length; ++i) {
                var vector = this.wayPoints[this.wayPoints.length - 1].clone();
                vector.y = vector.y + lineHeight;
                this.line.geometry.vertices[9 - i] = vector;
            }

        } else {
            for (var i = 0; i < 10; ++i) {
                this.line.geometry.vertices[i] = vectora;
            }

        }
        this.line.geometry.verticesNeedUpdate = true;
    },
    chooseAmmo: function () {
        for (var i = 0; i < this.ammoNumber; ++i) {
            if (this.ammo[i].fired === false) {
                this.ammo[i].cube.position.copy(new THREE.Vector3().setFromMatrixPosition(this.barrelMesh.matrixWorld));
                this.ammo[i].cube.visible = true;
                this.ammo[i].fired = true;
                return this.ammo[i];
            }
        }

    },
    hit: function (target) {



    },
    die: function () {
        //stop connection timer if any
        if(this.connectionTimer){
            clearInterval(this.connectionTimer);
        }
        checkWinner();
        this.mesh.visible = false;
        if (this.type !== "inf")
            this.ammo[0].cube.visible = false;
        this.target = null;

        this.cloud.cloud.visible = false;
        this.cloud.stop();

        this.localVariable = entitiesBoundingBox.indexOf(this.boundingBox);
        if (this.localVariable !== -1)
            ;
        entitiesBoundingBox.splice(this.localVariable, 1);
        this.boundingBox.visible = false;
    },
    update: function (dt) {
        if (!this.mesh)
            return;

        if (this.state === 'dead') {

            return;
        }

        //check connection status of the remote unit
        if(this.connectionTimer && this.connectionCounter>50){
            this.state = 'dead';
            this.die();
            return;
        }        
        //adjust the position of the first persone camera here
        cameraHelpVector.setFromMatrixPosition(cameraHelpBody.matrixWorld);
        cameraFirst.position.lerp(cameraHelpVector, 0.005);
//        cameraFirst.position.set(tank.pos.x,tank.pos.y+20,tank.pos.z-100);
        cameraFirst.lookAt(tank.mesh.localToWorld(new THREE.Vector3(0,0,20)));
//        cameraFirst.lookAt(tank.mesh.position);

        if (this.shooting)
            this.shoot(dt);

        this.boundingBox.update();
        this.boundingBox.visible = controller.boundingBoxes;

        //update healthbar
        this.healthBar.visible = controller.healthBar;
        if(!this.remote)
            this.healthBar.scale.x = this.health / this.armor;
        else{//drawing healthbar of the remote unit
            //check if it is set in onmessage
            switch(this.espdu.entityAppearance){
                case 8: //third bit is set to 1 meaning slight damage
                    //this.healthBar.scale.x = 0.75;
                    this.health = this.armor*0.75;
                    break;
                case 16: //forth bit to 1 moderate damage
                    this.health = this.armor*0.5; 
//                    this.healthBar.scale.x = 0.50;
//                    this.healthBar.material.color.setHex(0Xffff00);
                    break;
                case 24: //third and forth bits to 1 almost destroyed
                    this.health = this.armor*0.25; 
//                  this.healthBar.scale.x = 0.25;
//                  this.healthBar.material.color.setHex(0Xff0000);
                    break;                          
            }
        }
        if (this.health / this.armor < .99)
            this.healthBar.material.color.setHex(0Xffff00);
        if (this.health / this.armor < .5)
            this.healthBar.material.color.setHex(0Xff0000);

        //clouds
        if (this.cloud.cloud.visible)
            this.cloud.update(dt);
        if (this.blastCloud && this.blastCloud.cloud.visible)
            this.blastCloud.update(dt);
        if (this.barrelCloud && this.barrelCloud.cloud.visible)
            this.barrelCloud.update(dt);

        if (this.wayPoints[0])
            this.goal = this.wayPoints[0];
        else
            this.goal = this.pos.clone();
        if (this.goal)
            var dx = new THREE.Vector3().subVectors(this.goal, this.mesh.position);
        else
            dx = 0;


        this.getClosestTarget();

        if (//this.state !== 'engaged' && 
                dx.length() > this.closeEnough
                || this.wayPoints.length > 0) {
            if (this.side === "blue" || (this.side === "red" && this.state !== "engaged"))
                this.state = 'moving';

        }

        if (controller.enemyBehavior === "1"
                && this.side === "red" && Boolean(this.isAttackedBy)
                && tanks[this.isAttackedBy - 1].side === "blue" && tanks[this.isAttackedBy - 1].state !== "dead"
                ) {
            for (var i = 0; i < tanks.length; ++i) {
                if (tanks[i].side === "blue" || tanks[i].type === "how" || tanks[i].state === "engaged")
                    continue;
                tanks[i].wayPoints.push(tanks[this.isAttackedBy - 1].pos);

            }

        }
        switch (this.state) {
            case('idle'):
                if (this.health < 0) {
                    this.state = 'dead';
                    this.die();
                    return;
                }

                return;
            case('moving'):
                if (this.health < 0) {
                    this.state = 'dead';
                    this.die();
                    return;
                }
                if (dx.length() <= this.closeEnough) {
                    this.wayPoints.shift();
                    this.state = 'idle';
                    return;
                }
                this.move(dt);
                return;

            case('engaged'):
                if (this.health < 0) {
                    this.state = 'dead';
                    this.die();
                    return;
                }
                if (this.target === null) {
                    this.state = 'idle';
                    return;
                }
                this.engage(dt);
                return;

            case ('dead'):
                this.die();
                return;
        }


    }
};
function Tank(side, scene, loc, loader, collid, selectables, yRotation,appNr, remote) {
    
    
    //*****************
    this.applicationNumber = appNr;
    
    this.type = 'tank';
    //change this back to 10
    this.speed = 10.0;
    this.rotationSpeed = 5.0;
    this.traverseSpeed = 2.0;
    this.elevateSpeed = 0.0;

    this.armor = 150;

    this.side = side;

    this.range = 30;
    this.health = this.armor;
    this.damage = 25;
	this.remote = remote;

    this.ammo = [];
    this.ammoNumber = 2;

    for (i = 0; i < this.ammoNumber; ++i) {
        this.ammo.push(new Ammos(i));
    }
    ;

    this.model00Url = "models/tank/t72_body.js";
    this.model01Url = "models/tank/t72_turret.js";
    this.model02Url = "models/tank/t72_barrel.js";
    this.loadModel(this.model00Url, new THREE.Vector3(loc.x, loc.y, loc.z), this.model01Url, new THREE.Vector3(0.00344, 1.10835, -0.15043), this.model02Url, new THREE.Vector3(0, 0.14, -.70), scene, yRotation, collid, loader, selectables);
    
    this.hit = function (target) {

        target.cloud.cloud.position.copy(target.pos);
        target.cloud.cloud.visible = true;
        target.cloud.start();

        //sound
        var source = audioContext.createBufferSource(); // creates a sound source
        source.buffer = tank_explosionBuffer;
        source.connect(audioContext.destination); // connect the source to the context's destination (the speakers)
        if (controller.sound)
            source.start(0);

        setTimeout(function () {
            target.cloud.cloud.visible = false;
            target.cloud.stop();
        }, 1200);
        
        //this is where we decrease the health of the damaged unit
//        target.health -= this.damage;
        target.isAttackedBy = this.id;
		//rather than decreasing the health it will send detonation pdu (or pdus)
        //where do we send detonation pdu, in hearthbeat?
        //or do we send it just one time or several times with same timestamp
        if(this.remote) return;
        if (target.remote){
            this.createDPDU(target.pos, target.espdu.entityID);
            this.sendDPDU();
        }else target.health -= this.damage;

    };
    this.shoot = function (dt) {
        lookTowards(this.shotAmmo.cube, this.shotAtPos, 100);

        var dx = new THREE.Vector3();
        dx.subVectors(this.shotAtPos, this.shotFromPos);
        var ahead0 = dx.clone();
        ahead0.normalize();
        ahead0.multiplyScalar(dt * this.shotAmmo.speed);
        this.shotAmmo.fireDistance += ahead0.length();
        this.shotAmmo.cube.position.add(ahead0);
        
        //if the ammo gets closer than a minimum distance then assume that it hits the target
        if (this.shotAmmo.cube.position.distanceTo(this.shotToTarget.turretMesh.getWorldPosition()) < 1) {
            this.hit(this.shotToTarget);
            this.shotAmmo.cube.position.copy(new THREE.Vector3().setFromMatrixPosition(this.barrelMesh.matrixWorld));
            this.shotAmmo.fired = false;
            this.shotAmmo.cube.visible = false;
            this.shotAmmo.fireDistance = 0;
            this.shooting = false;
        }
        
        
        else if (this.shotAmmo.fireDistance > this.shotAmmo.maxDistance) {

            this.shotAmmo.cube.position.copy(new THREE.Vector3().setFromMatrixPosition(this.barrelMesh.matrixWorld));
            this.shotAmmo.fired = false;
            this.shotAmmo.cube.visible = false;
            this.shotAmmo.fireDistance = 0;
            this.shooting = false;

        }


    };

    this.engage = function (dt) {
        var dTheta = dt * this.traverseSpeed;
        this.rotatedToTarget = false;
        lookTowards(this.turretMesh, this.mesh.worldToLocal(this.target.turretMesh.getWorldPosition()), dTheta, undefined, this);
        if (this.rotatedToTarget && !this.reloading && !this.shooting) {

            //sound
            var source = audioContext.createBufferSource(); // creates a sound source
            source.buffer = tank_fireBuffer;
            source.connect(audioContext.destination); // connect the source to the context's destination (the speakers)
            if (controller.sound)
                source.start(0);

            this.shotToTarget = this.target;
            this.shotAmmo = this.chooseAmmo();
            this.shotAtPos = this.target.turretMesh.getWorldPosition();
            this.shotFromPos = this.turretMesh.getWorldPosition();
            this.shooting = true;
            this.reloading = true;
            var that = this;
            setTimeout(function () {
                that.reloading = false;
            }, 3000);
        }

    };
    this.init();
    
    //assuming that this is the only tank for this remote sim
    tank = this;
}
function RemoteTank(side, scene, loc, loader, collid, selectables, yRotation, nameStr) {

    this.type = 'tank';
    this.speed = 2.3;
    this.rotationSpeed = 10.0;
    this.traverseSpeed = 2.0;
    this.elevateSpeed = 0.0;

    this.armor = 150;

    this.side = side;

    this.range = 30;
    this.health = this.armor;
    this.damage = 25;

    this.ammo = [];
    this.ammoNumber = 2;

    //network things
    this.remoteLocation = new THREE.Vector3();
    this.remoteRay = new THREE.Raycaster();
    this.closeEnough = 1.5;
    this.remote = true;
    
    this.tankNameStr = nameStr;

    for (i = 0; i < this.ammoNumber; ++i) {
        this.ammo.push(new Ammos(i));
    }
    ;

    this.model00Url = "models/tank/t72_body.js";
    this.model01Url = "models/tank/t72_turret.js";
    this.model02Url = "models/tank/t72_barrel.js";
    this.loadModel(this.model00Url, new THREE.Vector3(loc.x, loc.y, loc.z), this.model01Url, new THREE.Vector3(0.00344, 1.10835, -0.15043), this.model02Url, new THREE.Vector3(0, 0.14, -.70), scene, yRotation, collid, loader, selectables);

    this.hit = function (target) {

        target.cloud.cloud.position.copy(target.pos);
        target.cloud.cloud.visible = true;
        target.cloud.start();

        //sound
        var source = audioContext.createBufferSource(); // creates a sound source
        source.buffer = tank_explosionBuffer;
        source.connect(audioContext.destination); // connect the source to the context's destination (the speakers)
        if (controller.sound)
            source.start(0);

        setTimeout(function () {
            target.cloud.cloud.visible = false;
            target.cloud.stop();
        }, 1200);

//        target.health -= this.damage;
        target.isAttackedBy = this.id;

    };
    this.shoot = function (dt) {
        lookTowards(this.shotAmmo.cube, this.shotAtPos, 100);

        var dx = new THREE.Vector3();
        dx.subVectors(this.shotAtPos, this.shotFromPos);
        var ahead0 = dx.clone();
        ahead0.normalize();
        ahead0.multiplyScalar(dt * this.shotAmmo.speed);
        this.shotAmmo.fireDistance += ahead0.length();
        this.shotAmmo.cube.position.add(ahead0);

        if (this.shotAmmo.cube.position.distanceTo(this.shotToTarget.turretMesh.getWorldPosition()) < 1) {
            this.hit(this.shotToTarget);
            this.shotAmmo.cube.position.copy(new THREE.Vector3().setFromMatrixPosition(this.barrelMesh.matrixWorld));
            this.shotAmmo.fired = false;
            this.shotAmmo.cube.visible = false;
            this.shotAmmo.fireDistance = 0;
            this.shooting = false;
        }

        else if (this.shotAmmo.fireDistance > this.shotAmmo.maxDistance) {

            this.shotAmmo.cube.position.copy(new THREE.Vector3().setFromMatrixPosition(this.barrelMesh.matrixWorld));
            this.shotAmmo.fired = false;
            this.shotAmmo.cube.visible = false;
            this.shotAmmo.fireDistance = 0;
            this.shooting = false;

        }


    };

    this.engage = function (dt) {
        var dTheta = dt * this.traverseSpeed;
        this.rotatedToTarget = false;
        lookTowards(this.turretMesh, this.mesh.worldToLocal(this.target.turretMesh.getWorldPosition()), dTheta, undefined, this);
        if (this.rotatedToTarget && !this.reloading && !this.shooting) {

            //sound
            var source = audioContext.createBufferSource(); // creates a sound source
            source.buffer = tank_fireBuffer;
            source.connect(audioContext.destination); // connect the source to the context's destination (the speakers)
            if (controller.sound)
                source.start(0);

            this.shotToTarget = this.target;
            this.shotAmmo = this.chooseAmmo();
            this.shotAtPos = this.target.turretMesh.getWorldPosition();
            this.shotFromPos = this.turretMesh.getWorldPosition();
            this.shooting = true;
            this.reloading = true;
            var that = this;
            setTimeout(function () {
                that.reloading = false;
            }, 3000);
        }

    };
    this.init();

}
function Infantry(side, scene, loc, loader, collid, selectables, yRotation, remote) {

    this.type = 'inf';
    this.speed = 15.0;
    this.rotationSpeed = 3.0;
    this.traverseSpeed = 2.0;
    this.elevateSpeed = 0.0;

    this.armor = 75;

    this.side = side;

    this.barrelPos = new THREE.Vector3(0, 0, 1);

    this.range = 20;
    this.health = this.armor;
    this.damage = 10;
	this.remote = remote;

    this.barrelCloud = {cloud: new THREE.Object3D()};
    this.barrelCloud.cloud.visible = false;

    var that = this;
    function particlesLoaded(mapA) {

        that.barrelCloud.cloud.position.set(5, 5, 5);
        that.barrelCloud.cloud.visible = false;

        that.barrelCloud = new SpriteParticleSystem({
            cloud: that.barrelCloud.cloud,
            rate: 30,
            num: 30,
            texture: mapA,
            //scaleR:[0.1,.2],
            scaleR: [.0025, .05],
            speedR: [0, 0.5],
            rspeedR: [-0.1, 0.3],
            lifespanR: [1, 4],
            terminalSpeed: 20
        });

    }
    THREE.ImageUtils.loadTexture("images/barrel_light.png", undefined, particlesLoaded);

    this.model00Url = "models/tank/inf_body.js";
    this.model01Url = "models/tank/inf_turret.js";
    this.model02Url = "models/tank/inf_barrel.js";
    this.loadModel(this.model00Url, new THREE.Vector3(loc.x, loc.y, loc.z), this.model01Url, new THREE.Vector3(0.08076, 1.52923, 0.42493), this.model02Url, new THREE.Vector3(.012, 0.168, .583), scene, yRotation, collid, loader, selectables, this.barrelCloud.cloud);

    this.hit = function (target) {

        //sound
        var source = audioContext.createBufferSource(); // creates a sound source
        source.buffer = machinegunBuffer;
        source.connect(audioContext.destination); // connect the source to the context's destination (the speakers)
        if (controller.sound)
            source.start(0);

        this.barrelCloud.cloud.visible = true;
        this.barrelCloud.start();
        var that = this;
        setTimeout(function () {
            that.barrelCloud.cloud.visible = false;
            that.barrelCloud.stop();
        }, 1200);

//        target.health -= this.damage;
        target.isAttackedBy = this.id;

    };
    this.shoot = function (dt) {
        this.hit(this.shotToTarget);
        this.shooting = false;

    };

    this.engage = function (dt) {
        var dTheta = dt * this.traverseSpeed;
        this.rotatedToTarget = false;
        lookTowards(this.turretMesh, this.mesh.worldToLocal(this.target.turretMesh.getWorldPosition()), dTheta, undefined, this);
        if (this.rotatedToTarget && !this.reloading && !this.shooting) {

            this.shotToTarget = this.target;

            this.shooting = true;
            this.reloading = true;
            var that = this;
            setTimeout(function () {
                that.reloading = false;
            }, 1000);
        }

    };
    this.init();

}

function Howitzer(side, scene, loc, loader, collid, selectables, yRotation,remote) {

    this.type = 'how';
    this.speed = 10.0;
    this.rotationSpeed = 5.0;
    this.traverseSpeed = 2.0;
    this.elevateSpeed = .5;

    this.armor = 100;

    this.side = side;
    
    this.remote = remote;

    this.range = 150;
    this.minRange = 50;
    this.health = this.armor;
    this.effectRange = 20;
    this.damage = 25;

    //engaging and shootin
    this.heightPoint = new THREE.Vector3();
    this.heightPointY = new THREE.Vector3();
    this.halfDistance = new THREE.Vector3();

    this.levitatedToTarget = false;

    this.blastCloud = {cloud: new THREE.Object3D()};
    this.blastCloud.cloud.visible = false;

    var that = this;
    function particlesLoaded(mapA) {

        that.blastCloud.cloud.position.set(5, 5, 5);
        scene.add(that.blastCloud.cloud);
        that.blastCloud.cloud.visible = false;

        that.blastCloud = new SpriteParticleSystem({
            cloud: that.blastCloud.cloud,
            rate: 30,
            num: 30,
            texture: mapA,
            //scaleR:[0.1,.2],
            scaleR: [0.05, .1],
            speedR: [0, 0.5],
            rspeedR: [-0.1, 0.3],
            lifespanR: [1, 4],
            terminalSpeed: 20
        });
//        this.blastCloud.start();
        that.blastCloud.addForce(new THREE.Vector3(0, 40, 0));

    }
    THREE.ImageUtils.loadTexture("images/smoke1.png", undefined, particlesLoaded);

    //shooting path
    this.curve = new THREE.QuadraticBezierCurve3(
            //this.curve = new THREE.SplineCurve3([
            new THREE.Vector3(-10, 0, 0),
            new THREE.Vector3(20, 15, 0),
            new THREE.Vector3(10, 0, 0)
            //]
            );
    this.curve.needsUpdate = true;
    var geometry = new THREE.Geometry();
    geometry.vertices = this.curve.getPoints(50);
    var material = new THREE.LineBasicMaterial({color: 0xff0000});
    this.curveObject = new THREE.Line(geometry, material);
    this.curveObject.geometry.verticesNeedUpdate = true;
    this.curveObject.visible = false;
    scene.add(this.curveObject);

    this.ammoCounter = 0;

    //this.hit = false;
    this.ammo = [];
    this.ammoNumber = 2;

    for (i = 0; i < this.ammoNumber; ++i) {
        this.ammo.push(new Ammos(i));
    }
    ;

    this.model00Url = "models/tank/how_body.js";
    this.model01Url = "models/tank/how_turret.js";
    this.model02Url = "models/tank/how_barrel.js";
    this.loadModel(this.model00Url, new THREE.Vector3(loc.x, loc.y, loc.z), this.model01Url, new THREE.Vector3(-0.09898, .85355, .04284), this.model02Url, new THREE.Vector3(-.04, 0.42, 1.15), scene, yRotation, collid, loader, selectables);

    this.hit = function (position) {
        this.blastCloud.cloud.position.copy(position);
        this.blastCloud.cloud.visible = true;
        this.blastCloud.start();

        //sound
        var source = audioContext.createBufferSource(); // creates a sound source
        source.buffer = explosionBuffer;
        source.connect(audioContext.destination); // connect the source to the context's destination (the speakers)
        if (controller.sound)
            source.start(0);

        var that = this;
        setTimeout(function () {
            that.blastCloud.stop();
            that.blastCloud.cloud.visible = false;

        }, 2000);

//you dont need to check other entities distance to the target position
//just send dpdu
        this.createDPDU(position);
        this.sendDPDU();
//        for (var i = 0; i < tanks.length; ++i) {
//            this.localVariable = position.distanceTo(tanks[i].pos);
//            if (this.localVariable < this.effectRange) {                
////                if (target.remote){
////                    this.createDPDU(target.pos, target.espdu.entityID);
//                this.createDPDU(target.pos, target.espdu.entityID);
//                this.sendDPDU();}
////                }else tanks[i].health -= this.damage * (this.effectRange - this.localVariable) / this.effectRange;
//                tanks[i].isAttackedBy = this.id;
//                //console.log(tanks[i].health)
//            }
            if (this.side === "blue")
                firstBlood = true;

        if (firstBlood) {
            for (var i = 0; i < tanks.length; ++i) {
                if (tanks[i].side === "red" && tanks[i].type === "how" && tanks[i].range < 200)
                    tanks[i].range += 15;
            }
        }

    };

    this.shoot = function (dt) {

        this.ammoCounter += dt / 4;


        if (this.ammoCounter <= 1) {
            this.shotAmmo.cube.position.copy(this.curve.getPointAt(this.ammoCounter));
            lookTowards(this.shotAmmo.cube, this.shotAmmo.cube.position.clone().add(this.curve.getTangentAt(this.ammoCounter)), 100);
        }

        if (this.ammoCounter > 1) {
            this.hit(this.shotAtPos);
            this.shotAmmo.cube.position.copy(new THREE.Vector3().setFromMatrixPosition(this.barrelMesh.matrixWorld));
            this.shotAmmo.fired = false;
            this.shotAmmo.cube.visible = false;
            //this.shotAmmo.fireDistance = 0;
            this.ammoCounter = 0;
            this.shooting = false;
            this.curveObject.visible = false;

        }

    };

    this.engage = function (dt) {
        var dTheta = dt * this.rotationSpeed;
        var dTheta1 = dt * this.elevateSpeed;
        this.halfDistance = this.target.pos.clone().sub(this.pos).multiplyScalar(3 / 4);
        this.heightPoint.copy(this.pos).add(this.halfDistance).add(this.heightPointY.setY(this.halfDistance.length()));
        this.rotatedToTarget = false;
        lookTowards(this.turretMesh, this.mesh.worldToLocal(this.heightPoint.clone().setY(this.turretMesh.getWorldPosition().y)), dTheta, undefined, this);
        if (this.rotatedToTarget)
            lookTowards(this.barrelMesh, this.turretMesh.worldToLocal(this.heightPoint.clone()), dTheta1, undefined, this, true);
        if (this.levitatedToTarget && !this.reloading && !this.shooting && this.pos.distanceTo(this.target.pos) > this.minRange) {

            //renew the ballistic path
            this.curve.v0.copy(this.barrelMesh.getWorldPosition());
            this.curve.v2.copy(this.target.pos);
            this.curve.v1.copy(this.heightPoint);


            this.curveObject.geometry.vertices = this.curve.getPoints(50);
            this.curve.needsUpdate = true;
            this.curveObject.geometry.verticesNeedUpdate = true;
            if (controller.ballisticTrajectory)
                this.curveObject.visible = true;


            //sound
            var source = audioContext.createBufferSource(); // creates a sound source
            source.buffer = cannon_fireBuffer;
            source.connect(audioContext.destination); // connect the source to the context's destination (the speakers)
            if (controller.sound)
                source.start(0);


            this.ammoCounter = 0;
            this.shotToTarget = this.target;
            this.shotAmmo = this.chooseAmmo();
            this.shotAtPos.copy(this.target.pos);
            this.shotFromPos = this.turretMesh.getWorldPosition();
            this.shooting = true;
            this.reloading = true;
            var that = this;
            setTimeout(function () {
                that.reloading = false;
            }, 8000);
        }

    };
    this.init();
}
function Uav(side, scene, loc, loader, collid, selectables, yRotation, remote) {

    //remote uav
    this.remote = true;

    this.type = 'uav';
    this.speed = 15.0;
    this.rotationSpeed = 3.0;
    this.traverseSpeed = 2.0;
    this.elevateSpeed = 0.0;

    this.armor = 1000;

    this.side = side;

    this.barrelPos = new THREE.Vector3(0, 0, 1);

    this.range = 100;
    this.health = this.armor;
    this.damage = 10;
	this.remote = remote;

    this.barrelCloud = {cloud: new THREE.Object3D()};
    this.barrelCloud.cloud.visible = false;

    var that = this;
    function particlesLoaded(mapA) {

        that.barrelCloud.cloud.position.set(5, 5, 5);
        that.barrelCloud.cloud.visible = false;

        that.barrelCloud = new SpriteParticleSystem({
            cloud: that.barrelCloud.cloud,
            rate: 30,
            num: 30,
            texture: mapA,
            //scaleR:[0.1,.2],
            scaleR: [0.05, .1],
            speedR: [0, 0.5],
            rspeedR: [-0.1, 0.3],
            lifespanR: [1, 4],
            terminalSpeed: 20
        });

    }
    //THREE.ImageUtils.loadTexture("images/barrel_light.png", undefined, particlesLoaded);
    THREE.ImageUtils.loadTexture("images/smoke1.png", undefined, particlesLoaded);

    this.model00Url = "models/uav/predator2.js";
    this.model01Url = null;
    this.model02Url = null;
    this.loadModel(this.model00Url, new THREE.Vector3(loc.x, loc.y, loc.z), this.model01Url, new THREE.Vector3(0.08076, 1.52923, 0.42493), this.model02Url, new THREE.Vector3(.012, 0.168, .583), scene, yRotation, collid, loader, selectables, this.barrelCloud.cloud);

    this.hit = function (target) {

        //sound
        var source = audioContext.createBufferSource(); // creates a sound source
        source.buffer = machinegunBuffer;
        source.connect(audioContext.destination); // connect the source to the context's destination (the speakers)
        if (controller.sound)
            source.start(0);

        this.barrelCloud.cloud.visible = true;
        this.barrelCloud.start();
        var that = this;
        setTimeout(function () {
            that.barrelCloud.cloud.visible = false;
            that.barrelCloud.stop();
        }, 1200);

        target.health -= this.damage;
        target.isAttackedBy = this.id;

    };
    this.shoot = function (dt) {
        this.hit(this.shotToTarget);
        this.shooting = false;

    };

    this.engage = function (dt) {
        var dTheta = dt * this.traverseSpeed;
        this.rotatedToTarget = false;
        lookTowards(this.turretMesh, this.mesh.worldToLocal(this.target.turretMesh.getWorldPosition()), dTheta, undefined, this);
        if (this.rotatedToTarget && !this.reloading && !this.shooting) {

            this.shotToTarget = this.target;

            this.shooting = true;
            this.reloading = true;
            var that = this;
            setTimeout(function () {
                that.reloading = false;
            }, 1000);
        }

    };
    this.init();
    this.move = function (dt) {
        //do nothing
    };
    this.updateUAV = function (updatedLocation, orientation) {
        if (!this.mesh)
            return;
        //this.chassisMesh.position.set(updatedLocation.x - 5, -updatedLocation.y - 90, updatedLocation.z + 5);
        this.chassisMesh.position.set(-updatedLocation.x, -updatedLocation.y+90, updatedLocation.z);
        
        this.chassisMesh.rotation.set(orientation.x, orientation.y, orientation.z);
        
        
        
    };

}

Tank.prototype = entityProto;
RemoteTank.prototype = entityProto;
Howitzer.prototype = entityProto;
Infantry.prototype = entityProto;
Uav.prototype = entityProto;
