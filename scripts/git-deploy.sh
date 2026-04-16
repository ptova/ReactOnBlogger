#!/bin/bash

git add dist -f
if [ $? -ne 0 ]; then
    echo "Error: Failed to add dist directory"
    exit 1
fi

git commit --amend --no-edit dist
if [ $? -ne 0 ]; then
    echo "Error: Failed to amend commit"
    exit 1
fi

GIT_SSH_COMMAND="ssh -i ~/.ssh/deploy_key -o IdentitiesOnly=yes" git push --progress --porcelain deploy refs/heads/svil:svil --force-with-lease
if [ $? -ne 0 ]; then
    echo "Error: Failed to push to deploy remote"
    exit 1
fi
