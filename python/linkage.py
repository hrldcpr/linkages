import json
import numpy
import nullspace

class Linkage:
    """representation of linked rigid bars"""

    def __init__(self):
        self.clear()

    def clear(self):
        self.vertices = [] #[(x,y)]
        self.fixed = [] #[i] fixes v_i
        self.edges = [] #[(i,j)] fixes distance between v_i and v_j
        self.angles = [] #[(i,j,k)] fixes angle between v_iv_j and v_iv_k

    def removeVertex(self,i0):
        self.vertices.pop(i0)
        fixed = []
        for l in range(len(self.fixed)):
            i = self.fixed[l]
            if i!=i0:
                if i>i0: i-=1
                fixed.append(i)
        self.fixed = fixed
        edges = []
        for l in range(len(self.edges)):
            i,j = self.edges[l]
            if i!=i0 and j!=i0:
                if i>i0: i-=1
                if j>i0: j-=1
                edges.append((i,j))
        self.edges = edges
        angles = []
        for l in range(len(self.angles)):
            i,j,k = self.angles[l]
            if i!=i0 and j!=i0 and k!=i0:
                if i>i0: i-=1
                if j>i0: j-=1
                if k>i0: k-=1
                angles.append((i,j,k))
        self.angles = angles

    def removeEdge(self, k0):
        i0,j0 = self.edges.pop(k0)
        f = lambda i_j_k: (i_j_k[0]!=i0 or (i_j_k[1]!=j0 and i_j_k[2]!=j0)) and (i_j_k[0]!=j0 or (i_j_k[1]!=i0 and i_j_k[2]!=i0))
        self.angles = list(filter(f, self.angles))

    def vertexDist2(self, x, y, i):
        xi,yi = self.vertices[i]
        return (xi-x)**2+(yi-y)**2

    def findVertex(self, x, y):
        """returns the index of the closest vertex to (x,y)"""
        i = -1
        di = numpy.inf
        for j in range(len(self.vertices)):
            dj = self.vertexDist2(x,y,j)
            if dj<di:
                i = j
                di = dj
        return i

    def edgeDist2(self, x, y, k):
        i,j = self.edges[k]
        u = numpy.array(self.vertices[i])
        v = numpy.array(self.vertices[j])
        w = numpy.array([x,y])
        uv = v-u
        uw = w-u
        d1 = numpy.dot(uw,uv) #project uw onto uv
        if d1<=0: #lies on segmentless side of u
            return self.vertexDist2(x,y,i)
        d2 = numpy.dot(uv,uv) #length2 of uv
        if d1>=d2: #lies on segmentless side of v
            return self.vertexDist2(x,y,j)
        pw = w - (u + d1/float(d2)*uv) #closest point is d1/d2 along uv
        return numpy.dot(pw,pw)

    def findEdge(self, x, y):
        """returns the index of the closest edge to (x,y)"""
        k = -1
        dk = numpy.inf
        for l in range(len(self.edges)):
            dl = self.edgeDist2(x,y,l)
            if dl<dk:
                k = l
                dk = dl
        return k

    def computeRigidity(self):
        """returns a k-by-n-by-2 basis of velocity vectors
        satisfying the constraints of this"""
        m = 2*len(self.fixed) + len(self.edges) + len(self.angles)
        if m==0: m=1 # still no constraint, but want a nonempty matrix
        n = len(self.vertices)
        rigidity = numpy.zeros((m, 2*n))
        row = 0

        # 2 constraints per fixed point i,
        # to make vx_i=0 and vy_i=0,
        # i.e. constrain i to have zero velocity:
        for i in self.fixed:
            rigidity[row, 2*i] = 1
            rigidity[row+1, 2*i+1] = 1
            row+=2

        # 1 constraint per edge (i,j),
        # to make (p_i-p_j).v_i=(p_i-p_j).v_j,
        # i.e. constrain velocities of i and j
        # to agree along their common edge:
        for (i,j) in self.edges:
            u = self.vertices[i]
            v = self.vertices[j]
            dx = u[0]-v[0]
            dy = u[1]-v[1]
            rigidity[row, 2*i] = dx
            rigidity[row, 2*i+1] = dy
            rigidity[row, 2*j] = -dx
            rigidity[row, 2*j+1] = -dy
            row+=1

        # 1 constraint per fixed angle:
        for (i,j,k) in self.angles:
            u = self.vertices[i]
            v = self.vertices[j]
            w = self.vertices[k]
            dxj = u[0]-v[0]
            dyj = u[1]-v[1]
            dxk = u[0]-w[0]
            dyk = u[1]-w[1]
            rigidity[row, 2*i] = dxj+dxk
            rigidity[row, 2*i+1] = dyj+dyk
            rigidity[row, 2*j] = -dxk
            rigidity[row, 2*j+1] = -dyk
            rigidity[row, 2*k] = -dxj
            rigidity[row, 2*k+1] = -dyj
            row+=1

        # find basis of velocities satisfying constraints:
        null = nullspace.nullspace(rigidity)

        # reshape to list of 2D vectors:
        velocities = []
        for v in null:
            velocities.append(v.reshape((n,2)))

        return velocities

    def load(self,path='saved_linkage.txt'):
        # file will refer to its vertices starting at zero,
        # so we offset by the number of vertices that already exist:
        n0 = len(self.vertices)
        parseVertex = lambda i: n0+int(i)

        f = file(path)
        modes = ['v','e','f','a']
        mode = ''
        for line in f:
            if line[0] in modes:
                mode = line[0]
                continue
            if mode=='v':
                try:
                    x,y = list(map(float,line.split()))
                    self.vertices.append((x,y))
                except ValueError: pass
            elif mode=='f':
                try:
                    i = parseVertex(line.strip())
                    self.fixed.append(i)
                except ValueError: pass
            elif mode=='e':
                try:
                    i,j = list(map(parseVertex,line.split()))
                    self.edges.append((i,j))
                except ValueError: pass
            elif mode=='a':
                try:
                    i,j,k = list(map(parseVertex,line.split()))
                    self.angles.append((i,j,k))
                except ValueError: pass

    def save(self,path='saved_linkage.txt'):
        f = file(path,'w')
        f2 = file(path+'.js', 'w')
        print('v', file=f)
        print('$.extend(new Linkage(), {', file=f2)

        for v in self.vertices:
            print('%f %f'%v, file=f)
        print('vertices: %s,' % json.dumps(self.vertices), file=f2)

        print('f', file=f)
        for i in self.fixed:
            print(i, file=f)
        print('fixed: %s,' % json.dumps(self.fixed), file=f2)

        print('e', file=f)
        for e in self.edges:
            print('%d %d'%e, file=f)
        print('edges: [%s],' % ',\n'.join(('{i: %d, j: %d}' % e)
                             for e in self.edges), file=f2)

        print('a', file=f)
        for a in self.angles:
            print('%d %d %d'%a, file=f)
        print('angles: [%s],' % ',\n'.join(('{i: %d, j: %d, k: %d}' % a)
                              for a in self.angles), file=f2)

        print('}),', file=f2)
        f.close()
        f2.close()
