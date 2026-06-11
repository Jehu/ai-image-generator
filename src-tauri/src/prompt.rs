// Prompt-Kompilierung — Port von src/lib/prompt/compile.ts.
// Die Key-Reihenfolge ist Teil des Kontrakts (style_reference zuerst, subject
// zuletzt, styleJson-Keys in Originalreihenfolge) — deshalb läuft serde_json
// mit dem Feature `preserve_order` (Einfüge-Reihenfolge wie JSON.stringify).
use serde_json::{Map, Value};

const STYLE_REFERENCE_INSTRUCTION: &str = "Use the photographic style, lighting, color grading, and overall look from the provided reference image(s). Keep the visual style perfectly consistent; only change the subject as described below.";

const INFOGRAPHIC_TEXT_INSTRUCTION: &str = "Render all text, labels, numbers and typographic elements crisply and legibly with correct spelling. Maintain a clear visual hierarchy and a clean, aligned layout.";

pub struct CompileOutput {
    pub prompt_object: Value,
    pub prompt_text: String,
}

/// Kompiliert styleJson + subject zum Prompt (Objekt + pretty JSON-Text).
pub fn compile_prompt(
    style_json: &Value,
    subject: &str,
    has_references: bool,
    kind: Option<&str>,
) -> CompileOutput {
    let mut obj = Map::new();
    if has_references {
        obj.insert(
            "style_reference".to_string(),
            Value::String(STYLE_REFERENCE_INSTRUCTION.to_string()),
        );
    }
    if kind == Some("infografik") {
        obj.insert(
            "text_rendering".to_string(),
            Value::String(INFOGRAPHIC_TEXT_INSTRUCTION.to_string()),
        );
    }
    if let Value::Object(style) = style_json {
        for (k, v) in style {
            obj.insert(k.clone(), v.clone());
        }
    }
    obj.insert("subject".to_string(), Value::String(subject.to_string()));

    let prompt_object = Value::Object(obj);
    let prompt_text =
        serde_json::to_string_pretty(&prompt_object).unwrap_or_else(|_| "{}".to_string());
    CompileOutput {
        prompt_object,
        prompt_text,
    }
}

/// True, wenn das styleJson keinerlei nutzbaren Inhalt hat — Port von
/// isEmptyStyle() aus src/server/styleBrief.ts.
pub fn is_empty_style(value: &Value) -> bool {
    match value {
        Value::Null => true,
        Value::String(s) => s.trim().is_empty(),
        Value::Number(_) | Value::Bool(_) => false,
        Value::Array(items) => items.iter().all(is_empty_style),
        Value::Object(map) => map.values().all(is_empty_style),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn injects_style_reference_when_references_present() {
        let out = compile_prompt(&json!({"mood": "calm"}), "ein Hund", true, None);
        let obj = out.prompt_object.as_object().unwrap();
        assert!(obj.contains_key("style_reference"));
        assert_eq!(obj["subject"], json!("ein Hund"));
    }

    #[test]
    fn injects_text_rendering_for_infografik() {
        let out = compile_prompt(&json!({}), "x", false, Some("infografik"));
        assert!(out.prompt_object.as_object().unwrap().contains_key("text_rendering"));
        let out2 = compile_prompt(&json!({}), "x", false, Some("foto"));
        assert!(!out2.prompt_object.as_object().unwrap().contains_key("text_rendering"));
    }

    #[test]
    fn empty_style_detection() {
        assert!(is_empty_style(&json!({})));
        assert!(is_empty_style(&json!({"a": "", "b": {"c": []}})));
        assert!(!is_empty_style(&json!({"a": false})));
        assert!(!is_empty_style(&json!({"a": "x"})));
    }
}
