function Linkage() {
    // representation of linked rigid bars

    // each that you can use 'this' in:
    function computeNullspace(A, eps) { // from http://danse.us/trac/diffraction 07-06-13
        // returns a basis for the nullspace of A

        if (A.length == 0) return [];

        var cols = A[0].length;
        while (A.length < cols) { // numeric.svd needs at least as many rows as columns
            // so we pad with zero vectors, which do nothing to the equations
            A.push(numeric.rep([cols], 0));
        }

        eps = eps || 1e-5;

        var svd = numeric.svd(A);
        var nullspace = [];
        for (var i in svd.V) {
            if (svd.S[i] <= eps) // zero singular value means this row is in nullspace
                nullspace.push(svd.V[i]);
        }
        return nullspace;
    }

    this.each = function(list, f) {
        return _.each(list, f, this);
    };

    this.init = function() {
        this.clear();
    };

    this.clear = function() {
        this.vertices = []; // [(x,y)]
        this.fixed = []; // [i] fixes v_i
        this.edges = []; // [(i,j)] fixes distance between v_i and v_j
        this.angles = []; // [(i,j,k)] fixes angle between v_iv_j and v_iv_k
    };

    this.removeVertex = function(i0) {
        this.vertices.splice(i0, 1);

        this.fixed = $.map(this.fixed, function(i) {
            if (i != i0)
                return i < i0 ? i : i-1;
        });

        this.edges = $.map(this.edges, function(e) {
            if (e.i != i0 && e.j != i0)
                return {i: i < i0 ? i : i-1,
                        j: j < i0 ? j : j-1};
        });

        this.angles = $.map(this.angles, function(a) {
            if (a.i != i0 && a.j != i0 && a.k != i0)
                return {i: i < i0 ? i : i-1,
                        j: j < i0 ? j : j-1,
                        k: k < i0 ? k : k-1};
        });
    };

    this.removeEdge = function(k0) {
        var e = this.edges.slice(k0, 1)[0];
        this.angles = $.map(this.angles, function(a) {
            if ((a.i != e.i || (a.j != e.j && a.k != e.j))
                && (a.i != e.j || (a.j != e.i && a.k != e.i)))
                return a;
        });
    };

    this.vertexDist2 = function(x, y, i) {
        var v = this.vertices[i];
        return numeric.norm2Squared([v.x - x, v.y - y]);
    };

    this.findVertex = function(x, y) {
        // returns the index of the closest vertex to (x,y)
        var i = -1, di = Infinity;
        this.each(this.vertices, function(vj, j) {
            var dj = this.vertexDist2(x, y, j);
            if (dj < di) {
                i = j;
                di = dj;
            }
        });
        return i;
    };

    this.edgeDist2 = function(x, y, k) {
        var e = this.edges[k];
        var u = [this.vertices[i].x, this.vertices[i].y];
        var v = [this.vertices[j].x, this.vertices[j].y];
        var w = [x, y];
        var uv = numeric.sub(v, u);
        var uw = numeric.sub(w, u);

        var d1 = numeric.dot(uw, uv); // project uw onto uv
        if (d1 <= 0) // lies on segmentless side of u
            return this.vertexDist2(x, y, i);

        var d2 = numeric.norm2Squared(uv);
        if (d1 >= d2) // lies on segmentless side of v
            return this.vertexDist2(x, y, j);

        // closest point is d1/d2 along uv:
        var pw = numeric.sub(w, numeric.add(u, numeric.mul(d1 / d2, uv)));
        return numeric.norm2Squared(pw);
    };

    this.findEdge = function(x, y) {
        // returns the index of the closest edge to (x,y)
        var k = -1, dk = Infinity;
        this.each(this.edges, function(el, l) {
            var dl = this.edgeDist2(x, y, l);
            if (dl < dk) {
                k = l;
                dk = dl;
            }
        });
        return k;
    };

    this.computeRigidity = function() {
        // returns a k-by-n-by-2 basis of velocity vectors
        // satisfying the constraints of this
        var m = 2*this.fixed.length + this.edges.length + this.angles.length;
        if (m == 0) m = 1; // still no constraint, but want a nonempty matrix
        var n = this.vertices.length;
        var rigidity = numeric.rep([m, 2 * n], 0); // zero matrix
        var row = 0;

        // 2 constraints per fixed point i,
        // to make vx_i=0 and vy_i=0,
        // i.e. constrain i to have zero velocity:
        this.each(this.fixed, function(i) {
            rigidity[row][2*i] = 1;
            rigidity[row + 1][2*i + 1] = 1;
            row += 2;
        });

        // 1 constraint per edge (i,j),
        // to make (p_i-p_j).v_i=(p_i-p_j).v_j,
        // i.e. constrain velocities of i and j
        // to agree along their common edge:
        this.each(this.edges, function(e) {
            var u = this.vertices[e.i];
            var v = this.vertices[e.j];
            var dx = u.x - v.x;
            var dy = u.y - v.y;
            rigidity[row][2*e.i] = dx;
            rigidity[row][2*e.i + 1] = dy;
            rigidity[row][2*e.j] = -dx;
            rigidity[row][2*e.j + 1] = -dy;
            row++;
        });

        // 1 constraint per fixed angle:
        this.each(this.angles, function(a) {
            var u = this.vertices[a.i];
            var v = this.vertices[a.j];
            var w = this.vertices[a.k];
            var dxj = u.x - v.x;
            var dyj = u.y - v.y;
            var dxk = u.x - w.x;
            var dyk = u.y - w.y;
            rigidity[row][2*a.i] = dxj + dxk;
            rigidity[row][2*a.i + 1] = dyj + dyk;
            rigidity[row][2*a.j] = -dxk;
            rigidity[row][2*a.j + 1] = -dyk;
            rigidity[row][2*a.k] = -dxj;
            rigidity[row][2*a.k + 1] = -dyj;
            row++;
        });

        // find basis of velocities satisfying constraints:
        var nullspace = computeNullspace(rigidity); // TODO

        // reshape to list of lists of 2D vectors:
        return _.map(nullspace, function(row) {
            var velocities = [];
            for (var i = 0; i < n; i++)
                velocities.push({x: row[2*i],
                                 y: row[2*i + 1]});
            return velocities;
        });
    };

    this.init();
}

var l = new Linkage();
l.vertices.push({x: 0, y: 0});
l.vertices.push({x: 1, y: 0});
l.fixed.push(1);
l.edges.push({i: 0, j: 1});
console.log(l.findVertex(0.8, 10));
console.log(l.findVertex(-0.8, 10));
console.log(l.computeRigidity());
