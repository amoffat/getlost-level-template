FROM mcr.microsoft.com/devcontainers/javascript-node:4.0.8-24-trixie

RUN apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends \
    # Base deps
    git-crypt \
    # For converting audio assets
    ffmpeg \
    ripgrep \
    # cleanup
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable pnpm


ENV HOME=/home/node
USER node

RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Doesn't work because the devcontainer.json feature overrides this
COPY zshrc $HOME/.zshrc