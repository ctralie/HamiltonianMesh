graphlib = require("./graphlib.min.js");

class UnionFind {
    constructor(N) {
        this.parents = [...new Array(N).keys()];
    }

    root(start) {
        var node = start;
        while (this.parents[node] != node)
            node = this.parents[node];

        return node
    }

    getPath(start) {
        var node = start;
        var ret = [node];
        while (this.parents[node] != node) {
            node = this.parents[node];
            ret.push(node);
        }

        return ret;
    }

    distance(start) {
        var dist = 0;
        var node = start;
        while (this.parents[node] != node) {
            ++dist;
            node = this.parents[node];
        }

        return dist;
    }

    getSetLabel(toFind) {
        return this.root(toFind);
    }
    
    find(node1, node2) {
        return this.root(node1) == this.root(node2);
    }
    
    union(node1, node2) {
        var root1 = this.root(node1);
        var root2 = this.root(node2);
        if (root1 != root2)
            this.parents[node2] = node1;
    }
}

function bfs(graph, start, end) {
    let visited = new Set();
    let queue = [{node: start, parent: undefined, dist: 0}];
    while (queue.length > 0) {
        let entry = queue.splice(0, 1)[0];
        if (entry.node == end)
            return entry;
        else {
            for (let n of graph.neighbors(entry.node)) {
                if (!visited.has(n)) {
                    visited.add(n)
                    queue.push({node: n, parent: entry, dist: entry.dist + 1});
                }
            }
        }
    }

    return undefined;
}

function differenceEdges(iterable1, iterable2) {
    let ret = [];
    for (let v of iterable1) {
        let found = false;
        for (let u of iterable2) {
            if (v.v == u.v && v.w == u.w) {
                found = true;
                break;
            }
        }

        if (!found)
            ret.push(v);
    }

    return ret;
}

function contractBlossom(graph, blossom) {
    let ret = graphlib.json.read(graphlib.json.write(graph));
    let keptNode = "blossomContractNode";
    for (let n of blossom.nodes())
        keptNode += n;

    ret.setNode(keptNode, "contractNode");
    for (let edge of ret.edges()) {
        let v = edge.v;
        let w = edge.w;
        if (blossom.hasEdge(v, w)) {
            ret.removeEdge(v, w);
            if (keptNode != v)
                ret.removeNode(v);
            if (keptNode != w)
                ret.removeNode(w);
        }
        else if (keptNode != w && blossom.hasNode(v)) {
            ret.removeEdge(v, w);
            if (keptNode != v) {
                ret.removeNode(v);
                ret.setEdge(keptNode, w, "blossomStemEdge");
            }
        }
        else if (keptNode != v && blossom.hasNode(w)) {
            ret.removeEdge(v, w);
            if (keptNode != w) {
                ret.removeNode(w);
                ret.setEdge(v, keptNode, "blossomStemEdge");
            }
        }
    }

    return {
        graph: ret,
        contracted: keptNode
    };
}

function liftPath(graph, path, blossom, contractNode, rootNode) {
    let contractNeighbors = [...path.neighbors(contractNode)];
    let neighbor1 = contractNeighbors[0], neighbor2 = undefined;
    let isEndpoint = contractNeighbors.length == 1;
    if (!isEndpoint)
        neighbor2 = contractNeighbors[1];
        
    for (let node of graph.neighbors(neighbor1)) {
        if (blossom.hasNode(node)) {
            blossomPathNode1 = node;
            break;
        }
    }

    if (!isEndpoint) {
        for (let node of graph.neighbors(neighbor2)) {
            if (blossom.hasNode(node)) {
                blossomPathNode2 = node;
                break;
            }
        }

        path.removeEdge({v: neighbor1, w: contractNode});
        path.removeEdge({v: neighbor2, w: contractNode});
        path.removeNode(contractNode);
        
        let bfsResult = bfs(blossom, blossomPathNode1, blossomPathNode2);
        if (bfsResult.dist % 2 == 0) {
            path.setNode(bfsResult.node, graph.node(bfsResult.node));
            let lastNode = bfsResult.node;
            while (bfsResult.parent != undefined) {
                bfsResult = bfsResult.parent;
                path.setNode(bfsResult.node, graph.node(bfsResult.node));
                path.setEdge(bfsResult.node, lastNode, "liftedBlossomEdge");
                lastNode = bfsResult.node;
            }
        }
        else {
            for (let e of blossom.edges()) {
                if ((e.v != blossomPathNode1 || e.w != blossomPathNode2) && (e.v != blossomPathNode2 || e.w != blossomPathNode1)) {
                    if (!path.hasNode(e.v))
                        path.setNode(e.v, blossom.node(e.v));
                    if (!path.hasNode(e.w))
                        path.setNode(e.w, blossom.node(e.w));
    
                    path.setEdge(e.v, e.w, "liftedBlossomEdge");
                }
            }
        }

        path.setEdge(neighbor1, blossomPathNode1, "liftedBlossomStem");
        path.setEdge(neighbor2, blossomPathNode2, "liftedBlossomStem");
    }
    else {
        path.removeEdge({v: neighbor1, w: contractNode});
        path.removeNode(contractNode);

        for (let e of blossom.edges()) {
            if ((e.v != rootNode || e.w != blossomPathNode1) && (e.v != blossomPathNode1 || e.w != rootNode)) {
                if (!path.hasNode(e.v))
                    path.setNode(e.v, blossom.node(e.v));
                if (!path.hasNode(e.w))
                    path.setNode(e.w, blossom.node(e.w));

                path.setEdge(e.v, e.w, "liftedBlossomEdge");
            }
        }

        path.setEdge(neighbor1, blossomPathNode1, "liftedBlossomStem");
    }
}

function augmentingPath(graph, matching, start = undefined) {
    let unmatched = new Set(graph.nodes());
    for (let n of matching.nodes())
        unmatched.delete(n);

    unmatched = [...unmatched];
    let vertToUnionIndex = {};
    let unionIndexToVert = new Array(graph.nodeCount());

    for (let v of graph.nodes())
        vertToUnionIndex[v] = -1;

    let numValidVerts = unmatched.length;
    for (let index = 0; index < unmatched.length; ++index) {
        let v = unmatched[index];
        vertToUnionIndex[v] = index;
        unionIndexToVert[index] = v;
    }

    let uf = new UnionFind(graph.nodeCount());
    let unmarkedEdges = differenceEdges(graph.edges(), matching.edges());
    if (start)
        unmatched = [start];
    else
        unmatched = unmatched.length > 0 ? [unmatched[0]] : [];

    while (unmatched.length != 0) {
        let node = unmatched[0];
        let id = vertToUnionIndex[node];
        if (id != -1 && uf.distance(id) % 2 == 0) {
            for (let j = 0; j < unmarkedEdges.length; ++j) {
                let edge = unmarkedEdges[j];
                if (edge.v == node || edge.w == node) {
                    let otherNode = edge.v == node ? edge.w : edge.v;
                    let otherId = vertToUnionIndex[otherNode];
                    if (otherId == -1) {
                        for (let otherEdge of matching.edges()) {
                            if (otherEdge.v == otherNode || otherEdge.w == otherNode) {
                                let nextNode = otherEdge.v == otherNode ? otherEdge.w : otherEdge.v;
                                vertToUnionIndex[nextNode] = numValidVerts++;
                                unionIndexToVert[vertToUnionIndex[nextNode]] = nextNode;
                                vertToUnionIndex[otherNode] = numValidVerts++;
                                unionIndexToVert[vertToUnionIndex[otherNode]] = otherNode;
                                otherId = vertToUnionIndex[otherNode];
                                uf.union(id, otherId);
                                uf.union(otherId, vertToUnionIndex[nextNode]);
                                unmatched.push(nextNode);
                                break;
                            }
                        }
                    }
                    else if (uf.distance(otherId) % 2 == 0) {
                        if (!uf.find(id, otherId)) {
                            let concatPath = uf.getPath(id).reverse().concat(uf.getPath(otherId));
                            let matched = new graphlib.Graph({directed: false});
                            for (let i = 0; i < concatPath.length; ++i) {
                                var name = unionIndexToVert[concatPath[i]];
                                matched.setNode(name, "matchedNode" + name);
                                if (i > 0)
                                    matched.setEdge(unionIndexToVert[concatPath[i - 1]], name, "matchingEdge");
                            }

                            return matched;
                        }
                        else {
                            let blossom = new graphlib.Graph({directed: false});
                            let bPath1 = uf.getPath(id);
                            let bPath2 = uf.getPath(otherId);
                            let bSet = new Set(bPath1);
                            let first = true;
                            let toRemove = new Set();
                            for (let i = 0; i < bPath2.length; ++i) {
                                if (bSet.has(bPath2[i])) {
                                    if (first)
                                        first = false;
                                    else
                                        toRemove.add(bPath2[i]);
                                }
                            }
                            
                            let bPath = bPath1.reverse().concat(bPath2);
                            let rootPath = [];
                            for (let i = 0; i < bPath.length; ++i) {
                                if (toRemove.has(bPath[i])) {
                                    let val = bPath.splice(i--, 1)[0];
                                    if (i < bPath.length / 2)
                                        rootPath.push(unionIndexToVert[val]);
                                }
                            }

                            for (let i = 0; i < bPath.length; ++i) {
                                var name = unionIndexToVert[bPath[i]];
                                blossom.setNode(name, "blossomNode" + name);
                                if (i > 0)
                                    blossom.setEdge(unionIndexToVert[bPath[i - 1]], name, "blossomEdge");
                            }

                            let contractedGraph = contractBlossom(graph, blossom);
                            let contractedMatching = contractBlossom(matching, blossom);
                            contractedMatching.graph.removeNode(contractedMatching.contracted);
                            let path = augmentingPath(contractedGraph.graph, contractedMatching.graph, contractedGraph.contracted);
                            if (rootPath.length > 0) {
                                let lastNode = rootPath[0];
                                if (!path.hasNode(lastNode))
                                    path.setNode(lastNode, graph.node(lastNode));

                                for (let i = 1; i < rootPath.length; ++i) {
                                    let n = rootPath[i];
                                    if (!path.hasNode(n))
                                        path.setNode(n, graph.node(n));

                                    path.setEdge(lastNode, n, graph.edge(lastNode, n));
                                    lastNode = n;
                                }

                                path.setEdge(lastNode, contractedGraph.contracted, "rootEdgeToBlossom");
                            }

                            if (path.hasNode(contractedGraph.contracted))
                                liftPath(graph, path, blossom, contractedGraph.contracted, unionIndexToVert[uf.root(vertToUnionIndex[node])]);

                            return path;
                        }
                    }

                    unmarkedEdges.splice(j--, 1);
                }
            }

            unmatched.splice(0, 1);
        }
    }

    return new graphlib.Graph({directed: false});
}

function augmentMatching(matching, path) {
    let ret = graphlib.json.read(graphlib.json.write(matching));
    for (let e of path.edges()) {
        if (ret.hasEdge(e))
            ret.removeEdge(e);
        else
            ret.setEdge(e.v, e.w, "augmentedEdge");
    }

    return ret;
}

function blossom(graph, matching = new graphlib.Graph({directed: false})) {
    path = augmentingPath(graph, matching);
    if (path.nodeCount() != 0)
        return blossom(graph, augmentMatching(matching, path));
    else
        return matching;
}

function makeThing(graph) {
    for (var i = 0; i < 6; ++i)
        graph.setNode(i, "node" + i);

    graph.setEdge("0", "1", "edge0");
    graph.setEdge("0", "2", "edge1");
    graph.setEdge("1", "2", "edge2");
    graph.setEdge("1", "4", "edge3");
    graph.setEdge("2", "3", "edge4");
    graph.setEdge("3", "4", "edge5");
    graph.setEdge("4", "5", "edge6");
}

function makeTrianglesAndSquares(graph) {
    for (var i = 0; i < 12; ++i)
        graph.setNode(i, "node" + i);

    graph.setEdge("0", "1", "edge0");
    graph.setEdge("0", "4", "edge1");
    graph.setEdge("0", "7", "edge2");
    graph.setEdge("0", "8", "edge3");
    graph.setEdge("1", "2", "edge4");
    graph.setEdge("1", "7", "edge5");
    graph.setEdge("1", "10", "edge6");
    graph.setEdge("2", "3", "edge7");
    graph.setEdge("2", "6", "edge8");
    graph.setEdge("2", "11", "edge9");
    graph.setEdge("3", "4", "edge10");
    graph.setEdge("3", "5", "edge11");
    graph.setEdge("3", "6", "edge12");
    graph.setEdge("4", "5", "edge13");
    graph.setEdge("4", "9", "edge14");
    graph.setEdge("8", "9", "edge15");
    graph.setEdge("10", "11", "edge16");
}

function makePentagonAndLine(graph) {
    for (let i = 0; i < 10; ++i)
        graph.setNode(i, "node" + i);

    graph.setEdge("0", "1", "edge0");
    graph.setEdge("0", "8", "edge1");
    graph.setEdge("1", "2", "edge2");
    graph.setEdge("2", "3", "edge3");
    graph.setEdge("3", "4", "edge4");
    graph.setEdge("3", "7", "edge5");
    graph.setEdge("4", "5", "edge6");
    graph.setEdge("5", "6", "edge7");
    graph.setEdge("6", "7", "edge8");
    graph.setEdge("7", "9", "edge9");
}

var graph = new graphlib.Graph({directed: false});
makeTrianglesAndSquares(graph);
console.log(blossom(graph));