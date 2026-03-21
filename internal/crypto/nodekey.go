package crypto

import (
    "crypto/rand"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "os"
    "path/filepath"
)

const nodeKeyFile = "node.key"

func GenerateNodeKey() ([]byte, error) {
    key := make([]byte, 32)
    if _, err := rand.Read(key); err != nil {
        return nil, fmt.Errorf("failed to generate key: %w", err)
    }
    return key, nil
}

func LoadOrGenerateNodeKey(dataDir string) ([]byte, error) {
    keyFile := filepath.Join(dataDir, nodeKeyFile)
    
    // Try to load existing key
    if key, err := os.ReadFile(keyFile); err == nil {
        return key, nil
    }
    
    // Generate new key
    key, err := GenerateNodeKey()
    if err != nil {
        return nil, err
    }
    
    // Ensure data directory exists
    if err := os.MkdirAll(filepath.Dir(keyFile), 0700); err != nil {
        return nil, err
    }
    
    // Save key with strict permissions
    if err := os.WriteFile(keyFile, key, 0600); err != nil {
        return nil, fmt.Errorf("failed to save node key: %w", err)
    }
    
    return key, nil
}
