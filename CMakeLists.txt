cmake_minimum_required(VERSION 3.10)
project(blossom LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

add_executable(blossom
    wasm/blossom.cpp
    wasm/graph.h
    wasm/forest.h   
)

if(MSVC)
    target_compile_options(blossom PRIVATE /W4 /WX)
else()
    target_compile_options(blossom PRIVATE -Wall -Wextra -Wpedantic -Werror)
endif()

set(CMAKE_INTERPROCEDURAL_OPTIMIZATION $<CONFIG:RELEASE>)

if($<CONFIG:DEBUG>)
    set(SPECIAL_LINK_FLAGS "-s SAFE_HEAP=1 -s STACK_OVERFLOW_CHECK=2")
else()
    set(SPECIAL_LINK_FLAGS "-s ASSERTIONS=0")
endif()

set_target_properties(blossom PROPERTIES LINK_FLAGS "${COMPILE_FLAGS} -s ALLOW_MEMORY_GROWTH=1 -s STRICT=1 ${SPECIAL_LINK_FLAGS} --bind")

