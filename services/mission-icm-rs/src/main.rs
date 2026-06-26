use axum::{routing::post, Json, Router};
use serde::{Deserialize, Serialize};
use std::{fs, path::{Path, PathBuf}};
#[derive(Deserialize)] struct RunStage { root: String, tenant: String, stage: String, input: serde_json::Value }
#[derive(Serialize)] struct StageResult { ok: bool, output: String, loaded_files: Vec<String> }
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let app = Router::new().route("/v1/stage/run", post(run_stage));
    let listener = tokio::net::TcpListener::bind("0.0.0.0:4400").await?;
    axum::serve(listener, app).await?;
    Ok(())
}
async fn run_stage(Json(req): Json<RunStage>) -> Result<Json<StageResult>, (axum::http::StatusCode, String)> {
    let tenant = clean_segment(&req.tenant)?;
    let stage = clean_segment(&req.stage)?;
    let root = PathBuf::from(req.root).join("tenants").join(&tenant);
    let stage_dir = root.join("stages").join(&stage);
    if !stage_dir.starts_with(&root) { return Err((axum::http::StatusCode::BAD_REQUEST, "path traversal".into())); }
    let mut loaded = vec![];
    for rel in ["AGENT.md", "CONTEXT.md"] { let p = root.join(rel); if p.exists() { loaded.push(rel.into()); } }
    let ctx = stage_dir.join("CONTEXT.md"); if ctx.exists() { loaded.push(format!("stages/{}/CONTEXT.md", stage)); }
    let out = stage_dir.join("output"); fs::create_dir_all(&out).map_err(internal)?;
    let file = out.join("result.md");
    fs::write(&file, format!("# ICM Stage Result\n\nStage: {}\nTenant: {}\n\nInput:\n```json\n{}\n```\n", stage, tenant, serde_json::to_string_pretty(&req.input).unwrap_or_default())).map_err(internal)?;
    Ok(Json(StageResult { ok: true, output: file.to_string_lossy().into(), loaded_files: loaded }))
}
fn clean_segment(s: &str) -> Result<String, (axum::http::StatusCode, String)> { if s.contains("..") || s.contains('/') || s.contains('\\') { return Err((axum::http::StatusCode::BAD_REQUEST, "unsafe segment".into())); } Ok(s.to_string()) }
fn internal<E: std::fmt::Display>(e: E) -> (axum::http::StatusCode, String) { (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string()) }
