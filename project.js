var gl;
var groundSize, ground, groundBuffer;
var geoNumber, geo, geoBuffer;
var normals, normalBuffer;
var projection, camera;
var locations = [];  //locations of geometries
var time_old = 0;
var _camera, _vPosition, _projection, _modelView, _color, _normal; //handles
var key = {left: false, right: false, up: false, down: false};

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
    
    // Get handles
    _camera = gl.getUniformLocation(program, "camera");
    _vPosition = gl.getAttribLocation(program, "vPosition");
    _projection = gl.getUniformLocation(program, "projection");
    _modelView = gl.getUniformLocation(program, "modelView");
    _color = gl.getUniformLocation(program, "color");
    _normal = gl.getAttribLocation(program, "normal");
    
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
    
    document.addEventListener('keydown', keyHandler);
    document.addEventListener('keyup', keyUp);
    window.ondeviceorientation = gyroscopeHandler;
    animate(0);
};

function initialSetup() {
    groundSize = 200.0;
    geoNumber = 300;  // Total number of geometries
    
    camera = translate(0.0, -0.5, 0.0);
    projection = perspective(90, 960./540, 0.01, groundSize);
    ground = [- groundSize / 2, 0.0, 0.0,
              groundSize / 2, 0.0, 0.0,
              - groundSize / 2, 0.0, - groundSize,
              - groundSize / 2, 0.0, - groundSize,
              groundSize / 2, 0.0, - groundSize,
              groundSize / 2, 0.0, 0.0,
              ];
    
    geo = [-0.5, 0.0, 0.0,
           0.0, 0.0, 0.5,
           0.0, 20.0, 0.0,
           0.5, 0.0, 0.0,
           0.0, 0.0, 0.5,
           0.0, 20.0, 0.0,
           -0.5, 0.0, 0.0,
           0.5, 0.0, 0.0,
           0.0, 20.0, 0.0];
    
    normals = [-0.5, 0.0, 0.5, //not really normals
              -0.5, 0.0, 0.5,
              -0.5, 0.0, 0.5,
              0.5 ,0.0, 0.5,
              0.5, 0.0, 0.5,
              0.5, 0.0, 0.5,
              0.0, 0.0, -1.0,
              0.0, 0.0, -1.0,
              0.0, 0.0, -1.0,
            ];
}

function animate(time) {
    var dt = time - time_old;
    time_old = time;
    //camera = mult(translate(0.0, 0.0, 0.01 * dt), camera);
    for (var i = 0; i < locations.length; i++) {
        locations[i] = mult(translate(0.0, 0.0, 0.01 * dt), locations[i]);
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
    
    // Draw ground
    gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(ground), gl.STATIC_DRAW);
    gl.vertexAttribPointer(_vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(_camera, false, flatten(camera));
    gl.uniformMatrix4fv(_projection, false, flatten(projection));
    gl.uniformMatrix4fv(_modelView, false, flatten(translate(0.0, 0.0, 0.0)));
    gl.uniform4fv(_color, flatten(vec4(0.5, 0.5, 0.5, 1.0)));
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    //for (var i = 0; i < 20; i++) {
    //    gl.uniformMatrix4fv(_modelView, false, flatten(locations[i]));
    //    gl.drawArrays(gl.TRIANGLES, 0, 9);
    //}
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
    gl.vertexAttribPointer(_normal, 3, gl.FLOAT, false, 0, 0);
    
    // Draw geometries
    gl.bindBuffer(gl.ARRAY_BUFFER, geoBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(geo), gl.STATIC_DRAW);
    gl.vertexAttribPointer(_vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(_camera, false, flatten(camera));
    gl.uniformMatrix4fv(_projection, false, flatten(projection));
    gl.uniform4fv(_color, flatten(vec4(0.3, 0.3, 0.3, 1.0)));
    
    for (var i = 0; i < locations.length; i++) {
        pos = times(locations[i], vec4(0.0, 0.0, 0.0, 1.0));
        pos = times(camera, pos);
        var z = pos[2];
        if (z > 0) {  //pop things behind the camera
            locations.splice(i, 1);
            i = i - 1;
        } else {
            gl.uniformMatrix4fv(_modelView, false, flatten(locations[i]));
            gl.drawArrays(gl.TRIANGLES, 0, 9);
        }
    }
    
    var len = locations.length
    while (len < geoNumber) {
        var coin = Math.random();
        if (coin > 0.5) {
            var x = (Math.random() - 0.5) * groundSize;
            var y = 0.0;
            var z = - groundSize - Math.random() * 1;
            locations.push(translate(x, y, z));
            len = locations.length;
        } else {
            var x = groundSize / 2 + Math.random() * 1;
            var y = 0.0;
            var z = -Math.random() * groundSize;
            locations.push(translate(x, y, z));
            locations.push(translate(-x, y, z));
        }
    }
}

/******** Interface ********/

function keyHandler(event) {
    switch (event.keyCode){
        case 37:  // left arrow
            key.left = true;
            break;
        case 39:  // right arrow
            key.right = true;
            break;
    }
}

function keyUp(event) {
    switch (event.keyCode){
        case 37:  // left arrow
            key.left = false;
            break;
        case 39:  // right arrow
            key.right = false;
            break;
    }
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

/******** Utility  ********/

function times(matrix, vector) {
    result = [];
    for (var i = 0; i < 4; i++) {
        result.push(dot(matrix[i], vector));
    }
    return result;
}
