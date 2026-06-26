use serde::{Deserialize, Serialize};
use sqlx::{PgPool, postgres::PgPoolOptions};
use std::time::Duration;
#[derive(Debug, Serialize, Deserialize)] struct OutboxEvent { id: uuid::Uuid, tenant_id: uuid::Uuid, event_type: String, adapter: String, status: String, attempts: i32, payload: serde_json::Value }
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt().init();
    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "postgres://mission:mission@localhost:5432/mission_os".to_string());
    let pool = PgPoolOptions::new().max_connections(4).connect(&database_url).await?;
    loop { tick(&pool).await?; tokio::time::sleep(Duration::from_secs(10)).await; }
}
async fn tick(pool: &PgPool) -> anyhow::Result<()> {
    let events = sqlx::query_as!(OutboxEvent, "select id, tenant_id, event_type, adapter, status, attempts, payload from outbox_events where status = 'approved_ready' order by created_at asc limit 10")
        .fetch_all(pool).await?;
    for e in events {
        tracing::info!(event_id=%e.id, adapter=%e.adapter, "dry-run outbox execution");
        sqlx::query!("update outbox_events set status='executed_dry_run', attempts=attempts+1, updated_at=now() where id=$1", e.id).execute(pool).await?;
    }
    Ok(())
}
