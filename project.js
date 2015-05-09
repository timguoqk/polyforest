
var gl;


window.onload = function init() {
    var canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }
    gl.viewport(0, 0, canvas.width, canvas.height);
    //set clear color to be black
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    //enable depth buffer
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.clearDepth(1.0);
    
    //
    //  Configure WebGL
    //
    //  Load shaders and initialize attribute buffers

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);
    
    
    // Get handles
    var _camera = gl.getUniformLocation(program, "camera");
    var _vPosition = gl.getAttribLocation(program, "vPosition");
    var _projection = gl.getUniformLocation(program, "projection");
    var _modelView = gl.getUniformLocation(program, "modelView");
    var _color = gl.getUniformLocation(program, "color");
    var _normal = gl.getAttribLocation(program, "normal");
    //  Initial setup
    
    var groundSize = 500.0;
    var geoNumber = 300;            //total number of geometries
    
    var camera = translate(0.0, -0.5, 0.0);
    var projection = perspective(90, 960./540, 0.01, groundSize);
    var ground = [- groundSize / 2, 0.0, 0.0,
                  groundSize / 2, 0.0, 0.0,
                  - groundSize / 2, 0.0, - groundSize,
                  -groundSize / 2, 0.0, - groundSize,
                  groundSize / 2, 0.0, - groundSize,
                  groundSize / 2, 0.0, 0.0,
                  ];
    
    var geo = [-0.5, 0.0, 0.0,
               0.0, 0.0, 0.5,
               0.0, 20.0, 0.0,
               0.5, 0.0, 0.0,
               0.0, 0.0, 0.5,
               0.0, 20.0, 0.0,
               -0.5, 0.0, 0.0,
               0.5, 0.0, 0.0,
               0.0, 20.0, 0.0];
    
    var normal = [-0.5, 0.0, 0.5, //not really normals
                  -0.5, 0.0, 0.5,
                  -0.5, 0.0, 0.5,
                  0.5 ,0.0, 0.5,
                  0.5, 0.0, 0.5,
                  0.5, 0.0, 0.5,
                  0.0, 0.0, -1.0,
                  0.0, 0.0, -1.0,
                  0.0, 0.0, -1.0,
                ]
    
    var location = [];         //locations of geometries
    for (var i = 0; i < geoNumber; i++) {
        var x = (Math.random() -0.5) * groundSize;
        var y = 0.0;
        var z = - Math.random() * groundSize;
        location.push(translate(vec3(x, y, z)));
    }

    // Create buffers
    var groundBuffer = gl.createBuffer();
    var geoBuffer = gl.createBuffer();
    var normalBuffer = gl.createBuffer();
    

    gl.enableVertexAttribArray(_vPosition);
    gl.enableVertexAttribArray(_normal);
    
    
    document.addEventListener('keydown', function(event) {
        switch (event.keyCode){
            case 37:
                for (var i = 0; i < location.length; i++) {
                    location[i] = mult(rotate(-1, vec3(0.0, 1.0, 0.0)),location[i])
                }
                render();
                break;
            case 39:
                for (var i = 0; i < location.length; i++) {
                    location[i] = mult(rotate(1, vec3(0.0, 1.0, 0.0)),location[i])
                }
                render();
                break;
        }
    })
    
    
    
    var render = function() {
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
        //    gl.uniformMatrix4fv(_modelView, false, flatten(location[i]));
        //    gl.drawArrays(gl.TRIANGLES, 0, 9);
        //}
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(normal), gl.STATIC_DRAW);
        gl.vertexAttribPointer(_normal, 3, gl.FLOAT, false, 0, 0);
        
        
        // Draw geometries
        gl.bindBuffer(gl.ARRAY_BUFFER, geoBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(geo), gl.STATIC_DRAW);
        gl.vertexAttribPointer(_vPosition, 3, gl.FLOAT, false, 0, 0);
        gl.uniformMatrix4fv(_camera, false, flatten(camera));
        gl.uniformMatrix4fv(_projection, false, flatten(projection));
        gl.uniform4fv(_color, flatten(vec4(0.3, 0.3, 0.3, 1.0)));
        
        
        
        
        for (var i = 0; i < location.length; i++) {
            
            pos = times(location[i], vec4(0.0, 0.0, 0.0, 1.0));
            pos = times(camera, pos);
            var z = pos[2];
            if (z > 0) {  //pop things behind the camera
                location.splice(i, 1);
                i = i - 1;
            } else {
                gl.uniformMatrix4fv(_modelView, false, flatten(location[i]));
                gl.drawArrays(gl.TRIANGLES, 0, 9);
            }
        }
        
        
        
        
        var len = location.length
        while (len < geoNumber) {
            var coin = Math.random();
            if (coin > 0.5) {
                var x = (Math.random() - 0.5) * groundSize;
                var y = 0.0;
                var z = - groundSize - Math.random() * 1;
                location.push(translate(x, y, z));
                len = location.length;
            } else {
                var x = groundSize / 2 + Math.random() * 1;
                var y = 0.0;
                var z = -Math.random() * groundSize;
                location.push(translate(x, y, z));
                location.push(translate(-x, y, z));
            }
        }

 
    }
    
    var time_old = 0.0;
    var animate = function(time) {
        var dt = time - time_old;
        time_old = time;
        //camera = mult(translate(0.0, 0.0, 0.01 * dt), camera);
        for (var i = 0; i < location.length; i++) {
            location[i] = mult(translate(0.0, 0.0, 0.01 * dt), location[i]);
        }
        render();
        window.requestAnimationFrame(animate);
    }
    animate(0);
    
    
};


function times(matrix, vector) {
    result = [];
    for (var i = 0; i < 4; i++) {
        result.push(dot(matrix[i], vector));
    }
    return result;
}





