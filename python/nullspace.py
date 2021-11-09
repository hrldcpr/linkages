import numpy

def nullspace(A, eps=1.0e-5): #from http://danse.us/trac/diffraction 07-06-13
    """returns a basis for the nullspace of A"""
    if A.size==0: return []
    u, s, vh = numpy.linalg.svd(A)
    # s may have smaller dimension than v:
    mask = numpy.array([True]*vh.shape[0])
    mask[:len(s)][s > eps] = False
    return numpy.compress(mask, vh, axis=0)
