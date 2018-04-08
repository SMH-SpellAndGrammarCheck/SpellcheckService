#!/usr/bin/env bash

sudo docker stop spellcheck
sudo docker rm spellcheck

read BING_KEY
read QUEUE
read RECEIVE_QUEUE
read SEND_QUEUE

sudo docker run -d -it \
    --name=spellcheck \
    -e BING_KEY="${BING_KEY}" \
	-e BING_KEY="${QUEUE}" \
    -e RECEIVE_QUEUE="${RECEIVE_QUEUE}" \
    -e SEND_QUEUE="${SEND_QUEUE}" \
    spellcheck
