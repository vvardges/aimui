# Aim

![GitHub Top Language](https://img.shields.io/github/languages/top/aimhubio/aimde)
[![Image pulls](https://img.shields.io/docker/pulls/aimhubio/aim-board)](https://hub.docker.com/r/aimhubio/aim-board)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

**A super-easy way to record, search and compare AI experiments.**

This project hosts the Aim UI code. Please file issues at [Aim](https://github.com/aimhubio/aim) primary repo.

> Check out a [LIVE DEMO](http://demo-1.aimstack.io:43900/dashboard) and a quick [VIDEO](https://www.youtube.com/watch?v=TeAkyRIMxx4&ab_channel=Aim) on what you can achieve with Aim.

<img src="https://user-images.githubusercontent.com/13848158/92605507-ddfacd80-f2c2-11ea-8547-0659ee2dcb37.png">

## Getting started in three steps
1. Install Aim in your training environment and init in the project folder
```shell
$ pip3 install aim-cli
```
2. Import Aim in your training code
```py
import aim
...
aim.set_params(hyperparam_dict, name='params_name')
aim.track(metric_value, name='metric_name', epoch=the_epoch_value)
...
```
3. Run the training like you are used to and start the AI Dev Environment
```shell
$ aim up
```

## Docs
See the [docs at Aim](https://github.com/aimhubio/aim#contents).
