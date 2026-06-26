use axum::{extract::{Path, State}, http::StatusCode, routing::{get, post}, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, postgres::PgPoolOptions};
use std::net::SocketAddr;
use tower_http::trace::TraceLayer;
use uuid::Uuid;

#[derive(Clone)]
struct AppState { pool: PgPool }

#[derive(Serialize)]
struct Health { ok: bool, service: &'static str, version: &'static str }

#[derive(Deserialize)]
struct CreateTenant { slug: String, org_name: String, region: Option<String>, niche: Option<String> }

#[derive(Serialize)]
struct TenantCreated { id: Uuid, slug: String, org_name: String }

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt().init();
    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "postgres://mission:mission@localhost:5432/mission_os".to_string());
    let pool = PgPoolOptions::new().max_connections(8).connect(&database_url).await?;
    let app = Router::new()
        .route("/health", get(health))
        .route("/v1/tenants", post(create_tenant))
        .route("/v1/tenants/:slug", get(get_tenant))
        .layer(TraceLayer::new_for_http())
        .with_state(AppState { pool });
    let addr: SocketAddr = std::env::var("MISSION_CORE_ADDR").unwrap_or_else(|_| "0.0.0.0:4100".into()).parse()?;
    tracing::info!(%addr, "mission-core-rs listening");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

async fn health() -> Json<Health> { Json(Health { ok: true, service: "mission-core-rs", version: "0.4.0" }) }

async fn create_tenant(State(state): State<AppState>, Json(input): Json<CreateTenant>) -> Result<Json<TenantCreated>, (StatusCode, String)> {
    let slug = clean_slug(&input.slug)?;
    let id = Uuid::new_v4();
    let region = input.region.unwrap_or_else(|| "Seattle / King County".into());
    let niche = input.niche.unwrap_or_else(|| "youth, sports, mentorship".into());
    sqlx::query!(
        r#"insert into tenants (id, slug, org_name, region, niche) values ($1,$2,$3,$4,$5) on conflict (slug) do update set org_name=excluded.org_name, region=excluded.region, niche=excluded.niche"#,
        id, slug, input.org_name, region, niche
    ).execute(&state.pool).await.map_err(internal)?;
    Ok(Json(TenantCreated { id, slug, org_name: input.org_name }))
}

async fn get_tenant(State(state): State<AppState>, Path(slug): Path<String>) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let slug = clean_slug(&slug)?;
    let row = sqlx::query!("select id, slug, org_name, region, niche, created_at from tenants where slug = $1", slug)
        .fetch_optional(&state.pool).await.map_err(internal)?;
    match row {
        Some(r) => Ok(Json(serde_json::json!({"id": r.id, "slug": r.slug, "orgName": r.org_name, "region": r.region, "niche": r.niche, "createdAt": r.created_at}))),
        None => Err((StatusCode::NOT_FOUND, "tenant not found".into()))
    }
}

fn clean_slug(input: &str) -> Result<String, (StatusCode, String)> {
    let slug: String = input.to_lowercase().chars().map(|c| if c.is_ascii_alphanumeric() || c == '-' { c } else { '-' }).collect();
    let slug = slug.trim_matches('-').replace("--", "-");
    if slug.len() < 2 || slug.len() > 60 { return Err((StatusCode::BAD_REQUEST, "invalid tenant slug".into())); }
    Ok(slug)
}
fn internal<E: std::fmt::Display>(e: E) -> (StatusCode, String) { (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()) }
