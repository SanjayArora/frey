const Command = require('../Command')
const constants = require('../constants')
const fs = require('fs')
const globby = require('globby')
const Terraform = require('../apps/Terraform')
const Ansible = require('../apps/Ansible')
const _ = require('lodash')
const mkdirp = require('mkdirp')
const depurar = require('depurar')

const debug = depurar('frey')

class Show extends Command {
  constructor (name, runtime) {
    super(name, runtime)
    this.boot = [ '_createTmpDir', 'output', 'publicAddresses', 'endpoint', 'facts' ]
    this.tmpFactDir = `${this.runtime.init.paths.process_tmp_dir}/facts`
  }

  _createTmpDir (cargo, cb) {
    mkdirp(this.tmpFactDir, cb)
  }

  output (cargo, cb) {
    if (!_.has(this.runtime.config, 'infra')) {
      debug('Skipping output as there are no infra instructions')
      return cb(null)
    }

    const terraform = new Terraform({
      cmdOpts: { mode: 'silent' },
      args   : {
        output     : constants.SHELLARG_PREPEND_AS_IS,
        state      : this.runtime.config.global.infra_state_file,
        parallelism: constants.SHELLARG_REMOVE,
      },
      runtime: this.runtime,
    })

    terraform.exe(cb)
  }

  publicAddresses (cargo, cb) {
    if (!_.has(this.runtime.config, 'infra')) {
      debug('Skipping publicAddresses as there are no infra instructions')
      return cb(null)
    }
    if (!_.has(this.runtime.config, 'infra.output.public_addresses')) {
      debug('Skipping publicAddresses as infra.output.public_addresses was not defined. ')
      return cb(null)
    }

    const terraform = new Terraform({
      cmdOpts: { mode: 'silent' },
      args   : {
        output          : constants.SHELLARG_PREPEND_AS_IS,
        state           : this.runtime.config.global.infra_state_file,
        parallelism     : constants.SHELLARG_REMOVE,
        public_addresses: constants.SHELLARG_APPEND_AS_IS,
      },
      runtime: this.runtime,
    })

    terraform.exe(cb)
  }

  endpoint (cargo, cb) {
    if (!_.has(this.runtime.config, 'infra')) {
      debug('Skipping endpoint as there are no infra instructions')
      return cb(null)
    }
    if (!_.has(this.runtime.config, 'infra.output.endpoint')) {
      debug('Skipping endpoint as infra.output.endpoint was not defined. ')
      return cb(null)
    }

    const terraform = new Terraform({
      cmdOpts: { mode: 'silent' },
      args   : {
        output     : constants.SHELLARG_PREPEND_AS_IS,
        state      : this.runtime.config.global.infra_state_file,
        parallelism: constants.SHELLARG_REMOVE,
        endpoint   : constants.SHELLARG_APPEND_AS_IS,
      },
      runtime: this.runtime,
    })

    terraform.exe(cb)
  }

  facts (cargo, cb) {
    if (!_.has(this.runtime.config, 'install.playbooks')) {
      debug('Skipping facts as there are no install instructions')
      return cb(null)
    }

    const ansibleProps = _.find(this.runtime.deps, { name: 'ansible' })
    const opts = {
      exe    : ansibleProps.exe,
      args   : {},
      runtime: this.runtime,
      cmdOpts: { mode: 'silent' },
    }

    opts.args['module-name'] = 'setup'
    opts.args['tree'] = this.tmpFactDir
    opts.args['all'] = constants.SHELLARG_APPEND_AS_IS
    opts.args['tags'] = constants.SHELLARG_REMOVE

    // ansible: error: no such option: --tags
    const ansible = new Ansible(opts)
    ansible.exe((err, stdout) => {
      if (err) {
        return cb(err)
      }

      let factList = []
      globby.sync(`${this.tmpFactDir}/*`).forEach(filepath => {
        const facts = JSON.parse(fs.readFileSync(filepath, 'utf-8'))

        const key = 'ansible_facts.ansible_service_mgr'
        let val = `${_.get(facts, key)}`
        let fqdn = `${_.get(facts, 'ansible_facts.ansible_fqdn')}`

        // @todo this is a hack to prevent failures like:
        // https://travis-ci.org/freyproject/frey/builds/116576951#L931
        // where there must be some odd character leaking into the acceptance test fixtures
        val = val.replace(/[^A-Za-z0-9.\-_]/mg, '')
        fqdn = fqdn.replace(/[^A-Za-z0-9.\-_]/mg, '')

        factList.push(`${fqdn},${key} = ${val}`)
      })

      cb(null, factList.sort().join('\n'))
    })
  }

  main (cargo, cb) {
    const results = {
      output          : this.bootCargo.output,
      public_addresses: this.bootCargo.publicAddresses,
      facts           : this.bootCargo.facts,
      endpoint        : this.bootCargo.endpoint,
    }

    _.forOwn(results, (out, key) => {
      if (out) {
        this._out(`- [ ${key} ] ------------------------------`)
        this._out(`${out}`)
      }
    })

    cb(null, results)
  }
}

module.exports = Show
