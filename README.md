# Aim

![GitHub Top Language](https://img.shields.io/github/languages/top/aimhubio/aimde)
[![Image pulls](https://img.shields.io/docker/pulls/aimhubio/aim-board)](https://hub.docker.com/r/aimhubio/aim-board)
[![License](https://img.shields.io/badge/License-Apache%202.0-orange.svg)](https://opensource.org/licenses/Apache-2.0)

**A super-easy way to record, search and compare AI experiments.**

This project hosts the Aim UI code. Please file issues at [Aim](https://github.com/aimhubio/aim) primary repo.

> Check out a [LIVE DEMO](http://demo-1.aimstack.io:43900/explore?search=eyJjaGFydCI6eyJzZXR0aW5ncyI6eyJwZXJzaXN0ZW50Ijp7InlTY2FsZSI6MCwiem9vbU1vZGUiOmZhbHNlLCJ6b29tSGlzdG9yeSI6W10sInBlcnNpc3RlbnQiOnsieVNjYWxlIjowLCJ6b29tTW9kZSI6ZmFsc2UsInpvb21IaXN0b3J5IjpbXSwicGVyc2lzdGVudCI6eyJ5U2NhbGUiOjAsInpvb21Nb2RlIjpmYWxzZSwiem9vbUhpc3RvcnkiOltdLCJwZXJzaXN0ZW50Ijp7ImRpc3BsYXlPdXRsaWVycyI6ZmFsc2UsInpvb20iOm51bGwsImludGVycG9sYXRlIjpmYWxzZX0sImRpc3BsYXlPdXRsaWVycyI6ZmFsc2UsImludGVycG9sYXRlIjp0cnVlLCJ6b29tIjp7IjAiOnsieCI6WzIuNjg1MTczMTQ4MTA1MzM4NSwzOF0sInkiOlszLjQ1NDEwMDA0ODU0MjAyMywzLjY4MjMzOTM5NzAxNzAyOF19LCIxIjp7IngiOlsyLjUzNzIwNjUxMzA3NzU1NywzOF0sInkiOlsyNy42NzE5Nzg3NjM2MTk2ODQsMzIuNTgxOTk5Nzc4NzQ3NTZdfSwiMiI6eyJ4IjpbNi4xMzAwNzcxODU4MDYzMzIsMjddLCJ5IjpbMy40MzIxNTAwNTM5Nzc5NjYsMy42NDc3MDkzNTA2NzM4NjZdfSwiMyI6eyJ4IjpbMy40OTA5MDg3NzA3OTQyNDE0LDI3XSwieSI6WzI5LjE0MjQ0OTMzOTY5ODA4MiwzMy43NzI5OTk5NTQyMjM2MzZdfSwiNCI6eyJ4IjpbNC42OTMxNjM4MzkzNzM3MDgsMjhdLCJ5IjpbMjkuNDA5MjQ3MjgyOTAwMjY0LDMyLjEwMzk5OTcxMDA4MzAxXX0sIjUiOnsieCI6WzYuOTQxMTk3MDgwOTUyMjg1LDI3LjA0MTk0NTU0NjY2ODI2XSwieSI6WzMuNDgxNjAwMDgxOTIwNjI0LDMuNTgyNzgzODQ4MDA3ODUzOF19fX0sInpvb20iOm51bGx9LCJ6b29tIjpudWxsfX0sImZvY3VzZWQiOnsiY2lyY2xlIjp7ImFjdGl2ZSI6ZmFsc2UsInJ1bkhhc2giOm51bGwsIm1ldHJpY05hbWUiOm51bGwsInRyYWNlQ29udGV4dCI6bnVsbCwic3RlcCI6bnVsbH19fSwic2VhcmNoIjp7InF1ZXJ5IjoiYmxldSBpZiBjb250ZXh0LnN1YnNldCA9PSB0ZXN0IGFuZCBocGFyYW1zLmxlYXJuaW5nX3JhdGUgPiAwLjAwMDAxIiwidiI6MX0sImNvbnRleHRGaWx0ZXIiOnsiZ3JvdXBCeVN0eWxlIjpbXSwiZ3JvdXBCeUNvbG9yIjpbInBhcmFtcy5ocGFyYW1zLmFsaWduIiwicGFyYW1zLmhwYXJhbXMubWF4X2siLCJwYXJhbXMuZGF0YXNldC5wcmVwcm9jIl0sImFnZ3JlZ2F0ZWQiOnRydWUsImdyb3VwQnlDaGFydCI6WyJwYXJhbXMuaHBhcmFtcy5tYXhfayIsInBhcmFtcy5ocGFyYW1zLmFsaWduIl19fQ==) and a quick [VIDEO](https://www.youtube.com/watch?v=TeAkyRIMxx4&ab_channel=Aim) on what you can achieve with Aim.

<img src="https://user-images.githubusercontent.com/13848158/95088468-0fd14980-0734-11eb-8137-698afa2f3a5d.png">

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
