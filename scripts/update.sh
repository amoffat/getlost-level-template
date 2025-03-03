#!/bin/zsh

TEMPLATE_REMOTE_NAME="template"
TEMPLATE_REPO_URL="git@github.com:amoffat/getlost-level-template.git"

# Check if the template remote already exists
if git remote get-url "$TEMPLATE_REMOTE_NAME" &>/dev/null; then
    echo "Remote '$TEMPLATE_REMOTE_NAME' already exists."
else
    echo "Adding remote '$TEMPLATE_REMOTE_NAME'..."
    git remote add "$TEMPLATE_REMOTE_NAME" "$TEMPLATE_REPO_URL"
fi

# Fetch the latest changes from the template repository
echo "Fetching latest updates from template repository..."
git fetch "$TEMPLATE_REMOTE_NAME"

# Get the current branch name
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $CURRENT_BRANCH"

# Attempt a rebase onto the latest template changes
echo "Attempting to rebase $CURRENT_BRANCH onto $TEMPLATE_REMOTE_NAME/main..."

if git rebase "$TEMPLATE_REMOTE_NAME/main"; then
    echo "Rebase successful!"
    echo "Pushing updated branch..."
    git push origin "$CURRENT_BRANCH" --force
    echo "Update complete."
else
    echo "Rebase failed! Resolve conflicts manually or abort the rebase."
    echo "To abort, run: git rebase --abort"
    exit 1
fi
