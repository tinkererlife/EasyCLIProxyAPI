//! Distribution policy for tinkererlife's local, manually updated Mac build.
use super::*;

pub(crate) const REPOSITORY: &str = "https://github.com/tinkererlife/EasyCLIProxyAPI";
pub(crate) const MANUAL_UPDATES: &str =
    "This tinkererlife build uses manual updates. Review source changes and rebuild the app; runtime downloads are disabled.";

pub(crate) fn require_manual_update() -> Result<(), String> {
    Err(MANUAL_UPDATES.to_string())
}

pub(crate) fn new_local_key() -> String {
    let mut bytes = [0u8; 32];
    // Do not start with a predictable fallback credential if system entropy fails.
    getrandom::fill(&mut bytes).expect("System random source is unavailable");
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

pub(crate) fn verify_core_archive(path: &Path) -> Result<(), String> {
    let lock: serde_json::Value = serde_json::from_str(include_str!("../../fork-core-lock.json"))
        .map_err(|error| format!("Invalid embedded core lock: {error}"))?;
    let name = path.file_name().and_then(|name| name.to_str()).unwrap_or("");
    let expected = lock["archives"][name].as_str()
        .ok_or_else(|| "Core archive is not approved in fork-core-lock.json".to_string())?;
    verify_digest(&sha256_file(path)?, expected)
}

fn verify_digest(actual: &str, expected: &str) -> Result<(), String> {
    if actual == expected {
        Ok(())
    } else {
        Err("Core archive does not match the SHA-256 pinned in this build".to_string())
    }
}

pub(crate) fn apply_local_config(content: &str) -> Result<String, String> {
    let before: serde_norway::Value = serde_norway::from_str(content)
        .map_err(|error| format!("Invalid core configuration: {error}"))?;
    let mut after = before.clone();
    if !core_config_uses_v8(&after) {
        return Err("This fork requires the pinned v8 core configuration".into());
    }
    for (path, value) in [
        (&["server", "host"][..], serde_norway::Value::String("127.0.0.1".into())),
        (&["management", "allow-remote"][..], serde_norway::Value::Bool(false)),
        (&["management", "disable-control-panel"][..], serde_norway::Value::Bool(true)),
        (&["management", "disable-auto-update-panel"][..], serde_norway::Value::Bool(true)),
        (&["plugins", "enabled"][..], serde_norway::Value::Bool(false)),
    ] {
        set_core_yaml_path_value(&mut after, path, value)?;
    }
    render_yaml_value_changes(content, &before, &after)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fork_policy_rejects_modified_archives_and_runtime_updates() {
        assert!(verify_digest("modified", "approved").is_err());
        assert!(verify_digest("approved", "approved").is_ok());
        assert!(require_manual_update().is_err());
        assert!(verify_core_archive(Path::new("unapproved.tar.gz")).is_err());
    }

    #[test]
    fn fork_policy_restricts_existing_network_and_download_settings() {
        let original = "config-version: 8\nserver:\n  host: 0.0.0.0\nmanagement:\n  allow-remote: true\nplugins:\n  enabled: true\nrouting:\n  strategy: round-robin\n";
        let secured = apply_local_config(original).unwrap();
        let config: serde_norway::Value = serde_norway::from_str(&secured).unwrap();
        assert_eq!(config["server"]["host"].as_str(), Some("127.0.0.1"));
        assert_eq!(config["management"]["allow-remote"].as_bool(), Some(false));
        assert_eq!(config["management"]["disable-control-panel"].as_bool(), Some(true));
        assert_eq!(config["management"]["disable-auto-update-panel"].as_bool(), Some(true));
        assert_eq!(config["plugins"]["enabled"].as_bool(), Some(false));
        assert_eq!(config["routing"]["strategy"].as_str(), Some("round-robin"));
        assert!(apply_local_config("host: 0.0.0.0").is_err());
    }

    #[test]
    fn fork_policy_generates_independent_credentials() {
        let first = new_local_key();
        let second = new_local_key();
        assert_eq!(first.len(), 64);
        assert!(first.bytes().all(|byte| byte.is_ascii_hexdigit()));
        assert_ne!(first, second);
    }
}
