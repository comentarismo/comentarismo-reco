#!/usr/bin/env bash

start:
	node comentarismoger.js

stop:
	echo "will stop dev app"
	pkill comentarismoger | true

status:
	ps -ef |grep comentarismoger

log:
	tail -f ./nohup.out

ger: ger-k
	nohup hapiger --es rethinkdb --esoptions '{"host":"g7-box","port": 28015,"db":"hapiger"}' &.

ger-s:
	ps -ef |grep hapiger

ger-k:
	lsof -i tcp:3456 | awk 'NR!=1 {print $2}' | xargs kill | true
	sleep 2


.PHONY: all
