global ssh {
  user = "root"
}

global terraformcfg {
  parallelism = 1
}

global ansiblecfg defaults {
  host_key_checking = "False"
}

global ansiblecfg privilege_escalation {
  become = "False"
}

infra provider digitalocean {
  token = "${var.FREY_DO_TOKEN}"
}

infra variable web_count {
  default = 2
}

infra variable db_count {
  default = 1
}

infra output public_address {
  value = "${digitalocean_droplet.freytest-web.0.ipv4_address}"
}

infra output public_addresses {
  value = "${join("\n", concat(digitalocean_droplet.freytest-db.*.ipv4_address, digitalocean_droplet.freytest-web.*.ipv4_address))}"
}

infra resource digitalocean_droplet "freytest-web" {
  image      = "ubuntu-14-04-x64"
  name       = "web-${count.index}"
  region     = "nyc2"
  size       = "512mb"
  ssh_keys   = ["${digitalocean_ssh_key.freytest-sshkey.id}"]
  count      = "${var.web_count}"
  depends_on = ["digitalocean_droplet.freytest-db"]
  connection {
    key_file = "{{{config.global.ssh.privatekey_file}}}"
    user     = "{{{config.global.ssh.user}}}"
  }
  provisioner "remote-exec" {
    inline = ["pwd"]
  }
}

infra resource digitalocean_droplet "freytest-db" {
  image    = "ubuntu-14-04-x64"
  name     = "db-${count.index}"
  region   = "nyc2"
  size     = "512mb"
  ssh_keys = ["${digitalocean_ssh_key.freytest-sshkey.id}"]
  count    = "${var.db_count}"
  connection {
    key_file = "{{{config.global.ssh.privatekey_file}}}"
    user     = "{{{config.global.ssh.user}}}"
  }
  provisioner "remote-exec" {
    inline = ["pwd"]
  }
}

infra resource digitalocean_domain "domain-web" {
  name       = "${element(digitalocean_droplet.freytest-web.*.name, count.index)}.freyexample.com"
  ip_address = "${element(digitalocean_droplet.freytest-web.*.ipv4_address, count.index)}"
  count      = "${var.web_count}"
}

infra resource digitalocean_ssh_key "freytest-sshkey" {
  name       = "Frey test"
  public_key = "${file("{{{config.global.ssh.publickey_file}}}")}"
}

install {
  playbooks {
    hosts = "freytest-web"
    name  = "Install freytest-web"
    tasks {
      name       = "Execute deploy command"
      command    = "{{item}}"
      with_items = ["pwd", "echo web"]
    }
  }
  playbooks {
    hosts = "freytest-db"
    name  = "Install freytest-db"
    tasks {
      name       = "Execute deploy command"
      command    = "{{item}}"
      with_items = ["pwd", "echo db"]
    }
  }
}

