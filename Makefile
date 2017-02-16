#!/usr/bin/env bash

start:
	npm run start

stop:
	echo "will stop dev app"
	pkill comentarismo-reco | true

status:
	ps -ef |grep comentarismo-reco

log:
	tail -f ./nohup.out

.PHONY: all
