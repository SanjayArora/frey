# Frey

<!-- badges/ -->
[![Build Status](https://travis-ci.org/kvz/frey.svg?branch=master)](https://travis-ci.org/kvz/frey)
[![Coverage Status](https://coveralls.io/repos/kvz/frey/badge.svg?branch=master&service=github)](https://coveralls.io/github/kvz/frey?branch=master)
[![npm](https://img.shields.io/npm/v/frey.svg)](https://www.npmjs.com/package/frey) 
[![Dependency Status](https://david-dm.org/kvz/frey.png?theme=shields.io)](https://david-dm.org/kvz/frey)
[![Development Dependency Status](https://david-dm.org/kvz/frey/dev-status.png?theme=shields.io)](https://david-dm.org/kvz/frey#info=devDependencies)
<!-- /badges -->

Frey let's you launch web infrastructure with a single command. It uses
Ansible & Hashicorp's Terraform to to the heavy lifting.

![](https://upload.wikimedia.org/wikipedia/commons/3/38/Freyr_by_Johannes_Gehrts.jpg)

## Design goals

 - Frey should be ridiculously convenient, and hence offer auto-installation of requirements for instance

## Comparison

### With Otto

We use nearly all Hashicorp products in production and absolutely love it.
We will be looking to utilize Otto as well. 

However, we also felt the needed a tool that offered more in the way of
provisioning tailor-made setups.

Hashicorp acknowledges that Otto will be able to serve 99% of the
common use-cases. Frey aims to serve the remaining 1%.

When compared to Hashicorp's recently launched Otto, which also 
uses Terraform under the hood, Frey fills a void for people that feel:

 - Feel Otto is too opinionated about configuration for their needs
 - Feel the Customizations Otto offers are too high level for their needs and would like to have more fine grained control
 - Would like to deploy to other cloud vendors besides AWS
 - Don't want to rely solely on disk images / containers to provision their
servers
 - Want a tighter grip on dependencies via version pinning
 - Had hoped on more than bash scripts / Dockerfiles to do actual provisioning, such as the declarative style of Ansible Playbooks
 - Want to reuse existing Terraform or Ansible scripts, but would like some glue between those
 
It's possible that over time, enough of these differences will dissolve so that we can 
dissolve Frey as well.

Frey has some opinionated and magical parts, but less so than Otto.

You can define all of this in a single `Freyfile`. A Freyfile is a project written in [TOML](https://github.com/toml-lang/toml).

Alternatively you can point Frey to your existing
Terraform `.tf` and Ansible `.yml` for creating web infrastructure.

What Frey is not good at:

 - Scaling Microservices
 - Dependencies with other Frey projects. Even though you could launch a heterogeneous cluster with different roles and apps across different cloud vendors - All of this should be defined in one Frey project.

## Install

```bash
npm install --global frey
```

## Run

Frey must be run in the root of the project that you want to set up infra for.
All infra description is supposed to be saved in `./frey/*`, but this can be configured.

There needs to be a `./.git` dir preset relative from your current directory.

Keeping infra projects together with the app is convenient and allows both to move
at the same pace. If you revert to 2 years ago, you can also inspect the matching infra
from that time.

```bash
cd ~/code/myapp
frey
```

### Chains of Commands

Frey works by walking down a chain of commands. You can 'enter' the chain at any step,
and Frey by default will complete the following steps. The commands are as follows


```
prepare   : "Install prerequisites"
refresh   : "Refreshes current infra state and saves to terraform.tfstate"
validate  : "Checks your docs"
plan      : "Shows infra changes and saves in an executable plan"
backup    : "Backs up server state"
launch    : "Launches virtual machines at a provider"
install   : "Runs Ansible to install software packages & configuration templates"
deploy    : "Upload your own application(s)"
restart   : "Restart your own application(s) and its dependencies"
show      : "Displays active platform"
```

For so you'd type `frey deploy`, Frey would deploy your app, restart it, and show
you the status.

#### One-off commands

All commands can be ran with `--bail` if you do not want to run the chain of commands.

There are also a few commands that do not belong to the chain, and are hence auto-bailing 
these are:

```
restore   : "Restore latest state backup"
remote    : "Execute a remote command - or opens console"
facts     : "Show Ansible facts"
```

### Dedicated infra repository

If you think it's better to keep the infra projects outside of your own app code
for security reasons or similar, we recommend that alongside your `app` repo, you create an
`infra-app` repo, where you'll keep Frey's projects in. We recommend you then keep the projects
in the root, and run Frey with `--projectdir .`:

```bash
cd ~/code/infra-myapp
frey --projectdir .
```

### Multiple setups in one repository

Also possible, via:

```bash
cd ~/code/infra-myapp
frey --projectdir ./envs/production
```

## Projects

Frey uses Terraform and Ansible to do the heavy lifting.

## Autocompletion of CLI arguments

### OSX

```bash
frey completion >> ~/.bash_profile 
source ~/.bash_profile 
```

### Linux

```bash
frey completion >> ~/.bashrc
source ~/.bashrc
```

## Limitations

For now, we only support

- Only OSX as workstation
- BASH, if you want to use autocompletion
- Ubuntu as remote server OS
- Git for version control - and Frey assumes your project has Git already set up

Frey is intended to service many use-cases and we'll work on removing some of these limitations as we go.
