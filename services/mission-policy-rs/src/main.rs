use axum::{routing::post, Json, Router};
use serde::{Deserialize, Serialize};
#[derive(Deserialize)] struct ClassifyRequest { text: String }
#[derive(Serialize)] struct ClassifyResponse { risk: &'static str, approval_required: bool, reason: &'static str }
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let app = Router::new().route("/v1/classify", post(classify));
    let listener = tokio::net::TcpListener::bind("0.0.0.0:4300").await?;
    axum::serve(listener, app).await?;
    Ok(())
}
async fn classify(Json(req): Json<ClassifyRequest>) -> Json<ClassifyResponse> {
    let text = req.text.to_lowercase();
    let red = ["child", "youth record", "legal", "tax", "grant submit", "bank", "donor commitment", "ssn"].iter().any(|k| text.contains(k));
    let orange = ["send", "post", "call", "email", "publish", "schedule"].iter().any(|k| text.contains(k));
    if red { Json(ClassifyResponse { risk: "red", approval_required: true, reason: "Money, legal, youth data, or signer-controlled action." }) }
    else if orange { Json(ClassifyResponse { risk: "orange", approval_required: true, reason: "External communication/action." }) }
    else { Json(ClassifyResponse { risk: "green", approval_required: false, reason: "Internal read/draft task." }) }
}
