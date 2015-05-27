var canvas;
var gl;
var groundSize, ground, groundBuffer;
var geoNumber, geo = [], geoBuffer, index = [];
var normals = [], normalBuffer;
var projection, inv_projection, camera, inv_camera;
var locations = [];  //locations of geometries
var time_old = 0, next_sample_time = 0, sampleT = 1;
var _vPosition, _projection, _modelView, _normal, _normalMatrix, _ambientProduct, _diffuseProduct, _specularProduct, _lightPosition, _shininess, _lightNum;
var key = {left: false, right: false, up: false, down: false};
var analyser, frequencyHistory = [];
// ----- For Particles ----- //
var triangleBuffer, triangle_vertex = [vec3(-1.5, 0.0,0.0), vec3(1.5, 0.0, 0.0), vec3(0.0, 2, 0.0)];
var velocity = [];
var speed = 1.0;
var box_size = 200.0;
var points = [];
var true_location = [];
var NumPoints = 150;
var far, near;
// ----- For Particles ----- //

var lights = [{
    position: vec4(10.0, 10.0, 10.0, 1.0),
    ambient: vec4(1.0, 1.0, 1.0, 1.0),
    diffuse: vec4(1.0, 1.0, 1.0, 1.0),
    specular: vec4(0.0, 0.0, 0.0, 1.0),
    age: 0  // Lights will decay (except the global ambient light)
}];

var materials = {
    ground: {
        ambient: vec4(0.5, 0.5, 0.5, 0.2),
        diffuse: vec4(0.5, 0.5, 0.5, 0.2),
        specular: vec4(1.0, 1.0, 1.0, 1.0),
        shininess: 0.01
    },
    tree: {
        ambient: vec4(1.0, 1.0, 1.0, 1.0),
        diffuse: vec4(0.5, 0.5, 0.5, 1.0),
        specular: vec4(0.0, 0.0, 0.0, 0.0),
        shininess: 0.001
    },
    particle: {
        ambient: vec4(1.0, 1.0, 1.0, 1.0),
        diffuse: vec4(0.5, 0.5, 0.5, 1.0),
        specular: vec4(0.0, 0.0, 0.0, 0.0),
        shininess: 0.001
    }
};

var MAX_LIGHTS = 10;  // This should match the macro in GLSL!
var LIGHT_LIFE_EXPECTANCY = 50;

document.addEventListener('keydown', keyDownHandler);
document.addEventListener('keyup', keyUpHandler);
document.addEventListener('click', clickHandler);
window.ondeviceorientation = gyroscopeHandler;

window.onload = function() {
    var canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl)
        alert("WebGL isn't available");
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    // Set clear color to be black
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    
    // Enable depth buffer
    gl.enable(gl.DEPTH_TEST);
    //gl.depthFunc(gl.LESS);
    gl.clearDepth(1.0);
    
    // Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    drawTree(0.1, 0.1, -0.2, 0.2, -1.5, 0.8, 1.2, 0.7);
    drawTree(-0.5, 0.5, -0.7, 1.0, -0.1, 1.0, 1.1, 0.9);
    drawTree(-0.8, -0.1, -0.5, 0.2, -0.3, 0.9, 1.4, 0.8);
    drawTree(0.5, -0.9, 0.2, -0.5, -0.4, 2.0, 1.5, 0.5);
    drawTree(1.0, -0.2, 0.3, -0.5, -0.8, 0.5, 1.3, 1.3);    


    // Get handles
    _vPosition = gl.getAttribLocation(program, "vPosition");
    _projection = gl.getUniformLocation(program, "projection");
    _modelView = gl.getUniformLocation(program, "modelView");
    _normal = gl.getAttribLocation(program, "normal");
    _normalMatrix = gl.getUniformLocation(program, "normalMatrix");
    _ambientProduct = gl.getUniformLocation(program, "ambientProduct");
    _diffuseProduct = gl.getUniformLocation(program, "diffuseProduct");
    _specularProduct = gl.getUniformLocation(program, "specularProduct");
    _lightPosition = gl.getUniformLocation(program, "lightPosition");
    _shininess = gl.getUniformLocation(program, "shininess");
    _lightNum = gl.getUniformLocation(program, "lightNum");
    
    initialSetup();
    
    for (var i = 0; i < geoNumber; i++) {
        var x = (Math.random() -0.5) * groundSize;
        var y = 0.0;
        var z = - Math.random() * groundSize;
        locations.push(translate(vec3(x, y, z)));
        index.push(Math.floor(Math.random()/0.2));
    }

    // Create buffers
    groundBuffer = gl.createBuffer();
    geoBuffer = gl.createBuffer();
    normalBuffer = gl.createBuffer();
    triangleBuffer = gl.createBuffer();
    triangleNormalBuffer = gl.createBuffer();
    gl.enableVertexAttribArray(_vPosition);
    gl.enableVertexAttribArray(_normal);

    $('#bgm-input').change(function() {  addBGM(this.files[0]);  });
};

var GLStarted = false;
function startGL() {
    if (GLStarted)
        return;
    GLStarted = true;

    // Set up audio
    var ctx = new AudioContext();
    var audio = document.getElementById($('.bgm.menu>.active.item').attr('bgm-id'));
    $('#bgm-column').fadeOut();
    var audioSrc = ctx.createMediaElementSource(audio);
    analyser = ctx.createAnalyser();  // This is global
    audioSrc.connect(analyser);
    audioSrc.connect(ctx.destination);
    audio.play();

    animate(0);
};

function initialSetup() {
    groundSize = 200.0;
    geoNumber = 30;  // Total number of geometries
    
    camera = translate(0.0, -10, 0.0);

    projection = perspective(90, 960./540, 0.1, groundSize);
    inv_camera = inverseCamera(camera);
    inv_projection = inverseProjection(projection);

    ground = [- groundSize / 2, 0.0, 0.0,
              groundSize / 2, 0.0, 0.0,
              - groundSize / 2, 0.0, - groundSize,
              - groundSize / 2, 0.0, - groundSize,
              groundSize / 2, 0.0, - groundSize,
              groundSize / 2, 0.0, 0.0,
              ];
    setUpPoints();
    
}

function animate(time) {
    var dt = time - time_old;
    time_old = time;
    for (var i = 0; i < locations.length; i++) {
        locations[i] = mult(translate(0.0, 0.0, 0.001 * dt), locations[i]);
        if (key.left)
            locations[i] = mult(rotate(-0.02 * dt, vec3(0.0, 1.0, 0.0)),locations[i]);
        else if (key.right)
            locations[i] = mult(rotate(0.02 * dt, vec3(0.0, 1.0, 0.0)),locations[i]);
    }
    for (var i = 0; i < points.length; i++) {
        points[i] = vec3(times(translate(0.0, 0.0, 0.001 * dt), vec4(points[i],1.0)));
        if (key.left)
            points[i] = vec3(times(rotate(-0.02 * dt, vec3(0.0, 1.0, 0.0)), vec4(points[i],1.0)));
        else if (key.right)
            points[i] = vec3(times(rotate(0.02 * dt, vec3(0.0, 1.0, 0.0)), vec4(points[i],1.0)));
    }
    if (next_sample_time < time) {
        next_sample_time += sampleT;
        analyzeAudio();
    }

    updatVelocity(1.0, 100.0);
    updatePointsLocation();
    generateTrueLocation();




    render();
    window.requestAnimationFrame(animate);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(_projection, false, flatten(projection));

    // Draw ground
    // --- borrowing normals for the ground, replace this by true normals
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
    gl.vertexAttribPointer(_normal, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(ground), gl.STATIC_DRAW);
    gl.vertexAttribPointer(_vPosition, 3, gl.FLOAT, false, 0, 0);

    setUniformLights(materials.ground);

    setModelViewAndNormalMatrix(camera);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    // Draw geometries
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
    gl.vertexAttribPointer(_normal, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, geoBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(geo), gl.STATIC_DRAW);
    gl.vertexAttribPointer(_vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray( _vPosition );

    setUniformLights(materials.tree);

    var offset = 0.01; //decided by bounding volume
    for (var i = 0; i < locations.length; i++) {
        //var index = Math.floor(Math.random()/0.2);
        var pos = find_clip_coord(locations[i], offset);
        //console.log(pos);
        var z = pos[2] / pos[3];
        var x = pos[0] / pos[3];
        var y = pos[1] / pos[3];
        if (x > 1.0 || y > 1.0 || z > 1.0 ) {  //pop things behind the camera
            locations.splice(i, 1);
            index.splice(i, 1);
            i = i - 1;
        } else {
            gl.uniformMatrix4fv(_modelView, false, flatten(mult(camera, locations[i])));
            gl.drawArrays(gl.TRIANGLES, 45*index[i], 45);
        }
    }

    setUniformLights(materials.ground);
    
    setModelViewAndNormalMatrix(translate(0.0, 0.0, 0.0));
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(triangle_vertex), gl.STATIC_DRAW);
    gl.vertexAttribPointer(_vPosition, 3, gl.FLOAT, false, 0, 0);
    for (var i = 0; i < NumPoints; i++)
    {
        modelView = translate(true_location[i]);
        gl.uniformMatrix4fv(_modelView, false, flatten(modelView));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    while (locations.length < geoNumber) {
        if (key.right == true) {
            var x = Math.random() * 0.5 * groundSize;
        }
        else if (key.left == true) {
            var x = - Math.random() * 0.5 * groundSize;
        }
        else {
            var x = (Math.random() - 0.5) * groundSize;
        }
        
        var y = 0.0;
        var z = - Math.random() * groundSize;
        var potential = translate(vec3(x, y, z));
        var clipped = find_clip_coord(potential, offset);
        var x_clipped = clipped[0] / clipped[3];
        var y_clipped = clipped[1] / clipped[3];
        var z_clipped = clipped[2] / clipped[3];
        //console.log(x_clipped);
        if (x_clipped > 1.0 || y_clipped > 1.0 || z_clipped > 1.0) {
            locations.push(potential);
            index.push(Math.floor(Math.random()/0.2));
        }
    }

    // Lights decay, note that the first light won't decay
    for (var i = 1; i < lights.length; i ++) {
        lights[i].age ++;
        // TODO: decay in strength
        lights[i].ambient[0] -= 1/LIGHT_LIFE_EXPECTANCY;
        lights[i].ambient[1] -= 1/LIGHT_LIFE_EXPECTANCY;
        lights[i].ambient[2] -= 1/LIGHT_LIFE_EXPECTANCY;
        lights[i].diffuse[0] -= 1/LIGHT_LIFE_EXPECTANCY;
        lights[i].diffuse[1] -= 1/LIGHT_LIFE_EXPECTANCY;
        lights[i].diffuse[2] -= 1/LIGHT_LIFE_EXPECTANCY;
        lights[i].specular[0] -= 1/LIGHT_LIFE_EXPECTANCY;
        lights[i].specular[1] -= 1/LIGHT_LIFE_EXPECTANCY;
        lights[i].specular[2] -= 1/LIGHT_LIFE_EXPECTANCY;

        if (lights[i].age == LIGHT_LIFE_EXPECTANCY)
            lights.splice(i, 1);
    }
}

function analyzeAudio() {
    var frequencyData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(frequencyData);

    var f = [];
    for (var i = 0; i < 5; i ++) {
        f.push(0);
        for (var j = 0; j < 50; j ++)
            f[i] += frequencyData[50*i + j];
    }
    // Push the sum to the array
    var total = 0;
    for (var i = 0; i < f.length; i ++)
        total += f[i];
    f.push(total);

    frequencyHistory.push(f);
    if (frequencyHistory.length > 10)
        frequencyHistory.shift();
    /*
        Mean: 7556.728101976377, Max: 10433, Pstdev: 1865.9577103153833
        Mean: 4625.7136007484505, Max: 8414, Pstdev: 1906.474273983962
        Mean: 3624.1598643433517, Max: 8131, Pstdev: 1908.5070876283664
        Mean: 3140.3971465325694, Max: 8455, Pstdev: 1931.6290092952563
        Mean: 2697.0495848438777, Max: 7369, Pstdev: 1928.8492120964333
        Mean: 21644.048298444628, Max: 38468, Pstdev: 8950.926632696443
    */

    // Stablize
    var frequency = frequencyHistory[0];
    for (var i = 1; i < frequencyHistory.length; i ++) {
        for (var j = 0; j < frequency.length; j ++)
            frequency[j] = (frequency[j] + frequencyHistory[i][j]) / 2;
    }
    
    // Apply frequency to lights[0]
    lights[0].diffuse[0] = frequency[4]/5000 + 0.1;
    lights[0].diffuse[1] = frequency[4]/4000 + 0.1;
    lights[0].diffuse[2] = frequency[4]/5200 + 0.1;

    lights[0].ambient[0] = frequency[5]/38468;
    lights[0].ambient[1] = frequency[5]/38468;
    lights[0].ambient[2] = frequency[5]/38468;
}

function drawTree(a, b, c, d, e, f, factor1, factor2) {

    var points = [];
    points.push( vec3(-0.5, 0, 0) );
    points.push( vec3(0.5, 0, 0) );
    points.push( vec3(0, 0, 0.8) );
    points.push( add(vec3(a,5.0*factor1,b),vec3(-0.3, 0, 0)) );
    points.push( add(vec3(a,5.0*factor1,b),vec3(0.3, 0, 0)) );
    points.push( add(vec3(a,5.0*factor1,b),vec3(0, 0, 0.5)) );
    points.push( add(vec3(c,10.0*factor1,d),vec3(-0.15, 0, 0)) );
    points.push( add(vec3(c,10.0*factor1,d),vec3(0.15, 0, 0)) );
    points.push( add(vec3(c,10.0*factor1,d),vec3(0, 0, 0.25)) );
    points.push( vec3(e,15*factor2,f) );

    var indices = [0,2,5,0,5,3,3,5,8,3,8,6,6,8,9,2,1,5,5,1,4,5,4,8,8,4,7,7,8,9,0,1,3,3,1,4,3,4,6,6,4,7,6,7,9];
    for ( var i = 0; i < indices.length; ++i ) 
    {
        geo.push( points[indices[i]] );
        normals.push ( points[indices[i]] );
    }
}
    


/********  Interface  ********/

function keyDownHandler(event) {
    switch (event.keyCode){
        case 37:  // left arrow
            key.left = true;
            break;
        case 39:  // right arrow
            key.right = true;
            break;
    }
}

function keyUpHandler(event) {
    switch (event.keyCode){
        case 37:  // left arrow
            key.left = false;
            break;
        case 39:  // right arrow
            key.right = false;
            break;
    }
}

function clickHandler(event) {
    if (lights.length == MAX_LIGHTS)
        return;

    var clickLoc = vec4(event.clientX, event.clientY, 0, 1);
    clickLoc = times(inv_projection, clickLoc);
    clickLoc = times(inv_camera, clickLoc);
    // clickLoc[2] = 10;
    clickLoc[3] = 1;
    console.log('For (' +event.clientX + ', ' + event.clientY + ') the clickLoc is ' + clickLoc);
    // TODO: lights should vary
    
    // lights.push({
    //     position: clickLoc,
    //     ambient: vec4(1.0, 1.0, 1.0, 1.0),
    //     diffuse: vec4(1.0, 1.0, 1.0, 1.0),
    //     specular: vec4(1.0, 1.0, 1.0, 1.0),
    //     age: 0
    // });
    // Experiment: use random color?
    var color = randomColor({luminosity: 'bright', format: 'rgba'});
    lights.push({
        position: clickLoc,
        ambient: color,
        diffuse: color,
        specular: color,
        age: 0
    });
}

var alphaHistory = [0];
function gyroscopeHandler(event) {
    if (!event.alpha)
        return; // Not supported
    alphaHistory.push(event.alpha);
    if (alphaHistory.length > 5)
        alphaHistory.shift();
    var alpha = alphaHistory[0];
    for (var i = 1; i < alphaHistory.length; i ++)
        alpha = (alpha + alphaHistory[i])/2;
    var dalpha = alpha - alphaHistory[alphaHistory.length - 1];
    for (var i = 0; i < locations.length; i ++)
        locations[i] = mult(rotate(dalpha, [0, 1, 0]), locations[i]);
    for (var i = 0; i < lights.length; i ++)
        lights[i].position = times(rotate(dalpha, [0, 1, 0]), lights[i].position);
}

function setUniformLights(material) {
    var am = [], di = [], sp = [], po = [];

    for (var i = 0; i < lights.length; i ++) {
        am.push(mult(material.ambient, lights[i].ambient));
        di.push(mult(material.diffuse, lights[i].diffuse));
        sp.push(mult(material.specular, lights[i].specular));
        po.push(lights[i].position);
    }
    for (var i = lights.length; i < MAX_LIGHTS; i ++) {
        // Fill it with zeroes
        am.push(0.0);
        di.push(0.0);
        sp.push(0.0);
        po.push(0.0);
    }

    gl.uniform1i(_lightNum, lights.length);
    gl.uniform4fv(_ambientProduct, flatten(am));
    gl.uniform4fv(_diffuseProduct, flatten(di));
    gl.uniform4fv(_specularProduct, flatten(sp));
    gl.uniform4fv(_lightPosition, flatten(po));
    gl.uniform1f(_shininess, material.shininess);
}

function setBGM(dom) {
    $(dom).addClass('active').siblings().removeClass('active');
}

function addBGM(file) {
    var reader = new FileReader();

    reader.onload = function(event) {
        the_url = event.target.result;
        $('#audio-zone').append('<audio id="custom" src="' + the_url + '"></audio>');
    }

    reader.readAsDataURL(file);
}

/********  Utility  ********/

function times(matrix, vector) {
    var result = [];
    for (var i = 0; i < 4; i++) {
        result.push(dot(matrix[i], vector));
    }
    return result;
}

function inverseProjection(m) {
    var a = m[0][0];
    var b = m[1][1];
    var c = m[2][2];
    var d = m[2][3];
    var inv = [];
    inv.push(vec4(1 / a, 0.0, 0.0, 0.0));
    inv.push(vec4(0.0, 1 / b, 0.0, 0.0));
    inv.push(vec4(0.0, 0.0, 0.0, -1.0));
    inv.push(vec4(0.0, 0.0, 1 / d, c / d));
    return inv;
}

function inverseCamera(m) {
    var res = [];
    res.push([m[0][0], m[0][1], m[0][2], -m[0][3]]);
    res.push([m[1][0], m[1][1], m[1][2], -m[1][3]]);
    res.push([m[2][0], m[2][1], m[2][2], -m[2][3]]);
    res.push([m[3][0], m[3][1], m[3][2], m[3][3]]);
    return res;
}

function find_clip_coord(location, offset) {
    var pos1 = times(location, vec4(offset, 0.0, - offset, 1.0));
    pos1 = times(projection, pos1);
    var pos2 = times(location, vec4(- offset, 0.0, - offset, 1.0));
    pos2 = times(projection, pos2);

    var pos = [];
    pos.push(Math.min(Math.abs(pos1[0]), Math.abs(pos2[0])));
    pos.push(Math.min(Math.abs(pos1[1]), Math.abs(pos2[1])));
    pos.push(Math.min(Math.abs(pos1[2]), Math.abs(pos2[2])));
    pos.push(Math.max(Math.abs(pos1[3]), Math.abs(pos2[3])));    

    return pos;
}

function setModelViewAndNormalMatrix(modelViewMatrix) {
    var normalMatrix = [
        vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
        vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
        vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2])
    ];
    gl.uniformMatrix4fv(_modelView, false, flatten(modelViewMatrix));
    gl.uniformMatrix3fv(_normalMatrix, false, flatten(normalMatrix));
}

function hexColorToRGBA(hex) {
    var num = parseInt(hex.slice(1),16);
    var R = (num >> 16)/256, G = (num >> 8 & 0x00FF)/256, B = (num & 0x0000FF)/256;
    return [R, G, B, 1.0];
}
