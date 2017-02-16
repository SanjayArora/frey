const Step = require('../Step')
const path = require('path')
const async = require('async')
const globby = require('globby')
const depurar = require('depurar')
const debug = depurar('frey')
const json2hcl = require('../json2hcl')
const fs = require('fs')
const _ = require('lodash')
// const tomlify = require('tomlify-j0.4')
const INI = require('ini')
const YAML = require('js-yaml')
const TOML = require('toml')

class Convert extends Step {
  constructor (name, runtime) {
    super(name, runtime)
    this.boot = [ '_confirm' ]
  }

  _confirm (cargo, cb) {
    this.shell.confirm(
      'About to convert existing TOML, YAML, CFG and TF to HCL files in your project dir. Make sure your files are under source control as this is a best-effort procedure. May I proceed?',
      cb
    )
  }

  _parseTomlFile (tomlFile, cb) {
    let parsed = ''
    let error = null
    try {
      parsed = TOML.parse(fs.readFileSync(tomlFile, 'utf8'))
    } catch (e) {
      error = e
    }

    cb(error, parsed)
  }

  _parseYamlFile (yamlFile, cb) {
    const parsed = YAML.safeLoad(fs.readFileSync(yamlFile, 'utf8'))
    cb(null, { install: { playbooks: parsed } })
  }

  _parseIniFile (iniFile, cb) {
    const parsed = INI.parse(fs.readFileSync(iniFile, 'utf8'))
    cb(null, { global: { ansiblecfg: parsed } })
  }

  _parseHclFile (hclFile, cb) {
    let hcl = fs.readFileSync(hclFile, 'utf8')
    json2hcl(hcl, true, (err, parsed) => {
      if (err) {
        debug({ hclFile, hcl })
        return cb(new Error(`Unable to parse '${hclFile}'. ${err}`))
      }

      cb(null, parsed)
    })
  }

  _parseTfFile (tfFile, cb) {
    this._parseHclFile(tfFile, (err, parsed) => {
      if (err) {
        return cb(err)
      }
      return cb(null, { infra: parsed })
    })
  }

  _parseFile (origFile, cb) {
    switch (path.extname(origFile)) {
      case '.toml':
        this._parseTomlFile(origFile, cb)
        break
      case '.yaml':
      case '.yml':
        this._parseYamlFile(origFile, cb)
        break
      case '.tf':
        this._parseTfFile(origFile, cb)
        break
      case '.cfg':
        this._parseIniFile(origFile, cb)
        break
      default:
        return cb(new Error('Unrecognized extension'))
    }
  }

  main (cargo, cb) {
    const pattern = `${this.runtime.init.cliargs.projectDir}/*.{toml,yml,yaml,tf,cfg}`
    debug(`Reading from '${pattern}'`)

    return globby(pattern).then(origFiles => {
      async.map(origFiles, this._parseFile.bind(this), (err, mapped) => {
        if (err) {
          return cb(err)
        }

        let config = {}
        mapped.forEach(val => {
          config = _.extend(config, val)
        })

        json2hcl(config, false, (err, hcl) => {
          if (err) {
            debug({ config })
            return cb(new Error(`Unable to convert JSON to HCL. ${err}`))
          }

          fs.writeFile(`${this.runtime.init.cliargs.projectDir}/Freyfile.hcl`, hcl, 'utf-8', cb)
        })
      })
    }).catch(cb)
  }
}

module.exports = Convert
