package crypto

import (
	"crypto/rand"
	"testing"
	"testing/quick"
)

func TestThresholdSignature(t *testing.T) {
	ts, err := NewThresholdSig(2, 3)
	if err != nil {
		t.Fatal(err)
	}
	
	msg := []byte("test transaction")
	
	// Generate partial signatures
	sigs := make(map[int]*bls.Sign)
	for i := 1; i <= 3; i++ {
		sig := ts.Share(i).Sign(msg)
		sigs[i] = sig
	}
	
	// Aggregate 2-of-3
	aggSig1, err := ts.AggregateShares(map[int]*bls.Sign{
		1: sigs[1],
		2: sigs[2],
	})
	if err != nil {
		t.Fatal(err)
	}
	
	if !aggSig1.Verify(ts.PublicKey(), msg) {
		t.Fatal("threshold signature verification failed")
	}
}
