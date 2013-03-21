var link = new Linkage();
var allVelocities = [];
var curVertex;
var curEdge;
var attractor;
var tracks = {};
var view = 0;
var VIEWS = 8;
var info = 0;
var INFOS = 2;
var recording;

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
    c.closePath();
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

    _.each(link.edges, function(e, k) {
        if (k == curEdge) c.fillStyle = colorString(1, 0.3, 1);
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
        c.closePath();
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
        var b = i == curVertex ? 1 : 0;
        var r = link.fixed.indexOf(i) != -1 ? 1 : 0;
        var g = i in tracks ? 1 : 0;
        if (i == curVertex || !(view & 2)) {
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
        if (picked.vertex == curVertex)
            delete picked.vertex; // clicking cur deselects
        if (picked.edge == curEdge)
            delete picked.edge;
        curVertex = picked.vertex;
        curEdge = picked.edge;
        display();
    }
    else {
        link.vertices.append((x, y));
        update();
    }
}

function mousemiddle(x, y) {
    var picked = pick(x, y);
    var i = picked.vertex, k = picked.edge;

    if (i >= 0 && curVertex >= 0 && i != curVertex) {
        var edge = makeEdge(i, curVertex);
        var k = link.getEdge(edge);
        if (k >= 0) link.removeEdge(k);
        else link.edges.push(edge);
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

function keypress(key) {
    if (key == 'f' && curVertex >= 0) {
        var i = link.fixed.indexOf(curVertex);
        if (i >= 0) link.fixed.splice(i, 1);
        else link.fixed.push(curVertex);
        update();
    }

    else if (key == 't' && curVertex >= 0) {
        if (curVertex in tracks) delete tracks[curVertex];
        else tracks[curVertex] = [];
        display();
    }

    else if (key=='d') {
        if (curVertex >= 0) {
            if (curVertex in tracks) {
                var oldTracks = tracks;
                tracks = {};
                _.each(oldTracks, function(track, i) {
                    if (i != curVertex)
                        tracks[i < curVertex ? i : i-1] = track;
                });
            }

            link.removeVertex(curVertex);
            curVertex = undefined;
            update();
        }
        else if (curEdge >= 0) {
            link.removeEdge(curEdge);
            curEdge = undefined;
            update();
        }
    }

    else if (key == 'c') {
        tracks = {};
        link.clear();
        update();
    }

    // elif key=='l':
    //         tracks = {}
    //         link.clear()
    //         link.load()
    //         stats = (len(link.vertices), len(link.fixed), len(link.edges), len(link.angles))
    //         print 'loaded %d vertices (%d fixed), %d edges, and %d angles'%stats
    //         update()

    // elif key=='s':
    //         link.save()
    //         stats = (len(link.vertices), len(link.fixed), len(link.edges), len(link.angles))
    //         print 'saved %d vertices (%d fixed), %d edges, and %d angles'%stats

    else if (key == 'v') {
        view = (view + 1) % VIEWS;
        display();
    }

    else if (key == 'i') {
        info = (info + 1) % INFOS;
        display();
    }

    // elif key=='m':
    //         if glutGameModeGet(GLUT_GAME_MODE_ACTIVE):
    //                 glutLeaveGameMode()
    //                 glutPostRedisplay()
    //         else:
    //                 glutEnterGameMode()
    //                 initWindow()
    // elif key=='p':
    //         print 'printed window to file'
    //         screenshot()
    // elif key=='r':
    //         if recording>=0:
    //                 print 'recorded %d frames'%recording
    //                 recording = -1
    //         else:
    //                 print 'recording...'
    //                 recording = 0
}


function idle() {
    if (!attractor || curVertex === undefined || allVelocities.length == 0
        || link.fixed.indexOf(curVertex) >= 0)
        return;

    // if recording>=0:
    //         screenshot('screenshot%04d.png'%recording)
    //         recording += 1

    var num = numeric;
    var velocity0 = num.sub(attractor, link.vertices[curVertex]);
    if (num.norm2Squared(velocity0) < ATTRACT_DIST2) { // turn off attractor
        attractor = undefined;
        display();
        return;
    }

    velocity0 = num.mul(VELOCITY_MAG * normalized(velocity0));
    _.each(allVelocities, function(velocities) {
        var velocity = velocities[curVertex];
        var c = numpy.dot(velocity0, velocity) / numpy.norm2Squared(velocity);
        if (c < -VELOCITY_COEFF) c = -VELOCITY_COEFF;
        if (c > VELOCITY_COEFF) c = VELOCITY_COEFF;

        velocity0 = num.sub(velocity0, num.mul(c, velocity));

        for (var i in link.vertices)
            link.vertices[i] = num.add(link.vertices[i],
                                       num.mul(c, velocities[i]));
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

function update() {
    allVelocities = link.computeRigidity();
    display();
}

// def screenshot(path='screenshot.png',format='png'):
//         vPort = glGetIntegerv(GL_VIEWPORT)
//         glPixelStorei(GL_PACK_ALIGNMENT, 1)
//         data = glReadPixelsub(0, 0, vPort[2], vPort[3], GL_RGB)
//         image = Image.fromstring( "RGB", (vPort[2], vPort[3]), data.tostring() )
//         image = image.transpose(Image.FLIP_TOP_BOTTOM)
//         image.save(path,format)

// def initWindow():
//         glPointSize(VERTEX_SIZE)
//         glLineWidth(LINE_WIDTH)
//         glutDisplayFunc(display)
//         glutMouseFunc(mouse)
//         glutKeyboardFunc(keyboard)


// def init(): #haha, definite
//         global link, VEL_MAG, VEL_COEFF
//         if len(sys.argv)>=2: #<linkage-file>
//                 link.load(sys.argv[1])
//                 update()
//         if len(sys.argv)>=3: #<step-size>
//                 VEL_MAG = float(sys.argv[2])
//         if len(sys.argv)>=4: #<max-step>
//                 VEL_COEFF = float(sys.argv[3])


// print """usage: python main.py [<linkage-file> [<step-size=1> [<max-step=1>]]]
// click to add vertices
// click to (de)select a vertex and middle-click (alt-click) another vertex to add an edge
// click to (de)select an edge and middle-click (alt-click) an adjacent edge to fix their angle
// right-click (control-click) to place or remove the attractor, which attracts the selected vertex
// press 'f' to fix the selected vertex
// press 'd' to delete the selected component
// press 'c' to clear everything away
// press 'l' to load from saved_linkage.txt
// press 's' to save to saved_linkage.txt
// press 'v' to cycle through viewing options
// press 'i' to toggle information display
// press 'm' to maximize/minimize to/from fullscreen
// press 'p' to print image to screenshot.png
// press 'r' to toggle motion recording to screenshot0000.png through screenshot9999.png"""

// glutInit(sys.argv)
// glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB)
// glutInitWindowSize(600, 600)
// glutCreateWindow('linkage')
// init()
// initWindow()
// glutIdleFunc(idle)
// glutMainLoop()

link.vertices.push([100, 100]);
link.vertices.push([200, 100]);
link.vertices.push([200, 200]);
link.fixed.push(1);
link.edges.push({i: 0, j: 1});
link.edges.push({i: 1, j: 2});

$(function() {
    update();

    $('#canvas').mouseup(function(event) {
        var offset = $(this).offset();
        mouseleft(event.pageX - offset.left,
                  event.pageY - offset.top);
    });
});
