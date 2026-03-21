package crypto

import (
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"

	"github.com/chai2010/bls12-381"
	"github.com/ethereum/go-ethereum/crypto/bls12381"
	"golang.org/x/crypto/sha3"
)

type ThresholdSig struct {
	threshold int
	total     int
	secret    *bls.SecretKey
	pubKey    *bls.PublicKey
	shares    map[int]*bls.SecretKey
}

func NewThresholdSig(threshold, total int) (*ThresholdSig, error) {
	if threshold > total || threshold <= 0 || total <= 0 {
		return nil, errors.New("invalid threshold parameters")
	}

	secret, err := bls.GenerateKey(rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("failed to generate master key: %w", err)
	}

	ts := &ThresholdSig{
		threshold: threshold,
		total:     total,
		secret:    secret,
		pubKey:    secret.GetPublicKey(),
		shares:    make(map[int]*bls.SecretKey),
	}

	// Generate shares using Shamir's Secret Sharing
	for i := 1; i <= total; i++ {
		share, err := ts.generateShare(i)
		if err != nil {
			return nil, err
		}
		ts.shares[i] = share
	}

	return ts, nil
}

func (ts *ThresholdSig) Share(index int) *bls.SecretKey {
	return ts.shares[index]
}

func (ts *ThresholdSig) PublicKey() *bls.PublicKey {
	return ts.pubKey
}

func (ts *ThresholdSig) Sign(message []byte) *bls.Sign {
	return ts.secret.Sign(message)
}

func (ts *ThresholdSig) AggregateShares(signatures map[int]*bls.Sign) (*bls.Sign, error) {
	if len(signatures) < ts.threshold {
		return nil, fmt.Errorf("insufficient signatures: need %d, got %d", ts.threshold, len(signatures))
	}

	aggSig := bls.Sign{}
	for _, sig := range signatures {
		if err := aggSig.Add(sig); err != nil {
			return nil, fmt.Errorf("failed to aggregate signature: %w", err)
		}
	}

	if !aggSig.Verify(ts.pubKey, []byte("test message")) {
		return nil, errors.New("aggregated signature verification failed")
	}

	return &aggSig, nil
}

func (ts *ThresholdSig) generateShare(index int) (*bls.SecretKey, error) {
	// Simplified Shamir share generation
	coeffs := make([]*big.Int, ts.threshold)
	coeffs[0] = new(big.Int).Set(ts.secret.GetLittleEndian())
	
	for i := 1; i < ts.threshold; i++ {
		coeffs[i], _ = rand.Int(rand.Reader, new(big.Int).Exp(big.NewInt(2), big.NewInt(256), nil))
	}
	
	// Evaluate polynomial at index
	x := big.NewInt(int64(index))
	share := new(big.Int)
	for i, coeff := range coeffs {
		term := new(big.Int).Exp(x, big.NewInt(int64(i)), nil)
		term.Mul(term, coeff)
		term.Mod(term, bls12_381.Q)
		share.Add(share, term)
		share.Mod(share, bls12_381.Q)
	}
	
	skBytes := share.Bytes()
	sk, err := bls.SecretKeyFromBytes(skBytes)
	return sk, err
}
