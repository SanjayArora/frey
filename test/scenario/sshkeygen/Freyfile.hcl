global {
  connection   = "local"
  "ansiblecfg" "defaults"   {}
  ansiblecfg ssh_connection {
    ssh_args = "-o ControlMaster=auto -o ControlPersist=60s"
  }
}

