// Serialisierbare DTOs — 1:1-Spiegel von src/lib/types.ts und den
// Input-Interfaces der früheren Server Functions. camelCase über serde,
// Datumswerte als ISO-Strings. Das Frontend bleibt unverändert.
use serde::{Deserialize, Serialize};
use serde_json::Value;

// ---------- Provider-Parameter (Spiegel von src/lib/providers/types.ts) ----------

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateParams {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_size: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thinking_level: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub count: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReferenceImage {
    pub mime_type: String,
    /// base64, ohne data:-Präfix
    pub data: String,
}

// ---------- Style ----------

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StyleDTO {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub kind: String,
    pub tags: Vec<String>,
    pub style_json: Value,
    pub style_brief: Option<String>,
    pub schema_version: i64,
    pub version: i64,
    pub provider: String,
    pub model_id: String,
    pub default_params: Value,
    pub anchor_image_ids: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StyleVersionDTO {
    pub version: i64,
    pub style_json: Value,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationDTO {
    pub id: String,
    pub style_id: Option<String>,
    pub subject: String,
    pub prompt_text: String,
    pub provider: String,
    pub model_id: String,
    pub params: Value,
    pub status: String,
    pub error_message: Option<String>,
    pub cost_usd: Option<f64>,
    pub output_image_ids: Vec<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateStyleInput {
    pub name: String,
    pub description: Option<String>,
    pub kind: Option<String>,
    pub tags: Option<Vec<String>>,
    pub style_json: Value,
    pub default_params: Option<Value>,
    pub anchor_image_ids: Option<Vec<String>>,
    pub provider: Option<String>,
    pub model_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStyleInput {
    pub id: String,
    pub name: Option<String>,
    // description darf explizit null sein (löschen) — doppelte Option
    // unterscheidet "nicht gesetzt" von "null".
    #[serde(default, deserialize_with = "deserialize_explicit_null")]
    pub description: Option<Option<String>>,
    pub kind: Option<String>,
    pub tags: Option<Vec<String>>,
    pub style_json: Option<Value>,
    pub default_params: Option<Value>,
    pub anchor_image_ids: Option<Vec<String>>,
    pub provider: Option<String>,
    pub model_id: Option<String>,
}

fn deserialize_explicit_null<'de, D>(
    deserializer: D,
) -> Result<Option<Option<String>>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let v: Option<String> = Option::deserialize(deserializer)?;
    Ok(Some(v))
}

// ---------- Generate ----------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateInput {
    pub style_json: Value,
    pub subject: String,
    pub provider: Option<String>,
    pub model_id: Option<String>,
    pub params: Option<GenerateParams>,
    pub references: Option<Vec<ReferenceImage>>,
    pub kind: Option<String>,
    pub style_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedImageOut {
    pub data_url: String,
    pub mime_type: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateOutput {
    pub images: Vec<GeneratedImageOut>,
    pub compiled_prompt: Value,
    pub prompt_text: String,
    pub cost_usd: f64,
}

// ---------- Images / Anchors ----------

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnchorImageDTO {
    pub id: String,
    pub data_url: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DataUrlOut {
    pub data_url: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AddAnchorOut {
    pub image_id: String,
    pub anchor_image_ids: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveAnchorOut {
    pub anchor_image_ids: Vec<String>,
}

// ---------- Analyze / Brief ----------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyzeStyleInput {
    pub image_base64: String,
    pub mime_type: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyzeStyleOutput {
    pub style_json: Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompileStyleBriefInput {
    pub style_json: Value,
    pub kind: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompileStyleBriefResult {
    pub brief: String,
}

// ---------- Models / Settings ----------

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AvailableModel {
    pub provider_id: String,
    pub model_id: String,
    pub label: String,
    pub supports_references: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsInfo {
    pub has_open_router_key: bool,
    pub open_router_key_masked: Option<String>,
    /// Herkunft des wirksamen Keys: "env" (Vorrang, UI-Änderung wirkungslos)
    /// oder "config" (über die Einstellungen-UI gespeichert); None = kein Key.
    pub open_router_key_source: Option<String>,
    pub config_path: String,
    pub image_dir: String,
    pub database_url: String,
}

/// Coerce beliebiger Strings auf eine gültige ImageKind (Fallback: foto) —
/// Port von asImageKind() aus src/lib/kinds/types.ts.
pub fn as_image_kind(value: Option<&str>) -> String {
    match value {
        Some("foto") | Some("illustration") | Some("infografik") => {
            value.unwrap().to_string()
        }
        _ => "foto".to_string(),
    }
}
