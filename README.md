# AimDE - Aim Development Environment

![GitHub Top Language](https://img.shields.io/github/languages/top/aimhubio/aimde)
[![Image pulls](https://img.shields.io/docker/pulls/aimhubio/aim-board)](https://hub.docker.com/r/aimhubio/aim-board)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

A super-easy way to search and compare recorded AI experiments.

<img src="https://user-images.githubusercontent.com/3179216/86801320-eea18400-c084-11ea-8480-87ee60ae95cd.png">

## Getting started in three steps
1. Install Aim in your training environment
```shell
pip3 install aim-cli
```
2. Import Aim in your training code
```py
import aim
aim.init() # initialize aim recorder
...
aim.track(metric_value, name='my-meaningful-metric-name', epoch=the_epoch)
aim.track(hyperparam_dict, namespace='hyperparams-name-that-makes-sense')
```
3. Run the training and start the AI Dev Environment
```shell
aim up
```

## Docs
See the [docs at Aim](https://github.com/aimhubio/aim#contents).

## Sneak Peak on AimDE
Demo AimDE: [http://demo-1.aimstack.io/](http://demo-1.aimstack.io/)

#### The search and compare panel
![AimDE Panel](https://user-images.githubusercontent.com/3179216/87037877-fe90a380-c1fd-11ea-9242-05ea1798a176.gif)

#### All experiments at hand
![AimDE Experiments](https://user-images.githubusercontent.com/3179216/87040316-95129400-c201-11ea-97e5-519ac6ffba94.gif)

#### Easily start new experiments
![AimDE Processes](https://user-images.githubusercontent.com/3179216/87042902-57176f00-c205-11ea-830e-e69168b9d269.gif)

#### Tag the experiments / training runs for better search
![AimDE Tags](https://user-images.githubusercontent.com/3179216/87041412-3fd78200-c203-11ea-8cca-27a26752df99.gif)
