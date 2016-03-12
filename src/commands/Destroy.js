'use strict'
import Terraform from '../Terraform'
import Command from '../Command'
import _ from 'lodash'

class Destroy extends Command {
  main (cargo, cb) {
    if (!_.has(this.runtime.config, 'infra')) {
      this.info(`Skipping as there are no install instructions\n`)
      return cb(null)
    }

    const terraform = new Terraform({
      args: {
        destroy: undefined,
        force: true
      },
      runtime: this.runtime,
      cmdOpts: {
        verbose: true,
        limitSamples: false
      }
    })

    return this.promptYesNo(`May I destroy your infrastructure? [yes|No]`, (ok) => {
      if (!ok) {
        return cb(new Error('Question declined. Aborting. '))
      }

      terraform.exe((err, stdout) => {
        if (err) {
          return cb(err)
        }

        this._out(`--> Saved new state to '${this.runtime.config.global.infra_state_file}'\n`)

        return cb(null)
      })
    })
  }
}

module.exports = Destroy
