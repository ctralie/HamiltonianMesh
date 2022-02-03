#include "graph.h"
#include "forest.h"

#include <algorithm>
#include <cassert>
#include <cstdint>
#include <deque>
#include <iostream>
#include <iterator>
#include <limits>
#include <optional>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

#ifdef __EMSCRIPTEN__

#include <emscripten/bind.h>
#include <emscripten/val.h>

int main()
{
    return 0;
}

#endif

using node_t = std::uint32_t;
using graph_t = graph<node_t>;
using forest_t = forest<node_t>;

graph_t contracted(const graph_t& graph, const graph_t& blossom, node_t contractNode)
{
    graph_t ret = graph;
    auto nodesPair = blossom.nodes();
    std::unordered_set<node_t> needConnection;
    for (auto i = nodesPair.first; i != nodesPair.second; ++i)
    {
        node_t v2 = *i;
        for (const auto& otherV : ret.edges_of_node(v2))
        {
            if (!blossom.has_node(otherV))
            {
                needConnection.insert(otherV);
            }
        }

        ret.remove_node(v2);
    }

    for (const auto& otherV : needConnection)
    {
        ret.add_edge(contractNode, otherV);
    }

    return ret;
}

std::vector<node_t> findAlternatingPath(const graph_t& matching, const graph_t& blossom, const std::vector<std::pair<node_t, node_t>>& pathEnds)
{
    std::optional<node_t> v = std::nullopt;
    std::optional<node_t> w = std::nullopt;
    if (pathEnds.size() == 1)
    {
        w.emplace(pathEnds[0].second);
        auto nodePair = blossom.nodes();
        for (auto i = nodePair.first; i != nodePair.second; ++i)
        {
            if (!matching.has_node(*i))
            {
                v.emplace(*i);
            }
        }
    }
    else
    {
        bool firstIsV = true;
        for (const auto& n : matching.edges_of_node(pathEnds[0].second))
        {
            if (n != pathEnds[0].first)
            {
                firstIsV = false;
                break;
            }
        }

        if (firstIsV)
        {
            v.emplace(pathEnds[0].second);
            w.emplace(pathEnds[1].second);
        }
        else
        {
            v.emplace(pathEnds[1].second);
            w.emplace(pathEnds[0].second);
        }
    }

    assert(v && w);
    std::deque<std::vector<node_t>> queue;
    queue.push_back({v.value()});
    while (!queue.empty())
    {
        auto entry = queue.front();
        queue.pop_front();
        if (entry.back() == w.value() && (entry.size() - 1) % 2 == 0)
        {
            return entry;
        }
        else if (entry.back() != w.value())
        {
            for (const auto& v2 : blossom.edges_of_node(entry.back()))
            {
                if (std::find(entry.cbegin(), entry.cend(), v2) == entry.end())
                {
                    auto newEntry = entry;
                    newEntry.push_back(v2);
                    queue.push_back(newEntry);
                }
            }
        }
    }

    assert(false);
    return std::vector<node_t>{};
}

void liftPath(const graph_t& graph, const graph_t& matching, const graph_t& blossom, graph_t& path, node_t contractNode)
{   
    if (path.has_node(contractNode))
    {
        std::vector<std::pair<node_t, node_t>> pathEnds;
        for (const auto& n : path.edges_of_node(contractNode))
        {
            for (const auto& n2 : graph.edges_of_node(n))
            {
                if (blossom.has_node(n2))
                {
                    path.add_edge(n, n2);
                    pathEnds.push_back({n, n2});
                    break;
                }
            }
        }

        path.remove_node(contractNode);
        auto lifted = findAlternatingPath(matching, blossom, pathEnds);
        for (std::size_t i = 0; i < lifted.size() - 1; ++i)
        {
            path.add_edge(lifted[i], lifted[i + 1]);
        }
    }
}

graph_t augmentingPath(const graph_t& graph, const graph_t& matching)
{
    forest_t trees;
    graph_t unmarkedEdges;
    std::deque<node_t> unmarkedNodes;
    for (const auto& [v1, v2] : graph.edges())
    {
        if (!matching.has_node(v1))
        {
            trees.add_node(v1);
            unmarkedNodes.push_back(v1);
        }

        if (!matching.has_node(v2))
        {
            trees.add_node(v2);
            unmarkedNodes.push_back(v2);
        }

        if (!matching.has_edge(v1, v2))
        {
            unmarkedEdges.add_edge(v1, v2);
        }
    }
   
    while (!unmarkedNodes.empty())
    {
        node_t v = unmarkedNodes.front();
        unmarkedNodes.pop_front();
        if (trees.has(v) && trees.distance(v) % 2 == 0)
        {
            for (const auto& w : unmarkedEdges.edges_of_node(v))
            {
                unmarkedEdges.remove_edge(v, w);
                if (!trees.has(w))
                {
                    auto wEdges = matching.edges_of_node(w);
                    // if w was matched, there must be some node other than v attached
                    assert(!wEdges.empty());
                    node_t matchedNode = *(wEdges.begin());
                    trees.set_edge(v, w);
                    trees.set_edge(w, matchedNode);
                    unmarkedNodes.push_back(matchedNode);
                }
                else if (trees.distance(w) % 2 == 0)
                {
                    if (!trees.same_tree(v, w))
                    {
                        std::vector<node_t> concatPath = trees.path(v);
                        std::reverse(concatPath.begin(), concatPath.end());
                        auto wPath = trees.path(w);
                        concatPath.insert(concatPath.cend(), wPath.cbegin(), wPath.cend());
                        graph_t path;
                        for (std::size_t i = 0; i < concatPath.size() - 1; ++i)
                        {
                            path.add_edge(concatPath[i], concatPath[i + 1]);
                        } 

                        assert(path.num_edges() % 2 == 1);
                        return path;
                    }
                    else
                    {
                        graph_t blossom{{v, w}};
                        auto pathV = trees.path(v);
                        auto pathW = trees.path(w);
                        auto sortedPathV = pathV;
                        std::sort(sortedPathV.begin(), sortedPathV.end());
                        auto sortedPathW = pathW;
                        std::sort(sortedPathW.begin(), sortedPathW.end()); 
                        std::vector<node_t> intersection;
                        std::set_intersection(sortedPathV.cbegin(), sortedPathV.cend(),
                                sortedPathW.cbegin(), sortedPathW.cend(),
                                std::back_inserter(intersection));
                        node_t minCommon = 0;
                        node_t minCommonDist = std::numeric_limits<node_t>::max();
                        for (const auto& n : intersection)
                        {
                            auto dist = trees.distance(n);
                            if (dist < minCommonDist)
                            {
                                minCommon = n;
                                minCommonDist = dist;
                            }
                        }
                        std::unordered_set<node_t> toRemove(intersection.cbegin(), intersection.cend());
                        toRemove.erase(minCommon);
                        for (const auto& n : toRemove)
                        {
                            std::remove(pathV.begin(), pathV.end(), n);
                            std::remove(pathW.begin(), pathW.end(), n);
                        }

                        for (std::size_t i = 0; i < pathV.size() - 1; ++i)
                        {
                            blossom.add_edge(pathV[i], pathV[i + 1]);
                        }

                        for (std::size_t i = 0; i < pathW.size() - 1; ++i)
                        {
                            blossom.add_edge(pathW[i], pathW[i + 1]);
                        }

                        assert(blossom.num_edges() % 2 == 1);
                        node_t contractNode = graph.num_nodes();
                        while (graph.has_node(contractNode) || matching.has_node(contractNode))
                        {
                            ++contractNode;
                        }

                        graph_t contractedGraph = contracted(graph, blossom, contractNode);
                        graph_t contractedMatching = contracted(matching, blossom, contractNode);
                        graph_t path = augmentingPath(contractedGraph, contractedMatching);
                        liftPath(graph, matching, blossom, path, contractNode);
                        assert(!path.has_node(contractNode));
                        return path;
                    }
                }
            }
        }
    }

    return graph_t{};
}

void augmentMatching(graph_t& matching, const graph_t& path)
{
    graph_t matchingWithoutPath = matching;
    matchingWithoutPath.remove_edges_from(path);
    graph_t pathWithoutMatching = path;
    pathWithoutMatching.remove_edges_from(matching);
    matching.clear();
    matching.add_edges_from(matchingWithoutPath);
    matching.add_edges_from(pathWithoutMatching);
}

graph_t doBlossom(const graph_t& edges)
{
    graph_t matching;
    auto path = augmentingPath(edges, matching);
    while (!path.empty())
    {
        augmentMatching(matching, path);
        path = augmentingPath(edges, matching);
    }

    return matching;
}

#ifdef __EMSCRIPTEN__
graph_t inputValuesToGraph(const emscripten::val& edgeData)
{
    auto edgeNums = emscripten::convertJSArrayToNumberVector<node_t>(edgeData);
#else
graph_t inputValuesToGraph(const std::vector<node_t>& edgeNums)
{
#endif
    assert(edgeNums.size() % 2 == 0);
    graph_t edges;
    for (std::size_t i = 0; i < edgeNums.size(); i += 2)
    {
        edges.add_edge(edgeNums[i], edgeNums[i + 1]);
    }

    return edges;
}

std::vector<node_t> graphToOutputValues(const graph_t& matching)
{
    std::vector<node_t> edgeNums;
    for (const auto& [v1, v2] : matching.edges())
    {
        edgeNums.push_back(v1);
        edgeNums.push_back(v2);
    }

    return edgeNums;
}

#ifdef __EMSCRIPTEN__
std::vector<node_t> blossom(const emscripten::val& edgeData)
#else
std::vector<node_t> blossom(const std::vector<node_t>& edgeData)
#endif
{ 
    auto matching = doBlossom(inputValuesToGraph(edgeData));
    return graphToOutputValues(matching);
}

#ifdef __EMSCRIPTEN__
std::pair<std::vector<node_t>, std::vector<node_t>> hamiltonianCycle(const emscripten::val& edgeData)
#else
std::pair<std::vector<node_t>, std::vector<node_t>> hamiltonianCycle(const std::vector<node_t>& edgeData)
#endif
{
    auto dualGraph = inputValuesToGraph(edgeData);
    auto matching = doBlossom(dualGraph);

    dualGraph.remove_edges_from(matching);
    forest_t cycles;
    auto nodesPair = dualGraph.nodes();
    std::unordered_set<node_t> remainingVerts(nodesPair.first, nodesPair.second);
    while (!remainingVerts.empty())
    {
        node_t start = *remainingVerts.begin();
        remainingVerts.erase(start);
        cycles.add_node(start);
        std::deque<node_t> queue;
        queue.push_back(start);
        while (!queue.empty())
        {
            node_t n = queue.front();
            queue.pop_front();
            for (const auto& v : dualGraph.edges_of_node(n))
            {
                cycles.set_edge(start, v);
                if (remainingVerts.erase(v))
                {
                    queue.push_back(v);
                }
            }
        }
    }
   
    std::vector<node_t> subdivisions;
    if (cycles.num_trees() != 1)
    {
        node_t nextNewNode = *std::max_element(nodesPair.first, nodesPair.second) + 1;
        for (const auto& [v1, v2] : matching.edges())
        {
            if (!cycles.same_tree(v1, v2))
            {
                auto neighbors1Set = dualGraph.edges_of_node(v1);
                auto neighbors2Set = dualGraph.edges_of_node(v2);
                std::vector<node_t> neighbors1(neighbors1Set.cbegin(), neighbors1Set.cend());
                std::vector<node_t> neighbors2(neighbors2Set.cbegin(), neighbors2Set.cend());
                assert(neighbors1.size() == 2);
                assert(neighbors2.size() == 2);

                node_t newNode1 = nextNewNode++;
                node_t newNode2 = nextNewNode++;

                cycles.set_edge(v1, cycles.root(v2));
                cycles.set_edge(v1, newNode1);
                cycles.set_edge(v2, newNode2);
                dualGraph.remove_edge(v1, neighbors1[1]);
                dualGraph.remove_edge(v2, neighbors2[1]);
                dualGraph.add_edge(v1, v2);
                dualGraph.add_edge(newNode1, neighbors1[1]);
                dualGraph.add_edge(newNode2, neighbors2[1]);
                dualGraph.add_edge(newNode1, newNode2);

                subdivisions.push_back(v1);
                subdivisions.push_back(newNode1);
                subdivisions.push_back(v2);
                subdivisions.push_back(newNode2);
            } 
        }
    }

    return {graphToOutputValues(dualGraph), subdivisions};
}

#ifdef __EMSCRIPTEN__

using hCycleRetType = std::invoke_result_t<decltype(hamiltonianCycle), const emscripten::val&>;

EMSCRIPTEN_BINDINGS(module)
{
    emscripten::function("blossom", &blossom);
    emscripten::function("hamiltonianCycle", &hamiltonianCycle);
    
    emscripten::value_object<hCycleRetType>("pair<vector<node_t>,vector<node_t>>")
        .field("graph", &hCycleRetType::first)
        .field("subdivisions", &hCycleRetType::second)
    ;
    
    emscripten::register_vector<node_t>("vector<node_t>");
}

#endif

