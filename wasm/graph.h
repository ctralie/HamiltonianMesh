#ifndef GRAPH_H
#define GRAPH_H

#include <algorithm>
#include <functional>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

template<typename T>
class graph
{
    std::unordered_map<T, std::unordered_set<T>> data;
    std::unordered_set<T> nodeSet;

    public:
        using node_iterator = typename decltype(nodeSet)::iterator;
        using const_node_iterator = typename decltype(nodeSet)::const_iterator;

        struct edge
        {
            T v1;
            T v2;

            edge(T n1, T n2): v1(n1), v2(n2) {}

            inline bool operator==(const edge& other) const
            {
                return (v1 == other.v1 && v2 == other.v2) || (v1 == other.v2 && v2 == other.v1);
            }
        };

        struct edge_hash
        {
            std::size_t operator()(const edge& p) const
            {
                // this might be terrible
                std::hash<T> hasher1;
                std::size_t hash1 = hasher1(p.v1) ^ (hasher1(p.v2) << 1);
                std::hash<T> hasher2;
                std::size_t hash2 = hasher2(p.v2) ^ (hasher2(p.v1) << 1);

                return std::min(hash1, hash2);
            }
        };

        // need custom iterator, this won't directly work due to internal structure
        //using iterator = std::pair<T, T>*;
        //using const_iterator = const iterator;

        graph(): data(), nodeSet() {}
        ~graph() noexcept = default;

        graph(const graph<T>& other): data(other.data), nodeSet(other.nodeSet) {}
        graph(graph<T>&& other) noexcept: data(std::move(other.data)), nodeSet(std::move(other.nodeSet)) {}

        graph& operator=(const graph<T>& other)
        {
            if (&other != this)
            {
                data = other.data;
                nodeSet = other.nodeSet;
            }

            return *this;
        }

        graph& operator=(graph<T>&& other) noexcept
        {
            if (&other != this)
            {
                data = std::move(other.data);
                nodeSet = std::move(other.nodeSet);
            }

            return *this;
        }

        bool add_edge(T v1, T v2)
        {
            bool ret = data[v1].insert(v2).second;
            data[v2].insert(v1);
            nodeSet.insert(v1);
            nodeSet.insert(v2);
            return ret;
        }

        std::size_t add_edges_from(const graph<T>& other)
        {
            std::size_t ret = 0;
            for (const auto& e : other.edges())
            {
                ret += add_edge(e.v1, e.v2);
            }

            return ret;
        }

        graph(std::initializer_list<std::pair<T, T>> list): data(), nodeSet()
        {
            for (const auto& [v1, v2] : list)
            {
                add_edge(v1, v2);
            }
        }

        graph& operator=(std::initializer_list<std::pair<T, T>> list)
        {
            data.clear();
            nodeSet.clear();
            for (const auto& [v1, v2] : list)
            {
                add_edge(v1, v2);
            }
        }

        bool remove_edge(T v1, T v2)
        {
            if (auto s1 = data.find(v1); s1 != data.end())
            {
                bool res1 = s1->second.erase(v2);
                if (res1)
                {
                    data[v2].erase(v1);
                    return true;
                }
            }

            return false;
        }

        std::size_t remove_edges_from(const graph<T>& other)
        {
            std::size_t ret = 0;
            for (const auto& e : other.edges())
            {
                ret += remove_edge(e.v1, e.v2);
            }

            return ret;
        }

        void add_node(T v)
        {
            nodeSet.insert(v);
        }

        bool remove_node(T v)
        {
            if (nodeSet.erase(v))
            {
                data.erase(v);
                for (auto& [_, s] : data)
                {
                    s.erase(v);
                }

                return true;
            }
            
            return false;
        }

        bool has_node(T v) const
        {
            return nodeSet.contains(v);
        }

        bool empty() const
        {
            return nodeSet.empty();
        }

        bool edgeless() const
        {
            for (const auto& [_, s] : data)
            {
                if (!s.empty())
                {
                    return false;
                }
            }

            return true;
        }

        bool has_edge(T v1, T v2) const
        {
            auto s = data.find(v1);
            return s != data.end() && s->second.contains(v2);
        }

        std::pair<const_node_iterator, const_node_iterator> nodes() const
        {
            return std::make_pair(nodeSet.cbegin(), nodeSet.cend());
        }

        std::unordered_set<edge, edge_hash> edges() const
        {
            std::unordered_set<edge, edge_hash> ret;
            for (const auto& [k, s] : data)
            {
                for (const auto& v : s)
                {
                    ret.emplace(k, v);
                }
            }

            return ret;
        }

        std::unordered_set<T> edges_of_node(T v) const
        {
            std::unordered_set<T> ret;
            if (const auto& set = data.find(v); set != data.end())
            {
                for (const auto& v2 : set->second)
                {
                    ret.insert(v2);
                }    
            }          

            return ret;
        }

        void clear()
        {
            data.clear();
            nodeSet.clear();
        }

        std::size_t num_nodes() const
        {
            return nodeSet.size();
        }

        std::size_t num_edges() const
        {
            std::size_t ret = 0;
            for (const auto& [_, s] : data)
            {
                ret += s.size();
            }

            // because edges in sets are duplicated
            return ret / 2;
        }
};

template<typename T>
bool operator==(const typename graph<T>::edge& e1, const typename graph<T>::edge& e2)
{
    return (e1.v1 == e2.v1 && e1.v2 == e2.v2) || (e1.v1 == e2.v2 && e1.v2 == e2.v1);
}

#endif
