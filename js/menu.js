/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */



var controller = {
    wayPoints: true,
    boundingBoxes: false,
    ballisticTrajectory: false,
    healthBar: true,
    pause : false,
    enemyBehavior:0,
    zoomToUnit:false,
    pan:true,
    music:true,
    sound:true,
    nightVision:false,
    stopUnit : function(){
        tank.wayPoints =[];
       
    },
    resetAllWaypoints :function(){
        for (var i=0; i<tanks.length;++i){
            tanks[i].wayPoints = [];
            //tanks[i].wayPoints.goal = tanks.pos;
        }
    },
    

    init: function (gui) {
        var v1 = gui.addFolder('Visualization');
        var v2 = gui.addFolder('Game Control');
        var that = this;
        
        v1.add(controller, "wayPoints");
        v1.add(controller, "boundingBoxes");
        v1.add(controller, "ballisticTrajectory");
        v1.add(controller, "healthBar");
        
        v2.add(controller, "pause");
        v2.add(controller, "stopUnit");
        v2.add(controller, "resetAllWaypoints");
        v2.add(controller,"pan");
        v2.add(controller,"nightVision");
        v2.add(controller,"sound");
        v2.add(controller,"music").onChange(function(){
            if(!controller.music) sound.pause();
            else sound.play();
        });
        v2.add(controller,"zoomToUnit").onChange(function(){
            if(controller.zoomToUnit&&tank){
                cameraCount+=1;
                if(cameraFirst.parent)
                    THREE.SceneUtils.detach(cameraFirst,cameraFirst.parent,scene);
                THREE.SceneUtils.attach(cameraFirst,scene,tank.mesh);
                cameraFirst.position.set(0,5,-30);
                
//                camera.position.copy(tank.mesh.localToWorld(new THREE.Vector3(0,30,-60)));
                //cameraFirst.lookAt(tank.mesh.localToWorld(new THREE.Vector3(0,0,30)));
                cameraFirst.lookAt(new THREE.Vector3(0,0,300));
            }else {cameraCount+=1;
//                camera.position.copy(cameraDefaultPos); camera.lookAt(new THREE.Vector3());
            }
        });
        v2.add(controller,"enemyBehavior",{defensive:0,aggressive:1}).onChange(function(){
            if(controller.enemyBehavior==="0"){
            
            for(var i =0; i<tanks.length;++i){
                if(tanks[i].side==="red")
                    tanks[i].goal=tanks[i].pos;           }
                   }
        })
        ;

        gui.close();
    }
};
