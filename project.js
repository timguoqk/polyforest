var canvas;
var gl;
var groundSize, ground, groundBuffer;
var geoNumber, geo, geoBuffer;
var normals, normalBuffer;
var geo = [];
var normals = [];
var projection, camera;
var inv_projection;
var locations = [];  //locations of geometries
var time_old = 0;
var _camera, _vPosition, _projection, _modelView, _normal; //handles
var key = {left: false, right: false, up: false, down: false};

var vertices = [
                vec3(-0.5, 0.0, 0.0),
                vec3(0.0, 0.0, 0.5),
                vec3(0.5, 0.0, 0.0), 
                vec3(0.0, 20.0, 0.0),
                vec3(-0.1, 17.0, 0.0),
                vec3(0.0, 17.0, 0.1),
                vec3(0.0, 16.0, 0.0),
                vec3(-1.7, 21.0, 1.4)
    ];

var lights = [{
    position: vec4(1.0, 1.0, 1.0, 0.0),
    ambient: vec4(1.0, 1.0, 1.0, 0.1),
    // diffuse: vec4(1.0, 1.0, 1.0, 0.2),
    diffuse: vec4(1.0, 1.0, 1.0, 0.0),
    specular: vec4(0.0, 0.0, 0.0, 0.0),
    age: 0  // Lights will decay (except the global ambient light)
}];

var materials = {
    ground: {
        ambient: vec4(0.5, 0.5, 0.5, 0.2),
        diffuse: vec4(0.5, 0.5, 0.5, 0.2),
        specular: vec4(0.0, 0.0, 0.0, 0.0),
        shininess: 0.0
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
    if (!gl) { alert("WebGL isn't available"); }
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
    
    drawTree(vertices[0], vertices[1], vertices[2], vertices[3]);
    drawTree(vertices[4], vertices[5], vertices[6], vertices[7]);
    // Get handles
    _vPosition = gl.getAttribLocation(program, "vPosition");
    _projection = gl.getUniformLocation(program, "projection");
    _modelView = gl.getUniformLocation(program, "modelView");
    _normal = gl.getAttribLocation(program, "normal");
    _normalMatrix = gl.getUniformLocation(program, "normalMatrix");
    _ambientProduct = gl.getUniformLocation(program, "ambientProduct")
    _diffuseProduct = gl.getUniformLocation(program, "diffuseProduct")
    _specularProduct = gl.getUniformLocation(program, "specularProduct")
    _lightPosition = gl.getUniformLocation(program, "lightPosition")
    _shininess = gl.getUniformLocation(program, "shininess")
    
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
    
    animate(0);
};

function initialSetup() {
    groundSize = 200.0;
    geoNumber = 100;  // Total number of geometries
    
    camera = translate(0.0, -10, 0.0);
    projection = perspective(40, 960./540, 0.01, groundSize);
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
    //camera = mult(translate(0.0, 0.0, 0.01 * dt), camera);
    for (var i = 0; i < locations.length; i++) {
        locations[i] = mult(translate(0.0, 0.0, 0.001 * dt), locations[i]);
        if (key.left)
            locations[i] = mult(rotate(-0.02 * dt, vec3(0.0, 1.0, 0.0)),locations[i]);
        else if (key.right)
            locations[i] = mult(rotate(0.02 * dt, vec3(0.0, 1.0, 0.0)),locations[i]);
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

    var modelViewMatrix = camera;
    normalMatrix = [
        vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
        vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
        vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2])
    ];
    gl.uniformMatrix4fv(_modelView, false, flatten(modelViewMatrix));
    gl.uniformMatrix3fv(_normalMatrix, false, flatten(normalMatrix));

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    // Draw geometries
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
    gl.vertexAttribPointer(_normal, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, geoBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(geo), gl.STATIC_DRAW);
    gl.vertexAttribPointer(_vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray( _vPosition );
    // Set up light
    setUniformLights(materials.ground);

    var offset = 0.01; //decided by bounding volume
    for (var i = 0; i < locations.length; i++) {
        var pos = find_clip_coord(locations[i], offset);
        //console.log(pos);
        var z = pos[2] / pos[3];
        var x = pos[0] / pos[3];
        var y = pos[1] / pos[3];
        if (z > 1.0 || y > 1.0 || z > 1.0 ) {  //pop things behind the camera
            locations.splice(i, 1);
            i = i - 1;
        } else {
            gl.uniformMatrix4fv(_modelView, false, flatten(mult(camera, locations[i])));
            gl.drawArrays(gl.TRIANGLES, 0, 9);
            gl.drawArrays(gl.TRIANGLES, 9, geo.length  - 9);
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


function drawTree(a, b, c, d) {
    geo.push(a);
    normals.push(a[0],a[1], a[2], 0.0);
    geo.push(b);
    normals.push(b[0],b[1], a[2], 0.0);
    geo.push(d);
    normals.push(d[0],d[1], d[2], 0.0);
    geo.push(b);
    normals.push(b[0],b[1], b[2], 0.0);
    geo.push(c);
    normals.push(c[0],c[1], c[2], 0.0);
    geo.push(d);
    normals.push(d[0],d[1], d[2], 0.0);
    geo.push(a);
    normals.push(a[0],a[1], a[2], 0.0);
    geo.push(c);
    normals.push(c[0],c[1], c[2], 0.0);
    geo.push(d);
    normals.push(d[0],d[1], d[2], 0.0);

    
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

    var x = event.clientX;
    var y = event.clientY;
    // TODO: lights should vary
    var light = {
        position: vec4(1.0, 1.0, 1.0, 0.0),
        ambient: vec4(0.2, 0.2, 0.2, 1.0),
        diffuse: vec4(1.0, 1.0, 1.0, 1.0),
        specular: vec4(1.0, 1.0, 1.0, 1.0),
        age: 0
    };
    lights.push(light);
}

var betaHistory = [];
function gyroscopeHandler(event) {
    betaHistory.push(Math.round(event.beta));
    if (betaHistory.length > 5)
        betaHistory.shift();
    var beta = betaHistory.reduce(function(prev, current) {
        return (prev + current) / 2;
    });
    camera = translate(0.0, -0.5, 0.0);
    camera = mult(camera, rotate(beta, [0, 1, 0]));
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
    //pos = times(camera, pos);
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
