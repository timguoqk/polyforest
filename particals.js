
var gl;
var points = [];
var true_location = [];

var NumPoints = 350;
var _projection;
var _modelView;
var modelView = translate(0.0, 0.0, 0.0);
var projection = perspective(90, 960.0/540.0, 0.01, 100);
var inv_projection = inverse4(projection);
var velocity = [];
var speed = 1.0;
var box_size = 20.0;
window.onload = function init()
{
    var canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    gl.enable(gl.DEPTH_TEST);
    gl.clearDepth(1.0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);


    //  Load shaders and initialize attribute buffers
    
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    // Load the data into the GPU
    
    var bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    

    // Associate out shader variables with our data buffer
    
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );
    _projection = gl.getUniformLocation(program, "projection");
    gl.uniformMatrix4fv(_projection, false, flatten(projection));
    _modelView = gl.getUniformLocation(program, "modelView");
    gl.uniformMatrix4fv(_modelView, false, flatten(modelView));
    setUpPoints();
    animate(0);
};

function animate(time){
    updatVelocity(1.0, 100.0);
    updataPointsLocation();
    generateTrueLocation();
    gl.bufferData( gl.ARRAY_BUFFER, flatten(true_location), gl.STATIC_DRAW );
    render();
    window.requestAnimationFrame(animate);
} 

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArrays( gl.POINTS, 0, points.length );
}


function updatVelocity(sepDist, detDist) {
    for (var i = 0; i < NumPoints; i++) {
        var sepVel = vec3(0.0, 0.0, 0.0);
        var cohVel = vec3(0.0, 0.0, 0.0);
        var algVel = vec3(0.0, 0.0, 0.0);
        var sepCounter = 0.0;
        var detCounter = 0.0;
        for (var j = 0; j < NumPoints; j++) {
            var pi = points[i];
            var pj = points[j];
            var distance = length(subtract(pi, pj));
            var direction = subtract(pj, pi);
            if (distance > detDist || distance == 0.0) {
                continue;
            }
            else if (distance < sepDist) {
                sepCounter++;
                sepVel = add(sepVel, scale2(1.0/distance, negate(direction)) );
            }
            detCounter++;
            cohVel = add(cohVel, direction);
            algVel = add(algVel, scale2(1.0/distance, velocity[j]));
        }
        if (sepCounter > 0) {
            sepVel = normalize(scale2(1.0/sepCounter, sepVel));
        }
        if (detDist > 0) {
            cohVel = normalize(scale2(1.0/detCounter, cohVel));
            algVel = normalize(scale2(1.0/detCounter, algVel));
        }
        var new_vel = normalize(add(add(algVel, cohVel), scale2(1.5, sepVel)));
        var diff = subtract(new_vel, velocity[i]);
        var diff_mag = length(diff);
        diff = scale2(0.1/diff_mag, diff);
        velocity[i] = add(velocity[i] , diff);
    }
}

function generateTrueLocation() {
    for (var i = 0; i < NumPoints; i++) {
        var clipped = (scale2(1.0/box_size,points[i]));

        true_location[i] = vec3(times(inv_projection, vec4(clipped, 1.0)));
    }
}

function updataPointsLocation() {
    for (var i = 0; i < NumPoints; i++) {
        var temp = add(points[i], scale2(speed, velocity[i]));
        points[i] = moduleboxsize(temp);
    }
}

function setUpPoints() {
    for (var i = 0; i<NumPoints; i++) {
        var theta = Math.random() * 2 * 3.14;
        var phi = (Math.random() - 0.5 ) * 2 * 3.14;
        var x = Math.cos(theta) * Math.cos(phi);
        var y = Math.sin(theta) * Math.cos(phi);
        var z = Math.sin(phi);
        points.push(vec3(x,y,z));
        velocity.push(vec3(x, y, z));
        true_location.push(vec3(x,y,z));
    }
}
//helping functions

function scale2( s, u )
{
    if ( !Array.isArray(u) ) {
        throw "scale: second parameter " + u + " is not a vector";
    }

    var result = [];
    for ( var i = 0; i < u.length; ++i ) {
        result.push( s * u[i] );
    }
    
    return result;
}

function times(matrix, vector) {
    result = [];
    for (var i = 0; i < 4; i++) {
        result.push(dot(matrix[i], vector));
    }
    return result;
}

function moduleboxsize(vector) {
    for (var i = 0; i < vector.length; i++) {
        if (vector[i] > box_size) {
            vector[i] = vector[i] - 2.0 * box_size;
        }
        else if (vector[i] < -box_size) {
            vector[i] = vector[i] + 2.0 * box_size;
        }    
    }
    return vector;
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