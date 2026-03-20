#[tokio::test]
async fn test_mastercard_validation() {
    let mut config = Config::parse();
    config.mastercard_enabled = true;
    
    // Missing API key
    assert!(config.validate().is_err());
    
    config.mastercard_api_key = Some("test_key".to_string());
    config.mastercard_merchant_id = Some("MCH-123".to_string());
    config.mastercard_signing_key = Some("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef".to_string());
    
    assert!(config.validate().is_ok());
}
