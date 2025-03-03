FROM mcr.microsoft.com/devcontainers/javascript-node:latest

RUN apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends \
    qtbase5-dev \
    libqt5svg5-dev \
    qttools5-dev-tools \
    zlib1g-dev \
    qtdeclarative5-dev \
    qbs \
    && rm -rf /var/lib/apt/lists/*

# Build Tiled from source
RUN git clone https://github.com/mapeditor/tiled.git /tmp/tiled
RUN cd /tmp/tiled \
    && qbs setup-toolchains --detect \
    && qbs build config:release \
    && cp -a /tmp/tiled/release/install-root/usr / \
    && rm -rf /tmp/tiled

ENV HOME=/home/node
COPY fluxbox-menu.txt $HOME/.fluxbox/menu
COPY fluxbox-startup.sh $HOME/.fluxbox/startup