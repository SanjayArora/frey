const Step = require('../Step')
const squashArrays = require('../squashArrays')
const utils = require('../Utils')
const json2hcl = require('../json2hcl')
const path = require('path')
const depurar = require('depurar')
const debug = depurar('frey')
const globby = require('globby')
const async = require('async')
const fs = require('fs')
const mkdirp = require('mkdirp')
const _ = require('lodash')
const INI = require('ini')
const YAML = require('js-yaml')
const unflatten = require('flat').unflatten

// const constants = require('../constants')
class Config extends Step {
  constructor (name, runtime) {
    super(name, runtime)
    this.boot = [
      '_findHclFiles',
      '_readHclFiles',
      '_mergeToOneConfig',
      '_applyDefaults',
      '_renderConfig',
      '_writeTerraformFile',
      '_writeAnsibleCfg',
      '_writeAnsiblePlaybooksVars',
      '_writeAnsiblePlaybookInstall',
      '_writeAnsiblePlaybookSetup',
      '_writeAnsiblePlaybookDeploy',
      '_writeAnsiblePlaybookBackup',
      '_writeAnsiblePlaybookRestore',
      '_writeAnsiblePlaybookRestart',
    ]
  }

  _findHclFiles (cargo, cb) {
    const pattern = `${this.runtime.init.cliargs.projectDir}/*.hcl`
    debug(`Reading from '${pattern}'`)
    return globby(pattern).then(hclFiles => {
      return cb(null, hclFiles)
    }).catch(cb)
  }

  _readHclFiles (hclFiles, cb) {
    const hclParsedItems = []
    let mainErr = null

    const q = async.queue(
      (hclFile, next) => {
        fs.readFile(hclFile, 'utf-8', (err, buf) => {
          if (err) {
            mainErr = err
            return next()
          }

          json2hcl(buf, true, (err, parsed) => {
            if (err) {
              mainErr = err
              return next()
            }

            hclParsedItems.push(parsed)

            return next()
          })
        })
      },
      1
    )

    q.drain = () => {
      // debug(hclParsedItems)
      return cb(mainErr, hclParsedItems)
    }

    q.push(hclFiles)
  }

  _mergeToOneConfig (hclParsedItems, cb) {
    let config = {}
    let squashed = {}

    hclParsedItems.forEach(parsedItem => {
      for (let key in parsedItem) {
        if (!_.isArray(parsedItem[key])) {
          parsedItem[key] = [ parsedItem[key] ]
        }
      }
      config = _.merge(config, parsedItem)
    })

    squashed = squashArrays(config)

    let newConfig = {}
    for (let parent in squashed) {
      newConfig[parent] = {}
      for (let key in config[parent]) {
        newConfig[parent] = _.merge(newConfig[parent], config[parent][key])
      }
    }

    debug({newConfig})

    return cb(null, newConfig)
  }

  _applyDefaults (cargo, cb) {
    // Defaults
    let appName = ''

    if (_.has(this.bootCargo._mergeToOneConfig, 'global.appname')) {
      appName = this.bootCargo._mergeToOneConfig.global.appname
    } else if (this.runtime.init.paths.git_dir) {
      appName = path.basename(path.dirname(this.runtime.init.paths.git_dir))
    } else {
      appName = path.basename(this.runtime.init.cliargs.projectDir)
    }

    const defaults = {
      global: {
        terraformcfg       : { parallelism: '{{{init.os.cores}}}' },
        appname            : appName,
        roles_dir          : '{{{init.paths.frey_dir}}}/roles',
        tools_dir          : '{{{init.os.home}}}/.frey/tools',
        infra_state_file   : '{{{init.cliargs.projectDir}}}/Frey-state-terraform.tfstate',
        ansiblecfg_file    : '{{{init.cliargs.projectDir}}}/Frey-residu-ansible.cfg',
        infra_plan_file    : '{{{init.cliargs.projectDir}}}/Frey-residu-terraform.plan',
        infra_file         : '{{{init.cliargs.projectDir}}}/Frey-residu-infra.tf.json',
        install_file       : '{{{init.cliargs.projectDir}}}/Frey-residu-install.yml',
        setup_file         : '{{{init.cliargs.projectDir}}}/Frey-residu-setup.yml',
        deploy_file        : '{{{init.cliargs.projectDir}}}/Frey-residu-deploy.yml',
        restart_file       : '{{{init.cliargs.projectDir}}}/Frey-residu-restart.yml',
        backup_file        : '{{{init.cliargs.projectDir}}}/Frey-residu-backup.yml',
        restore_file       : '{{{init.cliargs.projectDir}}}/Frey-residu-restore.yml',
        playbooks_vars_file: '{{{init.cliargs.projectDir}}}/group_vars/all/Frey-residu-playbooks_vars.yml',
        playbooks_vars     : {
          apt_manage_sources_list              : true,
          apt_src_enable                       : false,
          apt_update_cache_valid_time          : 86400,
          apt_upgrade                          : false,
          apt_dpkg_configure                   : true,
          apt_install_state                    : 'present',
          apt_clean                            : true,
          apt_autoremove                       : false,
          ansistrano_shared_paths              : ['logs'],
          ansistrano_keep_releases             : 10,
          ansistrano_npm                       : 'no',
          ansistrano_owner                     : 'www-data',
          ansistrano_group                     : 'www-data',
          ansistrano_allow_anonymous_stats     : 'no',
          ansistrano_remove_rolled_back        : 'no',
          fqdn                                 : `{{ lookup('env', 'FREY_DOMAIN') }}`,
          hostname                             : `{{ fqdn.split('.')[0] }}`,
          nodejs_yarn                          : false,
          nodejs_npm_global_packages           : [ 'yarn' ],
          unattended_remove_unused_dependencies: true,
        },
        ssh: {
          key_dir            : '{{{init.os.home}}}/.ssh',
          email              : `{{{init.os.user}}}@${appName}.freyproject.io`,
          keypair_name       : `${appName}`,
          privatekey_file    : `{{{self.key_dir}}}/frey-${appName}.pem`,
          privatekey_enc_file: `{{{self.key_dir}}}/frey-${appName}.pem.cast5`,
          publickey_file     : `{{{self.key_dir}}}/frey-${appName}.pub`,
          user               : 'ubuntu',
        },
      },
    }

    // Take --cfg-var cli options
    let flatCliConfig = {}
    let cliConfig = {}
    if (this.runtime.init.cliargs.cfgVar) {
      if (!_.isArray(this.runtime.init.cliargs.cfgVar)) {
        this.runtime.init.cliargs.cfgVar = [ this.runtime.init.cliargs.cfgVar ]
      }
      this.runtime.init.cliargs.cfgVar.forEach(item => {
        let parts = item.split('=')
        let key = parts.shift()
        let value = parts.join('=')
        flatCliConfig[key] = value
      })

      cliConfig = unflatten(flatCliConfig, { delimiter: '.' })
    }

    // @todo Add environment config?
    // let envConfig = {}
    // envConfig = unflatten(this.runtime.init.env, {delimiter: '_'})
    // envConfig[frey]
    // this.runtime.init.env
    // Merge all config inputs.
    // Left is more important. So cli wins from > project config, wins from > defaults.
    let config = _.defaultsDeep({}, cliConfig, this.bootCargo._mergeToOneConfig, defaults)

    return cb(null, config)
  }

  _renderConfig (cargo, cb) {
    let config = this.bootCargo._applyDefaults
    config = utils.render(config, this.runtime, { failhard: false })
    config = utils.render(config, { config }, { failhard: true })

    // Resolve to absolute paths
    config.global.tools_dir = path.resolve(
      this.runtime.init.cliargs.projectDir,
      config.global.tools_dir
    )
    config.global.ansiblecfg_file = path.resolve(
      this.runtime.init.cliargs.projectDir,
      config.global.ansiblecfg_file
    )
    config.global.infra_plan_file = path.resolve(
      this.runtime.init.cliargs.projectDir,
      config.global.infra_plan_file
    )
    config.global.infra_file = path.resolve(
      this.runtime.init.cliargs.projectDir,
      config.global.infra_file
    )
    config.global.infra_state_file = path.resolve(
      this.runtime.init.cliargs.projectDir,
      config.global.infra_state_file
    )
    config.global.install_file = path.resolve(
      this.runtime.init.cliargs.projectDir,
      config.global.install_file
    )
    config.global.setup_file = path.resolve(
      this.runtime.init.cliargs.projectDir,
      config.global.setup_file
    )
    config.global.deploy_file = path.resolve(
      this.runtime.init.cliargs.projectDir,
      config.global.deploy_file
    )
    config.global.restart_file = path.resolve(
      this.runtime.init.cliargs.projectDir,
      config.global.restart_file
    )
    config.global.backup_file = path.resolve(
      this.runtime.init.cliargs.projectDir,
      config.global.backup_file
    )
    config.global.restore_file = path.resolve(
      this.runtime.init.cliargs.projectDir,
      config.global.restore_file
    )

    config.global.ssh.key_dir = path.resolve(
      this.runtime.init.cliargs.projectDir,
      config.global.ssh.key_dir
    )
    config.global.ssh.privatekey_file = path.resolve(
      this.runtime.init.cliargs.projectDir,
      config.global.ssh.privatekey_file
    )
    config.global.ssh.privatekey_enc_file = path.resolve(
      this.runtime.init.cliargs.projectDir,
      config.global.ssh.privatekey_enc_file
    )
    config.global.ssh.publickey_file = path.resolve(
      this.runtime.init.cliargs.projectDir,
      config.global.ssh.publickey_file
    )

    return cb(null, config)
  }

  _writeTerraformFile (cargo, cb) {
    const cfgBlock = _.cloneDeep(_.get(this.bootCargo._renderConfig, 'infra'))

    if (!cfgBlock) {
      debug('No infra instructions found in merged hcl')
      fs.unlink(this.bootCargo._renderConfig.global.infra_file, err => {
        if (err) {
        }
        return cb(null)
      })
      return
    }

    // Automatically add all FREY_* environment variables to Terraform config
    _.forOwn(this.runtime.init.env, (val, key) => {
      if (_.startsWith(key, 'FREY_')) {
        let path = `variable.${key}.type`
        debug(`injecting 'string' into ${path}`)
        _.set(cfgBlock, path, 'string')
      }
    })

    const encoded = JSON.stringify(cfgBlock, null, '  ')
    if (!encoded) {
      debug({ encoded })
      return cb(new Error('Unable to convert project to Terraform infra HCL'))
    }

    debug('Writing %s', this.bootCargo._renderConfig.global.infra_file)

    return fs.writeFile(this.bootCargo._renderConfig.global.infra_file, encoded, cb)
  }

  _writeAnsibleCfg (cargo, cb) {
    const cfgBlock = _.get(this.bootCargo._renderConfig, 'global.ansiblecfg')

    if (!cfgBlock) {
      debug('No config instructions found in merged hcl')
      fs.unlink(this.bootCargo._renderConfig.global.ansiblecfg_file, err => {
        if (err) {
        }
        return cb(null)
      })
      return
    }

    let encoded = INI.encode(cfgBlock)
    if (!encoded) {
      debug({ cfgBlock })
      return cb(new Error('Unable to convert project to ansiblecfg INI'))
    }

    // Ansible strips over a quoted `ssh_args="-o x=y -o w=z"`, as it uses exec to call
    // ssh, and all treats multiple option arguments as one.
    // So we remove all double-quotes here. If that poses problems I don't foresee at
    // this point, the replace has to be limited in scope:
    encoded = encoded.replace(/"/g, '')

    debug('Writing %s', this.bootCargo._renderConfig.global.ansiblecfg_file)

    return fs.writeFile(this.bootCargo._renderConfig.global.ansiblecfg_file, encoded, cb)
  }

  _writeAnsiblePlaybook (step, cargo, cb) {
    let cfgBlock = {}
    let target   = this.bootCargo._renderConfig.global[`${step}_file`]
    if (step === 'playbooks_vars') {
      cfgBlock = _.get(this.bootCargo._renderConfig, `global.playbooks_vars`)
    } else {
      cfgBlock = _.get(this.bootCargo._renderConfig, `${step}.playbooks`)
    }

    if (!cfgBlock) {
      debug(`No ${step} instructions found`)
      fs.unlink(target, err => {
        if (err) {
        }
        return cb(null)
      })
      return
    }

    const encoded = YAML.safeDump(cfgBlock)
    if (!encoded) {
      debug({ cfgBlock })
      return cb(new Error('Unable to convert project to Ansible playbook YAML'))
    }

    debug(
      'Writing %s instructions at %s',
      step,
      target
    )

    mkdirp(`${path.dirname(target)}`, (err) => {
      if (err) {
        return cb(err)
      }

      fs.writeFile(target, encoded, cb)
    })
  }

  _writeAnsiblePlaybooksVars (cargo, cb) {
    return this._writeAnsiblePlaybook('playbooks_vars', cargo, cb)
  }
  _writeAnsiblePlaybookInstall (cargo, cb) {
    return this._writeAnsiblePlaybook('install', cargo, cb)
  }
  _writeAnsiblePlaybookSetup (cargo, cb) {
    return this._writeAnsiblePlaybook('setup', cargo, cb)
  }
  _writeAnsiblePlaybookDeploy (cargo, cb) {
    return this._writeAnsiblePlaybook('deploy', cargo, cb)
  }
  _writeAnsiblePlaybookRestart (cargo, cb) {
    return this._writeAnsiblePlaybook('restart', cargo, cb)
  }
  _writeAnsiblePlaybookBackup (cargo, cb) {
    return this._writeAnsiblePlaybook('backup', cargo, cb)
  }
  _writeAnsiblePlaybookRestore (cargo, cb) {
    return this._writeAnsiblePlaybook('restore', cargo, cb)
  }

  main (cargo, cb) {
    return cb(null, this.bootCargo._renderConfig)
  }
}

module.exports = Config
