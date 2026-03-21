package crypto

import (
    "github.com/arnaud-morini/zk"
    bls "github.com/chai2010/bls12-381"
    "github.com/ethereum/go-ethereum/crypto/bls12381"
)

type ZKThreshold struct {
    tks *bls.SecretKey
    pk  *bls.PublicKey
}

func NewZKThreshold(threshold int, total int) (*ZKThreshold, error) {
    sk, err := bls.GenerateKey()
    if err != nil {
        return nil, err
    }
    
    // Threshold signature scheme
    tpk := bls.Serialize(sk.GetPublicKey())
    
    return &ZKThreshold{tks: sk, pk: sk.GetPublicKey()}, nil
}

func (zt *ZKThreshold) SignZKProof(txHash []byte, proof zk.Proof) ([]byte, error) {
    sig := tks.Sign(txHash)
    return sig.Serialize(), nil
}
