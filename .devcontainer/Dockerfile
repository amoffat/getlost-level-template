FROM mcr.microsoft.com/devcontainers/javascript-node:latest

RUN apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends \
    # Base deps
    git-crypt \
    # Tiled deps
    qtbase5-dev \
    libqt5svg5-dev \
    qttools5-dev-tools \
    zlib1g-dev \
    qtdeclarative5-dev \
    qbs \
    # For converting audio assets
    ffmpeg \
    # For binaryen
    cmake \
    # Python deps
    python3-pip \
    python3-venv \
    # cleanup
    && rm -rf /var/lib/apt/lists/*

# Build Tiled from source
RUN git clone \
    --depth=1 \
    https://github.com/mapeditor/tiled.git \
    --branch v1.11.2 \
    /tmp/tiled

RUN cd /tmp/tiled \
    && qbs setup-toolchains --detect \
    && qbs build config:release \
    && cp -a /tmp/tiled/release/install-root/usr / \
    && rm -rf /tmp/tiled

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
COPY fluxbox-menu.txt $HOME/.fluxbox/menu
COPY fluxbox-startup.sh $HOME/.fluxbox/startup
COPY fluxbox-apps.txt $HOME/.fluxbox/apps

USER node
ENV VIRTUAL_ENV=$HOME/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

RUN python3 -m venv $VIRTUAL_ENV

RUN pip3 install poetry==2.1.2 \
    && poetry --version \
    && poetry config virtualenvs.create false

# Install twinejs and apply our autosaving patch
RUN git clone \
    --depth=1 \
    --branch 2.10.0 \
    https://github.com/klembot/twinejs.git \
    $HOME/twinejs
COPY patches/autosave.patch /home/node/twinejs/
RUN cd $HOME/twinejs \
    && git apply autosave.patch
