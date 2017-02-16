global {
  connection   = "local"
  "ansiblecfg" "defaults"   {}
  ansiblecfg ssh_connection {
    ssh_args = "-o ControlMaster=auto -o ControlPersist=60s"
  }
}

install {
  playbooks {
    hosts  = "{{ variable_host | default('infra-tusd-server')}}"
    name   = "Local stuff"
    become = "False"
    tasks {
      name    = "Showcase we can access FREY_ environment variables"
      command = "echo {{lookup('env', 'FREY_SHOULD_BE_AS_VAR_IN_ANSIBLE')}}"
    }
  }
}
