
var gl;
var points = [];
var true_location = [];

var NumPoints = 250;
var _projection;
var _modelView;
var modelView = translate(0.0, 0.0, 0.0);
var far = 100;
var near = 0.1;
var projection = perspective(40, 960.0/540.0, near, far);
var inv_projection = inverse4(projection);
var velocity = [];
var speed = 3.0;
var box_size = 100.0;
var numCopys = 1;
var offVec = [];
var bufferId;
var vPosition;
var triangleBuffer;
var triangle_vertex = [vec3(-0.001, 0.0,0.0), vec3(0.001, 0.0, 0.0), vec3(0.0, 0.001, 0.0)];





window.onload = function init()
{
    var canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    gl.enable(gl.DEPTH_TEST);
    //gl.clearDepth(1.0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);


    //  Load shaders and initialize attribute buffers
    
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    // Load the data into the GPU
    vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.enableVertexAttribArray( vPosition );

    bufferId = gl.createBuffer();

    triangleBuffer = gl.createBuffer();

    _projection = gl.getUniformLocation(program, "projection");
    gl.uniformMatrix4fv(_projection, false, flatten(projection));
    _modelView = gl.getUniformLocation(program, "modelView");
    setUpPoints();
    animate(0);
    for (var i = 0; i < numCopys; i ++) {
        offVec.push(scale2(0.2, vec3(Math.random() - 0.5, Math.random() - 0.5 , Math.random() - 0.5)));
    }
};

function animate(time){
    updatVelocity(1.0, 50.0);
    updatePointsLocation();
    generateTrueLocation();
    render();
    window.requestAnimationFrame(animate);
} 

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Draw points
    //gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    //gl.bufferData(gl.ARRAY_BUFFER, flatten(true_location), gl.STATIC_DRAW);
    //gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );
    //for (var i = 0; i < numCopys; i++){
    //    //modelView = translate(offVec[i]);
    //    modelView = translate(0.0, 0.0, 0.0);
    //    gl.uniformMatrix4fv(_modelView, false, flatten(modelView));
    //    gl.drawArrays( gl.POINTS, 0, points.length);
    //}

    // Draw Triangles
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(triangle_vertex), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    for (var i = 0; i < NumPoints; i++)
    {
        modelView = translate(true_location[i]);
        gl.uniformMatrix4fv(_modelView, false, flatten(modelView));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
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
            if (distance < sepDist) {
                sepCounter++;
                sepVel = add(sepVel, scale2(1.0/distance, negate(direction)) );
            }
            detCounter++;
            cohVel = add(cohVel, direction);
            algVel = add(algVel, scale2(1.0/distance, velocity[j]));
        }
        if (sepCounter > 0 && length(sepVel > 0)) {
            sepVel = normalize(scale2(1.0/sepCounter, sepVel));
        }
        if (detCounter > 0 && length(cohVel > 0)) {
            cohVel = normalize(scale2(1.0/detCounter, cohVel));
        }
        if (detCounter > 0 && length(algVel > 0)) {
            algVel = normalize(scale2(1.0/detCounter, algVel));
        }
        var new_vel = add(add(scale2(3, algVel), cohVel), scale2(5.5, sepVel));
        if (length(new_vel) > 0) {
            new_vel = normalize(new_vel);
        }
        else {
            new_vel = velocity[i];
        }
        var diff = subtract(new_vel, velocity[i]);
        var diff_mag = length(diff);
        if (diff_mag > 0) {
            diff = scale2(0.20/diff_mag, diff);
        }
        velocity[i] = normalize(add(velocity[i] , diff));
    }

}

function generateTrueLocation() {
    for (var i = 0; i < NumPoints; i++) {
        /*
        var clipped = scale2(1.0 /box_size, points[i]);
        var w = (2 * far * near) / (far + near - clipped[2] * (far - near));
        var temp = vec3(times(inv_projection, vec4(scale2(w, clipped), w)));
        temp[2] = temp[2] ;
        */
        true_location[i] = points[i];//moduleboxsize(vec3(times(camera, vec4(points[i], 1.0))));
    }
}

function updatePointsLocation() {
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
        points.push(vec3(x , y , z - 100.0));
        velocity.push(add(vec3(x,y,z), vec3(0.0, 0.0, 0.0)));
        true_location.push(vec3(times(camera,vec4(x,y,z, 1.0))));
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
    /*
    for (var i = 0; i < vector.length; i++) {
        if (vector[i] > 1.0 * box_size) {
            vector[i] = vector[i] - 2.0 * 1.0 * box_size;
        }
        else if (vector[i] < - 1.0 * box_size) {
            vector[i] = vector[i] + 2.0 *  1.0 * box_size;
        }    
    }*/
    if (vector[2] > 0) {
        vector[2] = vector[2] - far;
    }
    if (vector[2] < -far) {
        vector[2] = vector[2] + far;
    }
    var w = vector[2];
    if (vector[0] > - 1.334 * w) { //1.334 = tan(103.6/2) 
        vector[0] = vector[0] + 2 * w;
    }
    if (vector[0] < 1.334 * w) {
        vector[0] = vector[0] - 2 * w;
    }
    if (vector[1] > - w) {
        vector[1] = vector[1] +  w;
    }
    if (vector[1] < -10) {
        vector[1] = vector[1] -  w + 10;
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
    inv.matrix = true;
    return inv;
}