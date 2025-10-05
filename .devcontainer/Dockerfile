FROM mcr.microsoft.com/devcontainers/javascript-node:latest

RUN apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends \
    # Base deps
    git-crypt \
    # For converting audio assets
    ffmpeg \
    # For binaryen
    cmake \
    # cleanup
    && rm -rf /var/lib/apt/lists/*


# Binaryen gets us wasm-opt, which lets us asyncify our WASM code
RUN git clone \
    --depth=1 \
    --branch version_123 \
    https://github.com/WebAssembly/binaryen.git \
    /tmp/binaryen \
    && cd /tmp/binaryen \
    && git submodule init \
    && git submodule update \
    && cmake -DBUILD_TESTS=OFF . && make -j8 \
    && make install \
    && rm -rf /tmp/binaryen


ENV HOME=/home/node
USER node

RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Doesn't work because the devcontainer.json feature overrides this
COPY zshrc $HOME/.zshrc