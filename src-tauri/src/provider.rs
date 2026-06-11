// OpenRouter-Bildgenerierung — Port von src/lib/providers/openrouter.ts.
// Chat-Completions mit `modalities: ["image","text"]`; N Varianten = N
// parallele Calls. Kosten bevorzugt aus `usage.cost`, Fallback: Live-Preis
// aus /models (6 h gecacht).
use std::collections::HashMap;
use std::time::{Duration, Instant};

use serde_json::{json, Value};
use tokio::sync::Mutex;

use crate::config::Config;
use crate::dto::{GenerateParams, ReferenceImage};
use crate::error::{AppError, AppResult};

pub const BASE_URL: &str = "https://openrouter.ai/api/v1";
const PRICE_TTL: Duration = Duration::from_secs(6 * 60 * 60);

pub struct ModelDescriptor {
    pub id: &'static str,
    pub label: &'static str,
    pub supports_references: bool,
    pub supports_image_config: bool,
}

/// Kuratierte Bild-Output-Modelle (identisch zur Web-App).
pub const OPENROUTER_MODELS: &[ModelDescriptor] = &[
    ModelDescriptor {
        id: "google/gemini-3-pro-image-preview",
        label: "OpenRouter · Nano Banana Pro (Gemini 3 Pro Image)",
        supports_references: true,
        supports_image_config: true,
    },
    ModelDescriptor {
        id: "google/gemini-3.1-flash-image-preview",
        label: "OpenRouter · Nano Banana 2 (Gemini 3.1 Flash Image)",
        supports_references: true,
        supports_image_config: true,
    },
    ModelDescriptor {
        id: "google/gemini-2.5-flash-image",
        label: "OpenRouter · Nano Banana (Gemini 2.5 Flash Image)",
        supports_references: true,
        supports_image_config: true,
    },
    ModelDescriptor {
        id: "openai/gpt-5-image",
        label: "OpenRouter · GPT-5 Image",
        supports_references: true,
        supports_image_config: false,
    },
    ModelDescriptor {
        id: "openai/gpt-5-image-mini",
        label: "OpenRouter · GPT-5 Image Mini",
        supports_references: true,
        supports_image_config: false,
    },
];

pub fn model_meta(model_id: &str) -> Option<&'static ModelDescriptor> {
    OPENROUTER_MODELS.iter().find(|m| m.id == model_id)
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

fn parse_data_url_image(url: &str) -> Option<GeneratedImage> {
    let rest = url.strip_prefix("data:")?;
    let (mime, b64) = rest.split_once(";base64,")?;
    if b64.is_empty() {
        return None;
    }
    Some(GeneratedImage {
        mime_type: mime.to_string(),
        data: b64.to_string(),
    })
}

struct OnceResult {
    image: Option<GeneratedImage>,
    cost: f64,
}

async fn generate_once(
    http: &reqwest::Client,
    config: &Config,
    model_id: &str,
    prompt_text: &str,
    references: &[ReferenceImage],
    params: &GenerateParams,
) -> AppResult<OnceResult> {
    let meta = model_meta(model_id);
    let use_refs =
        meta.map(|m| m.supports_references).unwrap_or(false) && !references.is_empty();

    let mut content: Vec<Value> = vec![json!({ "type": "text", "text": prompt_text })];
    if use_refs {
        for r in references {
            content.push(json!({
                "type": "image_url",
                "image_url": { "url": format!("data:{};base64,{}", r.mime_type, r.data) }
            }));
        }
    }

    let mut body = json!({
        "model": model_id,
        "messages": [{ "role": "user", "content": content }],
        "modalities": ["image", "text"],
        "usage": { "include": true },
    });
    if meta.map(|m| m.supports_image_config).unwrap_or(false) {
        body["image_config"] = json!({
            "aspect_ratio": params.aspect_ratio.as_deref().unwrap_or("1:1"),
            "image_size": params.image_size.as_deref().unwrap_or("2K"),
        });
    }

    let res = or_request(
        http,
        config,
        reqwest::Method::POST,
        &format!("{BASE_URL}/chat/completions"),
    )?
    .json(&body)
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
            .map(|s| s.to_string())
            .unwrap_or_else(|| format!("HTTP {status}"));
        return Err(AppError::msg(format!(
            "OpenRouter-Bildgenerierung fehlgeschlagen: {msg}"
        )));
    }

    let url = json["choices"][0]["message"]["images"][0]["image_url"]["url"].as_str();
    let image = url.and_then(parse_data_url_image);
    let cost = json["usage"]["cost"].as_f64().unwrap_or(0.0);
    Ok(OnceResult { image, cost })
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
        if let Ok(req) = or_request(http, config, reqwest::Method::GET, &format!("{BASE_URL}/models"))
        {
            if let Ok(res) = req.send().await {
                if let Ok(json) = res.json::<Value>().await {
                    if let Some(models) = json["data"].as_array() {
                        for m in models {
                            let id = m["id"].as_str().unwrap_or_default();
                            let price = m["pricing"]["image"]
                                .as_str()
                                .and_then(|p| p.parse::<f64>().ok())
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
        .and_then(|c| c.by_model.get(model_id).copied())
        .unwrap_or(0.0)
}

/// N Varianten parallel generieren — Port von openrouterProvider.generate().
pub async fn generate(
    http: &reqwest::Client,
    config: &Config,
    price_cache: &Mutex<Option<PriceCache>>,
    model_id: &str,
    prompt_text: &str,
    references: &[ReferenceImage],
    params: &GenerateParams,
) -> AppResult<GenerateResult> {
    let count = params.count.unwrap_or(1).clamp(1, 4) as usize;

    let calls = (0..count)
        .map(|_| generate_once(http, config, model_id, prompt_text, references, params));
    let results: Vec<AppResult<OnceResult>> = futures::future::join_all(calls).await;

    let mut images = Vec::new();
    let mut reported_cost = 0.0;
    let mut last_err: Option<AppError> = None;
    for r in results {
        match r {
            Ok(once) => {
                reported_cost += once.cost;
                if let Some(img) = once.image {
                    images.push(img);
                }
            }
            Err(e) => last_err = Some(e),
        }
    }

    if images.is_empty() {
        if let Some(e) = last_err {
            return Err(e);
        }
        return Err(AppError::msg(
            "OpenRouter hat kein Bild zurückgegeben (evtl. Safety-Filter, ungültiger Prompt oder das Modell liefert keinen Bild-Output).",
        ));
    }

    let mut cost_usd = reported_cost;
    if reported_cost == 0.0 {
        let unit = image_price_for(http, config, price_cache, model_id).await;
        cost_usd = unit * images.len() as f64;
    }

    Ok(GenerateResult { images, cost_usd })
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
            None | Some("gemini-3-pro-image") => {
                "google/gemini-3-pro-image-preview".to_string()
            }
            Some(other) => format!("google/{other}"),
        }),
        other => Err(AppError::msg(format!(
            "Provider '{other}' ist in der Desktop-App nicht verfügbar — nur OpenRouter wird unterstützt. Wähle ein OpenRouter-Modell.",
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
    fn parses_image_data_url() {
        let img = parse_data_url_image("data:image/png;base64,QUJD").unwrap();
        assert_eq!(img.mime_type, "image/png");
        assert_eq!(img.data, "QUJD");
        assert!(parse_data_url_image("https://x/y.png").is_none());
    }
}
