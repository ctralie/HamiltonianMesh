/**
 * Skeleton code implementation for a half-edge mesh
 */

let vec3 = glMatrix.vec3;


class HMeshEdge {
    /**
     * Constructor for a half-edge
     */
    constructor() {
        this.head = null; // Head vertex (Type HMeshVertex)
        this.face = null; // Left face (Type HMeshFace)
        this.pair = null; // Half edge on opposite face (Type HMeshEdge)
        this.prev = null; // Previous half edge in CCW order around left face (Type HMeshEdge)
        this.next = null; // Next half edge in CCW order around left face (Type HMeshEdge)
    }

    /**
     * Return a list of the two vertices attached to this edge,
     * or an empty list if one of them has not yet been initialized
     * 
     * @returns {list} A 2-element list of HMeshVertex objects corresponding
     *                  to vertices attached to this edge
     */
    getVertices() {
        let ret = [];
        if (!(this.head === null) && !(this.prev === null)) {
            if (!(this.prev.head === null)) {
                ret = [this.head, this.prev.head];
            }
        }
        return ret;
    }
}

class HMeshFace {
    /**
     * Constructor for a half-edge face
     */
    constructor() {
        this.h = null; // Any HMeshEdge on this face (Type HMeshEdge)
        this.center = null;
        this.centroid = null
    }

    getEdges() {
        if (this.h === null) {
            return [];
        }
        let h = this.h;
        let edges = [];
        do {
            edges.push(h);
            h = h.next;
        }
        while (h != this.h);
        return edges;
    }

    
    getCenter() {
        verts = this.getVertices()
        sum = verts[0].pos + verts[1].pos + verts[2].pos
        sum /= 3
        center = HMeshVertex(sum)
        return center
    }

    /**
     * Get a list of vertices attached to this face
     * 
     * @returns {list} A list of HMeshVertex objects corresponding
     *                 to vertices on this face
     */
    getVertices() {
        if (this.h === null) {
            return [];
        }
        let h = this.h.next;
        let vertices = [this.h.head];
        while (h != this.h) {
            vertices.push(h.head);
            h = h.next;
        }
        return vertices;
    }

    /**
     * Compute the area of this face
     * 
     * @returns {float} The area of this face
     */
    getArea() {
        let area = 0.0;
        let vs = this.getVertices();
        for (let i = 1; i < vs.length-1; i++) {
            let ab = vec3.create();
            let ac = vec3.create();
            vec3.subtract(ab, vs[i].pos, vs[0].pos);
            vec3.subtract(ac, vs[i+1].pos, vs[0].pos);
            let normal = vec3.create();
            vec3.cross(normal, ab, ac);
            area += 0.5*vec3.length(normal);
        }

        return area;
    }

    /**
     * Compute the centroid of the vertices on this face
     * 
     * @returns {glMatrix.vec3} The centroid
     */
    getCentroid() {
        let p = vec3.create();
        let vs = this.getVertices();
        for (let i = 0; i < vs.length; i++) {
            vec3.add(p, p, vs[i].pos);
        }
        vec3.scale(p, p, 1/vs.length);
        return p;
    }

    /**
     * Get the normal of this face, assuming it is flat
     * 
     * @returns {vec3} The normal of this face
     */
    getNormal() {
        let normal = vec3.create();
        let vs = this.getVertices();
        if (vs.length > 2) {
            let ab = vec3.create();
            let ac = vec3.create();
            vec3.subtract(ab, vs[1].pos, vs[0].pos);
            vec3.subtract(ac, vs[2].pos, vs[0].pos);
            vec3.cross(normal, ab, ac);
            vec3.normalize(normal, normal);
        }
        return normal;
    }

    /**
     * Get a list of half-edges involved with this face
     * 
     * @returns {list} A list of HMeshEdge objects corresponding
     *                 to edges at the boundary of this face
     */

     getAdjacentFaces() {
        let edges = this.getEdges()
        let faces = []
        for(let i = 0; i < edges.length; i++){
            faces.push(edges[i].pair.face)
        }
        return faces
    }

}

class HMeshVertex {
    /**
     * Constructor for a half-edge vertex
     * @param {glMatrix.vec3} pos Position of this vertex
     * @param {glMatrix.vec3} color Color of this vertex.
     *                              If unspecified, it defaults to gray
     */
    constructor(pos, color) {
        if (color === undefined) {
            color = [0.5, 0.5, 0.5];
        }
        this.pos = pos; // Position of this vertex (Type vec3)
        this.color = color; // Color of this vertex (Type vec3)
        this.h = null; // Any hedge on this vertex (Type Hedge)
    }

    /**
     * Compute the vertices that are attached to this
     * vertex by an edge
     * 
     * @returns {list} List of HMeshVertex objects corresponding
     *                 to the attached vertices
     */
    getVertexNeighbors() {
        if (this.h === null) {
            return [];
        }
        let h = this.h;
        let vs = [];
        do {
            vs.push(h.head);
            h = h.pair.next;
        }
        while (h != this.h);
        return vs;
    }

    /**
     * Compute the faces of which this vertex is a member
     * 
     * @returns {list} A list of HMeshFace objects corresponding
     *                  to the incident faces
     */
    getAdjacentFaces() {
        if (this.h === null) {
            return [];
        }
        let h = this.h;
        let faces = [];
        do {
            if (!(h.face === null)) {
                faces.push(h.face);
            }
            h = h.pair.next;
        }
        while (h != this.h);
        return faces;
    }

    /**
     * Compute the normal of this vertex as an area-weighted
     * average of the normals of the faces attached to this vertex
     * 
     * @returns {vec3} The estimated normal
     */
    getNormal() {
        let normal = vec3.create();
        let faces = this.getAdjacentFaces();
        for (let i = 0; i < faces.length; i++) {
            let area = faces[i].getArea();
            let n = faces[i].getNormal();
            vec3.scaleAndAdd(normal, normal, n, area);
        }
        vec3.normalize(normal, normal);
        return normal;
    }
}

///////////////////////////////////////////////////
//               HELPER FUNCTIONS                //
///////////////////////////////////////////////////

/**
 * Make two new hedge objects which are linked
 */
function makeHedgePair() {
    const h1 = new HMeshEdge();
    const h2 = new HMeshEdge();
    h1.pair = h2;
    h2.pair = h1;
    return {'h1':h1, 'h2':h2};
}

/**
 * Make the next pointer of h1 h2 and the previous
 * pointer of h2 h1
 * @param {HMeshEdge} h1 first edge 
 * @param {Hedge} h2 next edge
 */
function makeNextPrev(h1, h2) {
    h1.next = h2;
    h2.prev = h1;
}

/**
 * Link two half-edges together
 * @param {HMeshEdge} h1 first edge 
 * @param {Hedge} h2 next edge
 */
function linkEdges(h1, h2) {
    h1.pair = h2;
    h2.pair = h1;
}


///////////////////////////////////////////////////
//               MAIN MESH CLASS                 //
///////////////////////////////////////////////////

class HedgeMesh extends PolyMesh {
    /**
     * @returns {I} A NumTrisx3 Uint32Array of indices into the vertex array
     */
    getTriangleIndices() {
        let NumTris = 0;
        let allvs = [];
        for (let i = 0; i < this.faces.length; i++) {
            let vsi = this.faces[i].getVertices();
            allvs.push(vsi.map(function(v){
                return v.ID;
            }));
            NumTris += vsi.length - 2;
        }
        let I = new Uint32Array(NumTris*3);
        let i = 0;
        let faceIdx = 0;
        //Now copy over the triangle indices
        while (i < NumTris) {
            let verts = allvs[faceIdx]
            for (let t = 0; t < verts.length - 2; t++) {
                I[i*3] = verts[0];
                I[i*3+1] = verts[t+1];
                I[i*3+2] = verts[t+2];
                i++;
            }
            faceIdx++;
        }
        return I;
    }

    /**
     * @returns {I} A NEdgesx2 Uint32Array of indices into the vertex array
     */
    getEdgeIndices() {
        let I = [];
        for (let i = 0; i < this.edges.length; i++) {
            let vs = this.edges[i].getVertices();
            for (let k = 0; k < vs.length; k++) {
                I.push(vs[k].ID);
            }
        }
        return new Uint32Array(I);
    }

    /**
     * Given two vertex objects representing an edge,
     * and a face to the left of that edge, initialize
     * a half edge object and add it to the list of edges
     * 
     * @param {HMeshVertex} v1 First vertex on edge
     * @param {HMeshVertex} v2 Second vertex on edge
     * @param {HMeshFace} face Face to the left of edge
     * 
     * @returns {HMeshEdge} The constructed half edge
     */
    addHalfEdge(v1, v2, face) {
        const hedge = new HMeshEdge();
        hedge.head = v2; // Points to head vertex of edge
        hedge.face = face;
        v1.h = hedge; // Let tail vertex point to this edge
        this.edges.push(hedge);
        return hedge;
    }

    /////////////////////////////////////////////////////////////
    ////                INPUT/OUTPUT METHODS                /////
    /////////////////////////////////////////////////////////////

    /**
     * Load in an OFF file from lines and convert into
     * half edge mesh format. Crucially, this function assumes
     * a consistently oriented mesh with vertices specified 
     * in CCW order
     */
    loadFileFromLines(lines) {
        // Step 1: Consistently orient faces using
        // the basic mesh structure and copy over the result
        const origMesh = new BasicMesh();
        origMesh.loadFileFromLines(lines);
        origMesh.consistentlyOrientFaces();
        origMesh.subtractCentroid();
        const res = {'vertices':[], 'colors':[], 'faces':[]};
        for (let i = 0; i < origMesh.vertices.length; i++) {
            res['vertices'].push(origMesh.vertices[i].pos);
            res['colors'].push(origMesh.vertices[i].color);
        }
        for (let i = 0; i < origMesh.faces.length; i++) {
            // These faces should now be consistently oriented
            const vs = origMesh.faces[i].getVertices();
            res['faces'].push(vs.map(
                function(v) {
                    return v.ID;
                }
            ));
        }

        // Step 1.5: Clear previous mesh
        this.vertices.length = 0;
        this.edges.length = 0;
        this.faces.length = 0;

        // Step 2: Add vertices
        for (let i = 0; i < res['vertices'].length; i++) {
            let V = new HMeshVertex(res['vertices'][i], res['colors'][i]);
            V.ID = this.vertices.length;
            this.vertices.push(V);
        }

        let str2Hedge = {};
        // Step 3: Add faces and halfedges
        for (let i = 0; i < res['faces'].length; i++) {
            const face = new HMeshFace();
            this.faces.push(face);
            let vertsi = [];
            for (let k = 0; k < res['faces'][i].length; k++) {
                vertsi.push(this.vertices[res['faces'][i][k]]);
            }

            // Add halfedges
            for (let k = 0; k < vertsi.length; k++) {
                const v1 = vertsi[k];
                const v2 = vertsi[(k+1)%vertsi.length];
                // Add each half edge
                const hedge = this.addHalfEdge(v1, v2, face);
                // Store half edge in hash table
                let key = v1.ID+"_"+v2.ID;
                str2Hedge[key] = hedge;
                face.h = hedge;
            }

            // Link edges together around face in CCW order
            // assuming each vertex points to the half edge
            // starting at that vertex
            // (which addHalfEdge has just done)
            for (let k = 0; k < vertsi.length; k++) {
                vertsi[k].h.next = vertsi[(k+1)%vertsi.length].h;
                vertsi[(k+1)%vertsi.length].h.prev = vertsi[k].h;
            }
        }

        // Step 4: Add links between opposite half edges if 
        // they exist.  Otherwise, it is a boundary edge, so
        // add a half edge with a null face on the other side
        let boundaryEdges = {}; // Index boundary edges by their tail
        for (const key in str2Hedge) {
            const v1v2 = key.split("_");
            let h1 = str2Hedge[key];
            const other = v1v2[1]+"_"+v1v2[0];
            if (other in str2Hedge) {
                h1.pair = str2Hedge[other];
            }
            else {
                let h2 = new HMeshEdge();
                h1.pair = h2;
                h2.pair = h1;
                h2.head = this.vertices[v1v2[0]];
                boundaryEdges[v1v2[1]] = h2;
                this.edges.push(h2);
            }
        }

        // Step 5: Link boundary edges
        for (let key in boundaryEdges) {
            let e = boundaryEdges[key];
            if (e.next === null) {
                let e2 = boundaryEdges[e.head.ID];
                e.next = e2;
                e2.prev = e;
            }
        }

        // Step 6: Number faces and edges to help with quick removal
        for (let i = 0; i < this.edges.length; i++) {
            this.edges[i].ID = i;
        }
        for (let i = 0; i < this.faces.length; i++) {
            this.faces[i].ID = i;
        }

        console.log("Initialized half edge mesh with " + 
                    this.vertices.length + " vertices, " + 
                    this.edges.length + " half edges, " + 
                    this.faces.length + " faces");

        this.needsDisplayUpdate = true;
    }



    subdivideTriangles() {
        let mesh = new HedgeMesh();
        // Step 1: For each original vertex, create a new vertex
        // that's a clone of it
        for (let i = 0; i < this.vertices.length; i++) {
            this.vertices[i].ID = i;
            let v = new HMeshVertex(this.vertices[i].pos);
            mesh.vertices.push(v);
        }
        // Step 2: For each half-edge pair, create a subdivided vertex
        for (let i = 0; i < this.edges.length; i++) {
            if (!('newV' in this.edges[i])) {
                let p1 = this.edges[i].head.pos;
                let p2 = this.edges[i].pair.head.pos;
                let p = glMatrix.vec3.create();
                glMatrix.vec3.scale(p, p1, 0.5);
                glMatrix.vec3.scaleAndAdd(p, p, p2, 0.5);
                let v = new HMeshVertex(p);
                v.eOrig = this.edges[i];
                this.edges[i].newV = v;
                this.edges[i].pair.newV = v;
                mesh.vertices.push(v);
            }
        }
        // Step 3: For each face, create subdivided edges
        // and faces.  Link the faces and next/prev pointers
        // of the edges, and store the new
        // edges in the original edges to be paired later
        for (let i = 0; i < this.faces.length; i++) {
            // Gather original edges, assuming triangle mesh
            let face = this.faces[i];
            let hs = [face.h, face.h.next, face.h.next.next];
            // Original vertex copies
            let vs = [hs[2].head, hs[0].head, hs[1].head];
            for (let k = 0; k < 3; k++) {
                vs[k] = mesh.vertices[vs[k].ID];
            }
            // Subdivided vertices
            let us = [hs[0].newV, hs[1].newV, hs[2].newV];
            // Create subdivided half-edges
            for (let k = 0; k < 3; k++) {
                let h1 = new HMeshEdge();
                let h2 = new HMeshEdge();
                h1.head = us[k];
                h2.head = vs[(k+1)%3];
                makeNextPrev(h1, h2);
                mesh.edges.push(h1);
                mesh.edges.push(h2);
                hs[k].newhs = [h1, h2];
                vs[k].h = h1;
                us[k].h = h2;
            }
            // Create internal triangle face
            let fint = new HMeshFace();
            mesh.faces.push(fint);
            // Create new internal half-edge pairs
            let gs = [];
            for (let k = 0; k < 3; k++) {
                let gk0 = new HMeshEdge();
                let gk1 = new HMeshEdge();
                gk0.face = fint;
                fint.h = gk0;
                gk0.head = us[(k+1)%3];
                gk1.head = us[k];
                mesh.edges.push(gk0);
                mesh.edges.push(gk1);
                linkEdges(gk0, gk1);
                gs.push([gk0, gk1]);
            }
            // Link prev/next of internal triangle face
            for (let k = 0; k < 3; k++) {
                makeNextPrev(gs[k][0], gs[(k+1)%3][0]);
            }
            // Create 3 outer faces and link their edges
            function linkNextPrevTriEdges(es, f) {
                f.h = es[0];
                for (let k = 0; k < 3; k++) {
                    makeNextPrev(es[k], es[(k+1)%3]);
                    es[k].face = f;
                }
            }
            // Top triangle face
            let f1 = new HMeshFace();
            mesh.faces.push(f1);
            linkNextPrevTriEdges([hs[0].newhs[0], gs[2][1], hs[2].newhs[1]], f1);
            // Left triangle face
            let f2 = new HMeshFace();
            mesh.faces.push(f2);
            linkNextPrevTriEdges([hs[0].newhs[1], hs[1].newhs[0], gs[0][1]], f2);
            // Right triangle face
            let f3 = new HMeshFace();
            mesh.faces.push(f3);
            linkNextPrevTriEdges([hs[1].newhs[1], hs[2].newhs[0], gs[1][1]], f3);
        }
        // Step 4: Link new hedges in neighboring faces
        for (let i = 0; i < this.edges.length; i++) {
            let hs1 = this.edges[i].newhs;
            let hs2 = this.edges[i].pair.newhs;
            linkEdges(hs1[0], hs2[1]);
            linkEdges(hs1[1], hs2[0]);
        }
        mesh.needsDisplayUpdate = true;
        return mesh;
    }

    /** 
     * Perform Loop subdivision on the mesh
     */
    doLoopSubdivision() {
        let mesh = this.subdivideTriangles();
        // Step 2: Compute new positions of vertices
        let posNew = [];
        for (let i = 0; i < mesh.vertices.length; i++) {
            let p = vec3.create();
            let v = mesh.vertices[i];
            if (i < this.vertices.length) {
                let vs = this.vertices[i].getVertexNeighbors();
                let beta = 3/16;
                if (vs.length > 3) {
                    beta = 3/(8*vs.length);
                }
                for (let k = 0; k < vs.length; k++) {
                    vec3.scaleAndAdd(p, p, vs[k].pos, beta);
                }
                vec3.scaleAndAdd(p, p, v.pos, 1-vs.length*beta);
            }
            else {
                // Go back to edges in the original mesh 
                // to find neighbors
                let e = v.eOrig;
                vec3.scaleAndAdd(p, p, e.head.pos, 3/8);
                vec3.scaleAndAdd(p, p, e.pair.head.pos, 3/8);
                vec3.scaleAndAdd(p, p, e.next.head.pos, 1/8);
                vec3.scaleAndAdd(p, p, e.pair.next.head.pos, 1/8);
            }
            posNew.push(p);
        }
        // Step 3: Copy over new positions
        for (let i = 0; i < mesh.vertices.length; i++) {
            mesh.vertices[i].pos = posNew[i];
        }
        return mesh;
    }

    /**
     * Compute an undirected dual graph of the mesh
     * @returns {'nodes': List of node objects, 'edges':List of edge objects}
     */
    getDualGraph(){
        let nodes = [];
        for (let i = 0; i < this.faces.length; i++){
            let current = this.faces[i];
            let center = current.getCentroid();
            let nodei = new Node(i,center);
            this.faces[i].centroid = nodei;
            nodes.push(nodei);
        }
        let edgeSet = new Set();
        let edges = [];

        for (let i = 0; i < this.faces.length; i++){
            let nodei = this.faces[i].centroid;
            let attached = this.faces[i].getAdjacentFaces();
            for(let k = 0; k < attached.length; k++) {
                let nodej = attached[k].centroid;
                let j = nodej.index;
                const s = Math.min(i, j) + "_" + Math.max(i, j);
                if (!edgeSet.has(s)) {
                    edgeSet.add(s);
                    nodei.neighbors.push(nodej);
                    nodej.neighbors.push(nodei);
                    const edge = new Edge(nodei, nodej);
                    edges.push(edge);
                }
            }
        }
        return {"nodes":nodes, "edges":edges};
    }

    /**
     * Perform a maximum matching on the dual graph
     */
    getDualMatching() {
        let res = this.getDualGraph();
        let edges = new Array();
        for (let e of res.edges) {
            edges.push(e.p1.index);
            edges.push(e.p2.index);
        }

        const matching = Module["blossom"](edges);
        try {
            assert(matching.size() % 2 == 0, "Matching has an incomplete edge");
            edges.length = 0;
            for (let i = 0; i < matching.size(); i += 2) {
                const v = matching.get(i);
                const w = matching.get(i + 1);
                edges.push(new Edge(res.nodes[v], res.nodes[w]));
            }

        }
        finally {
            matching.delete();
        }

        return {"nodes": res.nodes, "edges": edges};
    }

    getHamiltonianCycle() {
        let res = this.getDualGraph();
        let edges = new Array();
        for (let e of res.edges) {
            edges.push(e.p1.index);
            edges.push(e.p2.index);
        }

        const cycle = Module["hamiltonianCycle"](edges);
        try {
            assert(cycle.size() % 2 == 0, "Cycle has an incomplete edge");
            edges.length = 0;
            for (let i = 0; i < cycle.size(); i += 2) {
                const v = cycle.get(i);
                const w = cycle.get(i + 1);
                edges.push(new Edge(res.nodes[v], res.nodes[w]));
            }

        }
        finally {
            cycle.delete();
        }

        return {"nodes": res.nodes, "edges": edges};
    }

}

class Node {
    constructor(index, center) {
        this.index = index
        this.center = center
        this.neighbors = []
    }
}

class Edge {
    constructor(p1, p2){
        this.p1 = p1
        this.p2 = p2
    }
}
