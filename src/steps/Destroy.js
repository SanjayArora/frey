const Terraform = require('../apps/Terraform')
const Step = require('../Step')
const _ = require('lodash')
const constants = require('../constants')

// const debug = require('depurar')('frey')
class Destroy extends Step {
  constructor (name, runtime) {
    super(name, runtime)
    this.boot = [ '_confirm' ]
  }

  _confirm (cargo, cb) {
    if (!_.has(this.runtime.config, 'infra')) {
      this._scroll(`Skipping as there are no install instructions`)
      return cb(null)
    }
    this.shell.confirm('May I destroy your infrastructure?', cb)
  }

  main (cargo, cb) {
    if (!_.has(this.runtime.config, 'infra')) {
      this._scroll(`Skipping as there are no install instructions`)
      return cb(null)
    }

    new Terraform({
      args   : { destroy: constants.SHELLARG_PREPEND_AS_IS, force: constants.SHELLARG_BOOLEAN_FLAG },
      runtime: this.runtime,
    }).exe((err, stdout) => {
      if (err) {
        return cb(err)
      }

      this._scroll(`Saved new state to '${this.runtime.config.global.infra_state_file}'`)

      return cb(null)
    })
  }
}

module.exports = Destroy