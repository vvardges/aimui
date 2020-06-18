# AimDE
#### Aim Development Environment

See the docs [here](https://docs.aimhub.io).

## Prerequisites

- docker>=18.06.1
- GNU Make

## Development

Start AimDE development mode by running:

```bash
make [repo={full-aim-repo-path}] dev
```

AimDE should be accessible at http://aim-dev.loc:43800/

### Project Structure

```
├── client  <--------------  front end code
├── server  <--------------  back end code
├── examples  <------------  aim repo and examples for testing
└── ops    <---------------  build files and configurations
```