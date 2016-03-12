'use strict'
import Ansible from '../Ansible'
import Command from '../Command'
import _ from 'lodash'
import depurar from 'depurar'; const debug = depurar('frey')

class Deploy extends Command {
  main (cargo, cb) {
    if (!_.has(this.runtime.config, 'deploy.playbooks')) {
      debug(`Skipping as there are no deploy instructions`)
      return cb(null)
    }

    const opts = { args: {}, runtime: this.runtime }
    opts.args[this.runtime.config.global.deploy_file] = true
    const ansible = new Ansible(opts)
    ansible.exe(cb)
  }
}

module.exports = Deploy
