// Kanonische JSON-Serialisierung — Port von src/lib/canonicalJson.ts.
// Objekt-Keys werden rekursiv sortiert, damit inhaltsgleiche Werte denselben
// String (und damit SHA-256-Hash) ergeben. Muss byte-identisch zum
// TS-Original arbeiten, damit vorhandene briefSourceHash-Werte aus einer
// migrierten Datenbank gültig bleiben.
use serde_json::Value;
use sha2::{Digest, Sha256};

pub fn canonical_stringify(value: &Value) -> String {
    match value {
        Value::Null | Value::Bool(_) | Value::Number(_) | Value::String(_) => {
            // serde_json serialisiert Primitive wie JSON.stringify (Zahlen, die
            // als Integer geparst wurden, bleiben ohne Dezimalpunkt).
            serde_json::to_string(value).unwrap_or_else(|_| "null".to_string())
        }
        Value::Array(items) => {
            let parts: Vec<String> = items.iter().map(canonical_stringify).collect();
            format!("[{}]", parts.join(","))
        }
        Value::Object(map) => {
            let mut keys: Vec<&String> = map.keys().collect();
            keys.sort();
            let parts: Vec<String> = keys
                .into_iter()
                .map(|k| {
                    format!(
                        "{}:{}",
                        serde_json::to_string(k).unwrap_or_default(),
                        canonical_stringify(&map[k])
                    )
                })
                .collect();
            format!("{{{}}}", parts.join(","))
        }
    }
}

/// SHA-256 über das kanonische styleJson — Port von hashStyleJson().
pub fn hash_style_json(style_json: &Value) -> String {
    let canonical = canonical_stringify(style_json);
    let mut hasher = Sha256::new();
    hasher.update(canonical.as_bytes());
    hex::encode(hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn sorts_keys_recursively() {
        let v = json!({"b": 1, "a": {"d": true, "c": [1, "x", null]}});
        assert_eq!(
            canonical_stringify(&v),
            r#"{"a":{"c":[1,"x",null],"d":true},"b":1}"#
        );
    }

    #[test]
    fn primitives_match_json_stringify() {
        assert_eq!(canonical_stringify(&json!("a\"b")), r#""a\"b""#);
        assert_eq!(canonical_stringify(&json!(50)), "50");
        assert_eq!(canonical_stringify(&json!(1.5)), "1.5");
        assert_eq!(canonical_stringify(&json!(null)), "null");
    }

    #[test]
    fn hash_is_stable_regardless_of_key_order() {
        let a = json!({"x": 1, "y": 2});
        let b = json!({"y": 2, "x": 1});
        assert_eq!(hash_style_json(&a), hash_style_json(&b));
    }
}
