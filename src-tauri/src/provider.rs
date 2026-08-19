// OpenRouter-Bildgenerierung über die dedizierte Image API.
use std::collections::HashMap;
use std::time::{Duration, Instant};

use serde_json::{json, Value};
use tokio::sync::Mutex;

use crate::config::Config;
use crate::dto::{GenerateParams, ReferenceImage};
use crate::error::{AppError, AppResult};
use crate::prompt::render_prompt_as_text;

pub const BASE_URL: &str = "https://openrouter.ai/api/v1";
pub const VENICE_BASE_URL: &str = "https://api.venice.ai/api/v1";
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
    provider: String,
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
        .map(ToString::to_string)
        .ok_or_else(|| {
            AppError::msg(
                "OPENROUTER_API_KEY ist nicht gesetzt. Trage ihn in den Einstellungen bzw. der .env-Datei ein (siehe .env.example).",
            )
        })
}

fn venice_api_key(config: &Config) -> AppResult<String> {
    config.venice_api_key().map(ToString::to_string).ok_or_else(|| {
        AppError::msg(
            "VENICE_API_KEY ist nicht gesetzt. Trage ihn in den Einstellungen bzw. der .env-Datei ein (siehe .env.example).",
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
            (!id.is_empty()).then(|| {
                let parameters = &model["supported_parameters"];
                ImageModel {
                    id: id.to_string(),
                    label: model["name"].as_str().unwrap_or(id).to_string(),
                    max_references: range_max(&parameters["input_references"]).unwrap_or(0),
                    image_sizes: enum_values(&parameters["resolution"]),
                    aspect_ratios: enum_values(&parameters["aspect_ratio"]),
                    max_count: range_max(&parameters["n"]).unwrap_or(1).max(1),
                }
            })
        })
        .collect())
}

fn parse_venice_image_models(json: &Value) -> AppResult<Vec<ImageModel>> {
    let models = json["data"]
        .as_array()
        .ok_or_else(|| AppError::msg("Venice hat keine gültige Bildmodellliste geliefert."))?;
    Ok(models
        .iter()
        .filter(|model| model["type"].as_str() == Some("image"))
        .filter_map(|model| {
            let id = model["id"].as_str()?.trim();
            (!id.is_empty()).then(|| {
                let spec = &model["model_spec"];
                let constraints = &spec["constraints"];
                ImageModel {
                    id: id.to_string(),
                    label: spec["name"].as_str().unwrap_or(id).to_string(),
                    max_references: if spec["supportsStyleReferences"].as_bool().unwrap_or(false) {
                        constraints["maxStyleReferences"].as_u64().unwrap_or(0) as u32
                    } else {
                        0
                    },
                    image_sizes: constraints["resolutions"]
                        .as_array()
                        .into_iter()
                        .flatten()
                        .filter_map(Value::as_str)
                        .map(ToString::to_string)
                        .collect(),
                    aspect_ratios: constraints["aspectRatios"]
                        .as_array()
                        .into_iter()
                        .flatten()
                        .filter_map(Value::as_str)
                        .map(ToString::to_string)
                        .collect(),
                    max_count: 4,
                }
            })
        })
        .collect())
}

fn prompt_for_request(prompt_object: &Value) -> String {
    render_prompt_as_text(prompt_object)
}

async fn fetch_image_models(
    provider: &str,
    http: &reqwest::Client,
    config: &Config,
) -> AppResult<Vec<ImageModel>> {
    let (url, key) = match provider {
        "openrouter" => (format!("{BASE_URL}/images/models"), api_key(config)?),
        "venice" => (
            format!("{VENICE_BASE_URL}/models?type=image"),
            venice_api_key(config)?,
        ),
        _ => {
            return Err(AppError::msg(format!(
                "Unbekannter Bildprovider: {provider}"
            )))
        }
    };
    let res = http
        .get(url)
        .header("Authorization", format!("Bearer {key}"))
        .send()
        .await?;
    let status = res.status();
    let json: Value = res.json().await.map_err(|_| {
        AppError::msg(format!(
            "{provider}-Modellliste konnte nicht gelesen werden (HTTP {status})."
        ))
    })?;
    if !status.is_success() {
        let msg = json["error"]["message"]
            .as_str()
            .unwrap_or("Unbekannter Fehler");
        return Err(AppError::msg(format!(
            "{provider}-Modellliste konnte nicht geladen werden: {msg}"
        )));
    }
    let models = if provider == "venice" {
        parse_venice_image_models(&json)?
    } else {
        parse_image_models(&json)?
    };
    if models.is_empty() {
        return Err(AppError::msg(format!(
            "{provider} hat keine Bildmodelle zurückgegeben. Bitte später erneut versuchen."
        )));
    }
    Ok(models)
}

pub async fn available_image_models(
    provider: &str,
    http: &reqwest::Client,
    config: &Config,
    cache: &Mutex<Option<ImageModelCache>>,
) -> AppResult<Vec<ImageModel>> {
    let mut guard = cache.lock().await;
    if let Some(cached) = guard.as_ref() {
        if cached.provider == provider && cached.at.elapsed() <= IMAGE_MODEL_TTL {
            return Ok(cached.models.clone());
        }
    }
    match fetch_image_models(provider, http, config).await {
        Ok(models) => {
            *guard = Some(ImageModelCache {
                at: Instant::now(),
                provider: provider.to_string(),
                models: models.clone(),
            });
            Ok(models)
        }
        Err(error) => guard
            .as_ref()
            .filter(|cached| cached.provider == provider)
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

fn build_venice_image_request(
    model: &ImageModel,
    prompt_text: &str,
    references: &[ReferenceImage],
    params: &GenerateParams,
) -> Value {
    let mut body = json!({
        "model": model.id,
        "prompt": prompt_text,
        "format": "png",
        "variants": params.count.unwrap_or(1).clamp(1, model.max_count),
    });
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
    if model.max_references > 0 {
        body["style_references"] = Value::Array(
            references
                .iter()
                .take(model.max_references as usize)
                .map(|reference| {
                    json!({
                        "image": format!("data:{};base64,{}", reference.mime_type, reference.data),
                    })
                })
                .collect(),
        );
    }
    body
}

fn parse_venice_image_response(json: &Value) -> AppResult<ImageResponse> {
    let images = json["images"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .filter(|data| !data.is_empty())
        .map(|data| GeneratedImage {
            data: data.to_string(),
            mime_type: "image/png".to_string(),
        })
        .collect();
    Ok(ImageResponse { images, cost: 0.0 })
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
    provider: &str,
    http: &reqwest::Client,
    config: &Config,
    model: &ImageModel,
    prompt_text: &str,
    references: &[ReferenceImage],
    params: &GenerateParams,
) -> AppResult<ImageResponse> {
    let (url, key, body) = match provider {
        "openrouter" => (
            format!("{BASE_URL}/images"),
            api_key(config)?,
            build_image_request(model, prompt_text, references, params),
        ),
        "venice" => (
            format!("{VENICE_BASE_URL}/image/generate"),
            venice_api_key(config)?,
            build_venice_image_request(model, prompt_text, references, params),
        ),
        _ => {
            return Err(AppError::msg(format!(
                "Unbekannter Bildprovider: {provider}"
            )))
        }
    };
    let res = http.post(url).bearer_auth(key).json(&body).send().await?;
    let status = res.status();
    let json: Value = res.json().await.map_err(|_| {
        AppError::msg(format!(
            "{provider}-Antwort konnte nicht gelesen werden (HTTP {status})."
        ))
    })?;
    if !status.is_success() {
        let msg = json["error"]["message"]
            .as_str()
            .or_else(|| json["error"].as_str())
            .unwrap_or("Unbekannter Fehler");
        return Err(AppError::msg(format!(
            "{provider}-Bildgenerierung fehlgeschlagen: {msg}"
        )));
    }
    if provider == "venice" {
        parse_venice_image_response(&json)
    } else {
        parse_image_response(&json)
    }
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

async fn venice_image_price_for(
    http: &reqwest::Client,
    config: &Config,
    model_id: &str,
    params: &GenerateParams,
) -> f64 {
    let Ok(key) = venice_api_key(config) else {
        return 0.0;
    };
    let Ok(res) = http
        .get(format!("{VENICE_BASE_URL}/models?type=image"))
        .bearer_auth(key)
        .send()
        .await
    else {
        return 0.0;
    };
    let Ok(json) = res.json::<Value>().await else {
        return 0.0;
    };
    let Some(model) = json["data"].as_array().and_then(|models| {
        models
            .iter()
            .find(|model| model["id"].as_str() == Some(model_id))
    }) else {
        return 0.0;
    };
    let pricing = &model["model_spec"]["pricing"];
    let per_image = pricing["generation"]["usd"]
        .as_f64()
        .or_else(|| {
            params
                .image_size
                .as_deref()
                .and_then(|size| pricing["resolutions"][size]["usd"].as_f64())
        })
        .unwrap_or(0.0);
    per_image * params.count.unwrap_or(1) as f64
}

pub async fn generate(
    provider: &str,
    http: &reqwest::Client,
    config: &Config,
    price_cache: &Mutex<Option<PriceCache>>,
    model_cache: &Mutex<Option<ImageModelCache>>,
    model_id: &str,
    prompt_object: &Value,
    references: &[ReferenceImage],
    params: &GenerateParams,
) -> AppResult<GenerateResult> {
    let model = available_image_models(provider, http, config, model_cache)
        .await?
        .into_iter()
        .find(|model| model.id == model_id)
        .ok_or_else(|| AppError::msg(format!(
            "Das Modell '{model_id}' ist bei {provider} nicht mehr verfügbar. Wähle ein anderes Bildmodell."
        )))?;
    let prompt_text = prompt_for_request(prompt_object);
    let result = generate_once(
        provider,
        http,
        config,
        &model,
        &prompt_text,
        references,
        params,
    )
    .await?;
    if result.images.is_empty() {
        return Err(AppError::msg(format!(
            "{provider} hat kein Bild zurückgegeben (evtl. Safety-Filter, ungültiger Prompt oder das Modell liefert keinen Bild-Output)."
        )));
    }
    let cost_usd = if result.cost > 0.0 {
        result.cost
    } else if provider == "openrouter" {
        image_price_for(http, config, price_cache, model_id).await * result.images.len() as f64
    } else {
        venice_image_price_for(http, config, model_id, params).await
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
        "venice" => model_id
            .filter(|model| !model.trim().is_empty())
            .map(ToString::to_string)
            .ok_or_else(|| {
                AppError::msg(
                    "Für Venice muss ein Bildmodell ausgewählt werden. Wähle ein Venice-Bildmodell.",
                )
            }),
        "gemini" => Ok(match model_id {
            None | Some("gemini-3-pro-image") => "google/gemini-3-pro-image-preview".to_string(),
            Some(other) => format!("google/{other}"),
        }),
        other => Err(AppError::msg(format!(
            "Provider '{other}' ist in der Desktop-App nicht verfügbar. Wähle ein OpenRouter- oder Venice-Modell."
        ))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_provider_models() {
        assert_eq!(
            resolve_model(Some("gemini"), Some("gemini-3-pro-image")).unwrap(),
            "google/gemini-3-pro-image-preview"
        );
        assert_eq!(
            resolve_model(None, None).unwrap(),
            "google/gemini-3-pro-image-preview"
        );
        assert_eq!(
            resolve_model(Some("venice"), Some("krea-v2-large")).unwrap(),
            "krea-v2-large"
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
    fn parses_venice_style_reference_capabilities() {
        let models = parse_venice_image_models(&json!({
            "data": [{
                "id": "krea-v2-large",
                "type": "image",
                "model_spec": {
                    "name": "Krea v2 Large",
                    "supportsStyleReferences": true,
                    "constraints": {
                        "resolutions": ["1K", "2K"],
                        "aspectRatios": ["1:1", "16:9"],
                        "maxStyleReferences": 3
                    }
                }
            }]
        }))
        .unwrap();
        assert_eq!(models[0].max_references, 3);
        assert_eq!(models[0].image_sizes, ["1K", "2K"]);
    }

    #[test]
    fn renders_plain_text_for_every_image_model() {
        let prompt = json!({ "mood": "calm", "subject": "a red apple" });

        assert_eq!(
            prompt_for_request(&prompt),
            "Create an image of a red apple.\n\nStyle requirements:\n- Mood: calm"
        );
    }

    #[test]
    fn builds_venice_request_with_style_references() {
        let model = ImageModel {
            id: "krea-v2-large".to_string(),
            label: "Krea v2 Large".to_string(),
            image_sizes: vec!["2K".to_string()],
            aspect_ratios: vec!["16:9".to_string()],
            max_count: 4,
            max_references: 1,
        };
        let body = build_venice_image_request(
            &model,
            "test prompt",
            &[ReferenceImage {
                mime_type: "image/png".to_string(),
                data: "QUJD".to_string(),
            }],
            &GenerateParams {
                aspect_ratio: Some("16:9".to_string()),
                image_size: Some("2K".to_string()),
                thinking_level: None,
                count: Some(5),
            },
        );
        assert_eq!(body["variants"], 4);
        assert_eq!(
            body["style_references"][0]["image"],
            "data:image/png;base64,QUJD"
        );
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
