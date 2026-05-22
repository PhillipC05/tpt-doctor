variable "environment" {
  description = "Environment (production, staging, development)"
  type        = string
  default     = "production"
}

variable "gcp_project_id" {
  description = "GCP project ID"
  type        = string
}

variable "gcp_region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}

variable "auth0_domain" {
  description = "Auth0 tenant domain"
  type        = string
}

variable "auth0_audience" {
  description = "Auth0 API audience"
  type        = string
}

variable "auth0_client_secret" {
  description = "Auth0 client secret"
  type        = string
  sensitive   = true
}

variable "sql_disk_size_gb" {
  description = "Cloud SQL disk size in GB"
  type        = number
  default     = 100
}
</write_to_file>