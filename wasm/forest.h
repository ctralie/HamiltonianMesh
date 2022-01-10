#ifndef FOREST_H
#define FOREST_H

#include <iterator>
#include <unordered_map>
#include <vector>

template<typename T>
class forest
{
    std::vector<std::size_t> parents;
    std::unordered_map<T, std::size_t> lookup;
    std::unordered_map<std::size_t, T> reverseLookup;

    std::size_t rootInternal(std::size_t node) const
    {
        while (parents[node] != node)
        {
            node = parents[node];
        }

        return node;
    }

    std::size_t internalOrCreate(const T& start)
    {
        if (auto nodePtr = lookup.find(start); nodePtr != lookup.end())
        {
            return nodePtr->second;
        }

        std::size_t nextNode = parents.size();
        parents.push_back(nextNode);
        lookup.emplace(start, nextNode);
        reverseLookup.emplace(nextNode, start);
        return nextNode;
    }

    public:
        forest(): parents(), lookup(), reverseLookup() {}

        // concepts not in libc++ 12.0 (what emscripten uses), uncomment in 13.0
        template<typename It> //requires std::incrementable<It>
        forest(It begin, It end): parents(), lookup(), reverseLookup()
        {
            std::size_t index = 0;
            for (It i = begin; i != end; ++i, ++index)
            {
                parents.push_back(index);
                lookup.emplace(*i, index);
                reverseLookup.emplace(index, *i);
            }
        }

        const T& root(const T& start) const
        {
            return reverseLookup.at(rootInternal(lookup.at(start)));
        }

        std::size_t distance(const T& start) const
        {
            std::size_t dist = 0;
            std::size_t node = lookup.at(start);
            while (parents[node] != node)
            {
                node = parents[node];
                ++dist;
            }

            return dist;
        }

        std::vector<T> path(const T& start) const
        {
            std::vector<T> ret{start};
            std::size_t node = lookup.at(start);
            while (parents[node] != node)
            {
                node = parents[node];
                ret.push_back(reverseLookup.at(node));
            }

            return ret;
        }

        bool has(const T& v) const
        {
            return lookup.contains(v);
        }

        bool same_tree(const T& v1, const T& v2) const
        {
            return root(v1) == root(v2);
        }

        void add_node(const T& node)
        {
            if (!lookup.contains(node))
            {
                std::size_t nextNode = parents.size();
                parents.push_back(nextNode);
                lookup.emplace(node, nextNode);
                reverseLookup.emplace(nextNode, node);
            }
        }

        void set_edge(const T& parent, const T& child)
        {
            std::size_t r1 = internalOrCreate(parent);
            std::size_t r2 = internalOrCreate(child);
            if (r1 != r2)
            {
                parents[r2] = r1;
            }
        }
};

#endif
