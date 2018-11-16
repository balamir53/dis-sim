var nReps = 10.0;
terrainUniforms.uSplat1Repeat.value.x = nReps;
terrainUniforms.uSplat1Repeat.value.y = nReps;
terrainUniforms.uSplat2Repeat.value.x = nReps;
terrainUniforms.uSplat2Repeat.value.y = nReps;
terrainUniforms.uSplat3Repeat.value.x = nReps;
terrainUniforms.uSplat3Repeat.value.y = nReps;
terrainUniforms.uSplat4Repeat.value.x = nReps;
terrainUniforms.uSplat4Repeat.value.y = nReps;


var terrainMaterial;
var skyboxScene, skyboxCamera, skyboxMesh;


function initTerrain() {

    function onGeometryLoaded(geometry, materials) {

        terrainUniforms.tSplat1.value = THREE.ImageUtils.loadTexture("images/SUNNY-Assorted-Ground.png");
        terrainUniforms.tSplat2.value = THREE.ImageUtils.loadTexture("images/grass-and-rock.png");
        terrainUniforms.tSplat3.value = THREE.ImageUtils.loadTexture("images/snow.png");
        terrainUniforms.tSplat4.value = THREE.ImageUtils.loadTexture("images/SUNNY-Mottled-Stone-and-Dirt.png");
        terrainUniforms.tAlphaMap.value = THREE.ImageUtils.loadTexture("images/splat3.png");


        terrainMaterial = new THREE.TerrainMaterial({
            uniforms: terrainUniforms,
            vertexShader: terrainVertexShader,
            fragmentShader: terrainFragShader,
            lights: true,
        });
        //materials.push(terrainMaterial);
        plane = new THREE.Mesh(geometry, terrainMaterial);
        //terrainMesh.receiveShadow = true;
        scene.add(plane);
        objects.push(plane);


    }
    function onGeometryLoaded1(geometry, materials) {
        var nReps1 = 150.0;
        terrainUniforms1.uSplat1Repeat.value.x = nReps1;
        terrainUniforms1.uSplat1Repeat.value.y = nReps1;
        terrainUniforms1.uSplat2Repeat.value.x = nReps1;
        terrainUniforms1.uSplat2Repeat.value.y = nReps1;
        terrainUniforms1.uSplat3Repeat.value.x = nReps1;
        terrainUniforms1.uSplat3Repeat.value.y = nReps1;
        terrainUniforms1.uSplat4Repeat.value.x = nReps1;
        terrainUniforms1.uSplat4Repeat.value.y = nReps1;

        terrainUniforms1.tSplat1.value = THREE.ImageUtils.loadTexture("images/SUNNY-Assorted-Ground.png");
        terrainUniforms1.tSplat2.value = THREE.ImageUtils.loadTexture("images/grass-and-rock.png");
        terrainUniforms1.tSplat3.value = THREE.ImageUtils.loadTexture("images/snow.png");
        terrainUniforms1.tSplat4.value = THREE.ImageUtils.loadTexture("images/SUNNY-Mottled-Stone-and-Dirt.png");
        terrainUniforms1.tAlphaMap.value = THREE.ImageUtils.loadTexture("images/splat2.jpg");


        terrainMaterial = new THREE.TerrainMaterial({
            uniforms: terrainUniforms1,
            vertexShader: terrainVertexShader,
            fragmentShader: terrainFragShader,
            lights: true,
        });
        materials.push(terrainMaterial);
        var plane1 = new THREE.Mesh(geometry, terrainMaterial);

        //terrainMesh.receiveShadow = true;
        scene.add(plane1);
        plane1.position.y = -.9;
        //objects.push(plane);


    }

    var loader = new THREE.JSONLoader();

    loader.load("models/terrain/terrain3.json", onGeometryLoaded);
    loader.load("models/terrain/plane.js", onGeometryLoaded1);
}

function initSkybox() {

    skyboxCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, .1, 20000);
    skyboxScene = new THREE.Scene();

    var path = "images/sunnysky/";
    var format = '.jpg';
    var urls = [
        path + 'px' + format, path + 'nx' + format,
        path + 'py' + format, path + 'ny' + format,
        path + 'pz' + format, path + 'nz' + format
    ];

    var textureCube = THREE.ImageUtils.loadTextureCube(urls);

    var shader = THREE.ShaderLib["cube"];
    shader.uniforms["tCube"].value = textureCube;

    // We're inside the box, so make sure to render the backsides
    // It will typically be rendered first in the scene and without depth so anything else will be drawn in front
    var material = new THREE.ShaderMaterial({
        fragmentShader: shader.fragmentShader,
        vertexShader: shader.vertexShader,
        uniforms: shader.uniforms,
        depthWrite: false,
        side: THREE.BackSide
    });

    // The box dimension size doesn't matter that much when the camera is in the center.  Experiment with the values.
    skyboxMesh = new THREE.Mesh(new THREE.BoxGeometry(1000, 1000, 1000, 1, 1, 1), material);
    skyboxScene.add(skyboxMesh);
}

