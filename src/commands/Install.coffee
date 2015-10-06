Command = require "../Command"
chalk   = require "chalk"
_       = require "lodash"
debug   = require("depurar")("frey")

class Install extends Command
  boot: [
    "_gatherArgs"
    "_gatherEnv"
  ]

  _gatherArgs: (cargo, cb) ->
    args            = []
    terraformInvExe = (dep.exe for dep in @runtime.deps when dep.name == "terraformInventory")[0]

    args.push "--tags=#{@options.tags}"
    args.push "--user=#{@runtime.ssh.user}"
    args.push "--private-key=#{@runtime.ssh.privkey}"
    args.push "--inventory-file=#{terraformInvExe}"
    args.push "--sudo"
    args.push "#{@runtime.paths.playbookFile}"

    cb null, args

  _gatherEnv: (cargo, cb) ->
    env = {}

    if !chalk.enalbed
      env.ANSIBLE_NOCOLOR = "true"

    env.ANSIBLE_OPTIONS = @runtime.paths.ansibleCfg
    env.TF_STATE        = @runtime.paths.stateFile

    cb null, env

  main: (cargo, cb) ->
    ansiblePlaybookExe = (dep.exePlaybook for dep in @runtime.deps when dep.name == "ansible")[0]
    cmd                = [
      ansiblePlaybookExe
    ]
    cmd = cmd.concat @bootCargo._gatherArgs
    cmd = cmd.join " "

    opts =
      env: @bootCargo._gatherEnv

    @_exeScript ["-c", cmd], opts, (err, stdout) ->
      if err
        return cb err

      cb null

module.exports = Install
