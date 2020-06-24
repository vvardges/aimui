# AimDE - Aim Development Environment

![GitHub Top Language](https://img.shields.io/github/languages/top/aimhubio/aimde)
[![Image pulls](https://img.shields.io/docker/pulls/aimhubio/aim-board)](https://hub.docker.com/r/aimhubio/aim-board)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

Development Environment for AI Engineers.

See the documentation [here](https://docs.aimstack.io).

## Getting Started

These instructions will get you a copy of the project up and running on your 
local machine for development and testing purposes.

### Requirements

 - docker >= 18.06.1
 - GNU Make

To start development run:

```bash
make [repo={full-aim-repo-path}] dev
```

AimDE should be accessible at `http://aim-dev.loc:43800/`

You can do IP-host mapping by adding the following line to the end of  `/etc/hosts` file:

```
127.0.0.1    aim-dev.loc
```

### Project Structure

```
├── client  <--------------  front end code
├── server  <--------------  back end code
├── examples  <------------  aim repo and examples for testing
└── ops  <-----------------  build files and configurations
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our 
code of conduct, and the process for submitting pull requests to us.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available,
see the [tags on this repository](https://github.com/aimhubio/aim/tags).

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
