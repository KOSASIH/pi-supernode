package crypto

import (
	"crypto/sha256"
	"encoding/json"
)

type ZKProof struct {
	Proof        groth16.Proof    `json:"proof"`
	PublicInputs []*bn256.Scalar  `json:"public_inputs"`
	Circuit      string           `json:"circuit"`
	Message      []byte           `json:"message"`
	Signature    *bls.Sign        `json:"signature"`
}

func (zk *ZKProof) VerifyThreshold(publicKey *bls.PublicKey) bool {
	// 1. Verify ZK proof
	if err := VerifyTxProof(zk.Proof, zk.PublicInputs[0], vk); err != nil {
		return false
	}
	
	// 2. Verify BLS signature
	h := sha256.Sum256(zk.Message)
	return zk.Signature.Verify(publicKey, h[:])
}
