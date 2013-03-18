var link = new Linkage();
var allVelocities = [];
var curVertex = -1;
var curEdge = -1;
var attractor = false;
var tracks = {};
var view = 0;
var VIEWS = 8;
var info = 0;
var INFOS = 2;
var recording = -1;

var V_COEFF = 1;
var V_MAG = 1;

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
            console.log(c.strokeStyle);
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
        c.fillStyle = colorString(0.5,0.5,0.5)
        fillPoint(c, attractor);
    }
}

/*
def pick(x,y):
        i = link.findVertex(x,y)
        if i>=0 and link.vertexDist2(x,y,i)<PICK_DIST2:
                return i,-1
        k = link.findEdge(x,y)
        if k>=0 and link.edgeDist2(x,y,k)<PICK_DIST2:
                return -1,k
        return -1,-1
*/

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

/*
def mouse(button, state, x, y):
        global link, curVertex, curEdge, allVelocities, attractor
        if state!=GLUT_UP: return

        # alt-clicking should count as middle button, but if it doesn't... then it does:
        if button==GLUT_LEFT_BUTTON and glutGetModifiers() & GLUT_ACTIVE_ALT:
                button = GLUT_MIDDLE_BUTTON

        vPort = glGetIntegerv(GL_VIEWPORT)
        y = vPort[3]-y
        if button==GLUT_LEFT_BUTTON:
                i,k = pick(x,y)
                if i>=0 or k>=0:
                        if i==curVertex: i=-1 # clicking cur deselects
                        if k==curEdge: k=-1
                        curVertex,curEdge = i,k
                        glutPostRedisplay()
                else:
                        link.vertices.append((x,y))
                        update()
        elif button==GLUT_MIDDLE_BUTTON:
                i,k = pick(x,y)
                if i>=0 and curVertex>=0 and i!=curVertex:
                        edge = makeEdge(i,curVertex)
                        if edge in link.edges:
                                link.removeEdge( link.edges.index(edge) )
                        else:
                                link.edges.append(edge)
                        update()
                elif k>=0 and curEdge>=0 and k!=curEdge:
                        i1,j1 = link.edges[curEdge]
                        i2,j2 = link.edges[k]
                        angle = makeAngle2(i1,j1,i2,j2)
                        if angle in link.angles:
                                link.angles.remove(angle)
                        elif angle!=None:
                                link.angles.append(angle)
                        update()
        elif button==GLUT_RIGHT_BUTTON:
                if attractor and ((attractor[0]-x)**2+(attractor[1]-y)**2)<PICK_DIST2:
                        attractor = False
                else: attractor = (x,y)
                glutPostRedisplay()

def keyboard(key, x, y):
        global link, curVertex, curEdge, allVelocities, view, info, recording, tracks
        if key=='f' and curVertex>=0:
                if curVertex in link.fixed: link.fixed.remove(curVertex)
                else: link.fixed.append(curVertex)
                update()
        elif key=='t' and curVertex>=0:
                if curVertex in tracks: tracks.pop(curVertex)
                else: tracks[curVertex]=[]
                glutPostRedisplay()
        elif key=='d':
                if curVertex>=0:
                        for i in tracks:
                                if i==curVertex:
                                        tracks.pop(i)
                                elif i>curVertex:
                                        tracks[i-1] = tracks.pop(i)
                        link.removeVertex(curVertex)
                        curVertex = -1
                        update()
                elif curEdge>=0:
                        link.removeEdge(curEdge)
                        curEdge = -1
                        update()
        elif key=='c':
                tracks = {}
                link.clear()
                update()
        elif key=='l':
                tracks = {}
                link.clear()
                link.load()
                stats = (len(link.vertices), len(link.fixed), len(link.edges), len(link.angles))
                print 'loaded %d vertices (%d fixed), %d edges, and %d angles'%stats
                update()
        elif key=='s':
                link.save()
                stats = (len(link.vertices), len(link.fixed), len(link.edges), len(link.angles))
                print 'saved %d vertices (%d fixed), %d edges, and %d angles'%stats
        elif key=='v':
                view = (view+1)%VIEWS
                glutPostRedisplay()
        elif key=='i':
                info = (info+1)%INFOS
                glutPostRedisplay()
        elif key=='m':
                if glutGameModeGet(GLUT_GAME_MODE_ACTIVE):
                        glutLeaveGameMode()
                        glutPostRedisplay()
                else:
                        glutEnterGameMode()
                        initWindow()
        elif key=='p':
                print 'printed window to file'
                screenshot()
        elif key=='r':
                if recording>=0:
                        print 'recorded %d frames'%recording
                        recording = -1
                else:
                        print 'recording...'
                        recording = 0


def idle():
        global link,allVelocities,curVertex,attractor, recording, tracks
        if not attractor or curVertex<0 or len(allVelocities)==0 or curVertex in link.fixed:
                return

        if recording>=0:
                screenshot('screenshot%04d.png'%recording)
                recording += 1

        x,y = link.vertices[curVertex]
        v0 = numpy.array([attractor[0]-x,attractor[1]-y])
        dv = numpy.dot(v0,v0)
        if dv<ATTRACT_DIST2: # turn off attractor
                attractor = False
                glutPostRedisplay()
                return
        v0 = V_MAG*v0/numpy.sqrt(dv)
        for vel in allVelocities:
                v = vel[curVertex]
                c = numpy.dot(v0,v)/numpy.dot(v,v)
                c = max(-V_COEFF, min(V_COEFF, c)) #don't allow big coefficients
                v0 -= c*v
                for i in range(len(link.vertices)):
                        x,y = link.vertices[i]
                        link.vertices[i] = (x+c*vel[i,0],y+c*vel[i,1])

        for i in tracks:
                if len(tracks[i])==0 or link.vertexDist2(tracks[i][-1][0], tracks[i][-1][1], i)>TRACK_DIST2:
                        tracks[i].append(link.vertices[i])
                        while len(tracks[i])>TRACK_LENGTH:
                                tracks[i].pop(0)

        update()

def update():
        global allVelocities
        allVelocities = link.computeRigidity()
        glutPostRedisplay()


def screenshot(path='screenshot.png',format='png'):
        vPort = glGetIntegerv(GL_VIEWPORT)
        glPixelStorei(GL_PACK_ALIGNMENT, 1)
        data = glReadPixelsub(0, 0, vPort[2], vPort[3], GL_RGB)
        image = Image.fromstring( "RGB", (vPort[2], vPort[3]), data.tostring() )
        image = image.transpose(Image.FLIP_TOP_BOTTOM)
        image.save(path,format)

def initWindow():
        glPointSize(VERTEX_SIZE)
        glLineWidth(LINE_WIDTH)
        glutDisplayFunc(display)
        glutMouseFunc(mouse)
        glutKeyboardFunc(keyboard)


def init(): #haha, definite
        global link, V_MAG, V_COEFF
        if len(sys.argv)>=2: #<linkage-file>
                link.load(sys.argv[1])
                update()
        if len(sys.argv)>=3: #<step-size>
                V_MAG = float(sys.argv[2])
        if len(sys.argv)>=4: #<max-step>
                V_COEFF = float(sys.argv[3])


print """usage: python main.py [<linkage-file> [<step-size=1> [<max-step=1>]]]
click to add vertices
click to (de)select a vertex and middle-click (alt-click) another vertex to add an edge
click to (de)select an edge and middle-click (alt-click) an adjacent edge to fix their angle
right-click (control-click) to place or remove the attractor, which attracts the selected vertex
press 'f' to fix the selected vertex
press 'd' to delete the selected component
press 'c' to clear everything away
press 'l' to load from saved_linkage.txt
press 's' to save to saved_linkage.txt
press 'v' to cycle through viewing options
press 'i' to toggle information display
press 'm' to maximize/minimize to/from fullscreen
press 'p' to print image to screenshot.png
press 'r' to toggle motion recording to screenshot0000.png through screenshot9999.png"""

glutInit(sys.argv)
glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB)
glutInitWindowSize(600, 600)
glutCreateWindow('linkage')
init()
initWindow()
glutIdleFunc(idle)
glutMainLoop()
*/

link.vertices.push([100, 100]);
link.vertices.push([200, 100]);
link.vertices.push([200, 200]);
link.fixed.push(1);
link.edges.push({i: 0, j: 1});
link.edges.push({i: 1, j: 2});
console.log(link.findVertex(80, 10));
console.log(link.findVertex(180, 0));
console.log(link.computeRigidity());
allVelocities = link.computeRigidity();

$(display);
