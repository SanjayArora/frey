"infra" provider aws {
  access_key = "${var.FREY_AWS_ACCESS_KEY}"
  region     = "us-east-1"
  secret_key = "${var.FREY_AWS_SECRET_KEY}"
}

