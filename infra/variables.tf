variable "personal_access_token" {
  type = string
}

variable "account_id" {
  type = string
}

variable "region" {
  type = string
}

variable "public_key" {
  type = string
}

variable "ssh_public_key_file" {
  type    = string
  default = "~/.ssh/id_rsa.pub"
}
