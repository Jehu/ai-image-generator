// OpenRouter-Bildgenerierung über die dedizierte Image API.
use std::collections::HashMap;
use std::time::{Duration, Instant};

use serde_json::{json, Value};
use tokio::sync::Mutex;

use crate::config::Config;
use crate::dto::{GenerateParams, ReferenceImage};
use crate::error::{AppError, AppResult};

pub const BASE_URL: &str = "https://openrouter.ai/api/v1";
pub const IMAGE_MODEL_TTL: Duration = Duration::from_secs(6 * 60 * 60);
const PRICE_TTL: Duration = Duration::from_secs(6 * 60 * 60);

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ImageModel {
    pub id: String,
    pub label: String,
    pub image_sizes: Vec<String>,
    pub aspect_ratios: Vec<String>,
    pub max_count: u32,
    pub max_references: u32,
}

pub struct ImageModelCache {
    at: Instant,
    models: Vec<ImageModel>,
}

pub struct PriceCache {
    at: Instant,
    by_model: HashMap<String, f64>,
}

pub struct GeneratedImage {
    pub data: String,
    pub mime_type: String,
}

pub struct GenerateResult {
    pub images: Vec<GeneratedImage>,
    pub cost_usd: f64,
}

struct ImageResponse {
    images: Vec<GeneratedImage>,
    cost: f64,
}

pub fn api_key(config: &Config) -> AppResult<String> {
    config
        .openrouter_api_key()
        .map(|s| s.to_string())
        .ok_or_else(|| {
            AppError::msg(
                "OPENROUTER_API_KEY ist nicht gesetzt. Trage ihn in den Einstellungen bzw. der .env-Datei ein (siehe .env.example).",
            )
        })
}

/// Request-Builder mit Auth- und optionalen Attribution-Headern.
pub fn or_request(
    http: &reqwest::Client,
    config: &Config,
    method: reqwest::Method,
    url: &str,
) -> AppResult<reqwest::RequestBuilder> {
    let key = api_key(config)?;
    let mut req = http
        .request(method, url)
        .header("Authorization", format!("Bearer {key}"))
        .header("Content-Type", "application/json");
    if let Some(referer) = config.get("OPENROUTER_HTTP_REFERER") {
        req = req.header("HTTP-Referer", referer);
    }
    if let Some(title) = config.get("OPENROUTER_APP_TITLE") {
        req = req.header("X-Title", title);
    }
    Ok(req)
}

fn enum_values(parameter: &Value) -> Vec<String> {
    parameter["values"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .map(ToString::to_string)
        .collect()
}

fn range_max(parameter: &Value) -> Option<u32> {
    parameter["max"]
        .as_u64()
        .and_then(|value| value.try_into().ok())
}

fn parse_image_models(json: &Value) -> AppResult<Vec<ImageModel>> {
    let models = json["data"]
        .as_array()
        .ok_or_else(|| AppError::msg("OpenRouter hat keine gültige Bildmodellliste geliefert."))?;

    Ok(models
        .iter()
        .filter_map(|model| {
            let id = model["id"].as_str()?.trim();
            if id.is_empty() {
                return None;
            }
            let parameters = &model["supported_parameters"];
            Some(ImageModel {
                id: id.to_string(),
                label: model["name"].as_str().unwrap_or(id).to_string(),
                max_references: range_max(&parameters["input_references"]).unwrap_or(0),
                image_sizes: enum_values(&parameters["resolution"]),
                aspect_ratios: enum_values(&parameters["aspect_ratio"]),
                max_count: range_max(&parameters["n"]).unwrap_or(1).max(1),
            })
        })
        .collect())
}

async fn fetch_image_models(http: &reqwest::Client, config: &Config) -> AppResult<Vec<ImageModel>> {
    let res = or_request(
        http,
        config,
        reqwest::Method::GET,
        &format!("{BASE_URL}/images/models"),
    )?
    .send()
    .await?;
    let status = res.status();
    let json: Value = res.json().await.map_err(|_| {
        AppError::msg(format!(
            "OpenRouter-Modellliste konnte nicht gelesen werden (HTTP {status})."
        ))
    })?;
    if !status.is_success() {
        let msg = json["error"]["message"]
            .as_str()
            .unwrap_or("Unbekannter Fehler");
        return Err(AppError::msg(format!(
            "OpenRouter-Modellliste konnte nicht geladen werden: {msg}"
        )));
    }
    let models = parse_image_models(&json)?;
    if models.is_empty() {
        return Err(AppError::msg(
            "OpenRouter hat keine Bildmodelle zurückgegeben. Bitte später erneut versuchen.",
        ));
    }
    Ok(models)
}

pub async fn available_image_models(
    http: &reqwest::Client,
    config: &Config,
    cache: &Mutex<Option<ImageModelCache>>,
) -> AppResult<Vec<ImageModel>> {
    let mut guard = cache.lock().await;
    if let Some(cached) = guard.as_ref() {
        if cached.at.elapsed() <= IMAGE_MODEL_TTL {
            return Ok(cached.models.clone());
        }
    }

    match fetch_image_models(http, config).await {
        Ok(models) => {
            *guard = Some(ImageModelCache {
                at: Instant::now(),
                models: models.clone(),
            });
            Ok(models)
        }
        Err(error) => guard
            .as_ref()
            .map(|cached| cached.models.clone())
            .ok_or(error),
    }
}

fn build_image_request(
    model: &ImageModel,
    prompt_text: &str,
    references: &[ReferenceImage],
    params: &GenerateParams,
) -> Value {
    let mut body = json!({ "model": model.id, "prompt": prompt_text });
    let count = params.count.unwrap_or(1).clamp(1, model.max_count);
    body["n"] = json!(count);

    if let Some(size) = params
        .image_size
        .as_deref()
        .filter(|size| model.image_sizes.iter().any(|supported| supported == size))
    {
        body["resolution"] = json!(size);
    }
    if let Some(ratio) = params.aspect_ratio.as_deref().filter(|ratio| {
        model
            .aspect_ratios
            .iter()
            .any(|supported| supported == ratio)
    }) {
        body["aspect_ratio"] = json!(ratio);
    }
    if model.max_references > 0 && !references.is_empty() {
        body["input_references"] = Value::Array(
            references
                .iter()
                .take(model.max_references as usize)
                .map(|reference| {
                    json!({
                        "type": "image_url",
                        "image_url": {
                            "url": format!("data:{};base64,{}", reference.mime_type, reference.data)
                        }
                    })
                })
                .collect(),
        );
    }
    body
}

fn parse_image_response(json: &Value) -> AppResult<ImageResponse> {
    let images = json["data"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|image| {
            let data = image["b64_json"].as_str()?.to_string();
            if data.is_empty() {
                return None;
            }
            Some(GeneratedImage {
                data,
                mime_type: image["media_type"]
                    .as_str()
                    .unwrap_or("image/png")
                    .to_string(),
            })
        })
        .collect();
    Ok(ImageResponse {
        images,
        cost: json["usage"]["cost"].as_f64().unwrap_or(0.0),
    })
}

async fn generate_once(
    http: &reqwest::Client,
    config: &Config,
    model: &ImageModel,
    prompt_text: &str,
    references: &[ReferenceImage],
    params: &GenerateParams,
) -> AppResult<ImageResponse> {
    let res = or_request(
        http,
        config,
        reqwest::Method::POST,
        &format!("{BASE_URL}/images"),
    )?
    .json(&build_image_request(model, prompt_text, references, params))
    .send()
    .await?;
    let status = res.status();
    let json: Value = res.json().await.map_err(|_| {
        AppError::msg(format!(
            "OpenRouter-Antwort konnte nicht gelesen werden (HTTP {status})."
        ))
    })?;
    if !status.is_success() {
        let msg = json["error"]["message"]
            .as_str()
            .unwrap_or_else(|| "Unbekannter Fehler");
        return Err(AppError::msg(format!(
            "OpenRouter-Bildgenerierung fehlgeschlagen: {msg}"
        )));
    }
    parse_image_response(&json)
}

/// Pro-Bild-Preis aus GET /models (gecacht, best-effort).
async fn image_price_for(
    http: &reqwest::Client,
    config: &Config,
    cache: &Mutex<Option<PriceCache>>,
    model_id: &str,
) -> f64 {
    let mut guard = cache.lock().await;
    let expired = guard
        .as_ref()
        .map(|c| c.at.elapsed() > PRICE_TTL)
        .unwrap_or(true);
    if expired {
        let mut by_model = HashMap::new();
        if let Ok(req) = or_request(
            http,
            config,
            reqwest::Method::GET,
            &format!("{BASE_URL}/models"),
        ) {
            if let Ok(res) = req.send().await {
                if let Ok(json) = res.json::<Value>().await {
                    if let Some(models) = json["data"].as_array() {
                        for model in models {
                            let id = model["id"].as_str().unwrap_or_default();
                            let price = model["pricing"]["image"]
                                .as_str()
                                .and_then(|value| value.parse::<f64>().ok())
                                .unwrap_or(0.0);
                            if !id.is_empty() && price > 0.0 {
                                by_model.insert(id.to_string(), price);
                            }
                        }
                    }
                }
            }
        }
        *guard = Some(PriceCache {
            at: Instant::now(),
            by_model,
        });
    }
    guard
        .as_ref()
        .and_then(|cache| cache.by_model.get(model_id).copied())
        .unwrap_or(0.0)
}

pub async fn generate(
    http: &reqwest::Client,
    config: &Config,
    price_cache: &Mutex<Option<PriceCache>>,
    model_cache: &Mutex<Option<ImageModelCache>>,
    model_id: &str,
    prompt_text: &str,
    references: &[ReferenceImage],
    params: &GenerateParams,
) -> AppResult<GenerateResult> {
    let model = available_image_models(http, config, model_cache)
        .await?
        .into_iter()
        .find(|model| model.id == model_id)
        .ok_or_else(|| {
            AppError::msg(format!(
                "Das Modell '{model_id}' ist bei OpenRouter nicht mehr verfügbar. Wähle ein anderes Bildmodell."
            ))
        })?;
    let result = generate_once(http, config, &model, prompt_text, references, params).await?;
    if result.images.is_empty() {
        return Err(AppError::msg(
            "OpenRouter hat kein Bild zurückgegeben (evtl. Safety-Filter, ungültiger Prompt oder das Modell liefert keinen Bild-Output).",
        ));
    }
    let cost_usd = if result.cost == 0.0 {
        image_price_for(http, config, price_cache, model_id).await * result.images.len() as f64
    } else {
        result.cost
    };
    Ok(GenerateResult {
        images: result.images,
        cost_usd,
    })
}

/// Legacy-Mapping: Stile/Aufrufe aus der Web-App-Ära (direkter Gemini-Provider)
/// werden transparent auf das OpenRouter-Pendant umgelenkt.
pub fn resolve_model(provider: Option<&str>, model_id: Option<&str>) -> AppResult<String> {
    let provider = provider.unwrap_or("openrouter");
    match provider {
        "openrouter" => Ok(model_id
            .unwrap_or("google/gemini-3-pro-image-preview")
            .to_string()),
        "gemini" => Ok(match model_id {
            None | Some("gemini-3-pro-image") => "google/gemini-3-pro-image-preview".to_string(),
            Some(other) => format!("google/{other}"),
        }),
        other => Err(AppError::msg(format!(
            "Provider '{other}' ist in der Desktop-App nicht verfügbar — nur OpenRouter wird unterstützt. Wähle ein OpenRouter-Modell."
        ))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_legacy_gemini_default() {
        assert_eq!(
            resolve_model(Some("gemini"), Some("gemini-3-pro-image")).unwrap(),
            "google/gemini-3-pro-image-preview"
        );
        assert_eq!(
            resolve_model(None, None).unwrap(),
            "google/gemini-3-pro-image-preview"
        );
        assert!(resolve_model(Some("openai"), Some("gpt-image-1")).is_err());
    }

    #[test]
    fn parses_image_model_capabilities() {
        let models = parse_image_models(&json!({
            "data": [{
                "id": "example/image",
                "name": "Example Image",
                "supported_parameters": {
                    "input_references": { "type": "range", "min": 0, "max": 2 },
                    "resolution": { "type": "enum", "values": ["1K", "2K"] },
                    "aspect_ratio": { "type": "enum", "values": ["1:1", "16:9"] },
                    "n": { "type": "range", "min": 1, "max": 3 }
                }
            }]
        }))
        .unwrap();

        assert_eq!(models.len(), 1);
        assert_eq!(models[0].id, "example/image");
        assert_eq!(models[0].image_sizes, ["1K", "2K"]);
        assert_eq!(models[0].aspect_ratios, ["1:1", "16:9"]);
        assert_eq!(models[0].max_count, 3);
        assert_eq!(models[0].max_references, 2);
    }

    #[test]
    fn builds_image_api_request_from_capabilities() {
        let model = ImageModel {
            id: "example/image".to_string(),
            label: "Example Image".to_string(),
            image_sizes: vec!["2K".to_string()],
            aspect_ratios: vec!["1:1".to_string()],
            max_count: 2,
            max_references: 1,
        };
        let body = build_image_request(
            &model,
            "test prompt",
            &[ReferenceImage {
                mime_type: "image/png".to_string(),
                data: "QUJD".to_string(),
            }],
            &GenerateParams {
                aspect_ratio: Some("1:1".to_string()),
                image_size: Some("2K".to_string()),
                thinking_level: None,
                count: Some(4),
            },
        );

        assert_eq!(body["model"], "example/image");
        assert_eq!(body["n"], 2);
        assert_eq!(body["resolution"], "2K");
        assert_eq!(body["aspect_ratio"], "1:1");
        assert_eq!(
            body["input_references"][0]["image_url"]["url"],
            "data:image/png;base64,QUJD"
        );
    }

    #[test]
    fn parses_buffered_image_response() {
        let result = parse_image_response(&json!({
            "data": [{ "b64_json": "QUJD", "media_type": "image/webp" }],
            "usage": { "cost": 0.12 }
        }))
        .unwrap();

        assert_eq!(result.images[0].data, "QUJD");
        assert_eq!(result.images[0].mime_type, "image/webp");
        assert_eq!(result.cost, 0.12);
    }
}
