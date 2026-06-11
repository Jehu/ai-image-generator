// Text-/Vision-LLM-Calls über OpenRouter-Chat-Completions.
// Ersetzt die direkten Gemini-Calls aus src/server/analyze.ts und
// src/server/styleBrief.ts — gleiche Instruktionen, gleiches Verhalten.
use serde_json::{json, Value};

use crate::config::Config;
use crate::error::{AppError, AppResult};
use crate::provider::{or_request, BASE_URL};

// Anweisung für die Stil-Analyse — wörtlich aus src/server/analyze.ts.
const ANALYZE_INSTRUCTION: &str = r#"Analysiere AUSSCHLIESSLICH den fotografischen STIL dieses Bildes — nicht das Motiv, nicht den Bildinhalt.

Beurteile die Anmutung von Kamera/Optik, Licht, Farbe/Color-Grade/Film-Emulation, Post-Processing, Komposition und Stimmung.

Gib NUR ein JSON-Objekt nach folgendem Schema zurück (keine Erklärung, kein Markdown). Setze NUR Felder, die im Bild klar erkennbar sind; lass unklare Felder weg.

{
  "type": string,
  "camera": { "body": string, "lens_mm": number, "aperture": string, "iso": number, "shutter_speed": string, "format": string },
  "optics": { "depth_of_field": string, "bokeh": string, "vignette": string, "lens_flare": boolean, "chromatic_aberration": boolean },
  "lighting": { "setup": string, "primary_source": string, "direction": string, "quality": string, "color_temperature_k": number, "fill_ratio": string },
  "color": { "palette": string[], "temperature": string, "saturation": string, "grade": string, "film_emulation": string, "contrast": string },
  "post_processing": { "grain": string, "halation": boolean, "clarity": string, "sharpening": string, "finish": string },
  "composition": { "framing": string, "angle": string, "rule_of_thirds": boolean, "negative_space": string },
  "mood": string,
  "negative": string
}

WICHTIG:
- Fülle KEIN "subject"-Feld und beschreibe NICHT das abgebildete Motiv. Nur Stil.
- Befülle "negative" mit sinnvollen Guards (z.B. unerwünschte Artefakte/Looks, die diesem Stil widersprechen)."#;

// Anweisung für den Style-Brief — wörtlich aus src/server/styleBrief.ts.
const BRIEF_INSTRUCTION: &str = r#"You are a photography/art director writing a concise STYLE BRIEF.

Rewrite the following structured style JSON into a human-readable Markdown brief in flowing English prose — a briefing document a client or editor could read.

Rules:
- Write in English, in connected sentences (no bullet lists, no JSON, no key:value dumps).
- Use level-2 Markdown headings (## ) for the sections that have content, in this order when present:
  ## Visual Style (overall look / mood / negative guards), ## Camera, ## Optics, ## Lighting, ## Colors, ## Post-Processing, ## Composition.
- OMIT any section whose underlying fields are empty or not set — no empty sections, no "N/A".
- Bold the key style terms taken from the JSON values (camera bodies, lenses, light qualities, color grades, framing, etc.) using **double asterisks**.
- Describe ONLY the style/aesthetic. Never invent or describe a subject/motif.
- Output ONLY the Markdown brief — no preamble, no explanation, no code fences."#;

async fn chat_completion(
    http: &reqwest::Client,
    config: &Config,
    model: &str,
    content: Value,
    json_output: bool,
) -> AppResult<String> {
    let mut body = json!({
        "model": model,
        "messages": [{ "role": "user", "content": content }],
    });
    if json_output {
        body["response_format"] = json!({ "type": "json_object" });
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
    let json: Value = res
        .json()
        .await
        .map_err(|_| AppError::msg(format!("OpenRouter-Antwort konnte nicht gelesen werden (HTTP {status}).")))?;

    if !status.is_success() {
        let msg = json["error"]["message"]
            .as_str()
            .map(|s| s.to_string())
            .unwrap_or_else(|| format!("HTTP {status}"));
        return Err(AppError::msg(msg));
    }

    Ok(json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or_default()
        .to_string())
}

/// Entfernt optionale Markdown-Code-Fences um eine JSON-Antwort.
fn strip_code_fences(text: &str) -> &str {
    let t = text.trim();
    let t = t
        .strip_prefix("```json")
        .or_else(|| t.strip_prefix("```"))
        .unwrap_or(t);
    t.strip_suffix("```").unwrap_or(t).trim()
}

/// Stil-Analyse eines Bildes → styleJson (ohne subject).
pub async fn analyze_style(
    http: &reqwest::Client,
    config: &Config,
    image_base64: &str,
    mime_type: &str,
) -> AppResult<Value> {
    let model = config.analysis_model().to_string();
    let content = json!([
        {
            "type": "image_url",
            "image_url": { "url": format!("data:{mime_type};base64,{image_base64}") }
        },
        { "type": "text", "text": ANALYZE_INSTRUCTION },
    ]);

    let text = chat_completion(http, config, &model, content, true)
        .await
        .map_err(|e| {
            AppError::msg(format!(
                "Stil-Analyse fehlgeschlagen: {e}. Bei Modell-Problemen prüfe die Variable OPENROUTER_ANALYSIS_MODEL (aktuell: {model})."
            ))
        })?;

    let parsed: Value = serde_json::from_str(strip_code_fences(&text))
        .map_err(|_| AppError::msg("Antwort des Modells war kein gültiges JSON."))?;

    let mut obj = match parsed {
        Value::Object(o) => o,
        _ => return Err(AppError::msg("Antwort des Modells war kein JSON-Objekt.")),
    };
    // Nur Stil zurückgeben: ein versehentlich gesetztes "subject" entfernen.
    obj.shift_remove("subject");
    Ok(Value::Object(obj))
}

/// Markdown-Style-Brief aus dem Stil-JSON. Leerer Stil → leerer Brief.
pub async fn build_style_brief(
    http: &reqwest::Client,
    config: &Config,
    style_json: &Value,
    kind: Option<&str>,
) -> AppResult<String> {
    if crate::prompt::is_empty_style(style_json) {
        return Ok(String::new());
    }

    let model = config.brief_model().to_string();
    let kind_hint = kind
        .map(|k| format!("Image kind: {k}.\n\n"))
        .unwrap_or_default();
    let style_pretty =
        serde_json::to_string_pretty(style_json).unwrap_or_else(|_| "{}".to_string());
    let prompt = format!("{BRIEF_INSTRUCTION}\n\n{kind_hint}STYLE JSON:\n{style_pretty}");

    let text = chat_completion(http, config, &model, json!(prompt), false)
        .await
        .map_err(|e| {
            AppError::msg(format!(
                "Style-Brief-Generierung fehlgeschlagen: {e}. Bei Modell-Problemen prüfe die Variable OPENROUTER_BRIEF_MODEL (aktuell: {model})."
            ))
        })?;

    Ok(text.trim().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_code_fences() {
        assert_eq!(strip_code_fences("```json\n{\"a\":1}\n```"), "{\"a\":1}");
        assert_eq!(strip_code_fences("{\"a\":1}"), "{\"a\":1}");
        assert_eq!(strip_code_fences("```\n{}\n```"), "{}");
    }
}
