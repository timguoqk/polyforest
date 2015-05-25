var canvas;
var gl;
var groundSize, ground, groundBuffer;
var geoNumber, geo = [], geoBuffer;
var normals = [], normalBuffer;
var projection, inv_projection, camera, inv_camera;
var locations = [];  //locations of geometries
var time_old = 0, next_sample_time = 0, sampleT = 1;
var _vPosition, _projection, _modelView, _normal, _normalMatrix, _ambientProduct, _diffuseProduct, _specularProduct, _lightPosition, _shininess, _lightNum;
var key = {left: false, right: false, up: false, down: false};
var analyser, frequencyHistory = [];

var lights = [{
    position: vec4(10.0, 10.0, 10.0, 1.0),
    ambient: vec4(1.0, 1.0, 1.0, 1.0),
    diffuse: vec4(1.0, 1.0, 1.0, 0.0),
    specular: vec4(0.0, 0.0, 0.0, 0.0),
    age: 0  // Lights will decay (except the global ambient light)
}];

var materials = {
    ground: {
        ambient: vec4(0.5, 0.5, 0.5, 0.2),
        diffuse: vec4(0.5, 0.5, 0.5, 0.2),
        specular: vec4(0.0, 0.0, 0.0, 0.0),
        shininess: 0.1
    }
};

var MAX_LIGHTS = 10;  // This should match the macro in GLSL!
var LIGHT_LIFE_EXPECTANCY = 500;

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
    gl.depthFunc(gl.LESS);
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
    }

    // Create buffers
    groundBuffer = gl.createBuffer();
    geoBuffer = gl.createBuffer();
    normalBuffer = gl.createBuffer();

    gl.enableVertexAttribArray(_vPosition);
    gl.enableVertexAttribArray(_normal);
    
    // Set up audio
    var ctx = new AudioContext();
    var audio = document.getElementById('bgm');
    var audioSrc = ctx.createMediaElementSource(audio);
    analyser = ctx.createAnalyser();  // This is global
    audioSrc.connect(analyser);
    audioSrc.connect(ctx.destination);
    audio.play();

    animate(0);
};

function initialSetup() {
    groundSize = 200.0;
    geoNumber = 100;  // Total number of geometries
    
    camera = translate(0.0, -10, 0.0);
    projection = perspective(40, 960./540, 0.01, groundSize);
    inv_camera = inverse4(camera);
    inv_projection = inverse4(projection);
    ground = [- groundSize / 2, 0.0, 0.0,
              groundSize / 2, 0.0, 0.0,
              - groundSize / 2, 0.0, - groundSize,
              - groundSize / 2, 0.0, - groundSize,
              groundSize / 2, 0.0, - groundSize,
              groundSize / 2, 0.0, 0.0,
              ];
    
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
    if (next_sample_time < time) {
        next_sample_time += sampleT;
        analyzeAudio();
    }
    render();
    window.requestAnimationFrame(animate);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(_projection, false, flatten(projection));

    // Draw ground
    gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(ground), gl.STATIC_DRAW);
    gl.vertexAttribPointer(_vPosition, 3, gl.FLOAT, false, 0, 0);

    setModelViewAndNormalMatrix(camera);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    // Draw geometries
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
    gl.vertexAttribPointer(_normal, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, geoBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(geo), gl.STATIC_DRAW);
    gl.vertexAttribPointer(_vPosition, 3, gl.FLOAT, false, 0, 0);
    //gl.enableVertexAttribArray( _vPosition );
    // Set up light
    setUniformLights(materials.ground);

    var offset = 0.01; //decided by bounding volume
    for (var i = 0; i < locations.length; i++) {
        //var index = Math.floor(Math.random()/0.2);
        var pos = find_clip_coord(locations[i], offset);
        //console.log(pos);
        var z = pos[2] / pos[3];
        var x = pos[0] / pos[3];
        var y = pos[1] / pos[3];
        if (z > 1.0 || y > 1.0 || z > 1.0 ) {  //pop things behind the camera
            locations.splice(i, 1);
            i = i - 1;
        } else {
            setModelViewAndNormalMatrix(mult(camera, locations[i]));
            gl.drawArrays(gl.TRIANGLES, 0, 45);
        }
    }

    // FIXME: @lihao http://en.wikipedia.org/wiki/Don%27t_repeat_yourself
    while (locations.length < geoNumber) {
        var coin = Math.random();
        var x = (Math.random() - 0.5) * 2;
        var z = (Math.random() - 0.5) * 2;
        var w = (Math.random()) * groundSize;
        var clipped;
        var world_coord;
        if (key.right == true) {
            clipped = vec4((1.0) * w, 0.0, z * w, w);
            world_coord = times(inv_projection, clipped);
            world_coord[1] = 0.0;
            world_coord[0] = world_coord[0] + offset + Math.random();
            locations.push(translate(vec3(world_coord)));
        }
        if (key.left == true) {
            clipped = vec4(-(1.0) * w, 0.0, z * w, w);
            world_coord = times(inv_projection, clipped);
            world_coord[1] = 0.0;
            world_coord[0] = world_coord[0] - offset - Math.random();
            locations.push(translate(vec3(world_coord)));
        }
        if (coin < 0.2) {
            clipped = vec4(x * w, 0.0, groundSize, groundSize);
            world_coord = times(inv_projection, clipped);
            world_coord[1] = 0.0;
            locations.push(translate(vec3(world_coord)));
        }
        else if (coin < 0.6) {
            clipped = vec4((1.0) * w, 0.0, z * w, w);
            world_coord = times(inv_projection, clipped);
            world_coord[1] = 0.0;
            world_coord[0] = world_coord[0] + offset + Math.random();
            locations.push(translate(vec3(world_coord)));
        }
        else {
            clipped = vec4((- 1.0) * w, 0.0, z * w, w);
            world_coord = times(inv_projection, clipped);
            world_coord[1] = 0.0;
            world_coord[0] = world_coord[0] - offset - Math.random();
            locations.push(translate(vec3(world_coord)));
        }
    }

    // Lights decay, note that the first light is ambient and won't decay
    for (var i = 1; i < lights.length; i ++) {
        lights[i].age ++;
        // TODO: decay in strength
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
    if (frequencyHistory.length > 5)
        frequencyHistory.shift();
    
    var frequency = frequencyHistory.reduce(function(prev, current) {
        var res = [];
        for (var i = 0; i < 6; i ++)
            res.push((prev[i] + current[i]) / 2);
        return res;
    });

    // Apply frequency to lights
    lights[0].diffuse = vec4(frequency[4]/4000 + 0.1, frequency[4]/3000 + 0.1, frequency[4]/4200 + 0.1, 1.0);
}

function drawTree(a, b, c, d, e, f, factor1, factor2) {
    //var r1 = Math.random();
    //var a2 = 
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
    clickLoc[3] = 1;
    // TODO: lights should vary
    var light = {
        position: clickLoc,
        ambient: vec4(0.2, 0.2, 0.2, 1.0),
        diffuse: vec4(1.0, 1.0, 1.0, 1.0),
        specular: vec4(1.0, 1.0, 1.0, 1.0),
        age: 0
    };

    lights.push(light);
}

var betaHistory = [];
function gyroscopeHandler(event) {
    if (!event.beta)
        return; // Not supported
    betaHistory.push(Math.round(event.beta));
    if (betaHistory.length > 5)
        betaHistory.shift();
    var beta = betaHistory[0];
    for (var i = 1; i < betaHistory.length; i ++)
        beta = (beta + betaHistory[i])/2;

    for (var i = 0; i < locations.length; i ++)
        locations[i] = mult(locations[i], rotate(beta, [0, 1, 0]));
    for (var i = 0; i < lights.length; i ++)
        lights[i].position = mult(lights[i].position, rotate(beta, [0, 1, 0]));
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

/********  Utility  ********/

function times(matrix, vector) {
    var result = [];
    for (var i = 0; i < 4; i++) {
        result.push(dot(matrix[i], vector));
    }
    return result;
}

function inverse4(m) {
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

// From http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
function shadeColor1(color, percent) {  
    var num = parseInt(color.slice(1),16), amt = Math.round(2.55 * percent), R = (num >> 16) + amt, G = (num >> 8 & 0x00FF) + amt, B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
}

