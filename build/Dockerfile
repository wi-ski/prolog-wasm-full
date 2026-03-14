# Builds SWI-Prolog 10.1.4 for WebAssembly with full JS interop:
#   - addFunction / removeFunction (dynamic foreign predicate registration)
#   - ALLOW_TABLE_GROWTH (growable function table)
#   - ccall, wasmTable, wasmMemory exported
#   - -g2 debug names in WASM binary
#
# Based on: https://github.com/SWI-Prolog/npm-swipl-wasm/blob/master/docker/Dockerfile

ARG EMSDK_VERSION=5.0.2
FROM emscripten/emsdk:$EMSDK_VERSION

RUN apt-get update && apt-get install -y ninja-build rsync jq

# ── Dependencies ──────────────────────────────────────────────────
WORKDIR /wasm

ARG ZLIB_VERSION=1.3.2
ARG PCRE2_NAME=pcre2-10.47

RUN wget --no-verbose -qO- https://zlib.net/zlib-${ZLIB_VERSION}.tar.gz | tar xvz
RUN git clone --branch=${PCRE2_NAME} --depth 1 https://github.com/PCRE2Project/pcre2

WORKDIR /wasm/zlib-${ZLIB_VERSION}
RUN emconfigure ./configure --static --prefix=/wasm
RUN EMCC_CFLAGS=-Wno-deprecated-non-prototype emmake make
RUN emmake make install

WORKDIR /wasm/pcre2/build
RUN emcmake cmake -DCMAKE_INSTALL_PREFIX=/wasm \
    -DPCRE2GREP_SUPPORT_JIT=OFF \
    -G Ninja .. $@
RUN ninja && ninja install

# ── SWI-Prolog source ────────────────────────────────────────────
WORKDIR /
ARG SWIPL_COMMIT=5a2191ba53fc1a4021bf2fe3e311f6657cf55867
RUN git clone --single-branch https://github.com/SWI-Prolog/swipl-devel

WORKDIR /swipl-devel
RUN git checkout $SWIPL_COMMIT
RUN git submodule update --init --depth 1 -j 100 \
    packages/chr packages/clib packages/clpqr packages/http packages/json \
    packages/nlp packages/pcre packages/plunit packages/sgml packages/RDF \
    packages/semweb packages/zlib

# ── Patch: add our runtime exports + ALLOW_TABLE_GROWTH ──────────
# Add addFunction, removeFunction, ccall, wasmTable, wasmMemory to runtime exports
RUN cat src/wasm/runtime_exports.json | jq '. + ["addFunction", "removeFunction", "ccall", "wasmTable", "wasmMemory"]' > /tmp/runtime_exports.json \
    && mv /tmp/runtime_exports.json src/wasm/runtime_exports.json

# Add ALLOW_TABLE_GROWTH to the shared link flags in EmscriptenTargets.cmake
RUN sed -i 's/-s STACK_OVERFLOW_CHECK=1)/-s STACK_OVERFLOW_CHECK=1\n -s ALLOW_TABLE_GROWTH=1)/' cmake/EmscriptenTargets.cmake

# ── Build ─────────────────────────────────────────────────────────
WORKDIR /swipl-devel/build.wasm
RUN mkdir -p /swipl-devel/build.wasm
ENV LDFLAGS="-s STACK_SIZE=1048576"
RUN cmake -DCMAKE_TOOLCHAIN_FILE=/emsdk/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_FIND_ROOT_PATH=/wasm \
    -DUSE_GMP=OFF \
    -DINSTALL_DOCUMENTATION=OFF \
    -DINSTALL_QLF=ON \
    -DINSTALL_PROLOG_SRC=OFF \
    -G Ninja ..
RUN ninja

# ── Output ────────────────────────────────────────────────────────
RUN mkdir -p /output && \
    cp src/swipl-web.js /output/ && \
    cp src/swipl-web.wasm /output/ && \
    cp src/swipl-web.data /output/
