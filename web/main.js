var link = new Linkage();
var allVelocities = [];
var curVertices = [];
var curEdge;
var attractor;
var tracks = {};
var view = 0;
var VIEWS = 8;
var info = 0;
var label = 0
var INFOS = 2;
var createButton = 1;
var savedCount = 3;

function reset() {
    allVelocities = [];
    curVertices = [];
    curEdge = undefined;
    attractor = undefined;
    tracks = {};
}

var VELOCITY_COEFF = 1;
var VELOCITY_MAG = 1;

var VERTEX_SIZE = 10;
var LINE_WIDTH = 3;
var ANGLE_DIST = 25;
var VECTOR_LENGTH = 50;
var PICK_DIST2 = 100;
var ATTRACT_DIST2 = 25;
var TRACK_LENGTH = 1024;
var TRACK_DIST2 = 4;

function normalized(v) {
    return numeric.div(v, numeric.norm2(v));
}

function strokeLine(c, u, v) {
    c.beginPath();
    c.moveTo(u[0], u[1]);
    c.lineTo(v[0], v[1]);
    c.stroke();
}

function fillPoint(c, v) {
    c.fillRect(v[0] - VERTEX_SIZE/2, v[1] - VERTEX_SIZE/2,
               VERTEX_SIZE, VERTEX_SIZE);
}

function colorComponent(x) {
    x = Math.round(255 * x).toString(16);
    if (x.length < 2) x = '0' + x;
    return x;
}

function colorString(r, g, b) {
    return '#' + colorComponent(r) + colorComponent(g) + colorComponent(b);
}

function display() {
    if (createButton & 1){
        let buttonPane = document.createElement("body");
        buttonPane.style.display = "flex";
        buttonPane.style.justifyContent = "space-evenly";

        
        let mergeButton = document.createElement("button");
        mergeButton.innerHTML = "Auto-merge";
        mergeButton.height = "50";
        mergeButton.onclick = function () {
            keypress('a');
        };
        buttonPane.appendChild(mergeButton);

        let fixButton = document.createElement("button");
        fixButton.innerHTML = "Fix Vertex";
        fixButton.height = "50";
        fixButton.onclick = function () {
            keypress('f');
        };
        buttonPane.appendChild(fixButton);

        let traceButton = document.createElement("button");
        traceButton.innerHTML = "Trace Vertex";
        traceButton.onclick = function () {
            keypress('t');
        };
        buttonPane.appendChild(traceButton);

        let delButton = document.createElement("button");
        delButton.innerHTML = "Delete Vertex";
        delButton.onclick = function () {
            keypress('d');
        };
        buttonPane.appendChild(delButton);

        let viewButton = document.createElement("button");
        viewButton.innerHTML = "Change view";
        viewButton.onclick = function () {
            keypress('v');
        };
        buttonPane.appendChild(viewButton);

        let infoButton = document.createElement("button");
        infoButton.innerHTML = "Toggle Info";
        infoButton.onclick = function () {
            keypress('i');
        };
        buttonPane.appendChild(infoButton);

        let editLabelButton = document.createElement("button");
        editLabelButton.innerHTML = "Edit Label";
        editLabelButton.onclick = function () {
            keypress('q');
        };
        buttonPane.appendChild(editLabelButton);

        let labelButton = document.createElement("button");
        labelButton.innerHTML = "Toggle Labels";
        labelButton.onclick = function () {
            keypress('l');
        };
        buttonPane.appendChild(labelButton);

        let clearButton = document.createElement("button");
        clearButton.innerHTML = "Clear Screen";
        clearButton.onclick = function () {
            keypress('c');
        };
        buttonPane.appendChild(clearButton);

        let saveButton = document.createElement("button");
        saveButton.innerHTML = "Save Linkage";
        saveButton.onclick = function () {
            keypress('s');
        };
        buttonPane.appendChild(saveButton);

        document.body.appendChild(buttonPane);
        createButton = 0;
    }

    var num = numeric;
    var canvas = $('#canvas');
    canvas.attr('width', canvas.width());
    canvas.attr('height', canvas.height());
    var c = canvas[0].getContext('2d');
    c.clearRect(0, 0, canvas.width, canvas.height);

    if (!(info & 1)) {
        c.fillStyle = colorString(0, 0, 0);
        c.font = '10pt Helvetica';
        c.fillText(allVelocities.length + ' degrees of freedom',
                   50, 50);
    }

    if (!(label & 1)) {
        if (link.labels.length < link.vertices.length) {
            for(let j = link.labels.length; j < link.vertices.length; j++){
                link.labels[j] = String.fromCharCode(65 + j + link.labelCount);
            }
        }

        for(let i = 0; i < link.vertices.length; i++){
            var x = link.vertices[i][0];
            var y = link.vertices[i][1];
            c.fillText(link.labels[i], x + 8, y + 12);
        }
    }

    _.each(link.edges, function(e, k) {
        if (k == curEdge) c.strokeStyle = colorString(1, 0.3, 1);
        else c.strokeStyle = colorString(1, 0.3, 0);
        strokeLine(c, link.vertices[e.i], link.vertices[e.j]);
    });

    if (!(view & 4)) {
        c.strokeStyle = colorString(1, 0.7, 0);
        _.each(link.angles, function(a) {
            var u = link.vertices[a.i];
            var v = link.vertices[a.j];
            var w = link.vertices[a.k];
            strokeLine(c, num.add(u, num.mul(ANGLE_DIST, normalized(num.sub(v, u)))),
                       num.add(u, num.mul(ANGLE_DIST, normalized(num.sub(w, u)))));
        });
    }

    c.strokeStyle = colorString(0, 0.5, 0);
    _.each(tracks, function(track) {
        c.beginPath();
        _.each(track, function(v, i) {
            if (i == 0) c.moveTo(v[0], v[1]);
            else c.lineTo(v[0], v[1]);
        });
        c.stroke();
    });

    if (!(view & 1)) {
        var n = allVelocities.length;
        _.each(allVelocities, function(velocities, k) {
            velocities = num.mul(VECTOR_LENGTH, velocities);
            c.strokeStyle = colorString(0, (k + 1) / n, 0);
            _.each(link.vertices, function(v, i) {
                strokeLine(c, v, num.add(v, velocities[i]));
            });
        });
    }

    _.each(link.vertices, function(v, i) {
        var b = curVertices.indexOf(i) >= 0 ? 1 : 0;
        var r = link.fixed.indexOf(i) != -1 ? 1 : 0;
        var g = i in tracks ? 1 : 0;
        if (curVertices.indexOf(i) >= 0 || !(view & 2)) {
            c.fillStyle = colorString(r, g, b);
            fillPoint(c, v);
        }
    });

    if (attractor) {
        c.fillStyle = colorString(0.5, 0.5, 0.5)
        fillPoint(c, attractor);
    }
}

function pick(x, y) {
    var i = link.findVertex(x, y);
    if (i >= 0 && link.vertexDist2(x, y, i) < PICK_DIST2)
        return {vertex: i};

    var k = link.findEdge(x,y)
    if (k >= 0 && link.edgeDist2(x, y, k) < PICK_DIST2)
        return {edge: k}

    return {};
}

function makeEdge(i, j) {
    if (i < j) return {i: i, j: j};
    else return {i: j, j: i};
}

function makeAngle(i, j, k) {
    if (j < k) return {i: i, j: j, k: k};
    else return {i: i, j: k, k: j};
}

function makeAngle2(i1, j1, i2, j2) {
    if (i1 == i2) return makeAngle(i1,j1,j2);
    if (i1 == j2) return makeAngle(i1,j1,i2);
    if (j1 == i2) return makeAngle(j1,i1,j2);
    if (j1 == j2) return makeAngle(j1,i1,i2);
}

function mouseleft(x, y) {
    var picked = pick(x, y);
    if (picked.vertex >= 0 || picked.edge >= 0) {
        if (curVertices.indexOf(picked.vertex) >= 0)
            curVertices = curVertices.filter(vertex => vertex !== picked.vertex); // clicking cur deselects
        else {
            if (picked.vertex !== undefined)
                curVertices.push(picked.vertex);
        }
        if (picked.edge == curEdge)
            delete picked.edge;
        curEdge = picked.edge;
        display();
    }
    else {
        link.vertices.push([x, y]);
        update();
    }
}

function mousemiddle(x, y) {
    var picked = pick(x, y);
    var i = picked.vertex, k = picked.edge;

    if (i >= 0 && curVertices.length > 0 && curVertices.indexOf(i) < 0) {
        for (const curVertex of curVertices) {
            var edge = makeEdge(i, curVertex);
            var k = link.getEdge(edge);
            if (k >= 0) link.removeEdge(k);
            else link.edges.push(edge);
        }
        update();
    }

    else if (k >= 0 && curEdge >= 0 && k != curEdge) {
        var ij = link.edges[curEdge];
        var jk = link.edges[k];
        var angle = makeAngle2(ij.i, ij.j, jk.i, jk.j);
        if (angle) {
            var a = link.getAngle(angle);
            if (a >= 0) link.angles.slice(a, 1);
            else link.angles.push(angle);
            update();
        }
    }
}

function mouseright(x, y) {
    if (attractor && numeric.norm2Squared(numeric.sub([x, y], attractor)) < PICK_DIST2)
        attractor = undefined;
    else
        attractor = [x, y];
    display();
}

let isMerging = false;

function keypress(key) {
    // var k = key;
    // function myFunction(key2){
    //     k = key2;
    // }
    // <button onclick="myFunction('f')">fix point</button>

    if (key == 'f' && curVertices.length > 0) {
        for (const curVertex of curVertices) {
            var i = link.fixed.indexOf(curVertex);
            if (i >= 0) link.fixed.splice(i, 1);
            else link.fixed.push(curVertex);
        }
        update();
    }

    else if (key == 'a' && curVertices.length == 2 && !isMerging) {
        isMerging = true;
        const i0 = Math.min(curVertices[0], curVertices[1]);
        const i1 = Math.max(curVertices[0], curVertices[1]);
        const midpoint = ([x1, y1], [x2, y2]) => [(x1 + x2) / 2, (y1 + y2) / 2];
        var mid = midpoint(link.vertices[i0], link.vertices[i1])
        mouseright(mid[0], mid[1]);
        setTimeout(() => {
            const success = link.mergeVertices(i0, i1);
            if (success) {
                curVertices = curVertices.filter((vertex) => vertex !== i1);
            }
            mouseright(mid[0], mid[1]);
            update();
            isMerging = false; // merge attempt finished
        }, 5000);
        
    }

    else if (key == 't' && curVertices.length > 0) {
        for (const curVertex of curVertices) {
            if (curVertex in tracks) delete tracks[curVertex];
            else tracks[curVertex] = [];
        }
        display();
    }

    else if (key == 'd') {
        if (curVertices.length > 0) {
            for (const curVertex of curVertices.sort((a,b) => b-a)) {
                if (curVertex in tracks) {
                    var oldTracks = tracks;
                    tracks = {};
                    _.each(oldTracks, function(track, i) {
                        if (i != curVertex)
                            tracks[i < curVertex ? i : i-1] = track;
                    });
                }

                link.removeVertex(curVertex);
                update()
            }
            curVertices = [];
            update();
            display();
        }
        else if (curEdge >= 0) {
            link.removeEdge(curEdge);
            curEdge = undefined;
            update();
        }
    }

    else if(key == 'q' && curVertices.length == 1) {
        var new_label = prompt("Please enter new label", "<new label>");
        link.labels[curVertices] = new_label;
        display();
    }

    else if (key == 'c') {
        reset();
        link.clear();
        update();
    }

    else if (key == 'v') {
        view = (view + 1) % VIEWS;
        display();
    }

    else if (key == 'i') {
        info = (info + 1) % INFOS;
        display();
    }

    else if (key == 'l') {
        label = (label + 1) % INFOS;
        display();
    }

    else if (key == 'n') {
        instr = (instr + 1) % INFOS;
        display();
    }

    else if (key == 's') {
        if (savedCount >= 9) {
            alert("You have exceeded the allowed number of saved linkages in this session.");
            return;
        }

        var linkageName = prompt("What would you like to name this linkage?", "<name>");
        if (linkageName == null) return;
        var verticesCopy = [];
        for (var i=0; i<link.vertices.length; i++) {
            verticesCopy.push([...link.vertices[i]]);
        }
        PRESETS.push(
            $.extend(new Linkage(), {
                name: linkageName,
                vertices: verticesCopy,
                labels: [...link.labels],
                fixed: [...link.fixed],
                edges: [...link.edges],
                angles: [...link.angles],
            })
        );

        var ol = $('#presets');
        ol.append('<li>' + linkageName + '</li>');
        savedCount++;
        update();
    }

    else if ((key - '1') in PRESETS) {
        reset();
        link = PRESETS[key - '1'].copy();
        update();
    }
}


var resized = false;
function idle() {
    for (const curVertex of curVertices) {
        if (attractor && curVertex >= 0 && allVelocities.length && link.fixed.indexOf(curVertex) < 0) {
            var num = numeric;
            
            var velocity0 = num.sub(attractor, link.vertices[curVertex]);
            
            if (num.norm2Squared(velocity0) < ATTRACT_DIST2) { // turn off attractor
                attractor = undefined;
                display();
                break;
            }
            else {
                velocity0 = num.mul(VELOCITY_MAG, normalized(velocity0));
                _.each(allVelocities, function(velocities) {
                    var velocity = velocities[curVertex];
                    var d = num.norm2Squared(velocity);
                    if (d < 1e-9) return;

                    var c = num.dot(velocity0, velocity) / d;
                    if (c < -VELOCITY_COEFF) c = -VELOCITY_COEFF;
                    if (c > VELOCITY_COEFF) c = VELOCITY_COEFF;

                    velocity0 = num.sub(velocity0, num.mul(c, velocity));

                    for (var i in link.vertices) {
                        link.vertices[i] = num.add(link.vertices[i],
                                                num.mul(c, velocities[i]));
                    }
                });

                _.each(tracks, function(track, i) {
                    var last = track[track.length - 1];
                    if (!last || link.vertexDist2(last[0], last[1], i) > TRACK_DIST2) {
                        track.push(link.vertices[i]);

                        if (track.length > TRACK_LENGTH)
                            track.splice(0, track.length - TRACK_LENGTH);
                    }
                });
                update();
            }
            
        }
        else if (resized) {
            display();
            resized = false;
        }
    }

    setTimeout(idle, 10);
}

function update() {
    if (link.vertices.length)
        allVelocities = link.computeRigidity();
    else
        allVelocities = [];
    display();
}

link = PRESETS[0].copy();

$(function() {
    $('#canvas').mouseup(function(event) {
        var offset = $(this).offset();
        var x = event.pageX - offset.left;
        var y = event.pageY - offset.top;
        if (event.shiftKey)
            mouseright(x, y);
        else if (event.altKey)
            mousemiddle(x, y);
        else
            mouseleft(x, y);
    });

    $(window).keypress(function(event) {
        keypress(String.fromCharCode(event.charCode));
    }).resize(function() {
        resized = true;
    });

    update();
    idle();
});
