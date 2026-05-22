# ============================================================================
# TPT Doctor — GCP Infrastructure (HIPAA-Eligible)
# Terraform configuration for production deployment
# ============================================================================

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

locals {
  name_prefix = "tpt-doctor-${var.environment}"
  common_tags = {
    project     = "tpt-doctor"
    environment = var.environment
    managed-by  = "terraform"
    compliance  = "hipaa"
  }
}

# ============================================================================
# VPC & Networking
# ============================================================================

resource "google_compute_network" "main" {
  name                    = "${local.name_prefix}-vpc"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
}

resource "google_compute_subnetwork" "private" {
  name          = "${local.name_prefix}-private-subnet"
  network       = google_compute_network.main.id
  region        = var.gcp_region
  ip_cidr_range = "10.2.0.0/24"

  private_ip_google_access = true
}

resource "google_compute_subnetwork" "data" {
  name          = "${local.name_prefix}-data-subnet"
  network       = google_compute_network.main.id
  region        = var.gcp_region
  ip_cidr_range = "10.2.1.0/24"

  private_ip_google_access = true
}

resource "google_compute_router" "nat" {
  name    = "${local.name_prefix}-nat-router"
  network = google_compute_network.main.id
  region  = var.gcp_region
}

resource "google_compute_router_nat" "main" {
  name                               = "${local.name_prefix}-nat"
  router                             = google_compute_router.nat.name
  region                             = var.gcp_region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}

# ============================================================================
# Cloud SQL (PostgreSQL)
# ============================================================================

resource "google_sql_database_instance" "postgres" {
  name             = "${local.name_prefix}-postgres"
  database_version = "POSTGRES_16"
  region           = var.gcp_region

  settings {
    tier              = var.environment == "production" ? "db-custom-8-32768" : "db-custom-2-8192"
    disk_size         = var.sql_disk_size_gb
    disk_type         = "PD_SSD"
    disk_autoresize   = true
    availability_type = var.environment == "production" ? "REGIONAL" : "ZONAL"

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.main.id
      require_ssl     = true
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      retained_backups               = 30
      retention_unit                 = "COUNT"
      transaction_log_retention_days = 7
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }

    database_flags {
      name  = "cloudsql.iam_authentication"
      value = "on"
    }

    database_flags {
      name  = "ssl_min_protocol_version"
      value = "TLSv1.2"
    }

    database_flags {
      name  = "log_statement"
      value = "ddl"
    }
  }

  deletion_protection = var.environment == "production"
}

resource "google_sql_database" "main" {
  name     = "tpt_doctor"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "app" {
  name     = "tpt_app"
  instance = google_sql_database_instance.postgres.name
  password = random_password.sql_password.result
}

# ============================================================================
# Memorystore Redis
# ============================================================================

resource "google_redis_instance" "main" {
  name           = "${local.name_prefix}-redis"
  memory_size_gb = var.environment == "production" ? 4 : 1
  region         = var.gcp_region
  redis_version  = "REDIS_7"
  tier           = var.environment == "production" ? "STANDARD_HA" : "BASIC"

  authorized_network = google_compute_network.main.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"
  transit_encryption_enabled = true

  persistence_config {
    persistence_mode = "RDB"
    rdb_snapshot_period = "TWENTY_FOUR_HOURS"
  }

  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time = "04:00"
    }
  }
}

# ============================================================================
# Cloud Storage (Encrypted)
# ============================================================================

resource "google_storage_bucket" "documents" {
  name                        = "${local.name_prefix}-documents"
  location                    = var.gcp_region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  versioning {
    enabled = var.environment == "production"
  }

  encryption {
    default_kms_key_name = google_kms_crypto_key.documents.id
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 2555
    }
    action {
      type = "Delete"
    }
  }
}

resource "google_storage_bucket" "backups" {
  name                        = "${local.name_prefix}-backups"
  location                    = var.gcp_region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  versioning {
    enabled = true
  }

  encryption {
    default_kms_key_name = google_kms_crypto_key.backups.id
  }
}

# ============================================================================
# Cloud KMS
# ============================================================================

resource "google_kms_key_ring" "main" {
  name     = "${local.name_prefix}-keyring"
  location = var.gcp_region
}

resource "google_kms_crypto_key" "documents" {
  name     = "${local.name_prefix}-documents-key"
  key_ring = google_kms_key_ring.main.id
  rotation_period = "7776000s" # 90 days

  version_template {
    algorithm = "GOOGLE_SYMMETRIC_ENCRYPTION"
  }
}

resource "google_kms_crypto_key" "backups" {
  name     = "${local.name_prefix}-backups-key"
  key_ring = google_kms_key_ring.main.id
  rotation_period = "7776000s"

  version_template {
    algorithm = "GOOGLE_SYMMETRIC_ENCRYPTION"
  }
}

resource "google_kms_crypto_key" "application" {
  name     = "${local.name_prefix}-app-key"
  key_ring = google_kms_key_ring.main.id
  rotation_period = "7776000s"

  version_template {
    algorithm = "GOOGLE_SYMMETRIC_ENCRYPTION"
  }
}

# ============================================================================
# Cloud Run
# ============================================================================

resource "google_artifact_registry_repository" "api" {
  location      = var.gcp_region
  repository_id = "${local.name_prefix}-api"
  format        = "DOCKER"
}

resource "google_cloud_run_v2_service" "api" {
  name     = "${local.name_prefix}-api"
  location = var.gcp_region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = var.environment == "production" ? 2 : 1
      max_instance_count = 10
    }

    containers {
      image = "${google_artifact_registry_repository.api.location}-docker.pkg.dev/${var.gcp_project_id}/${google_artifact_registry_repository.api.repository_id}/latest"

      env {
        name  = "NODE_ENV"
        value = var.environment
      }
      env {
        name  = "PORT"
        value = "4000"
      }
      env {
        name  = "DATABASE_URL"
        value = "postgresql://${google_sql_user.app.name}:${random_password.sql_password.result}@${google_sql_database_instance.postgres.private_ip_address}:5432/${google_sql_database.main.name}?ssl=require"
      }
      env {
        name  = "REDIS_URL"
        value = "redis://${google_redis_instance.main.host}:6379"
      }
      env {
        name  = "STORAGE_BUCKET"
        value = google_storage_bucket.documents.name
      }
      env {
        name  = "AUTH0_DOMAIN"
        value = var.auth0_domain
      }
      env {
        name  = "AUTH0_AUDIENCE"
        value = var.auth0_audience
      }
      env {
        name  = "ENCRYPTION_PROVIDER"
        value = "gcp"
      }
      env {
        name  = "ENCRYPTION_KEY_URI"
        value = google_kms_crypto_key.application.id
      }
      env {
        name  = "LOG_LEVEL"
        value = "info"
      }

      liveness_probe {
        http_get {
          path = "/api/v1/health"
        }
        initial_delay_seconds = 60
        period_seconds        = 30
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "4Gi"
        }
      }
    }

    service_account = google_service_account.api.email
  }

  depends_on = [google_artifact_registry_repository.api]
}

# ============================================================================
# Cloud CDN + Cloud Armor
# ============================================================================

resource "google_compute_security_policy" "waf" {
  name = "${local.name_prefix}-waf"

  rule {
    action   = "deny(403)"
    priority = "1000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Rate limiting"
    rate_limit_options {
      rate_limit_threshold {
        count        = 2000
        interval_sec = 60
      }
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"
    }
  }

  rule {
    action   = "allow"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default allow"
  }
}

# ============================================================================
# IAM & Service Accounts
# ============================================================================

resource "google_service_account" "api" {
  account_id   = "${local.name_prefix}-api-sa"
  display_name = "TPT Doctor API Service Account"
}

resource "google_project_iam_member" "api_kms" {
  project = var.gcp_project_id
  role    = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_storage" {
  project = var.gcp_project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_cloudsql" {
  project = var.gcp_project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.api.email}"
}

# ============================================================================
# Secrets
# ============================================================================

resource "google_secret_manager_secret" "auth0_client_secret" {
  secret_id = "${local.name_prefix}-auth0-client-secret"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "auth0_client_secret" {
  secret      = google_secret_manager_secret.auth0_client_secret.id
  secret_data = var.auth0_client_secret
}

# ============================================================================
# Random Password
# ============================================================================

resource "random_password" "sql_password" {
  length  = 32
  special = false
}
</write_to_file>