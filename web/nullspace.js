function computeNullspace(A, eps) {
    // returns a basis for the nullspace of A
    if (A.length == 0) return [];

    var cols = A[0].length;
    while (A.length < cols) { // numeric.svd needs at least as many rows as columns
        // so we pad with zero vectors, which do nothing to the equations
        A.push(numeric.rep([cols], 0));
    }

    var svd = numeric.svd(A);
    var Vh = numeric.transpose(svd.V); // technically we should do Hermitian transpose?

    eps = eps || 1e-9;
    var nullspace = [];
    for (var i in Vh) {
        if (svd.S[i] <= eps) // zero singular value means this row is in nullspace
            nullspace.push(Vh[i]);
    }
    return nullspace;
}
