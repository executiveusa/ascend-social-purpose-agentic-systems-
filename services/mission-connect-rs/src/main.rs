use axum::{extract::{Path, State}, http::{HeaderMap, StatusCode}, routing::{get, post}, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, postgres::PgPoolOptions};
use std::net::SocketAddr;
use tower_http::trace::TraceLayer;
use uuid::Uuid;

#[derive(Clone)]
struct AppState { pool: PgPool }
#[derive(Serialize)] struct Health { ok: bool, service: &'static str, version: &'static str }
#[derive(Deserialize)] struct PublicSubmission { name: Option<String>, email: Option<String>, phone: Option<String>, message: Option<String>, source_page: Option<String>, consent: Option<bool> }
#[derive(Serialize)] struct Receipt { ok: bool, contact_id: Uuid, pipeline_item_id: Uuid, message: &'static str }

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt().init();
    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "postgres://mission:mission@localhost:5432/mission_os".to_string());
    let pool = PgPoolOptions::new().max_connections(12).connect(&database_url).await?;
    let app = Router::new()
        .route("/health", get(|| async { Json(Health { ok: true, service: "mission-connect-rs", version: "0.4.0" }) }))
        .route("/v1/public/:tenant/:kind", post(public_submit))
        .layer(TraceLayer::new_for_http())
        .with_state(AppState { pool });
    let addr: SocketAddr = std::env::var("MISSION_CONNECT_ADDR").unwrap_or_else(|_| "0.0.0.0:4200".into()).parse()?;
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

async fn public_submit(State(state): State<AppState>, Path((tenant, kind)): Path<(String, String)>, headers: HeaderMap, Json(input): Json<PublicSubmission>) -> Result<Json<Receipt>, (StatusCode, String)> {
    let public_key = headers.get("x-mission-public-key").and_then(|v| v.to_str().ok()).unwrap_or("");
    if public_key.is_empty() { return Err((StatusCode::UNAUTHORIZED, "missing public key".into())); }
    if input.email.is_none() && input.phone.is_none() && input.name.is_none() { return Err((StatusCode::UNPROCESSABLE_ENTITY, "name, email, or phone required".into())); }
    let tenant_id = sqlx::query_scalar!("select id from tenants where slug = $1", tenant)
        .fetch_optional(&state.pool).await.map_err(internal)?.ok_or((StatusCode::NOT_FOUND, "tenant not found".into()))?;
    let key_ok = sqlx::query_scalar!("select exists(select 1 from public_api_keys where tenant_id=$1 and public_key=$2 and revoked_at is null)", tenant_id, public_key)
        .fetch_one(&state.pool).await.map_err(internal)?.unwrap_or(false);
    if !key_ok { return Err((StatusCode::UNAUTHORIZED, "invalid public key".into())); }
    let contact_id = Uuid::new_v4();
    sqlx::query!("insert into contacts (id, tenant_id, display_name, email, phone, source) values ($1,$2,$3,$4,$5,$6)", contact_id, tenant_id, input.name.unwrap_or_else(|| "Website contact".into()), input.email, input.phone, kind)
        .execute(&state.pool).await.map_err(internal)?;
    let item_id = Uuid::new_v4();
    sqlx::query!("insert into pipeline_items (id, tenant_id, pipeline, stage, title, contact_id, metadata) values ($1,$2,$3,$4,$5,$6,$7)", item_id, tenant_id, pipeline_for(&kind), "New", format!("{} from website", kind), contact_id, serde_json::json!({"message": input.message, "sourcePage": input.source_page, "consent": input.consent}))
        .execute(&state.pool).await.map_err(internal)?;
    Ok(Json(Receipt { ok: true, contact_id, pipeline_item_id: item_id, message: "Received. Staff will review this in Mission OS." }))
}
fn pipeline_for(kind: &str) -> &'static str { match kind { "volunteer" => "volunteer", "program-application" => "youth_program", "donation-intent" => "donor", _ => "donor" } }
fn internal<E: std::fmt::Display>(e: E) -> (StatusCode, String) { (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()) }
