variable "environment" {
  description = "Environment (production, staging, development)"
  type        = string
  default     = "production"
}

variable "azure_location" {
  description = "Azure region"
  type        = string
  default     = "eastus"
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

variable "aad_admin_object_id" {
  description = "Azure AD admin object ID for SQL Server"
  type        = string
}

variable "app_service_hostname" {
  description = "Custom hostname for App Service"
  type        = string
}

variable "aks_kubernetes_version" {
  description = "AKS Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "aks_node_count" {
  description = "Default AKS node count"
  type        = number
  default     = 3
}

variable "aks_vm_size" {
  description = "AKS node VM size"
  type        = string
  default     = "Standard_D4s_v3"
}

variable "sql_max_size_gb" {
  description = "Maximum SQL database size in GB"
  type        = number
  default     = 256
}
</write_to_file>