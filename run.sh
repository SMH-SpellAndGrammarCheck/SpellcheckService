#!/usr/bin/env bash

sudo docker stop maild
sudo docker rm maild

sudo docker run -d -it \
    --name=spellcheck \
    -e QUEUE_NAME="${QUEUE_NAME}" \
    -e CONNECTION_STRING="${CONNECTION_STRING}" \
    spellcheck
