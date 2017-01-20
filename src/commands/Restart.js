import Ansible from '../Ansible'
import Command from '../Command'
import constants from '../constants'
import _ from 'lodash'
import depurar from 'depurar'

const debug = depurar('frey')

class Restart extends Command {
  main (cargo, cb) {
    if (!_.has(this.runtime.config, 'restart.playbooks')) {
      debug('Skipping as there are no restart instructions')
      return cb(null)
    }

    const opts = { args: {}, runtime: this.runtime }

    opts.args[this.runtime.config.global.restart_file] = constants.SHELLARG_APPEND_AS_IS

    const ansible = new Ansible(opts)
    ansible.exe(cb)
  }
}

module.exports = Restart
