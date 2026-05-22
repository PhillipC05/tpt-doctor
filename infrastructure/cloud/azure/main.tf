# ============================================================================
# TPT Doctor — Azure Infrastructure (HIPAA-Eligible)
# Terraform configuration for production deployment
# ============================================================================

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
      recover_soft_deleted_key_vaults = true
    }
  }
}

locals {
  name_prefix = "tpt-doctor-${var.environment}"
  common_tags = {
    Project     = "TPT Doctor"
    Environment = var.environment
    ManagedBy   = "Terraform"
    Compliance  = "HIPAA"
  }
}

# ============================================================================
# Resource Group
# ============================================================================

resource "azurerm_resource_group" "main" {
  name     = "${local.name_prefix}-rg"
  location = var.azure_location
  tags     = local.common_tags
}

# ============================================================================
# Networking
# ============================================================================

resource "azurerm_virtual_network" "main" {
  name                = "${local.name_prefix}-vnet"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = ["10.1.0.0/16"]
  tags                = local.common_tags
}

resource "azurerm_subnet" "public" {
  name                 = "${local.name_prefix}-public-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.1.1.0/24"]
}

resource "azurerm_subnet" "private" {
  name                 = "${local.name_prefix}-private-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.1.2.0/24"]
}

resource "azurerm_subnet" "data" {
  name                 = "${local.name_prefix}-data-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.1.3.0/24"]
  service_endpoints    = ["Microsoft.Sql", "Microsoft.Storage"]
}

resource "azurerm_network_security_group" "api" {
  name                = "${local.name_prefix}-api-nsg"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.common_tags

  security_rule {
    name                       = "HTTPS"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "HTTP-redirect"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

# ============================================================================
# Azure Container Registry (ACR)
# ============================================================================

resource "azurerm_container_registry" "main" {
  name                = "${local.name_prefix}acr"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Premium"
  admin_enabled       = false
  encryption {
    enabled            = true
    key_vault_key_id   = azurerm_key_vault_key.acr.id
  }
  network_rule_set {
    default_action = "Deny"
  }
  tags = local.common_tags
}

# ============================================================================
# Azure Kubernetes Service (AKS)
# ============================================================================

resource "azurerm_kubernetes_cluster" "main" {
  name                = "${local.name_prefix}-aks"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = local.name_prefix
  kubernetes_version  = var.aks_kubernetes_version

  default_node_pool {
    name                = "default"
    node_count          = var.aks_node_count
    vm_size             = var.aks_vm_size
    vnet_subnet_id      = azurerm_subnet.private.id
    enable_auto_scaling = true
    min_count           = 2
    max_count           = 10
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin    = "azure"
    network_policy    = "calico"
    load_balancer_sku = "standard"
  }

  microsoft_defender {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  }

  azure_policy_enabled = true

  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  }

  key_vault_secrets_provider {
    secret_rotation_enabled = true
  }

  tags = local.common_tags
}

# ============================================================================
# Azure SQL Database
# ============================================================================

resource "azurerm_mssql_server" "main" {
  name                          = "${local.name_prefix}-sql"
  resource_group_name           = azurerm_resource_group.main.name
  location                      = azurerm_resource_group.main.location
  version                       = "16.0"
  administrator_login           = "tpt_admin"
  administrator_login_password  = random_password.sql_password.result
  minimum_tls_version           = "1.2"
  public_network_access_enabled = false

  azuread_administrator {
    login_username = "tpt-aad-admin"
    object_id      = var.aad_admin_object_id
  }

  identity {
    type = "SystemAssigned"
  }

  tags = local.common_tags
}

resource "azurerm_mssql_database" "main" {
  name                        = "tpt_doctor"
  server_id                   = azurerm_mssql_server.main.id
  collation                   = "SQL_Latin1_General_CP1_CI_AS"
  license_type                = "LicenseIncluded"
  max_size_gb                 = var.sql_max_size_gb
  read_replica_count          = var.environment == "production" ? 1 : 0
  sku_name                    = var.environment == "production" ? "GP_Gen5_8" : "GP_Gen5_2"
  zone_redundant              = var.environment == "production"
  storage_account_type        = "GeoZoneRedundant"
  transparent_data_encryption_enabled = true

  tags = local.common_tags
}

resource "azurerm_mssql_firewall_rule" "allow_azure" {
  name             = "AllowAzureServices"
  server_id        = azurerm_mssql_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# ============================================================================
# Azure Cache for Redis
# ============================================================================

resource "azurerm_redis_cache" "main" {
  name                = "${local.name_prefix}-redis"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  capacity            = var.environment == "production" ? 2 : 1
  family              = "P"
  sku_name            = var.environment == "production" ? "Premium" : "Standard"
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"
  redis_version       = "7"

  redis_configuration {
    aof_backup_enabled              = true
    aof_storage_connection_string_0 = azurerm_storage_account.backup.primary_blob_connection_string
  }

  tags = local.common_tags
}

# ============================================================================
# Blob Storage (Encrypted)
# ============================================================================

resource "azurerm_storage_account" "documents" {
  name                      = "${local.name_prefix}documents"
  resource_group_name       = azurerm_resource_group.main.name
  location                  = azurerm_resource_group.main.location
  account_tier              = "Premium"
  account_replication_type  = "ZRS"
  account_kind              = "BlockBlobStorage"
  min_tls_version           = "TLS1_2"
  infrastructure_encryption_enabled = true
  blob_encryption_enabled   = true
  public_network_access_enabled = false

  blob_properties {
    versioning_enabled = var.environment == "production"
    delete_retention_policy {
      days = 7
    }
    container_delete_retention_policy {
      days = 7
    }
  }

  tags = local.common_tags
}

resource "azurerm_storage_account" "backup" {
  name                      = "${local.name_prefix}backup"
  resource_group_name       = azurerm_resource_group.main.name
  location                  = azurerm_resource_group.main.location
  account_tier              = "Standard"
  account_replication_type  = "GRS"
  min_tls_version           = "TLS1_2"
  infrastructure_encryption_enabled = true
  blob_encryption_enabled   = true
  public_network_access_enabled = false

  blob_properties {
    versioning_enabled = true
    container_delete_retention_policy {
      days = 30
    }
  }

  tags = local.common_tags
}

# ============================================================================
# Azure Key Vault
# ============================================================================

resource "azurerm_key_vault" "main" {
  name                       = "${local.name_prefix}-kv"
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "premium"
  soft_delete_retention_days = 90
  purge_protection_enabled   = true
  rbac_authorization_enabled = true
  public_network_access_enabled = false

  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"
  }

  tags = local.common_tags
}

resource "azurerm_key_vault_key" "documents" {
  name         = "tpt-documents-key"
  key_vault_id = azurerm_key_vault.main.id
  key_type     = "RSA"
  key_size     = 4096
  key_opts     = ["encrypt", "decrypt", "sign", "verify", "wrapKey", "unwrapKey"]

  rotation_policy {
    automatic {
      time_after_creation = "P90D"
    }
  }
}

resource "azurerm_key_vault_key" "acr" {
  name         = "tpt-acr-key"
  key_vault_id = azurerm_key_vault.main.id
  key_type     = "RSA"
  key_size     = 4096
  key_opts     = ["encrypt", "decrypt"]

  rotation_policy {
    automatic {
      time_after_creation = "P90D"
    }
  }
}

resource "azurerm_key_vault_secret" "sql_password" {
  name         = "sql-admin-password"
  value        = random_password.sql_password.result
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "auth0_client_secret" {
  name         = "auth0-client-secret"
  value        = var.auth0_client_secret
  key_vault_id = azurerm_key_vault.main.id
}

# ============================================================================
# Azure Front Door + WAF
# ============================================================================

resource "azurerm_front_door" "main" {
  name                = "${local.name_prefix}-frontdoor"
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.common_tags

  frontend_endpoint {
    name      = "${local.name_prefix}-fe"
    host_name = "${local.name_prefix}.azurefd.net"
    session_affinity_enabled = false
  }

  backend_pool {
    name = "${local.name_prefix}-backend"
    backend {
      host_header = var.app_service_hostname
      address     = var.app_service_hostname
      http_port   = 80
      https_port  = 443
    }
  }

  routing_rule {
    name               = "https-redirect"
    accepted_protocols = ["Http"]
    patterns_to_match  = ["/*"]
    frontend_endpoints = ["${local.name_prefix}-fe"]
    redirect_configuration {
      redirect_type     = "Found"
      redirect_protocol = "HttpsOnly"
    }
  }

  routing_rule {
    name               = "api-route"
    accepted_protocols = ["Https"]
    patterns_to_match  = ["/*"]
    frontend_endpoints = ["${local.name_prefix}-fe"]
    forwarding_configuration {
      backend_pool_name = "${local.name_prefix}-backend"
      cache_enabled     = false
      forwarding_protocol = "HttpsOnly"
    }
  }
}

resource "azurerm_front_door_firewall_policy" "main" {
  name                = "${local.name_prefix}-waf"
  resource_group_name = azurerm_resource_group.main.name
  mode                = "Prevention"
  enabled             = true

  managed_rule {
    type    = "Microsoft_DefaultRuleSet"
    version = "2.1"

    override {
      rule_group_name = "SQLI"
    }

    override {
      rule_group_name = "XSS"
    }
  }

  managed_rule {
    type    = "Microsoft_BotManagerRuleSet"
    version = "1.0"
  }

  custom_rule {
    name     = "RateLimit"
    type     = "RateLimitRule"
    rate_limit_duration_in_minutes = 1
    rate_limit_threshold = 2000
    action   = "Block"
    match_condition {
      match_variable = "RemoteAddr"
      operator       = "IPMatch"
      match_values   = ["*"]
    }
  }

  tags = local.common_tags
}

# ============================================================================
# Log Analytics
# ============================================================================

resource "azurerm_log_analytics_workspace" "main" {
  name                = "${local.name_prefix}-logs"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 90
  tags                = local.common_tags
}

# ============================================================================
# Azure App Service Plan + App Service
# ============================================================================

resource "azurerm_service_plan" "main" {
  name                = "${local.name_prefix}-asp"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = var.environment == "production" ? "P3V3" : "P1V2"
  tags                = local.common_tags
}

resource "azurerm_linux_web_app" "api" {
  name                = "${local.name_prefix}-api"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.main.id
  https_only          = true
  client_certificate_enabled = true

  site_config {
    minimum_tls_version = "1.2"
    health_check_path   = "/api/v1/health"
    application_stack {
      node_version = "18-lts"
    }
    cors {
      allowed_origins = [
        "https://${var.domain_name}",
        "https://portal.${var.domain_name}"
      ]
    }
  }

  identity {
    type = "SystemAssigned"
  }

  app_settings = {
    NODE_ENV              = var.environment
    PORT                  = "4000"
    AZURE_KEY_VAULT_URI   = azurerm_key_vault.main.vault_uri
    REDIS_URL             = "${azurerm_redis_cache.main.hostname}:${azurerm_redis_cache.main.ssl_port},password=${azurerm_redis_cache.main.primary_access_key},ssl=True,abortConnect=False"
    STORAGE_CONNECTION    = azurerm_storage_account.documents.primary_connection_string
    AUTH0_DOMAIN          = var.auth0_domain
    AUTH0_AUDIENCE        = var.auth0_audience
    ENCRYPTION_PROVIDER   = "azure"
    ENCRYPTION_KEY_URI    = azurerm_key_vault_key.documents.id
    LOG_LEVEL             = "info"
  }

  logs {
    application_logs {
      file_system_level = "Information"
    }
    http_logs {
      file_system {
        retention_in_mb = 35
        retention_in_days = 30
      }
    }
  }

  tags = local.common_tags
}

# ============================================================================
# Random Password
# ============================================================================

resource "random_password" "sql_password" {
  length  = 32
  special = false
}

# ============================================================================
# Data Sources
# ============================================================================

data "azurerm_client_config" "current" {}
</write_to_file>