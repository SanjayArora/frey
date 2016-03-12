'use strict'
import Ansible from '../Ansible'

class Restart extends Ansible {
  _gatherArgs (cargo, cb) {
    super._gatherArgs(cargo, (err, args) => {
      if (err) {
        return cb(err)
      }
      args.push(`${this.runtime.config.global.restart_file}`)
      return cb(null, args)
    })
  }
}

module.exports = Restart
