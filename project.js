var gl;
var groundSize, ground = [], groundBuffer;
var geoNumber, geo = [],
    geoBuffer, index = [];
var normals = [],
    normalBuffer;
var textures = [], images = [];
var texCoordsArray = [], texCoordsBuffer, texTransform;
var projection, inv_projection, camera, inv_camera;
var locations = []; //locations of geometries
var time_old = 0,
    next_sample_time = 0,
    sampleT = 0.1,
    analyser,
    frequencyHistory = [],
    moveSpeed = 1;
var _vPosition, _projection, _modelView, _normal, _normalMatrix,
    _ambientProduct, _diffuseProduct, _specularProduct, _lightPosition,
    _shininess, _lightNum, _vTexCoord, _hTexture, _nTexture, _enableTex, _enableTexF, _texTransform;
var key = {
    left: false,
    right: false,
    up: false,
    down: false
};
var colorTheme,
    MAX_LIGHTS; // This should match the macro in GLSL!
var LIGHT_LIFE_EXPECTANCY = 200;
// ----- For Particles ----- //

var triangleBuffer;
var triangle_vertex = [
    vec3(-0.3, 0.17, 0.0),
    vec3(0.3, 0.17, 0.0),
    vec3(0.0, -0.34, 0.0),
    vec3(-0.3, -0.17, 0.0),
    vec3(0.3, -0.17, 0.0),
    vec3(0.0, 0.34, 0.0)
];

var velocity = [];
var speed = 1.0;
var box_size = 200.0;
var points = [];
var true_location = [];
var NumPoints = 250;
var far, near;
// ----- For Particles ----- //

var lights = [{
    position: vec4(0.0, 0.0, 1.0, 0.0),
    ambient: vec4(0.0, 0.0, 0.0, 0.0),
    diffuse: vec4(0.0, 0.0, 0.0, 0.0),
    specular: vec4(0.0, 0.0, 0.0, 0.0),
    age: 0 // Lights will decay (except the global ambient light)
}];

var materials = {
    ground: {
        ambient: vec4(0.5, 0.5, 0.5, 0.2),
        diffuse: vec4(0.5, 0.5, 0.5, 0.2),
        specular: vec4(0.5, 0.5, 0.5, 0.2),
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
        diffuse: vec4(1.0, 1.0, 1.0, 1.0),
        specular: vec4(1.0, 1.0, 1.0, 1.0),
        shininess: 1
    }
};

window.onload = function() {
    var canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl)
        alert("WebGL isn't available");
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Set clear color to be black
    gl.clearColor(0.2, 0.2, 0.2, 1.0);

    // Enable depth buffer
    gl.enable(gl.DEPTH_TEST);
    //gl.depthFunc(gl.LESS);
    gl.clearDepth(1.0);

    drawTree(3, 1, -2, -1.2, -4.5, 5.8, 1.2, 1.0, 0.7);
    drawTree(-3.5, 0.5, -2.7, -2.0, -1.0, 2.0, 1.1, 1.5, 0.8);
    drawTree(-2.8, -3, -0.5, 1.2, 1.3, 0.9, 1.4, 0.8, 0.9);
    drawTree(2.5, -2.9, 0.2, 1.5, -2.4, 2.0, 1.5, 1.2, 1.0);
    drawTree(3.0, -3.2, -0.3, -3.5, -4.8, 0.5, 1.3, 1.8, 0.9);

    groundSize = 200.0;
    geoNumber = 60; // Total number of geometries

    camera = translate(0.0, -10, 0.0);

    projection = perspective(90, 960.0 / 540, 0.1, groundSize);
    inv_camera = inverseCamera(camera);
    inv_projection = inverseProjection(projection);
    texTransform = mat4();

    drawGround();
    configureTexture();

    setUpPoints();

    for (var i = 0; i < geoNumber; i++) {
        var x = (Math.random() - 0.5) * groundSize;
        var y = 0.0;
        var z = -Math.random() * groundSize;
        locations.push(translate(vec3(x, y, z)));
        index.push(Math.floor(Math.random() / 0.2));
    }

    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
    document.addEventListener('click', clickHandler);
    document.addEventListener('touchend', clickHandler);
    window.ondeviceorientation = gyroscopeHandler;
    document.getElementById('bgm-input').addEventListener('change', bgmInputHandler);
};

var GLStarted = false;

function startGL() {
    if (GLStarted)
        return;
    GLStarted = true;

    // Load shaders and initialize attribute buffers
    var program;
    if ($('.menu>.active.item.effects').attr('effects-id') == 'high') {
        MAX_LIGHTS = 10;
        program = initShaders(gl, "vertex-shaderH", "fragment-shaderH")
        gl.useProgram(program);
    }
    else {
        MAX_LIGHTS = 5;
        NumPoints = 20;
        program = initShaders(gl, "vertex-shaderL", "fragment-shaderL")
        gl.useProgram(program);   
    }

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
    _vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    _hTexture = gl.getUniformLocation(program, "hTexture");
    _nTexture = gl.getUniformLocation(program, "nTexture");
    _enableTex = gl.getUniformLocation(program, "enableTex");
    _enableTexF = gl.getUniformLocation(program, "enableTexF");
    _texTransform = gl.getUniformLocation(program, "texTransform");

    // Create buffers
    groundBuffer = gl.createBuffer();
    geoBuffer = gl.createBuffer();
    normalBuffer = gl.createBuffer();
    triangleBuffer = gl.createBuffer();
    triangleNormalBuffer = gl.createBuffer();
    texCoordsBuffer = gl.createBuffer();
    gl.enableVertexAttribArray(_vPosition);
    gl.enableVertexAttribArray(_normal);
    gl.enableVertexAttribArray(_vTexCoord);

    // Set up audio
    try {
        var ctx;
        if (typeof AudioContext=='undefined') {
            ctx = new webkitAudioContext();
        }
        else
            ctx = new AudioContext();
        var audio = document.getElementById($('.menu>.active.item.bgm').attr(
            'bgm-id'));
        var audioSrc = ctx.createMediaElementSource(audio);
        analyser = ctx.createAnalyser(); // This is global
        audioSrc.connect(analyser);
        audioSrc.connect(ctx.destination);
        audio.play();
    }
    catch (e) {
        alert("AudioAPI not supported!");
    }

    colorTheme = $('.menu>.active.item.color').attr('color-id');

    $('#options-column').fadeOut();
    animate(0);
}

function animate(time) {
    var dt = time - time_old;
    time_old = time;
    for (var i = 0; i < locations.length; i++) {
        locations[i] = mult(translate(0.0, 0.0, 0.001 * moveSpeed * dt), locations[i]);
        if (key.left)
            locations[i] = mult(rotate(-0.02 * dt, vec3(0.0, 1.0, 0.0)),
                locations[i]);
        else if (key.right)
            locations[i] = mult(rotate(0.02 * dt, vec3(0.0, 1.0, 0.0)),
                locations[i]);
    }
    for (var i = 0; i < points.length; i++) {
        points[i] = vec3(times(translate(0.0, 0.0, 0.001 * moveSpeed * dt), vec4(points[
            i], 1.0)));
        if (key.left)
            points[i] = vec3(times(rotate(-0.02 * dt, vec3(0.0, 1.0, 0.0)),
                vec4(points[i], 1.0)));
        else if (key.right)
            points[i] = vec3(times(rotate(0.02 * dt, vec3(0.0, 1.0, 0.0)),
                vec4(points[i], 1.0)));
    }
    texTransform = mult(translate(0.0, 0.0, -0.001 * moveSpeed * dt), texTransform);
    if (key.left)
        texTransform = mult(texTransform, rotate(0.02 * dt, vec3(0.0, 1.0, 0.0)));
    else if (key.right)
        texTransform = mult(texTransform, rotate(-0.02 * dt, vec3(0.0, 1.0, 0.0)));

    //texTransform = mat4();
    if (next_sample_time < time) {
        next_sample_time += sampleT;
        analyzeAudio();
    }

    // TODO: adjust parameters!!!!!!!!!!!!!!
    
    updatVelocity(0.5, 100.0);
    updatePointsLocation();
    generateTrueLocation();

    render();
    window.requestAnimationFrame(animate);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(_projection, false, flatten(projection));

    // Draw ground
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);
    gl.vertexAttribPointer(_vTexCoord, 2, gl.FLOAT, false, 0, 0 );

    gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(ground), gl.STATIC_DRAW);
    gl.vertexAttribPointer(_vPosition, 3, gl.FLOAT, false, 0, 0);

    // bind heightmap
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[0]);
    gl.uniform1i(_hTexture, 0);
    // bind normalmap
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures[1]);
    gl.uniform1i(_nTexture, 1);

    gl.uniformMatrix4fv(_texTransform, false, flatten(texTransform));

    gl.uniform1i(_enableTex, 1);    // enable texture
    gl.uniform1i(_enableTexF, 1);
    gl.enableVertexAttribArray(_vTexCoord);
    gl.disableVertexAttribArray(_normal);

    setUniformLights(materials.ground);

    setModelViewAndNormalMatrix(camera);

    gl.drawArrays(gl.TRIANGLES, 0, ground.length);

    // Draw geometries
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
    gl.vertexAttribPointer(_normal, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, geoBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(geo), gl.STATIC_DRAW);
    gl.vertexAttribPointer(_vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(_vPosition);

    gl.uniform1i(_enableTex, 0);    // disable texture
    gl.uniform1i(_enableTexF, 0);
    gl.disableVertexAttribArray(_vTexCoord);
    gl.enableVertexAttribArray(_normal);

    setUniformLights(materials.tree);

    var offset = 5; //decided by bounding volume
    for (var i = 0; i < locations.length; i++) {
        //var index = Math.floor(Math.random()/0.2);
        var pos = find_clip_coord(locations[i], offset);
        var z = pos[2] / pos[3];
        var x = pos[0] / pos[3];
        var y = pos[1] / pos[3];
        if (x > 1.0 || y > 1.0 || z > 1.0) { //pop things behind the camera
            locations.splice(i, 1);
            index.splice(i, 1);
            i = i - 1;
        } else {
            gl.uniformMatrix4fv(_modelView, false, flatten(mult(camera,
                locations[i])));
            gl.drawArrays(gl.TRIANGLES, 45 * index[i], 45);
        }
    }

    setUniformLights(materials.ground);
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten([0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
        0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
        1.0
    ]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(_normal, 3, gl.FLOAT, false, 0, 0);

    setModelViewAndNormalMatrix(translate(0.0, 0.0, 0.0));
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(triangle_vertex), gl.STATIC_DRAW);
    gl.vertexAttribPointer(_vPosition, 3, gl.FLOAT, false, 0, 0);
    for (var i = 0; i < NumPoints; i++) {
        modelView = translate(true_location[i]);
        gl.uniformMatrix4fv(_modelView, false, flatten(modelView));
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    while (locations.length < geoNumber) {
        if (key.right == true) {
            var x = Math.random() * 0.5 * groundSize;
        } else if (key.left == true) {
            var x = -Math.random() * 0.5 * groundSize;
        } else {
            var x = (Math.random() - 0.5) * groundSize;
        }

        var y = 0.0;
        var z = -Math.random() * groundSize;
        var potential = translate(vec3(x, y, z));
        var clipped = find_clip_coord(potential, offset);
        var x_clipped = clipped[0] / clipped[3];
        var y_clipped = clipped[1] / clipped[3];
        var z_clipped = clipped[2] / clipped[3];
        //console.log(x_clipped);
        if (x_clipped > 1.0 || y_clipped > 1.0 || z_clipped > 1.0) {
            locations.push(potential);
            index.push(Math.floor(Math.random() / 0.2));
        }
    }

    // Lights decay, note that the first light won't decay
    for (var i = 1; i < lights.length; i++) {
        lights[i].age++;
        if (lights[i].age == LIGHT_LIFE_EXPECTANCY) {
            lights.splice(i, 1);
            i--;
            continue;
        }

        var faint = 0;
        for (var j = 0; j < 3; j++) {

            lights[i].ambient[j] = Math.max(0.0, lights[i].ambient[j] - 1 /
                LIGHT_LIFE_EXPECTANCY);
            lights[i].diffuse[j] = Math.max(0.0, lights[i].diffuse[j] - 1 /
                LIGHT_LIFE_EXPECTANCY);
            lights[i].specular[j] = Math.max(0.0, lights[i].specular[j] - 1 /
                LIGHT_LIFE_EXPECTANCY);
            if (lights[i].ambient[j] <= 0.0 && lights[i].diffuse[j] <= 0.0 && lights[i].specular[j] <= 0.0) {
                faint += 1;
            }
        }
        if (faint == 3) {
            lights.splice(i,1);
        }

    }

    for (var i = 1; i < lights.length; i++)
        if (lights[i].age == LIGHT_LIFE_EXPECTANCY)
            lights.splice(i, 1);
}

function analyzeAudio() {
    if (!analyser)
        return;

    var frequencyData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(frequencyData);

    var f = [];
    for (var i = 0; i < 5; i++) {
        f.push(0);
        for (var j = 0; j < 50; j++)
            f[i] += frequencyData[50 * i + j];
    }
    // Push the sum to the array
    var total = 0;
    for (var i = 0; i < f.length; i++)
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
    for (var i = 1; i < frequencyHistory.length; i++)
        for (var j = 0; j < frequency.length; j++)
            frequency[j] = (frequency[j] + frequencyHistory[i][j]) / 2;

    // Apply frequency to lights[0]
    lights[0].diffuse[0] = frequency[4] / 6000;
    lights[0].diffuse[1] = frequency[4] / 4500;
    lights[0].diffuse[2] = frequency[4] / 6200;

    lights[0].ambient[0] = frequency[5] / 38468 / 2;
    lights[0].ambient[1] = frequency[5] / 38468;
    lights[0].ambient[2] = frequency[5] / 38468 / 3;

    lights[0].specular[0] = frequency[0] / 7556;
    lights[0].specular[1] = frequency[0] / 7556 / 2;
    lights[0].specular[2] = frequency[0] / 7556 / 1.5;

    speed = frequency[5] * 1.5 / 21644;
    moveSpeed = 0.5 + 5 * Math.pow(frequency[5], 2) / Math.pow(21644, 2);
}

function drawTree(a, b, c, d, e, f, factor1, factor2, factor3) {

    var points = [];
    points.push(vec3(-0.5, 0, 0));
    points.push(vec3(0.5, 0, 0));
    points.push(vec3(0, 0, 0.8));
    points.push(add(vec3(a, 10.0 * factor1, b), vec3(-0.3, 0, 0)));
    points.push(add(vec3(a, 10.0 * factor1, b), vec3(0.3, 0, 0)));
    points.push(add(vec3(a, 10.0 * factor1, b), vec3(0, 0, 0.5)));
    points.push(add(vec3(c, 20.0 * factor2, d), vec3(-0.15, 0, 0)));
    points.push(add(vec3(c, 20.0 * factor2, d), vec3(0.15, 0, 0)));
    points.push(add(vec3(c, 20.0 * factor2, d), vec3(0, 0, 0.25)));
    points.push(vec3(e, 30 * factor3, f));

    var indices = [0, 2, 5, 0, 5, 3, 3, 5, 8, 3, 8, 6, 6, 8, 9, 2, 1, 5, 5,
        1, 4, 5, 4, 8, 8, 4, 7, 7, 8, 9, 0, 1, 3, 3, 1, 4, 3, 4, 6, 6,
        4, 7, 6, 7, 9
    ];
    for (var i = 0; i < indices.length; ++i) {
        geo.push(points[indices[i]]);
        normals.push(points[indices[i]]);
    }
}

function drawGround() {
    var gg = 1.0;
    var tt = gg * 2 / groundSize;
    for (var ig = -groundSize, it = 0.5 ; ig < groundSize; ig += gg, it -= tt)
        for (var jg = -groundSize, jt = 0; jg < 0; jg += gg, jt += tt) {
            ground.push(vec3(ig, 0, jg));
            ground.push(vec3(ig+gg, 0, jg));
            ground.push(vec3(ig+gg, 0, jg+gg));
            ground.push(vec3(ig+gg, 0, jg+gg));
            ground.push(vec3(ig, 0, jg+gg));
            ground.push(vec3(ig, 0, jg));

            texCoordsArray.push(vec2(it, jt));
            texCoordsArray.push(vec2(it-tt, jt));
            texCoordsArray.push(vec2(it-tt, jt+tt));
            texCoordsArray.push(vec2(it-tt, jt+tt));
            texCoordsArray.push(vec2(it, jt+tt));
            texCoordsArray.push(vec2(it, jt));
        }
}

function configureTexture() {
    var texture1 = gl.createTexture();
    var image1 = new Image();
    image1.src = "heightmap3.jpg";
    image1.onload = function() {
            gl.bindTexture(gl.TEXTURE_2D, texture1);
            //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image1);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.bindTexture(gl.TEXTURE_2D, null);
    }
    textures.push(texture1);
    
    var texture2 = gl.createTexture();
    image2 = new Image();
    image2.src = "normalmap3.png";
    image2.onload = function() {
            gl.bindTexture(gl.TEXTURE_2D, texture2);
            //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image2);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.bindTexture(gl.TEXTURE_2D, null);
    }
    textures.push(texture2);
}

/********  Interface  ********/

function keyDownHandler(event) {
    switch (event.keyCode) {
        case 37: // left arrow
            key.left = true;
            break;
        case 39: // right arrow
            key.right = true;
            break;
    }
}

function keyUpHandler(event) {
    switch (event.keyCode) {
        case 37: // left arrow
            key.left = false;
            break;
        case 39: // right arrow
            key.right = false;
            break;
    }
}

function clickHandler(event) {
    if (lights.length == MAX_LIGHTS)
        return;

    var x, y;
    if (event.type == 'touchend') {
        x = event.pageX;
        y = event.pageY;
    }
    else {
        x = event.clientX;
        y = event.clientY;
    }
    var clickLoc = vec4((x - 480) * 100 * (16.0 / 9) / 960, (285 -
        y) * 100 / 570, -50, 1);
    // console.log('For (' +event.clientX + ', ' + event.clientY + ') the clickLoc is ' + clickLoc);

    var color = randomColor({
        luminosity: colorTheme,
        format: 'rgba'
    });

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
    for (var i = 1; i < alphaHistory.length; i++)
        alpha = (alpha + alphaHistory[i]) / 2;
    var dalpha = alpha - alphaHistory[alphaHistory.length - 1];
    for (var i = 0; i < locations.length; i++)
        locations[i] = mult(rotate(dalpha, [0, 1, 0]), locations[i]);
    for (var i = 0; i < lights.length; i++)
        lights[i].position = times(rotate(dalpha, [0, 1, 0]), lights[i].position);
}

function setUniformLights(material) {
    var am = [],
        di = [],
        sp = [],
        po = [];

    for (var i = 0; i < lights.length; i++) {
        am.push(mult(material.ambient, lights[i].ambient));
        di.push(mult(material.diffuse, lights[i].diffuse));
        sp.push(mult(material.specular, lights[i].specular));
        po.push(lights[i].position);
    }
    for (var i = lights.length; i < MAX_LIGHTS; i++) {
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

function setBGM(item) {
    $('.item.bgm').removeClass('active');
    item.addClass('active');
}

function setColor(item) {
    $('.item.color').removeClass('active');
    item.addClass('active');
}

function setEffects(item) {
    $('.item.effects').removeClass('active');
    item.addClass('active');
}

function bgmInputHandler() {
    var reader = new FileReader();

    reader.onload = function(event) {
        the_url = event.target.result;
        $('#audio-zone').append('<audio id="custom" src="' + the_url +
            '"></audio>');
    };
    setBGM($('[bgm-id=custom]'));

    reader.readAsDataURL(this.files[0]);
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
    var pos1 = times(location, vec4(offset, 0.0, -offset, 1.0));
    pos1 = times(projection, pos1);
    var pos2 = times(location, vec4(-offset, 0.0, -offset, 1.0));
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
        vec3(modelViewMatrix[0][0], modelViewMatrix[0][1],
            modelViewMatrix[0][2]),
        vec3(modelViewMatrix[1][0], modelViewMatrix[1][1],
            modelViewMatrix[1][2]),
        vec3(modelViewMatrix[2][0], modelViewMatrix[2][1],
            modelViewMatrix[2][2])
    ];
    gl.uniformMatrix4fv(_modelView, false, flatten(modelViewMatrix));
    gl.uniformMatrix3fv(_normalMatrix, false, flatten(normalMatrix));
}

function hexColorToRGBA(hex) {
    var num = parseInt(hex.slice(1), 16);
    var R = (num >> 16) / 256,
        G = (num >> 8 & 0x00FF) / 256,
        B = (num & 0x0000FF) / 256;
    return [R, G, B, 1.0];
}
